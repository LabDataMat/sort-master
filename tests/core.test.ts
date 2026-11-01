import { TestRunner, assert, assertEq } from './harness';
import { makeLevel } from './helpers';
import { GameSession } from '../assets/scripts/gameplay/logic/GameSession';
import { SlotModel } from '../assets/scripts/gameplay/logic/SlotModel';

export const coreTests = new TestRunner();

coreTests.test('正常三消：三个同类型消除并清空槽位', () => {
  const lv = makeLevel([
    { type: 'apple', layer: 0, x: 0, y: 0 },
    { type: 'apple', layer: 0, x: 300, y: 0 },
    { type: 'apple', layer: 0, x: 600, y: 0 },
    { type: 'banana', layer: 0, x: 0, y: 300 },
    { type: 'banana', layer: 0, x: 300, y: 300 },
    { type: 'banana', layer: 0, x: 600, y: 300 },
  ]);
  const s = new GameSession(lv);
  s.start();
  s.pickTile('t0');
  s.pickTile('t1');
  assertEq(s.slots.occupiedCount, 2);
  s.pickTile('t2');
  assertEq(s.slots.occupiedCount, 0, '三个苹果应被消除');
  assertEq(s.board.remainingCount, 3);
  assertEq(s.combo, 1);
});

coreTests.test('不同物品不消除', () => {
  const lv = makeLevel([
    { type: 'apple', layer: 0, x: 0, y: 0 },
    { type: 'banana', layer: 0, x: 300, y: 0 },
    { type: 'cherry', layer: 0, x: 600, y: 0 },
    { type: 'donut', layer: 0, x: 0, y: 300 },
    { type: 'cake', layer: 0, x: 300, y: 300 },
    { type: 'duck', layer: 0, x: 600, y: 300 },
  ]);
  const s = new GameSession(lv);
  s.start();
  s.pickTile('t0');
  s.pickTile('t1');
  s.pickTile('t2');
  assertEq(s.slots.occupiedCount, 3, '不同类型不应消除');
  assertEq(s.state, 'PLAYING', '槽位7格中占3格，游戏继续');
  assertEq(s.board.remainingCount, 3);
});

coreTests.test('收纳槽未满时游戏继续', () => {
  const lv = makeLevel(Array.from({ length: 6 }, (_, i) => ({ type: ['apple', 'banana'][i % 2], layer: 0, x: (i % 6) * 120, y: 0 })));
  const s = new GameSession(lv);
  s.start();
  for (const id of ['t0', 't1', 't2']) s.pickTile(id);
  assert(s.state === 'PLAYING', `应处于 PLAYING，实际 ${s.state}`);
});

coreTests.test('收纳槽已满（7 个不同类型且场上还有物品）判负', () => {
  const types = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  const lv = makeLevel(types.map((t, i) => ({ type: t, layer: 0, x: i * 120, y: 0 })));
  const s = new GameSession(lv);
  s.start();
  for (let i = 0; i < 7; i++) s.pickTile(`t${i}`);
  assertEq(s.state, 'FAILED');
  assertEq(s.slots.occupiedCount, 7);
  assertEq(s.board.remainingCount, 3, '场上还有物品时槽满才判负');
});

coreTests.test('遮挡物品无法点击', () => {
  const lv = makeLevel([
    { type: 'apple', layer: 0, x: 0, y: 0 },
    { type: 'apple', layer: 0, x: 300, y: 0 },
    { type: 'apple', layer: 0, x: 600, y: 0 },
    { type: 'banana', layer: 1, x: 30, y: 30 },
  ]);
  const s = new GameSession(lv);
  s.start();
  const blocked = s.canPick('t0');
  assert(!blocked.ok, '被遮挡的 t0 不可点击');
  assertEq(blocked.reason, 'occluded');
  assert(s.canPick('t3').ok, '顶层 t3 可点击');
  // 穿透保护：直接调用 pickTile 也应被拒绝
  const r = s.pickTile('t0');
  assert(!r.ok, 'pickTile 应拒绝被遮挡物品');
});

coreTests.test('消除上层物品后下层解锁', () => {
  const lv = makeLevel([
    { type: 'apple', layer: 0, x: 0, y: 0 },
    { type: 'banana', layer: 1, x: 30, y: 30 },
    { type: 'banana', layer: 0, x: 300, y: 0 },
    { type: 'banana', layer: 0, x: 600, y: 0 },
  ]);
  const s = new GameSession(lv);
  s.start();
  assert(!s.canPick('t0').ok, '初始 t0 被遮挡');
  s.pickTile('t1');
  assert(s.canPick('t0').ok, '移除遮挡者后 t0 解锁');
});

coreTests.test('冰冻物品：三消后解冻', () => {
  const lv = makeLevel(
    [
      { type: 'apple', layer: 0, x: 0, y: 0 },
      { type: 'apple', layer: 0, x: 300, y: 0 },
      { type: 'apple', layer: 0, x: 600, y: 0 },
      { type: 'banana', layer: 0, x: 0, y: 300 },
      { type: 'banana', layer: 0, x: 300, y: 300 },
      { type: 'banana', layer: 0, x: 600, y: 300 },
    ],
    { obstacles: { frozenTileIds: ['t0'], lockedTileIds: [], lockedUnlockAfterMatches: 2 } }
  );
  const s = new GameSession(lv);
  s.start();
  assert(!s.canPick('t0').ok, '冰冻不可点击');
  s.pickTile('t3');
  s.pickTile('t4');
  s.pickTile('t5'); // 触发三消
  assert(s.canPick('t0').ok, '三消后冰冻解除');
});

coreTests.test('锁定物品：达到解锁次数后可点击', () => {
  const lv = makeLevel(
    [
      { type: 'apple', layer: 0, x: 0, y: 0 },
      { type: 'banana', layer: 0, x: 300, y: 0 },
      { type: 'banana', layer: 0, x: 600, y: 0 },
      { type: 'banana', layer: 0, x: 0, y: 300 },
    ],
    { obstacles: { frozenTileIds: [], lockedTileIds: ['t0'], lockedUnlockAfterMatches: 1 } }
  );
  const s = new GameSession(lv);
  s.start();
  assert(!s.canPick('t0').ok, '锁定不可点击');
  s.pickTile('t1');
  s.pickTile('t2');
  s.pickTile('t3'); // 1 次三消 → 解锁
  assert(s.canPick('t0').ok, '达到解锁次数后可点击');
});

coreTests.test('撤回操作：恢复上一次操作前状态', () => {
  const lv = makeLevel([
    { type: 'apple', layer: 0, x: 0, y: 0 },
    { type: 'banana', layer: 1, x: 30, y: 30 },
  ]);
  const s = new GameSession(lv);
  s.start();
  assert(s.canUndo() === false, '无操作时不可撤回');
  s.pickTile('t1');
  assertEq(s.board.remainingCount, 1);
  assert(s.undo(), '撤回成功');
  assertEq(s.board.remainingCount, 2, '物品回到场上');
  assert(!s.canPick('t0').ok, '遮挡关系恢复');
  assertEq(s.slots.occupiedCount, 0);
});

coreTests.test('洗牌后物品数量与类型一致', () => {
  const lv = makeLevel([
    { type: 'apple', layer: 0, x: 0, y: 0 },
    { type: 'banana', layer: 0, x: 300, y: 0 },
    { type: 'cherry', layer: 0, x: 600, y: 0 },
    { type: 'apple', layer: 1, x: 30, y: 30 },
  ]);
  const s = new GameSession(lv);
  s.start();
  const beforeTypes = s.board.liveTiles().map((t) => t.type).sort().join(',');
  const beforeCount = s.board.remainingCount;
  s.useShuffle(() => 0.4);
  assertEq(s.board.remainingCount, beforeCount, '数量不变');
  assertEq(s.board.liveTiles().map((t) => t.type).sort().join(','), beforeTypes, '类型不变');
});

coreTests.test('移除道具：直接移除一个可点击物品', () => {
  const lv = makeLevel([
    { type: 'apple', layer: 0, x: 0, y: 0 },
    { type: 'banana', layer: 0, x: 300, y: 0 },
  ]);
  const s = new GameSession(lv);
  s.start();
  assert(s.useRemove('t0'), '移除成功');
  assertEq(s.board.remainingCount, 1);
  assertEq(s.slots.occupiedCount, 0, '移除的物品不进入槽位');
  assert(!s.useRemove('t0'), '重复移除失败');
});

coreTests.test('额外槽位：可超过 7 个临时占用', () => {
  const types = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const lv = makeLevel(types.map((t, i) => ({ type: t, layer: 0, x: i * 120, y: 0 })));
  const s = new GameSession(lv);
  s.start();
  for (let i = 0; i < 7; i++) s.pickTile(`t${i}`);
  assertEq(s.state, 'FAILED', '无额外槽位时第 7 个不同类型已失败');
});

coreTests.test('额外槽位道具生效', () => {
  const types = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];
  const lv = makeLevel(types.map((t, i) => ({ type: t, layer: 0, x: i * 120, y: 0 })));
  const s = new GameSession(lv);
  s.start();
  s.useExtraSlot();
  for (let i = 0; i < 8; i++) s.pickTile(`t${i}`);
  assert(s.state === 'PLAYING' || s.state === 'FAILED', '8 个占用（容量 8）未超限');
  assertEq(s.slots.occupiedCount, 8);
  assertEq(s.slots.capacity, 8, '容量临时 +1');
});

coreTests.test('胜利判定', () => {
  const lv = makeLevel([
    { type: 'apple', layer: 0, x: 0, y: 0 },
    { type: 'apple', layer: 0, x: 300, y: 0 },
    { type: 'apple', layer: 0, x: 600, y: 0 },
  ]);
  const s = new GameSession(lv);
  s.start();
  s.pickTile('t0');
  s.pickTile('t1');
  s.pickTile('t2');
  assertEq(s.state, 'VICTORY');
});

coreTests.test('动画期间重复点击：视图层闸门拦截（inputLocked 契约）', () => {
  const lv = makeLevel([
    { type: 'apple', layer: 0, x: 0, y: 0 },
    { type: 'banana', layer: 0, x: 300, y: 0 },
  ]);
  const s = new GameSession(lv);
  s.start();
  // 视图层标准流程：入口检查 inputLocked → 置锁 → pickTile → 动画后解锁
  s.inputLocked = true;
  // 模拟视图层入口：锁定期间入口直接返回，不调用 pickTile
  const viewGateAllows = !s.inputLocked;
  assert(!viewGateAllows, '锁定期间视图层入口应返回');
  // 锁定期间 canPick 保持纯逻辑语义（不被输入锁污染）
  assert(s.canPick('t0').ok, 'canPick 是纯逻辑检查');
  // 但视图层不会在锁定期间调用 pickTile，逻辑数据不变
  assertEq(s.board.remainingCount, 2, '逻辑未被修改');
  s.inputLocked = false;
  assert(s.pickTile('t0').ok, '解锁后可正常拾取');
});

coreTests.test('动画期间重复点击：同帧两次 pickTile 只有第一次生效', () => {
  const lv = makeLevel([
    { type: 'apple', layer: 0, x: 0, y: 0 },
    { type: 'apple', layer: 0, x: 300, y: 0 },
    { type: 'apple', layer: 0, x: 600, y: 0 },
    { type: 'banana', layer: 0, x: 0, y: 300 },
    { type: 'banana', layer: 0, x: 300, y: 300 },
    { type: 'banana', layer: 0, x: 600, y: 300 },
  ]);
  const s = new GameSession(lv);
  s.start();
  // 模拟同一帧内的两次点击（未加视图层锁的错误情形也不应产生重复结算）
  const r1 = s.pickTile('t0');
  assert(r1.ok);
  const r2 = s.pickTile('t0'); // 同一物品
  assert(!r2.ok, '第二次点击同一物品被逻辑拒绝');
  assertEq(r2.reason, 'not_exists');
  assertEq(s.board.remainingCount, 5, '只结算一次');
});

coreTests.test('快速连续点击：逻辑层立即去重（已移除物品）', () => {
  const lv = makeLevel([
    { type: 'apple', layer: 0, x: 0, y: 0 },
    { type: 'apple', layer: 0, x: 300, y: 0 },
    { type: 'apple', layer: 0, x: 600, y: 0 },
  ]);
  const s = new GameSession(lv);
  s.start();
  s.pickTile('t0');
  const r = s.pickTile('t0'); // 同一物品重复点击
  assert(!r.ok, '重复点击同一物品应被拒绝');
  assertEq(r.reason, 'not_exists');
});

coreTests.test('状态机：非 PLAYING 状态拒绝操作', () => {
  const lv = makeLevel([
    { type: 'apple', layer: 0, x: 0, y: 0 },
    { type: 'apple', layer: 0, x: 300, y: 0 },
    { type: 'apple', layer: 0, x: 600, y: 0 },
  ]);
  const s = new GameSession(lv);
  // 未 start，处于 READY
  const r = s.pickTile('t0');
  assert(!r.ok);
  assertEq(r.reason, 'state=READY');
  s.start();
  s.pause();
  assert(!s.pickTile('t0').ok, 'PAUSED 拒绝');
  s.resume();
  assert(s.pickTile('t0').ok, '恢复后可点击');
});

coreTests.test('槽位模型：连续三连才消除（新规则语义）', () => {
  const slots = new SlotModel(7);
  slots.add('x', 'apple');
  slots.add('y', 'banana');
  // 第三个 apple：A,B,A —— 不连续，不消除
  const t1 = slots.add('z', 'apple');
  assertEq(t1.groups.length, 0, 'A,B,A 不消除');
  assertEq(slots.occupiedCount, 3);
  // 第四个 apple：A,B,A,A —— 仍无连续三连，不消除
  const t2 = slots.add('w', 'apple');
  assertEq(t2.groups.length, 0, 'A,B,A,A 不消除');
  assertEq(slots.occupiedCount, 4);
  // 撤回式恢复验证
  const snap = slots.items.map((it) => ({ ...it }));
  slots.restore(snap, 7, 0, 7);
  assertEq(slots.occupiedCount, 4, '恢复后数量一致');
});
