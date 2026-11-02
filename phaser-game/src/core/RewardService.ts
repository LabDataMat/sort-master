import { COLLECTIBLE_BY_ID, type Collectible, type SeriesId } from './collectibles';
import { CollectionManager } from './CollectionManager';
import { REWARD } from './RewardConfig';
import type { SaveManager } from './SaveManager';
import type { LevelData } from './types';

export interface LevelReward {
  /** 基础通关金币（按难度档位） */
  baseCoins: number;
  /** 首通额外奖励 */
  firstClearBonus: number;
  /** 连胜加成 */
  streakBonus: number;
  /** 重复收藏折算金币 */
  duplicateCoins: number;
  /** 本次合计发放金币 */
  totalCoins: number;

  collectible?: Collectible;
  isNewCollectible: boolean;
  seriesCompleted?: SeriesId;

  streak: number;
}

/**
 * 奖励系统：通关金币、收藏掉落、连胜。
 * 数值全部来自 RewardConfig，逻辑与渲染解耦。
 */
export class RewardService {
  constructor(
    private readonly save: SaveManager,
    private readonly collection: CollectionManager,
  ) {}

  /**
   * 结算一次通关。
   * @param level 关卡数据（使用 tier / difficultyScore）
   * @param isFirstClear 是否首次通关该关
   */
  grantClear(
    level: LevelData,
    isFirstClear: boolean,
    maxLevel: number,
    rng: () => number = Math.random,
  ): LevelReward {
    const tier = level.tier ?? 'normal';

    // 档位由关卡设计决定，不按分数二次推断，避免高难关被误判为特殊挑战
    let baseCoins: number = REWARD.coins.normalClear;
    if (tier === 'challenge') baseCoins = REWARD.coins.challengeClear;
    else if (tier === 'hard') baseCoins = REWARD.coins.hardClear;

    const firstClearBonus = isFirstClear ? REWARD.coins.firstClear : 0;
    const streak = this.save.data.streak + 1;
    const streakBonus = Math.min(REWARD.coins.streakMax, Math.max(0, streak - 1) * REWARD.coins.streakStep);

    let collectible: Collectible | undefined;
    let isNewCollectible = false;
    let duplicateCoins = 0;
    let seriesCompleted: SeriesId | undefined;

    const drop = this.rollDrop(level, isFirstClear, rng);
    if (drop) {
      const res = this.collection.unlock(drop.id);
      if (res) {
        collectible = res.collectible;
        isNewCollectible = res.isNew;
        duplicateCoins = res.duplicateCoins;
        seriesCompleted = res.seriesCompleted;
      }
    }

    const totalCoins = baseCoins + firstClearBonus + streakBonus + duplicateCoins;
    this.save.completeLevel(level.levelId, totalCoins, maxLevel);
    this.save.recordClear();

    return {
      baseCoins,
      firstClearBonus,
      streakBonus,
      duplicateCoins,
      totalCoins,
      collectible,
      isNewCollectible,
      seriesCompleted,
      streak,
    };
  }

  /** 失败：中断连胜 */
  recordDefeat(): void {
    this.save.resetStreak();
  }

  /**
   * 掉落规则：
   * - 第 1 关首次通关：必定获得第一件收藏品
   * - 挑战关：史诗为主，极低概率传说
   * - 高难关（难度 ≥ 7）：稀有
   * - 普通关：普通
   */
  private rollDrop(level: LevelData, isFirstClear: boolean, rng: () => number): Collectible | null {
    if (level.levelId === 1 && isFirstClear) {
      return COLLECTIBLE_BY_ID.get('food_01') ?? null;
    }

    const tier = level.tier ?? 'normal';

    if (tier === 'challenge') {
      if (rng() < REWARD.drop.legendary) return this.collection.pickFromRarity('legendary', rng);
      if (rng() < REWARD.drop.epic) return this.collection.pickFromRarity('epic', rng);
      if (rng() < REWARD.drop.rare) return this.collection.pickFromRarity('rare', rng);
      return null;
    }

    if (tier === 'hard') {
      if (rng() < REWARD.drop.rare) return this.collection.pickFromRarity('rare', rng);
      if (rng() < REWARD.drop.common) return this.collection.pickFromRarity('common', rng);
      return null;
    }

    if (rng() < REWARD.drop.common) return this.collection.pickFromRarity('common', rng);
    return null;
  }
}
