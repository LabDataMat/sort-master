import { describe, expect, it } from 'vitest';
import { SaveManager, type StorageLike } from '../src/core/SaveManager';

function fakeStorage(): StorageLike & { dump: Map<string, string> } {
  const dump = new Map<string, string>();
  return {
    dump,
    getItem: (k) => (dump.has(k) ? (dump.get(k) as string) : null),
    setItem: (k, v) => {
      dump.set(k, v);
    },
  };
}

describe('存档', () => {
  it('通关后解锁下一关并累计金币', () => {
    const s = new SaveManager(fakeStorage());
    s.completeLevel(1, 40, 100);

    expect(s.isCompleted(1)).toBe(true);
    expect(s.isUnlocked(2)).toBe(true);
    expect(s.data.coins).toBe(40);
  });

  it('刷新后（新建实例）进度仍保留', () => {
    const storage = fakeStorage();
    const a = new SaveManager(storage);
    a.completeLevel(1, 30, 100);
    a.completeLevel(2, 30, 100);
    a.data.musicOn = false;
    a.save();

    const b = new SaveManager(storage);
    expect(b.isCompleted(1)).toBe(true);
    expect(b.isCompleted(2)).toBe(true);
    expect(b.data.maxUnlocked).toBe(3);
    expect(b.data.musicOn).toBe(false);
    expect(b.data.coins).toBe(60);
  });

  it('未解锁关卡不可进入', () => {
    const s = new SaveManager(fakeStorage());
    expect(s.isUnlocked(1)).toBe(true);
    expect(s.isUnlocked(2)).toBe(false);
  });

  it('道具次数扣减，耗尽后拒绝', () => {
    const s = new SaveManager(fakeStorage());
    expect(s.data.boosters.undo).toBe(3);
    expect(s.spendBooster('undo')).toBe(true);
    expect(s.boosterCount('undo')).toBe(2);

    s.data.boosters.hint = 0;
    expect(s.spendBooster('hint')).toBe(false);
  });

  it('存储不可用时静默降级，不影响游戏', () => {
    const s = new SaveManager({
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(s.isUnlocked(1)).toBe(true);
    expect(() => s.save()).not.toThrow();
  });
});
