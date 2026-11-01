import { TestRunner, assert, assertEq } from './harness';
import { MockAdService } from '../assets/scripts/ads/MockAdService';
import { AdManager } from '../assets/scripts/ads/AdManager';
import { RewardManager } from '../assets/scripts/systems/economy/RewardManager';
import { CurrencyManager } from '../assets/scripts/systems/economy/CurrencyManager';
import { EventHub } from '../assets/scripts/core/EventHub';

export const adTests = new TestRunner();

function makeAd(opts?: { reviveMaxPerRun?: number; maxAdsPerRun?: number }) {
  const service = new MockAdService();
  const mgr = new AdManager(service, { reviveMaxPerRun: 1, maxAdsPerRun: 10, ...opts });
  mgr.startRun('run_test');
  return { service, mgr };
}

/** 模拟完整发放流程：AdManager 结果 + RewardManager 幂等 + 金币入账 */
function grantFlow(mgr: AdManager, rewards: RewardManager, coins: CurrencyManager, rid: string, amount: number): boolean {
  // 由调用方在 completed 后执行
  void mgr;
  if (!rewards.grant(rid)) return false;
  coins.add(amount, 'ad');
  return true;
}

adTests.test('广告完整观看 → 发放奖励', async () => {
  const { service, mgr } = makeAd();
  service.outcome = 'complete';
  const rewards = new RewardManager();
  const coins = new CurrencyManager(0, new EventHub<any>());
  const r = await mgr.showRewardedAd('booster', 'rid1');
  assert(r.completed, '完整观看 completed=true');
  assert(r.mock === true, '明确 Mock 标识');
  assert(grantFlow(mgr, rewards, coins, 'rid1', 80), '首次发放成功');
  assertEq(coins.balance, 80);
  assertEq(mgr.stats.ad_complete_count, 1);
  assertEq(mgr.stats.ad_reward_count, 0, '发奖后需 reportRewarded');
  mgr.reportRewarded('rid1');
  assertEq(mgr.stats.ad_reward_count, 1);
});

adTests.test('广告中途关闭 → 不发奖励', async () => {
  const { service, mgr } = makeAd();
  service.outcome = 'abandon';
  const rewards = new RewardManager();
  const coins = new CurrencyManager(0, new EventHub<any>());
  const r = await mgr.showRewardedAd('booster', 'rid2');
  assert(!r.completed, '中途关闭 completed=false');
  // 只有 completed=true 才允许进入发奖流程
  if (r.completed) grantFlow(mgr, rewards, coins, 'rid2', 80);
  assertEq(coins.balance, 0, '未发放金币');
  assertEq(mgr.stats.ad_complete_count, 0);
});

adTests.test('广告加载/播放失败 → 不发奖励', async () => {
  const { service, mgr } = makeAd();
  service.outcome = 'fail';
  const r = await mgr.showRewardedAd('booster', 'rid3');
  assert(!r.completed);
  assert(!!r.error, '携带错误信息');
  assertEq(mgr.stats.ad_error_count, 1);
});

adTests.test('重复 requestId 不重复发奖', async () => {
  const { mgr } = makeAd();
  const r1 = await mgr.showRewardedAd('booster', 'dup');
  assert(r1.completed);
  const r2 = await mgr.showRewardedAd('booster', 'dup');
  assert(!r2.completed, '重复请求拒绝');
  assertEq(r2.error, 'duplicate_request');
});

adTests.test('每关复活广告最多一次', async () => {
  const { mgr } = makeAd();
  const r1 = await mgr.showRewardedAd('revive', 'rev1');
  assert(r1.completed);
  const r2 = await mgr.showRewardedAd('revive', 'rev2');
  assert(!r2.completed);
  assertEq(r2.error, 'revive_limit_reached');
});

adTests.test('每局广告次数限制', async () => {
  const { mgr } = makeAd({ maxAdsPerRun: 2 });
  await mgr.showRewardedAd('booster', 'a1');
  await mgr.showRewardedAd('booster', 'a2');
  const r3 = await mgr.showRewardedAd('booster', 'a3');
  assert(!r3.completed);
  assertEq(r3.error, 'run_limit_reached');
});

adTests.test('startRun 重置本局限制', async () => {
  const { mgr } = makeAd();
  await mgr.showRewardedAd('revive', 'r1');
  mgr.startRun('run_next');
  const r2 = await mgr.showRewardedAd('revive', 'r2');
  assert(r2.completed, '新一局复活广告可用');
});

adTests.test('广告统计计数完整', async () => {
  const { mgr } = makeAd();
  await mgr.showRewardedAd('booster', 's1');
  const s = mgr.stats;
  assertEq(s.ad_request_count, 1);
  assertEq(s.ad_show_count, 1);
  assertEq(s.ad_complete_count, 1);
  assert(s.ad_request_count >= s.ad_show_count, '请求 >= 展示');
});

adTests.test('show 成功不等于播放完成（Mock abandon 场景验证）', async () => {
  const { service, mgr } = makeAd();
  service.outcome = 'abandon';
  const rewards = new RewardManager();
  const r = await mgr.showRewardedAd('double_reward', 'x1');
  // 展示成功（ad_show_count +1）但没有完成
  assertEq(mgr.stats.ad_show_count, 1);
  assertEq(mgr.stats.ad_complete_count, 0);
  assert(!rewards.grant('x1 grant') || !r.completed, '未完成不进入发奖流程');
});
