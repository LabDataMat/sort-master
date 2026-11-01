import { describe, expect, it } from 'vitest';
import { resolveMatches } from '../src/core/MatchSystem';
import { SlotManager } from '../src/core/SlotManager';
import type { SlotItem } from '../src/core/types';

const items = (...ids: string[]): SlotItem[] => ids.map((id, i) => ({ instanceId: `i${i}`, itemId: id }));
const idsOf = (list: readonly SlotItem[]): string[] => list.map((x) => x.itemId);

describe('核心消除规则', () => {
  it('1. 三个相同且相邻 → 消除', () => {
    const r = resolveMatches(items('A', 'A', 'A'));
    expect(r.groups).toHaveLength(1);
    expect(r.remaining).toHaveLength(0);
  });

  it('2. 三个相同但不相邻 → 消除', () => {
    const r = resolveMatches(items('A', 'B', 'A', 'C', 'A'));
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].itemId).toBe('A');
    expect(idsOf(r.remaining)).toEqual(['B', 'C']);
  });

  it('3. 两个相同 → 不消除', () => {
    const r = resolveMatches(items('A', 'B', 'A'));
    expect(r.groups).toHaveLength(0);
    expect(r.remaining).toHaveLength(3);
  });

  it('4. 四个相同 → 消除三个，剩余一个', () => {
    const r = resolveMatches(items('A', 'A', 'A', 'A'));
    expect(r.groups).toHaveLength(1);
    expect(r.remaining).toHaveLength(1);
    expect(r.remaining[0].itemId).toBe('A');
  });

  it('5. 六个相同 → 两组三消', () => {
    const r = resolveMatches(items('A', 'A', 'A', 'A', 'A', 'A'));
    expect(r.groups).toHaveLength(2);
    expect(r.remaining).toHaveLength(0);
  });

  it('6. 不同类型物品不误消除', () => {
    const r = resolveMatches(items('A', 'B', 'C'));
    expect(r.groups).toHaveLength(0);
    expect(r.remaining).toHaveLength(3);
  });

  it('7. 消除后其余物品保持相对顺序', () => {
    const r = resolveMatches(items('B', 'A', 'C', 'A', 'D', 'A', 'E'));
    expect(r.groups).toHaveLength(1);
    expect(idsOf(r.remaining)).toEqual(['B', 'C', 'D', 'E']);
  });

  it('8. 两种类型同时满足 → 各消一组', () => {
    const r = resolveMatches(items('A', 'A', 'A', 'B', 'B', 'B'));
    expect(r.groups).toHaveLength(2);
    expect(r.remaining).toHaveLength(0);
  });

  it('9. 同一物品不会被重复消除', () => {
    const r = resolveMatches(items('A', 'A', 'A', 'A', 'A', 'A', 'A'));
    const seen = new Set<string>();
    for (const g of r.groups) {
      for (const it of g.items) {
        expect(seen.has(it.instanceId)).toBe(false);
        seen.add(it.instanceId);
      }
    }
    expect(r.groups).toHaveLength(2);
    expect(r.remaining).toHaveLength(1);
  });
});

describe('收纳槽', () => {
  it('10. 消除后正确释放槽位', () => {
    const slot = new SlotManager(7);
    slot.add('1', 'A');
    slot.add('2', 'B');
    slot.add('3', 'A');
    slot.add('4', 'C');
    slot.add('5', 'A');

    expect(slot.count).toBe(2);
    expect(slot.freeSlots).toBe(5);
  });

  it('11. 槽满且无匹配 → 拒绝插入', () => {
    const slot = new SlotManager(7);
    ['A', 'A', 'B', 'B', 'C', 'C', 'D'].forEach((t, i) => slot.add(String(i + 1), t));
    expect(slot.isFull).toBe(true);

    const res = slot.add('8', 'E');
    expect(res.inserted).toBe(false);
    expect(res.reason).toBe('full');
  });

  it('12. 槽满但刚好可消除 → 不判负且释放槽位', () => {
    const slot = new SlotManager(7);
    ['A', 'A', 'B', 'B', 'C', 'C'].forEach((t, i) => slot.add(String(i + 1), t));

    const res = slot.add('7', 'A');
    expect(res.inserted).toBe(true);
    expect(res.groups).toHaveLength(1);
    expect(res.fullAfterInsert).toBe(false);
    expect(slot.count).toBe(4);
  });

  it('13. 快照与恢复保持独立（撤回基础）', () => {
    const slot = new SlotManager(7);
    slot.add('1', 'A');
    slot.add('2', 'B');
    const snap = slot.snapshot();
    slot.add('3', 'C');

    slot.restore(snap);
    expect(slot.count).toBe(2);
    expect(idsOf(slot.all)).toEqual(['A', 'B']);
  });
});
