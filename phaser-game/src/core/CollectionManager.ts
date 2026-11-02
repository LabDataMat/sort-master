import {
  COLLECTIBLES,
  COLLECTIBLE_BY_ID,
  SERIES,
  collectiblesOfRarity,
  collectiblesOfSeries,
  type Collectible,
  type Rarity,
  type SeriesId,
} from './collectibles';
import { REWARD } from './RewardConfig';
import type { SaveManager } from './SaveManager';

export interface UnlockResult {
  collectible: Collectible;
  isNew: boolean;
  duplicateCoins: number;
  /** 本次解锁后刚好集齐的系列 */
  seriesCompleted?: SeriesId;
}

export interface SeriesProgress {
  owned: number;
  total: number;
  complete: boolean;
  claimed: boolean;
}

/**
 * 收藏系统：解锁、去重、进度、系列奖励。
 * 只依赖 SaveManager，不依赖任何渲染层。
 */
export class CollectionManager {
  constructor(private readonly save: SaveManager) {}

  progress(series: SeriesId): SeriesProgress {
    const all = collectiblesOfSeries(series);
    const owned = all.filter((c) => this.save.hasCollectible(c.id)).length;
    return {
      owned,
      total: all.length,
      complete: owned === all.length,
      claimed: this.save.isSeriesClaimed(series),
    };
  }

  total(): { owned: number; total: number } {
    const owned = COLLECTIBLES.filter((c) => this.save.hasCollectible(c.id)).length;
    return { owned, total: COLLECTIBLES.length };
  }

  /** 领取系列奖励；未集齐或已领取返回 0 */
  claimSeries(series: SeriesId): number {
    const p = this.progress(series);
    if (!p.complete || p.claimed) return 0;
    const meta = SERIES.find((s) => s.id === series);
    if (!meta) return 0;
    return this.save.claimSeries(series, meta.rewardCoins) ? meta.rewardCoins : 0;
  }

  /**
   * 解锁一件收藏品。
   * 已拥有时不重复计入图鉴，而是折算金币。
   */
  unlock(id: string): UnlockResult | null {
    const c = COLLECTIBLE_BY_ID.get(id);
    if (!c) return null;

    if (this.save.hasCollectible(id)) {
      const coins = REWARD.coins.duplicate[c.rarity];
      this.save.addCoins(coins);
      return { collectible: c, isNew: false, duplicateCoins: coins };
    }

    this.save.addCollectible(id);
    const p = this.progress(c.series);
    return {
      collectible: c,
      isNew: true,
      duplicateCoins: 0,
      seriesCompleted: p.complete ? c.series : undefined,
    };
  }

  /** 从指定稀有度池中挑选：优先未拥有，全部拥有则返回已拥有（用于折算） */
  pickFromRarity(rarity: Rarity, rng: () => number = Math.random): Collectible | null {
    const pool = collectiblesOfRarity(rarity);
    if (pool.length === 0) return null;
    const locked = pool.filter((c) => !this.save.hasCollectible(c.id));
    const list = locked.length > 0 ? locked : pool;
    return list[Math.floor(rng() * list.length) % list.length];
  }
}
