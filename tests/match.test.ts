import { TestRunner, assert, assertEq } from './harness';
import { MatchManager, SlotItem } from '../assets/scripts/gameplay/logic/MatchManager';
import { SlotModel } from '../assets/scripts/gameplay/logic/SlotModel';

export const matchTests = new TestRunner();

function items(types: string[]): SlotItem[] {
  return types.map((t, i) => ({ uniqueId: `u${i}`, itemType: t, state: 'idle' as const }));
}

/** 规则语义验证：只有连续三个相同才消除 */
matchTests.test('[A,A,A] => 消除', () => {
  const { groups, remaining } = MatchManager.resolve(items(['A', 'A', 'A']));
  assertEq(groups.length, 1, '一组');
  assertEq(groups[0].items.map((i) => i.itemType).join(''), 'AAA');
  assertEq(remaining.length, 0, '全部消除');
});

matchTests.test('[A,B,A] => 不消除', () => {
  const { groups, remaining } = MatchManager.resolve(items(['A', 'B', 'A']));
  assertEq(groups.length, 0, '不消除');
  assertEq(remaining.length, 3);
});

matchTests.test('[A,B,A,A] => 不消除', () => {
  const { groups, remaining } = MatchManager.resolve(items(['A', 'B', 'A', 'A']));
  assertEq(groups.length, 0, '分散的两个 A 不构成三连');
  assertEq(remaining.length, 4);
});

matchTests.test('[A,A,B,A] => 不消除', () => {
  const { groups, remaining } = MatchManager.resolve(items(['A', 'A', 'B', 'A']));
  assertEq(groups.length, 0);
  assertEq(remaining.length, 4);
});

matchTests.test('[B,B,B,B] => 只消除一组（消费前三个）', () => {
  const { groups, remaining } = MatchManager.resolve(items(['B', 'B', 'B', 'B']));
  assertEq(groups.length, 1, '四连只算一组三个');
  assertEq(remaining.length, 1, '剩一个 B');
});

matchTests.test('[A,B,B,B,A] => 只消除连续的三个 B', () => {
  const { groups, remaining } = MatchManager.resolve(items(['A', 'B', 'B', 'B', 'A']));
  assertEq(groups.length, 1, '只有 B 一组');
  assertEq(groups[0].items.every((i) => i.itemType === 'B'), true, '消除的是 B 组');
  assertEq(remaining.map((i) => i.itemType).join(''), 'AA', '剩余两个 A');
});

matchTests.test('[A,A,A,B,B,B] => 两组分别消除', () => {
  const { groups, remaining } = MatchManager.resolve(items(['A', 'A', 'A', 'B', 'B', 'B']));
  assertEq(groups.length, 2, '两组');
  assertEq(groups[0].items[0].itemType, 'A');
  assertEq(groups[1].items[0].itemType, 'B');
  assertEq(remaining.length, 0);
});

matchTests.test('[A,A,B,B,B,A,A] => 只消除中间三个 B，剩余 A 不消除', () => {
  const { groups, remaining } = MatchManager.resolve(items(['A', 'A', 'B', 'B', 'B', 'A', 'A']));
  assertEq(groups.length, 1, '只有中间三个 B 一组');
  assertEq(groups[0].items.every((i) => i.itemType === 'B'), true, '消除的是 B 组');
  assertEq(remaining.every((i) => i.itemType === 'A'), true, '剩余全部是 A（未被消除）');
  assertEq(remaining.length, 4, '两侧各两个 A 补位合并，均不消除');
});

matchTests.test('[A,A,B,B,B,A] => 消除三个 B 后剩 [A,A,A]（不再触发）', () => {
  const { groups, remaining } = MatchManager.resolve(items(['A', 'A', 'B', 'B', 'B', 'A']));
  assertEq(groups.length, 1, '只有 B 一组');
  assertEq(remaining.map((i) => i.itemType).join(''), 'AAA', '补位后的 A 不再消除');
});

matchTests.test('消除后左补位（顺序保持）', () => {
  // C,A,A,A,B => 消除 AAA => [C,B]
  const { remaining } = MatchManager.resolve(items(['C', 'A', 'A', 'A', 'B']));
  assertEq(remaining.map((i) => i.itemType).join(''), 'CB', '剩余物品向左补位且保持相对顺序');
});

matchTests.test('消除不会重复触发（数据无错乱）', () => {
  const input = items(['A', 'A', 'B', 'B', 'B', 'A', 'A', 'A', 'A']);
  // 单轮扫描：B,B,B(2-4) 与 A,A,A(5-7) 两组分别消除；A(0),A(1),A(8) 剩余
  const { groups, remaining } = MatchManager.resolve(input);
  const removedIds = groups.flatMap((g) => g.items.map((i) => i.uniqueId));
  assertEq(new Set(removedIds).size, removedIds.length, '无重复消除');
  assertEq(groups.length, 2, '两组：BBB 与补位相邻的 AAA');
  assertEq(remaining.length, 3, '剩余 3 个 A');
  assertEq(groups.reduce((n, g) => n + g.items.length, 0), input.length - remaining.length, '消除数 + 剩余数 = 总数');
});

matchTests.test('appendingCompletesTriple 判定（尾部凑三）', () => {
  assert(MatchManager.appendingCompletesTriple(items(['A', 'A']), 'A') === true, '尾部两个 A 再追加 A 触发');
  assert(MatchManager.appendingCompletesTriple(items(['A', 'B']), 'A') === false, '尾部 A,B 追加 A 不触发');
  assert(MatchManager.appendingCompletesTriple(items(['B', 'A']), 'A') === false, '尾部 B,A 追加 A 不触发');
  assert(MatchManager.appendingCompletesTriple(items([]), 'A') === false, '空槽不触发');
  assert(MatchManager.appendingCompletesTriple(items(['A']), 'A') === false, '只有一个 A 不触发');
});

matchTests.test('SlotModel.add：按进入顺序追加并结算', () => {
  const slots = new SlotModel(7);
  // 模拟玩家依次拿 A,B,A,A（不消除）
  slots.add('t1', 'A');
  slots.add('t2', 'B');
  const r3 = slots.add('t3', 'A');
  const r4 = slots.add('t4', 'A');
  assertEq(r3.groups.length, 0, 'A,B,A 不消除');
  assertEq(r4.groups.length, 0, 'A,B,A,A 不消除');
  assertEq(slots.items.map((i) => i.itemType).join(''), 'ABAA', '槽内保持进入顺序');
  // 撤回快照恢复
  const snap = slots.items.map((it) => ({ ...it }));
  slots.restore(snap, 7, 0, 7);
  assertEq(slots.items.map((i) => i.itemType).join(''), 'ABAA');
});

matchTests.test('SlotModel 尾部三连触发并补位', () => {
  const slots = new SlotModel(7);
  // 4 个不同 + A,A 停车，追加 A 触发尾部三连
  for (const t of ['B', 'C', 'D', 'E']) slots.add(`p${t}`, t);
  slots.add('x1', 'A');
  slots.add('x2', 'A');
  const r = slots.add('x3', 'A');
  assertEq(r.groups.length, 1, '尾部三连触发');
  assertEq(slots.occupiedCount, 4, '消除后补位，占用 4');
  assertEq(slots.items.map((i) => i.itemType).join(''), 'BCDE', '槽内保持顺序');
  assert(!slots.isFull(), '不满');
});
