/** 关卡内单个物品（与 JSON 字段一致） */
export interface LevelItem {
  instanceId: string;
  itemId: string;
  layer: number;
  x: number;
  y: number;
  w: number;
  h: number;
  frozen: number;
  locked: boolean;
  unlockAfterMatches: number;
  /** 隐藏物品：初始不可见，累计消除达到阈值后显现 */
  hidden?: boolean;
  revealAfterMatches?: number;
}

/** 关卡难度档位 */
export type LevelTier = 'tutorial' | 'normal' | 'hard' | 'challenge';

/** 关卡数据 */
export interface LevelData {
  levelId: number;
  slotCapacity: number;
  difficulty: number;
  /** 计算得出的难度评分（1~10） */
  difficultyScore?: number;
  /** 难度档位 */
  tier?: LevelTier;
  difficultyLabel: string;
  itemCount: number;
  layerCount: number;
  itemTypes: string[];
  boosterLimit: number;
  items: LevelItem[];
  /** 已验证的通关拾取序列，用于运行时可解性复核 */
  solution: string[];
}

/** 收纳槽内物品 */
export interface SlotItem {
  instanceId: string;
  itemId: string;
}

/** 一组被消除的物品 */
export interface MatchGroup {
  itemId: string;
  items: SlotItem[];
}

export type SessionState = 'playing' | 'victory' | 'lose';

export interface PickOutcome {
  ok: boolean;
  reason?: string;
  insertIndex: number;
  groups: MatchGroup[];
  willMatch: boolean;
}
