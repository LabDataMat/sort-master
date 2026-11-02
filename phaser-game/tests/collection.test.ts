import { describe, expect, it } from 'vitest';
import { CollectionManager } from '../src/core/CollectionManager';
import { COLLECTIBLES, collectiblesOfSeries, SERIES } from '../src/core/collectibles';
import { REWARD } from '../src/core/RewardConfig';
import { SaveManager, type StorageLike } from '../src/core/SaveManager';

function memStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

describe('收藏品目录', () => {
  it('共 48 件，4 系列各 12 件', () => {
    expect(COLLECTIBLES).toHaveLength(48);
    for (const s of SERIES) {
      expect(collectiblesOfSeries(s.id)).toHaveLength(12);
    }
  });

  it('每系列稀有度分布为 6 普通 / 3 稀有 / 2 史诗 / 1 传说', () => {
    for (const s of SERIES) {
      const list = collectiblesOfSeries(s.id);
      const count = (r: string): number => list.filter((c) => c.rarity === r).length;
      expect(count('common')).toBe(6);
      expect(count('rare')).toBe(3);
      expect(count('epic')).toBe(2);
      expect(count('legendary')).toBe(1);
    }
  });

  it('ID 唯一且字段完整', () => {
    const ids = new Set(COLLECTIBLES.map((c) => c.id));
    expect(ids.size).toBe(COLLECTIBLES.length);
    for (const c of COLLECTIBLES) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.desc.length).toBeGreaterThan(0);
      expect(c.condition.length).toBeGreaterThan(0);
      expect(c.image).toMatch(/^(dessert|fruit|house|pet)_\d{2}$/);
    }
  });
});

describe('收藏解锁与去重', () => {
  it('首次解锁计入图鉴', () => {
    const save = new SaveManager(memStorage());
    const cm = new CollectionManager(save);
    const res = cm.unlock('food_01');

    expect(res?.isNew).toBe(true);
    expect(res?.duplicateCoins).toBe(0);
    expect(save.hasCollectible('food_01')).toBe(true);
    expect(save.data.collection).toHaveLength(1);
  });

  it('重复解锁不重复计入，折算为金币', () => {
    const save = new SaveManager(memStorage());
    const cm = new CollectionManager(save);

    cm.unlock('food_01');
    const before = save.data.collection.length;
    const coinsBefore = save.data.coins;

    const again = cm.unlock('food_01');
    expect(again?.isNew).toBe(false);
    expect(again?.duplicateCoins).toBe(REWARD.coins.duplicate.common);
    expect(save.data.collection.length).toBe(before);
    expect(save.data.coins).toBe(coinsBefore + REWARD.coins.duplicate.common);
  });

  it('系列进度统计正确', () => {
    const save = new SaveManager(memStorage());
    const cm = new CollectionManager(save);
    cm.unlock('food_01');
    cm.unlock('food_02');

    const p = cm.progress('food');
    expect(p.owned).toBe(2);
    expect(p.total).toBe(12);
    expect(p.complete).toBe(false);
  });

  it('集齐系列后可领取奖励，且只能领取一次', () => {
    const save = new SaveManager(memStorage());
    const cm = new CollectionManager(save);

    for (const c of collectiblesOfSeries('food')) cm.unlock(c.id);
    expect(cm.progress('food').complete).toBe(true);

    const coinsBefore = save.data.coins;
    const gained = cm.claimSeries('food');
    expect(gained).toBe(200);
    expect(save.data.coins).toBe(coinsBefore + 200);
    expect(cm.progress('food').claimed).toBe(true);

    expect(cm.claimSeries('food')).toBe(0);
  });

  it('未集齐时不能领取', () => {
    const save = new SaveManager(memStorage());
    const cm = new CollectionManager(save);
    cm.unlock('food_01');
    expect(cm.claimSeries('food')).toBe(0);
  });

  it('刷新后收藏进度保留', () => {
    const storage = memStorage();
    const a = new SaveManager(storage);
    new CollectionManager(a).unlock('animal_01');

    const b = new SaveManager(storage);
    expect(b.hasCollectible('animal_01')).toBe(true);
    expect(b.data.collection).toHaveLength(1);
  });

  it('存档中的重复 id 会被去重', () => {
    const storage = memStorage();
    storage.setItem(
      'sort_master_phaser_v1',
      JSON.stringify({ version: 2, collection: ['food_01', 'food_01', 'food_02'] }),
    );
    const save = new SaveManager(storage);
    expect(save.data.collection).toEqual(['food_01', 'food_02']);
  });
});
