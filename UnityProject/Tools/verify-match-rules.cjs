/**
 * 核心消除规则的「等价实现」验证脚本。
 *
 * 说明（务必如实理解）：
 * - 本脚本用 Node 复刻 MatchSystem.Resolve / SlotManager.Add 的同一算法，
 *   目的是在当前没有 Unity / .NET 的环境里，真实执行并验证规则逻辑。
 * - 它不能替代 Unity EditMode 测试；C# 测试需在 Unity 中运行（见 Assets/Tests/EditMode）。
 * - 两者算法逐行对应，若本脚本全部通过，说明规则设计成立；C# 实现仍需 Unity 编译验证。
 */
const MATCH = 3;

function resolve(items) {
  let remaining = items.slice();
  const groups = [];
  for (;;) {
    const order = [];
    const buckets = new Map();
    for (const it of remaining) {
      if (!buckets.has(it.itemId)) {
        buckets.set(it.itemId, []);
        order.push(it.itemId);
      }
      buckets.get(it.itemId).push(it);
    }
    let hit = null;
    for (const id of order) {
      if (buckets.get(id).length >= MATCH) { hit = id; break; }
    }
    if (hit === null) break;
    const trio = buckets.get(hit).slice(0, MATCH);
    groups.push({ itemId: hit, items: trio });
    const remove = new Set(trio);
    remaining = remaining.filter((x) => !remove.has(x));
  }
  return { groups, remaining };
}

class SlotManager {
  constructor(capacity) {
    this.capacity = Math.max(1, capacity);
    this.items = [];
  }
  get count() { return this.items.length; }
  get isFull() { return this.items.length >= this.capacity; }
  get freeSlots() { return this.capacity - this.items.length; }
  add(instanceId, itemId) {
    if (this.isFull) return { inserted: false, reason: 'full', groups: [], fullAfterInsert: true };
    this.items.push({ instanceId, itemId });
    const r = resolve(this.items);
    this.items = r.remaining;
    return { inserted: true, groups: r.groups, fullAfterInsert: this.isFull };
  }
}

const items = (...ids) => ids.map((id, i) => ({ instanceId: 'i' + i, itemId: id }));
const idsOf = (list) => list.map((x) => x.itemId);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  [' + detail + ']' : '')); }
}

console.log('=== 核心规则等价验证（10 个必测用例）===');

// 1
{
  const r = resolve(items('A', 'A', 'A'));
  check('1 三个相同且相邻 → 消除', r.groups.length === 1 && r.remaining.length === 0);
}
// 2
{
  const r = resolve(items('A', 'B', 'A', 'C', 'A'));
  check('2 三个相同但不相邻 → 消除', r.groups.length === 1 && r.groups[0].itemId === 'A' && eq(idsOf(r.remaining), ['B', 'C']),
    JSON.stringify(idsOf(r.remaining)));
}
// 3
{
  const r = resolve(items('A', 'B', 'A'));
  check('3 两个相同 → 不消除', r.groups.length === 0 && r.remaining.length === 3);
}
// 4
{
  const r = resolve(items('A', 'A', 'A', 'A'));
  check('4 四个相同 → 消除三个剩一个', r.groups.length === 1 && r.remaining.length === 1 && r.remaining[0].itemId === 'A');
}
// 5
{
  const r = resolve(items('A', 'A', 'A', 'A', 'A', 'A'));
  check('5 六个相同 → 两组三消', r.groups.length === 2 && r.remaining.length === 0);
}
// 6
{
  const r = resolve(items('A', 'B', 'C'));
  check('6 三种不同 → 不消除', r.groups.length === 0 && r.remaining.length === 3);
}
// 7
{
  const r = resolve(items('B', 'A', 'C', 'A', 'D', 'A', 'E'));
  check('7 消除后其余顺序保持', r.groups.length === 1 && eq(idsOf(r.remaining), ['B', 'C', 'D', 'E']),
    JSON.stringify(idsOf(r.remaining)));
}
// 8
{
  const s = new SlotManager(7);
  ['A', 'A', 'B', 'B', 'C', 'C', 'D'].forEach((t, i) => s.add(String(i + 1), t));
  const res = s.add('8', 'E');
  check('8 槽满且无匹配 → 拒绝插入', s.isFull && res.inserted === false);
}
// 9
{
  const s = new SlotManager(7);
  ['A', 'A', 'B', 'B', 'C', 'C'].forEach((t, i) => s.add(String(i + 1), t));
  const res = s.add('7', 'A');
  check('9 槽满但刚好可消除 → 不判负', res.inserted && res.groups.length === 1 && res.fullAfterInsert === false && s.count === 4,
    'count=' + s.count);
}
// 10
{
  const s = new SlotManager(7);
  ['A', 'B', 'A', 'C', 'A'].forEach((t, i) => s.add(String(i + 1), t));
  check('10 消除后释放槽位', s.count === 2 && s.freeSlots === 5, 'count=' + s.count + ' free=' + s.freeSlots);
}

// 附加
{
  const r = resolve(items('A', 'A', 'A', 'B', 'B', 'B'));
  check('附加 两种类型同时三消 → 各消一组', r.groups.length === 2 && r.remaining.length === 0);
}
{
  const r = resolve(items('A', 'A', 'A', 'A', 'A', 'A', 'A'));
  const seen = new Set();
  let dup = false;
  for (const g of r.groups) for (const it of g.items) { if (seen.has(it.instanceId)) dup = true; seen.add(it.instanceId); }
  check('附加 同一物品不被重复消除', !dup && r.groups.length === 2 && r.remaining.length === 1);
}

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);
