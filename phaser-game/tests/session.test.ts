import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/core/GameSession';
import type { LevelData, LevelItem } from '../src/core/types';

function makeItem(instanceId: string, itemId: string, i: number, layer = 0): LevelItem {
  return {
    instanceId,
    itemId,
    layer,
    x: (i % 6) * 110,
    y: Math.floor(i / 6) * 110,
    w: 100,
    h: 100,
    frozen: 0,
    locked: false,
    unlockAfterMatches: 0,
  };
}

function makeLevel(ids: string[], capacity = 7): LevelData {
  const items = ids.map((id, i) => makeItem(`t${i}`, id, i));
  return {
    levelId: 1,
    slotCapacity: capacity,
    difficulty: 1,
    difficultyLabel: 'test',
    itemCount: items.length,
    layerCount: 1,
    itemTypes: [...new Set(ids)],
    boosterLimit: 0,
    items,
    solution: items.map((x) => x.instanceId),
  };
}

describe('单局流程', () => {
  it('重复拾取同一物品被拒绝', () => {
    const s = new GameSession(makeLevel(['A', 'A', 'A', 'B', 'B', 'B']));
    expect(s.pick('t0').ok).toBe(true);
    const second = s.pick('t0');
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('missing');
  });

  it('全部拾取后判定胜利', () => {
    const level = makeLevel(['A', 'A', 'A', 'B', 'B', 'B']);
    const s = new GameSession(level);
    for (const id of level.solution) expect(s.pick(id).ok).toBe(true);
    expect(s.state).toBe('victory');
    expect(s.board.remaining).toBe(0);
  });

  it('被遮挡物品不可点击，移除上层后解锁', () => {
    const level: LevelData = {
      levelId: 1,
      slotCapacity: 7,
      difficulty: 1,
      difficultyLabel: 'test',
      itemCount: 2,
      layerCount: 2,
      itemTypes: ['A'],
      boosterLimit: 0,
      items: [
        { ...makeItem('lower', 'A', 0, 0), x: 100, y: 100 },
        { ...makeItem('upper', 'A', 1, 1), x: 120, y: 120 },
      ],
      solution: ['upper', 'lower'],
    };

    const s = new GameSession(level);
    const blocked = s.pick('lower');
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toBe('occluded');

    expect(s.pick('upper').ok).toBe(true);
    expect(s.pick('lower').ok).toBe(true);
  });

  it('收纳槽满且无匹配 → 判负', () => {
    const level = makeLevel(['A', 'A', 'B', 'B', 'C', 'C', 'D', 'E', 'F']);
    const s = new GameSession(level);
    for (let i = 0; i < 7; i++) {
      expect(s.pick(level.solution[i]).ok).toBe(true);
    }
    expect(s.slots.isFull).toBe(true);
    expect(s.state).toBe('lose');
  });

  it('收纳槽满但可消除 → 不判负', () => {
    const level = makeLevel(['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C']);
    const s = new GameSession(level);
    // A,A,B,B,C,C → 6 格
    for (const i of [0, 1, 3, 4, 6, 7]) expect(s.pick(level.solution[i]).ok).toBe(true);
    expect(s.slots.count).toBe(6);

    // 第 7 个补齐 A 三消
    const r = s.pick(level.solution[2]);
    expect(r.ok).toBe(true);
    expect(r.groups).toHaveLength(1);
    expect(s.state).toBe('playing');
    expect(s.slots.count).toBe(4);
  });

  it('撤回恢复棋盘与收纳槽', () => {
    const s = new GameSession(makeLevel(['A', 'A', 'A', 'B', 'B', 'B']));
    const before = s.board.remaining;

    expect(s.pick('t0').ok).toBe(true);
    expect(s.board.remaining).toBe(before - 1);
    expect(s.slots.count).toBe(1);

    expect(s.undo()).toBe(true);
    expect(s.board.remaining).toBe(before);
    expect(s.slots.count).toBe(0);
    expect(s.canUndo).toBe(false);
  });

  it('提示返回可点击物品', () => {
    const s = new GameSession(makeLevel(['A', 'A', 'A']));
    const id = s.hint();
    expect(id).not.toBeNull();
    expect(s.board.get(id as string)?.removed).toBe(false);
  });

  it('洗牌不改变物品总数与类型分布', () => {
    const level = makeLevel(['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C']);
    const s = new GameSession(level);
    const before = level.items.map((x) => x.itemId).sort().join(',');

    expect(s.shuffle(() => 0.42)).toBe(true);
    const after = s.board.tiles.map((x) => x.itemId).sort().join(',');
    expect(after).toBe(before);
  });
});
