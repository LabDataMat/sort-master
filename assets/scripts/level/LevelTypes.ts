import type { GameState, AdPlacement, BoosterType } from '../core/GameConfig';
import type { SlotItem } from '../gameplay/logic/MatchManager';

/** 单个物品数据模型（纯逻辑）。 */
export interface TileData {
  /** 唯一 ID */
  id: string;
  /** 物品类型（如 apple） */
  type: string;
  /** 所属层级（0 最底层） */
  layer: number;
  /** 坐标与尺寸（设计分辨率像素，中心点语义由使用方约定，此处为左上角矩形） */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 冰冻层数：>0 时不可点击，每次三消成功全体 -1 */
  frozen: number;
  /** 是否被锁定 */
  locked: boolean;
  /** 锁定物品在完成 N 次三消后解锁 */
  unlockAfterMatches: number;
  /** 状态：idle 场上 / removed 已消除 */
  status: 'idle' | 'removed';
}

/** 关卡内单个物品的静态布局描述 */
export interface TilePlacement {
  id: string;
  type: string;
  layer: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 关卡配置（每关一个独立 JSON 文件） */
export interface LevelData {
  levelId: number;
  name: string;
  difficulty: number;
  itemTypes: string[];
  itemCount: number;
  layerCount: number;
  itemPositions: TilePlacement[];
  /** 显式遮挡关系：upper 遮挡 lower。渲染顺序不作为遮挡依据。
   * 集中堆叠关卡可能为空：此时由 occlusion.derivedFromGeometry 标记，
   * 运行时由几何 + z 序推导（OcclusionGraph 每次重建），关系完全确定。 */
  blockerRelations: { upper: string; lower: string }[];
  /** 遮挡关系推导模式（集中堆叠关卡使用，避免 JSON 体积膨胀） */
  occlusion?: { derivedFromGeometry: boolean; edgeCount: number };
  obstacles: {
    frozenTileIds: string[];
    lockedTileIds: string[];
    /** 锁定解锁所需三消次数 */
    lockedUnlockAfterMatches: number;
  };
  /** 特殊目标：收集指定类型在通关时给额外奖励金币 */
  specialObjectives: {
    bonusTypes: { typeId: string; count: number }[];
    moveLimit?: number;
  };
  difficultyLabel: string;
  /** 有限道具：>0 时本关道具使用总次数上限（高难度关卡） */
  boosterLimit?: number;
  /** 可解性验证结果：未通过验证的关卡不能标记 verified=true */
  solutionValidation: {
    verified: boolean;
    method: string;
    attempts: number;
    verifiedAt: string;
    seed?: number;
    /** 构造式生成的通关拾取序列（可被回放验证） */
    solution?: string[];
  };
}

/** 撤回快照 */
export interface GameSnapshot {
  tiles: { id: string; status: TileData['status']; frozen: number; locked: boolean }[];
  slots: SlotItem[];
  capacity: number;
  combo: number;
  extraMovesLeft: number;
}

/** 事件表 */
export interface GameEvents {
  'state:changed': { from: GameState; to: GameState };
  'tile:picked': { tileId: string; type: string; slotIndex: number };
  'tile:rejected': { tileId: string; reason: string };
  /** 每个连续三连消除组发一次（级联顺序）；groupIndex 为该次拾取内的组序号 */
  'match:cleared': { type: string; slotItems: { tileId: string; type: string }[]; combo: number; groupIndex: number };
  'board:changed': Record<string, never>;
  'game:victory': { bonusCoins: number; stars: number };
  'game:failed': Record<string, never>;
  'slot:full': Record<string, never>;
  'slot:tight': { occupied: number; capacity: number };
  'booster:used': { type: BoosterType };
}

/** 拾取结果 */
export interface PickResult {
  ok: boolean;
  reason?: string;
  willMatch?: boolean;
}
