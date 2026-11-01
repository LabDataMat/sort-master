import { TestRunner, assert, assertEq } from './harness';
import { ProgressManager, DAILY_TASKS, xpToNext } from '../assets/scripts/systems/progress/ProgressManager';

export const progressTests = new TestRunner();

function makePM() {
  const coins: number[] = [];
  const frags: number[] = [];
  const pm = new ProgressManager({ level: 1, xp: 0 }, ProgressManager.emptyTasks('2026-11-01'), {
    onCoins: (n) => coins.push(n),
    onFragments: (n) => frags.push(n),
  });
  return { pm, coins, frags };
}

progressTests.test('经验升级：达到阈值升级并发放等级奖励', () => {
  const { pm, coins, frags } = makePM();
  const need = xpToNext(1);
  const r = pm.addXp(need);
  assertEq(r.levelsGained, 1, '升 1 级');
  assertEq(pm.player.level, 2);
  assertEq(pm.player.xp, 0);
  assertEq(coins.length, 1, '发放金币奖励');
  assertEq(frags.length, 1, '发放碎片奖励');
});

progressTests.test('经验可连续升多级', () => {
  const { pm } = makePM();
  const r = pm.addXp(xpToNext(1) + xpToNext(2) + 10);
  assertEq(r.levelsGained, 2);
  assertEq(pm.player.level, 3);
  assertEq(pm.player.xp, 10);
});

progressTests.test('每日任务：未完成不能领取', () => {
  const { pm } = makePM();
  const r = pm.claimTask('clear3');
  assert(!r.ok);
  assertEq(r.reason, 'incomplete');
});

progressTests.test('每日任务：事件驱动进度并按目标封顶', () => {
  const { pm } = makePM();
  pm.recordEvent('level_clear', 1);
  assertEq(pm.taskProgress('clear3'), 1);
  pm.recordEvent('level_clear', 5);
  assertEq(pm.taskProgress('clear3'), 3, '封顶为目标值');
});

progressTests.test('每日任务：完成可领且只能领一次（幂等）', () => {
  const { pm, coins, frags } = makePM();
  for (let i = 0; i < 3; i++) pm.recordEvent('level_clear', 1);
  const r1 = pm.claimTask('clear3');
  assert(r1.ok, '首次领取成功');
  assertEq(r1.coins, DAILY_TASKS[0].coins);
  assertEq(coins[0], DAILY_TASKS[0].coins);
  assert(frags.length > 0, '发放碎片');
  const r2 = pm.claimTask('clear3');
  assert(!r2.ok);
  assertEq(r2.reason, 'claimed');
});

progressTests.test('每日任务：四种事件类型都驱动对应任务', () => {
  const { pm } = makePM();
  pm.recordEvent('booster_used', 2);
  pm.recordEvent('new_collectible', 1);
  pm.recordEvent('combo_clear', 1);
  assert(pm.isTaskComplete('booster2'));
  assert(pm.isTaskComplete('newcollect1'));
  assert(pm.isTaskComplete('combo1'));
  assert(!pm.isTaskComplete('clear3'));
  assertEq(pm.completedTaskCount, 3);
});

progressTests.test('每日任务：跨天重置进度与领取状态', () => {
  const { pm } = makePM();
  pm.recordEvent('level_clear', 3);
  assert(pm.claimTask('clear3').ok);
  const reset = pm.ensureToday('2026-11-02');
  assert(reset, '跨天重置');
  assertEq(pm.taskProgress('clear3'), 0);
  assertEq(pm.tasks.claimed.length, 0);
});

progressTests.test('里程碑：每 5 关有金币与碎片奖励', () => {
  assertEq(ProgressManager.milestoneFor(4), null, '非 5 的倍数无奖励');
  const m5 = ProgressManager.milestoneFor(5)!;
  assert(m5.coins > 0 && m5.fragments > 0);
  const m50 = ProgressManager.milestoneFor(50)!;
  assert(m50.coins > m5.coins, '越往后奖励越高');
});
