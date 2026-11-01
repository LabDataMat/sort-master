/**
 * 游戏全局配置（纯逻辑，无引擎依赖，可在 Node 中测试）
 * 设计基准分辨率 750x1334，竖屏。
 */
export const DESIGN_WIDTH = 750;
export const DESIGN_HEIGHT = 1334;

/** 槽位基础容量（可通过道具临时 +1） */
export const BASE_SLOT_CAPACITY = 7;

/** 遮挡判定：两层物品矩形重叠比例超过该值视为产生遮挡 */
export const OCCLUSION_OVERLAP_RATIO = 0.35;

/** 物品基础尺寸 */
export const TILE_SIZE = 96;

/** 撤回历史长度上限 */
export const MAX_UNDO_HISTORY = 10;

/** 额外槽位默认持续次数 */
export const EXTRA_SLOT_MOVES = 15;

/** 视觉配色（暖奶油白 / 琥珀橙 / 鼠尾草绿 / 深灰正文） */
export const PALETTE = {
  background: '#FDF6EC',
  backgroundAlt: '#F7ECDC',
  primary: '#F59E42',
  primaryDark: '#E07B2A',
  sage: '#9CB98F',
  sageDark: '#7C9B70',
  blue: '#8FC7E8',
  pink: '#F4C2C2',
  yellow: '#F7DE8C',
  text: '#4A4036',
  textLight: '#8C8073',
  white: '#FFFFFF',
  red: '#E8705F',
  gold: '#F5C542',
};

/** 游戏状态机 */
export type GameState =
  | 'READY'
  | 'PLAYING'
  | 'MOVING'
  | 'MATCHING'
  | 'VICTORY'
  | 'FAILED'
  | 'PAUSED';

/** 广告位 */
export type AdPlacement = 'revive' | 'booster' | 'double_reward';

/** 道具类型 */
export type BoosterType = 'undo' | 'shuffle' | 'remove' | 'extra_slot';
