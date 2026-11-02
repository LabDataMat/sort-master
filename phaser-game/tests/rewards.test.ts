import { describe, expect, it } from 'vitest';
import { CollectionManager } from '../src/core/CollectionManager';
import { COLLECTIBLES } from '../src/core/collectibles';
import { REWARD } from '../src/core/RewardConfig';
import { RewardService } from '../src/core/RewardService';
import { SaveManager, type StorageLike } from '../src/core/SaveManager';
import type { LevelData, LevelTier } from '../src/core/types';

function memStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

function makeLevel(id: number, tier: LevelTier, score: number): LevelData {
  return {
    levelId: id,
    slotCapacity: 7,
    difficulty: score,
    difficultyScore: score,
    tier,
    difficultyLabel: '',
    itemCount: 0,
    layerCount: 1,
    itemTypes: [],
    boosterLimit: 3,
    items: [],
    solution: [],
  };
}

function setup(): { save: SaveManager; rewards: RewardService; collection: CollectionManager } {
  const save = new SaveManager(memStorage());
  const collection = new CollectionManager(save);
  const rewards = new RewardService(save, collection);
  return { save, rewards, collection };
}

describe('关卡奖励', () => {
  it('第 1 关首通必得第一件收藏品（food_01）', () => {
    const { save, rewards } = setup();
    const r = rewards.grantClear(makeLevel(1, 'tutorial', 1), true, 100, () => 0.99);

    expect(r.collectible?.id).toBe('food_01');
    expect(r.isNewCollectible).toBe(true);
    expect(save.hasCollectible('food_01')).toBe(true);
  });

  it('首通奖励包含首通加成与基础金币', () => {
    const { save, rewards } = setup();
    const r = rewards.grantClear(makeLevel(3, 'normal', 6), true, 100, () => 0.99);

    expect(r.firstClearBonus).toBe(REWARD.coins.firstClear);
    expect(r.baseCoins).toBe(REWARD.coins.normalClear);
    expect(r.totalCoins).toBe(REWARD.coins.normalClear + REWARD.coins.firstClear);
    expect(save.data.coins).toBe(r.totalCoins);
  });

  it('高难关卡基础金币更高', () => {
    const { rewards } = setup();
    const r = rewards.grantClear(makeLevel(2, 'hard', 8.8), true, 100, () => 0.99);
    expect(r.baseCoins).toBe(REWARD.coins.hardClear);
  });

  it('特殊挑战基础金币最高', () => {
    const { rewards } = setup();
    const r = rewards.grantClear(makeLevel(26, 'challenge', 9), false, 100, () => 0.99);
    expect(r.baseCoins).toBe(REWARD.coins.challengeClear);
  });

  it('连续通关获得递增加成', () => {
    const { save, rewards } = setup();

    const r1 = rewards.grantClear(makeLevel(1, 'tutorial', 1), true, 100, () => 0.99);
    expect(r1.streakBonus).toBe(0);

    const r2 = rewards.grantClear(makeLevel(2, 'hard', 8.8), true, 100, () => 0.99);
    expect(r2.streak).toBe(2);
    expect(r2.streakBonus).toBe(REWARD.coins.streakStep);

    expect(save.data.streak).toBe(2);
    expect(save.data.bestStreak).toBe(2);
  });

  it('失败会中断连胜', () => {
    const { save, rewards } = setup();
    rewards.grantClear(makeLevel(1, 'tutorial', 1), true, 100, () => 0.99);
    expect(save.data.streak).toBe(1);

    rewards.recordDefeat();
    expect(save.data.streak).toBe(0);
  });

  it('挑战关可掉落史诗或传说', () => {
    const { rewards } = setup();
    const r = rewards.grantClear(makeLevel(26, 'challenge', 9), true, 100, () => 0);
    expect(r.collectible).toBeDefined();
    expect(['epic', 'legendary']).toContain(r.collectible?.rarity);
  });

  it('重复收藏折算金币，不重复计入图鉴', () => {
    const { save, rewards } = setup();

    // 先集齐全部普通收藏
    for (const c of COLLECTIBLES.filter((x) => x.rarity === 'common')) {
      save.addCollectible(c.id);
    }
    const countBefore = save.data.collection.length;
    const coinsBefore = save.data.coins;

    // rng=0 必定触发普通掉落；普通池已满 → 重复折算
    const r = rewards.grantClear(makeLevel(3, 'normal', 6), false, 100, () => 0);
    expect(r.duplicateCoins).toBe(REWARD.coins.duplicate.common);
    expect(save.data.collection.length).toBe(countBefore);
    expect(save.data.coins).toBeGreaterThan(coinsBefore);
  });

  it('金币与连胜在刷新后保留', () => {
    const storage = memStorage();
    const save = new SaveManager(storage);
    const collection = new CollectionManager(save);
    const rewards = new RewardService(save, collection);

    rewards.grantClear(makeLevel(1, 'tutorial', 1), true, 100, () => 0.99);
    const coins = save.data.coins;

    const reloaded = new SaveManager(storage);
    expect(reloaded.data.coins).toBe(coins);
    expect(reloaded.data.streak).toBe(1);
    expect(reloaded.hasCollectible('food_01')).toBe(true);
  });
});
