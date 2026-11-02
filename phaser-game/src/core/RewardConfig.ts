import type { Rarity } from './collectibles';

export type BoosterKind = 'undo' | 'hint' | 'shuffle';

export interface SkinDef {
  id: string;
  name: string;
  price: number;
  desc: string;
  /** 棋盘桌面染色（与白色相乘） */
  tint: number;
}

/**
 * 奖励与经济的唯一配置源。
 * 所有数值集中在此，游戏逻辑不得散落硬编码。
 */
export const REWARD = {
  coins: {
    /** 首次通关额外奖励 */
    firstClear: 50,
    /** 普通关卡通关 */
    normalClear: 10,
    /** 高难关卡通关 */
    hardClear: 30,
    /** 特殊挑战通关 */
    challengeClear: 60,
    /** 连续通关每层加成 */
    streakStep: 5,
    /** 连续通关加成上限 */
    streakMax: 25,
    /** 重复收藏品折算金币 */
    duplicate: {
      common: 20,
      rare: 50,
      epic: 120,
      legendary: 300,
    } as Record<Rarity, number>,
    /** 失败安慰（不发放，仅保留配置位） */
    defeat: 0,
  },

  /** 各稀有度掉落概率 */
  drop: {
    common: 0.5,
    rare: 0.65,
    epic: 0.4,
    legendary: 0.12,
  } as Record<Rarity, number>,

  shop: {
    boosters: {
      undo: 60,
      hint: 80,
      shuffle: 100,
    } as Record<BoosterKind, number>,
    skins: [
      { id: 'default', name: '原木', price: 0, desc: '默认的温暖木纹桌面', tint: 0xffffff },
      { id: 'warm', name: '暖阳', price: 300, desc: '偏暖的橘调桌面', tint: 0xffd9a8 },
      { id: 'night', name: '夜色', price: 500, desc: '深蓝夜间桌面', tint: 0x8fa3c8 },
    ] as SkinDef[],
  },

  /** 难度分档阈值 */
  difficulty: {
    hard: 7,
    challenge: 8.5,
  },
} as const;

export function skinById(id: string): SkinDef {
  return REWARD.shop.skins.find((s) => s.id === id) ?? REWARD.shop.skins[0];
}
