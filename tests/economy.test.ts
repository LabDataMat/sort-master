import { TestRunner, assert, assertEq } from './harness';
import { CurrencyManager } from '../assets/scripts/systems/economy/CurrencyManager';
import { RewardManager, DailyRewardLogic } from '../assets/scripts/systems/economy/RewardManager';
import { BoosterInventory } from '../assets/scripts/systems/economy/BoosterInventory';
import { SaveManager, defaultSave } from '../assets/scripts/systems/save/SaveManager';
import { MemoryStorageAdapter } from '../assets/scripts/systems/save/StorageAdapters';
import { EventHub } from '../assets/scripts/core/EventHub';
import { strHash } from '../assets/scripts/utils/Rand';

export const economyTests = new TestRunner();

economyTests.test('金币增加必须为正数', () => {
  const c = new CurrencyManager(100, new EventHub<any>());
  assert(!c.add(0, 'x'), '0 不允许');
  assert(!c.add(-5, 'x'), '负数不允许');
  assert(c.add(50, 'x'));
  assertEq(c.balance, 150);
});

economyTests.test('金币扣减：余额不足拒绝，永不为负', () => {
  const c = new CurrencyManager(100, new EventHub<any>());
  assert(!c.spend(150, 'x'), '余额不足应拒绝');
  assertEq(c.balance, 100, '余额不变');
  assert(c.spend(100, 'x'));
  assertEq(c.balance, 0);
  assert(!c.spend(1, 'x'), '0 余额不能扣');
  assertEq(c.balance, 0);
});

economyTests.test('奖励发放幂等：重复 requestId 只发一次', () => {
  const r = new RewardManager();
  assert(r.grant('req_1'), '首次成功');
  assert(!r.grant('req_1'), '重复拒绝');
  assert(r.grant('req_2'));
});

economyTests.test('关卡结算防重（canSettle）', () => {
  const r = new RewardManager();
  assert(r.canSettle('victory:run1'), '首次可结算');
  assert(!r.canSettle('victory:run1'), '重复结算拒绝');
  assert(r.canSettle('victory:run2'), '不同局可结算');
});

economyTests.test('每日签到逻辑：日期判断与连击', () => {
  assert(DailyRewardLogic.canClaim('', '2026-11-01'), '从未领取可领');
  assert(!DailyRewardLogic.canClaim('2026-11-01', '2026-11-01'), '当天不可重复领');
  assert(DailyRewardLogic.canClaim('2026-10-31', '2026-11-01'), '隔天可领');
  assertEq(DailyRewardLogic.nextStreak('2026-10-31', 3, '2026-11-01', '2026-10-31'), 4, '连续签到 +1');
  assertEq(DailyRewardLogic.nextStreak('2026-10-20', 5, '2026-11-01', '2026-10-31'), 1, '断签重置');
  assertEq(DailyRewardLogic.nextStreak('2026-10-31', 7, '2026-11-01', '2026-10-31'), 1, '7 天循环');
});

economyTests.test('道具库存：消耗不足拒绝', () => {
  const inv = new BoosterInventory({ undo: 1, shuffle: 0, remove: 0, extra_slot: 0 });
  assert(inv.consume('undo'));
  assert(!inv.consume('undo'), '不足拒绝');
  assert(inv.add('shuffle', 2));
  assertEq(inv.get('shuffle'), 2);
});

economyTests.test('存档：写入读取往返一致', () => {
  const storage = new MemoryStorageAdapter();
  const sm = new SaveManager(storage);
  sm.data.coins = 999;
  sm.data.currentLevel = 5;
  sm.data.maxUnlockedLevel = 6;
  sm.data.completedLevels = [1, 2, 3, 4];
  sm.save();
  const sm2 = new SaveManager(storage);
  assertEq(sm2.data.coins, 999);
  assertEq(sm2.data.currentLevel, 5);
  assertEq(sm2.data.completedLevels.length, 4);
});

economyTests.test('存档：损坏数据回退默认值（游戏可启动）', () => {
  const storage = new MemoryStorageAdapter();
  storage.set('sort_master_save_v1', '{invalid json!!');
  const sm = new SaveManager(storage);
  assertEq(sm.data.coins, defaultSave().coins, '回退默认金币');
  assertEq(sm.data.currentLevel, 1);
});

economyTests.test('存档：校验和不匹配回退默认值', () => {
  const storage = new MemoryStorageAdapter();
  const sm = new SaveManager(storage);
  sm.save();
  // 篡改内容（保持 JSON 合法但校验和不符）
  const raw = JSON.parse(storage.get('sort_master_save_v1')!);
  raw.coins = 999999;
  storage.set('sort_master_save_v1', JSON.stringify(raw));
  const sm2 = new SaveManager(storage);
  assert(sm2.data.coins !== 999999, '篡改数据被拒绝');
});

economyTests.test('存档 v1→v2：旧进度完整保留', () => {
  const storage = new MemoryStorageAdapter();
  const old = {
    schemaVersion: 1,
    currentLevel: 12,
    maxUnlockedLevel: 13,
    completedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    coins: 888,
    boosters: { undo: 3, shuffle: 2, remove: 1, extra_slot: 0 },
    dailyReward: { lastClaimDate: '2026-10-30', streak: 4 },
    settings: { musicOn: false, sfxOn: true },
    stats: { gamesPlayed: 11, wins: 11, coinsEarned: 2000, coinsSpent: 300, maxCombo: 6,
      adStats: { ad_request_count: 0, ad_load_success_count: 0, ad_show_count: 0, ad_complete_count: 0, ad_reward_count: 0, ad_error_count: 0 } },
  };
  // 模拟真实 v1 存档：checksum 由 v1 数据计算
  const checksum = strHash(JSON.stringify(old));
  storage.set('sort_master_save_v1', JSON.stringify({ ...old, checksum }));
  const sm = new SaveManager(storage);
  assertEq(sm.data.currentLevel, 12, '关卡进度保留');
  assertEq(sm.data.coins, 888, '金币保留');
  assertEq(sm.data.boosters.undo, 3, '道具保留');
  assertEq(sm.data.settings.musicOn, false, '设置保留');
  assertEq(sm.data.schemaVersion, 2, '升级到 v2');
  assertEq(sm.data.playerLevel, 1, '新增字段默认值');
});

economyTests.test('存档 v2：收藏品/碎片/任务持久化', () => {
  const storage = new MemoryStorageAdapter();
  const sm = new SaveManager(storage);
  sm.data.collection = { dessert_01: '2026-10-31T10:00:00.000Z' };
  sm.data.fragments = 42;
  sm.data.playerLevel = 3;
  sm.data.playerXp = 55;
  sm.data.seriesCompleted = ['fruit'];
  sm.data.dailyTasks = { date: '2026-10-31', progress: { clear3: 2 }, claimed: [] };
  sm.save();
  const sm2 = new SaveManager(storage);
  assertEq(sm2.data.collection['dessert_01'], '2026-10-31T10:00:00.000Z');
  assertEq(sm2.data.fragments, 42);
  assertEq(sm2.data.playerLevel, 3);
  assertEq(sm2.data.playerXp, 55);
  assertEq(sm2.data.seriesCompleted[0], 'fruit');
  assertEq(sm2.data.dailyTasks.progress['clear3'], 2);
});

economyTests.test('存档：缺失字段补默认值（版本升级兼容）', () => {
  const storage = new MemoryStorageAdapter();
  // 模拟旧版本存档：没有 boosters / settings / stats
  storage.set(
    'sort_master_save_v1',
    JSON.stringify({ schemaVersion: 0, currentLevel: 3, maxUnlockedLevel: 4, completedLevels: [1, 2], coins: 77 })
  );
  const sm = new SaveManager(storage);
  assertEq(sm.data.coins, 77, '已有字段保留');
  assertEq(sm.data.currentLevel, 3);
  assertEq(sm.data.boosters.undo, 1, '缺失字段补默认');
  assertEq(sm.data.settings.musicOn, true, '缺失字段补默认');
  assert(sm.data.stats !== undefined, 'stats 已迁移');
  assertEq(sm.data.schemaVersion, 2, 'schemaVersion 升级到 2');
  assertEq(sm.data.playerLevel, 1, 'v2 字段补默认');
  assertEq(sm.data.fragments, 0);
  assert(sm.data.collection !== undefined, 'collection 已迁移');
  assertEq(sm.data.dailyTasks.claimed.length, 0);
});
