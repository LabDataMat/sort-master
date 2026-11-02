/** 设计分辨率 */
export const W = 750;
export const H = 1334;

/** 中文字体栈：使用系统字体，避免打包数 MB 字体文件 */
export const FONT = '"Noto Sans SC","PingFang SC","Microsoft YaHei","Hiragino Sans GB",system-ui,sans-serif';

export const COLORS = {
  cream: 0xfbf5ea,
  panel: 0xfffaf2,
  brown: 0x523625,
  brownSoft: 0x7b6050,
  orange: 0xf49c3f,
  orangeDeep: 0xe07b28,
  green: 0x5cb473,
  red: 0xe35a52,
  gold: 0xfac74a,
  white: 0xffffff,
  blocked: 0x9a9a9a,
} as const;

export const HEX = {
  brown: '#523625',
  brownSoft: '#7b6050',
  white: '#ffffff',
  gold: '#fac74a',
  orange: '#f49c3f',
} as const;

/** 布局分区 */
export const LAYOUT = {
  headerH: 120,
  boardTop: 150,
  boardH: 896,
  trayY: 1120,
  trayH: 136,
  boosterY: 1250,
  slotCell: 88,
  slotGap: 6,
} as const;

/** 物品图片资源名（30 种） */
export const ITEM_IDS = [
  'apple', 'ball', 'banana', 'bear', 'blocks', 'book', 'cake', 'car', 'cherry', 'clock',
  'cookie', 'cup', 'donut', 'duck', 'eraser', 'grape', 'headphones', 'icecream', 'key', 'macaron',
  'orange', 'pencil', 'penholder', 'pudding', 'robot', 'ruler', 'scissors', 'soap', 'strawberry', 'toothbrush',
] as const;

/** 启动时预加载的 UI 贴图（按需裁剪，不加载收藏品等无关资源） */
export const UI_NAMES = [
  'bg_home', 'bg_game', 'card_bg', 'card_locked', 'coin', 'frame_rare',
  'icon_star', 'icon_undo', 'icon_shuffle', 'lock_overlay', 'logo',
  'panel', 'particle_circle', 'particle_star', 'slot_cell', 'table', 'tray',
  'shadow_soft', 'frost_overlay', 'level_badge', 'icon_settings',
  'icon_book', 'icon_daily', 'icon_theme', 'icon_fragment',
] as const;

/** 音频（2 BGM + 9 SFX） */
export const AUDIO_NAMES = [
  'bgm_home', 'bgm_game',
  'click', 'match', 'combo', 'move', 'win', 'lose', 'coin', 'booster', 'unlock',
] as const;

/** 收藏品图片（4 系列 × 12 件） */
export const COLLECT_FILES: string[] = ['dessert', 'fruit', 'house', 'pet'].flatMap((prefix) =>
  Array.from({ length: 12 }, (_, i) => `${prefix}_${String(i + 1).padStart(2, '0')}`),
);
