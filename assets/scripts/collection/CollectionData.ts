/**
 * 收藏品数据（纯逻辑）：4 大系列 × 12 件 = 48 件，4 种稀有度。
 * 每件收藏品均有独立原创素材：assets/resources/textures/collect/<id>.png
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type SeriesId = 'dessert' | 'pet' | 'fruit' | 'house';

export interface RarityMeta {
  id: Rarity;
  label: string;
  color: string;
  glow: string;
  /** 重复获得时转化的碎片数量 */
  fragmentValue: number;
  /** 碎片兑换所需数量 */
  exchangeCost: number;
}

export const RARITIES: Record<Rarity, RarityMeta> = {
  common: { id: 'common', label: '普通', color: '#9C9184', glow: 'rgba(156,145,132,0.5)', fragmentValue: 5, exchangeCost: 40 },
  rare: { id: 'rare', label: '稀有', color: '#4E9BD6', glow: 'rgba(78,155,214,0.55)', fragmentValue: 10, exchangeCost: 70 },
  epic: { id: 'epic', label: '史诗', color: '#A15FD3', glow: 'rgba(161,95,211,0.6)', fragmentValue: 20, exchangeCost: 110 },
  legendary: { id: 'legendary', label: '传说', color: '#E8A020', glow: 'rgba(232,160,32,0.7)', fragmentValue: 40, exchangeCost: 180 },
};

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export interface SeriesMeta {
  id: SeriesId;
  name: string;
  subtitle: string;
  /** 集齐系列解锁的主题名 */
  themeName: string;
  accent: string;
}

export const SERIES: Record<SeriesId, SeriesMeta> = {
  dessert: { id: 'dessert', name: '甜品系列', subtitle: '甜到心里的下午茶', themeName: '糖霜主题', accent: '#F4A0B4' },
  pet: { id: 'pet', name: '萌宠系列', subtitle: '毛茸茸的小伙伴', themeName: '暖绒主题', accent: '#F2C48A' },
  fruit: { id: 'fruit', name: '水果系列', subtitle: '阳光果园的馈赠', themeName: '果园主题', accent: '#9CB98F' },
  house: { id: 'house', name: '梦幻小屋系列', subtitle: '童话里的小房子', themeName: '星灯主题', accent: '#8FC7E8' },
};

export const SERIES_ORDER: SeriesId[] = ['dessert', 'pet', 'fruit', 'house'];

export interface CollectibleDef {
  id: string;
  name: string;
  series: SeriesId;
  rarity: Rarity;
  desc: string;
  /** 素材路径（resources 相对路径，不含 /spriteFrame） */
  texture: string;
}

/** 内部构造器：自动补全 texture 路径 */
function def(series: SeriesId, index: number, name: string, rarity: Rarity, desc: string): CollectibleDef {
  const id = `${series}_${String(index).padStart(2, '0')}`;
  return { id, name, series, rarity, desc, texture: `textures/collect/${id}` };
}

export const COLLECTIBLES: CollectibleDef[] = [
  // ---------------- 甜品系列 ----------------
  def('dessert', 1, '草莓奶油蛋糕', 'common', '三层海绵蛋糕夹着草莓果酱，顶上卧着一颗新鲜草莓。'),
  def('dessert', 2, '焦糖布丁', 'common', '微微颤动的布丁，淋着一层琥珀色焦糖。'),
  def('dessert', 3, '彩虹甜甜圈', 'common', '裹着粉色糖霜的甜甜圈，撒满彩色糖针。'),
  def('dessert', 4, '巧克力曲奇', 'common', '边缘微脆、中心柔软，藏着大颗巧克力豆。'),
  def('dessert', 5, '香草冰淇淋', 'common', '两球香草冰淇淋，插着一支薄脆蛋卷。'),
  def('dessert', 6, '蜂蜜华夫饼', 'common', '格子纹路金黄酥脆，淋上琥珀色蜂蜜。'),
  def('dessert', 7, '蓝莓慕斯', 'rare', '入口即化的慕斯，顶部点缀一圈蓝莓。'),
  def('dessert', 8, '抹茶马卡龙', 'rare', '外壳酥脆、内馅绵密的抹茶马卡龙。'),
  def('dessert', 9, '奶油泡芙', 'rare', '圆滚滚的泡芙，塞满冰凉的香草奶油。'),
  def('dessert', 10, '水果塔', 'epic', '酥皮塔壳上堆满当季水果，闪着糖浆光泽。'),
  def('dessert', 11, '肉桂卷', 'epic', '螺旋纹路淋着白色糖霜，散发着肉桂暖香。'),
  def('dessert', 12, '星愿蛋糕', 'legendary', '传说中只在生日夜出现的蛋糕，烛光里藏着愿望。'),

  // ---------------- 萌宠系列 ----------------
  def('pet', 1, '橘猫团子', 'common', '喜欢趴在窗台上晒太阳的橘猫，尾巴一摇一摇。'),
  def('pet', 2, '柴犬小豆', 'common', '笑起来眼睛弯成月牙的柴犬，最爱散步。'),
  def('pet', 3, '雪球兔', 'common', '抱着胡萝卜不撒手的白兔，耳朵总是竖着。'),
  def('pet', 4, '仓鼠鼓鼓', 'common', '腮帮子永远塞满瓜子的仓鼠，跑轮高手。'),
  def('pet', 5, '小狐狸', 'common', '尾巴蓬松的小狐狸，喜欢在落叶堆里打滚。'),
  def('pet', 6, '熊猫团子', 'common', '抱着竹子打盹的熊猫，圆滚滚像个糯米团。'),
  def('pet', 7, '企鹅豆豆', 'rare', '走路一摇一摆的小企鹅，滑冰时却格外优雅。'),
  def('pet', 8, '考拉抱抱', 'rare', '整天挂在桉树上打瞌睡的考拉，抱着树就不撒手。'),
  def('pet', 9, '粉红小猪', 'rare', '鼻子粉粉的小猪，最爱在泥坑里打滚。'),
  def('pet', 10, '刺猬栗子', 'epic', '背着一身小刺的刺猬，遇到危险就缩成一颗栗子。'),
  def('pet', 11, '小恐龙', 'epic', '从蛋壳里孵出的小恐龙，尾巴甩得飞快。'),
  def('pet', 12, '月光独角兽', 'legendary', '只在满月夜现身的独角兽，鬃毛像流动的星河。'),

  // ---------------- 水果系列 ----------------
  def('fruit', 1, '红苹果', 'common', '清晨摘下的红苹果，咬一口脆生生。'),
  def('fruit', 2, '香蕉船', 'common', '弯弯的香蕉像一条小船，甜得刚刚好。'),
  def('fruit', 3, '奶油草莓', 'common', '带着露珠的草莓，尖上一点红最甜。'),
  def('fruit', 4, '紫葡萄串', 'common', '一串饱满的紫葡萄，颗颗都透着光。'),
  def('fruit', 5, '阳光橙子', 'common', '切开来满是阳光味道的橙子，汁水充足。'),
  def('fruit', 6, '双生樱桃', 'common', '两颗并排的樱桃，用一根梗连在一起。'),
  def('fruit', 7, '西瓜切片', 'rare', '沙瓤西瓜切成一角，黑籽排成小星星。'),
  def('fruit', 8, '菠萝皇冠', 'rare', '顶着绿叶皇冠的菠萝，香气能飘满整间屋子。'),
  def('fruit', 9, '蜜桃', 'rare', '绒毛柔软的水蜜桃，一捏就溢出蜜汁。'),
  def('fruit', 10, '蓝莓簇', 'epic', '一小簇深蓝浆果，表面覆着薄薄的白霜。'),
  def('fruit', 11, '柠檬半切', 'epic', '切开一半的柠檬，果肉纹路像太阳的光芒。'),
  def('fruit', 12, '火龙果之心', 'legendary', '剖开的火龙果，紫红果肉里缀满黑色星点。'),

  // ---------------- 梦幻小屋系列 ----------------
  def('house', 1, '奶油小屋', 'common', '奶白色墙面配橙色屋顶的小屋，烟囱冒着热气。'),
  def('house', 2, '圆窗阁楼', 'common', '阁楼上一扇圆圆的小窗，晚上会亮起灯。'),
  def('house', 3, '木纹大门', 'common', '带铜环的木质大门，推开就是温暖的家。'),
  def('house', 4, '花园栅栏', 'common', '刷成白色的木栅栏，爬满了小野花。'),
  def('house', 5, '门前秋千', 'common', '挂在老树上的木秋千，风一吹就轻轻摇。'),
  def('house', 6, '红顶信箱', 'common', '门口的红顶信箱，每天都有好消息。'),
  def('house', 7, '花园路灯', 'rare', '黄昏自动亮起的路灯，光晕是暖橘色的。'),
  def('house', 8, '窗台花坛', 'rare', '窗台下的小花坛，四季都有花开。'),
  def('house', 9, '小鸟屋', 'rare', '挂在树梢的迷你鸟屋，住着一家麻雀。'),
  def('house', 10, '摇椅一角', 'epic', '门廊上的木质摇椅，旁边放着热可可。'),
  def('house', 11, '砖砌烟囱', 'epic', '红砖烟囱冒着袅袅白烟，像在打哈欠。'),
  def('house', 12, '星灯小屋', 'legendary', '屋檐挂满星星灯的小屋，是童话的最后一页。'),
];

export const COLLECTIBLE_BY_ID = new Map(COLLECTIBLES.map((c) => [c.id, c]));

export function collectiblesOfSeries(series: SeriesId): CollectibleDef[] {
  return COLLECTIBLES.filter((c) => c.series === series);
}

/** 各稀有度允许出现的最低关卡 */
export function rarityAllowedAt(levelId: number, rarity: Rarity): boolean {
  switch (rarity) {
    case 'common':
      return true;
    case 'rare':
      return levelId >= 6;
    case 'epic':
      return levelId >= 16;
    case 'legendary':
      return levelId >= 31;
  }
}

/**
 * 里程碑关卡：必定获得指定主题的高品质收藏品。
 * 完成这些关卡时优先发放对应收藏品（若已拥有则转碎片，且不消耗新收藏机会）。
 */
export const MILESTONES: Record<number, string> = {
  5: 'dessert_12', // 星愿蛋糕（传说）
  10: 'pet_12', // 月光独角兽（传说）
  15: 'fruit_12', // 火龙果之心（传说）
  20: 'house_12', // 星灯小屋（传说）
  30: 'dessert_10',
  40: 'pet_10',
  50: 'fruit_10',
  60: 'house_10',
  75: 'dessert_11',
  90: 'pet_11',
  100: 'house_11',
};
