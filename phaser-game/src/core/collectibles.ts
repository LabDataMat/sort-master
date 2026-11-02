/** 收藏品稀有度 */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/** 收藏系列 */
export type SeriesId = 'food' | 'animal' | 'house' | 'festival';

export interface Collectible {
  id: string;
  name: string;
  /** 图片键（BootScene 以 collect_ 前缀加载） */
  image: string;
  series: SeriesId;
  rarity: Rarity;
  desc: string;
  /** 获取条件说明（展示用） */
  condition: string;
}

export interface SeriesMeta {
  id: SeriesId;
  name: string;
  desc: string;
  accent: number;
  /** 集齐整个系列的奖励金币 */
  rewardCoins: number;
}

export const SERIES: SeriesMeta[] = [
  { id: 'food', name: '美食系列', desc: '甜点与烘焙的治愈时光', accent: 0xe98b6b, rewardCoins: 200 },
  { id: 'animal', name: '动物系列', desc: '毛茸茸的伙伴们', accent: 0x7fb069, rewardCoins: 200 },
  { id: 'house', name: '生活用品', desc: '温暖小屋的每个角落', accent: 0xd9a441, rewardCoins: 200 },
  { id: 'festival', name: '节日系列', desc: '时令果盘与节日祝福', accent: 0xc25b8c, rewardCoins: 200 },
];

export const RARITY_META: Record<Rarity, { name: string; color: number; hex: string }> = {
  common: { name: '普通', color: 0x8aa0b5, hex: '#8aa0b5' },
  rare: { name: '稀有', color: 0x4a9ee8, hex: '#4a9ee8' },
  epic: { name: '史诗', color: 0xa05ce0, hex: '#a05ce0' },
  legendary: { name: '传说', color: 0xf0a020, hex: '#f0a020' },
};

const COND = {
  common: '普通及以上关卡概率掉落',
  rare: '困难关卡（难度 ≥ 7）概率掉落',
  epic: '特殊挑战或高难关卡概率掉落',
  legendary: '特殊挑战极低概率掉落',
};

function c(
  id: string,
  name: string,
  image: string,
  series: SeriesId,
  rarity: Rarity,
  desc: string,
  condition?: string,
): Collectible {
  return { id, name, image, series, rarity, desc, condition: condition ?? COND[rarity] };
}

/**
 * 48 件收藏品：4 系列 × 12 件。
 * 稀有度分布：每系列 6 普通 / 3 稀有 / 2 史诗 / 1 传说。
 */
export const COLLECTIBLES: Collectible[] = [
  // ---------------- 美食 ----------------
  c('food_01', '樱桃蛋糕', 'dessert_01', 'food', 'common', '顶层樱桃配奶油，第一口就让人心情变好。', '首次通关第 1 关必定获得'),
  c('food_02', '香草布丁', 'dessert_02', 'food', 'common', '晃一晃会轻轻颤动，是下午三点的温柔。'),
  c('food_03', '草莓甜甜圈', 'dessert_03', 'food', 'common', '粉色糖霜撒着彩针，甜得刚刚好。'),
  c('food_04', '巧克力曲奇', 'dessert_04', 'food', 'common', '边缘微焦，咬下去是浓郁的巧克力豆。'),
  c('food_05', '香草冰淇淋', 'dessert_05', 'food', 'common', '脆筒托着一球雪白，夏天的最佳注脚。'),
  c('food_06', '黄油华夫饼', 'dessert_06', 'food', 'common', '格子纹路里藏着融化的黄油香。'),
  c('food_07', '蓝莓杯子蛋糕', 'dessert_07', 'food', 'rare', '顶部一颗蓝莓，酸甜平衡得恰到好处。'),
  c('food_08', '抹茶马卡龙', 'dessert_08', 'food', 'rare', '外壳酥脆、内里柔软，抹茶微苦回甘。'),
  c('food_09', '葡式蛋挞', 'dessert_09', 'food', 'rare', '层层酥皮托着焦糖色的蛋奶馅。'),
  c('food_10', '草莓芭菲', 'dessert_10', 'food', 'epic', '奶油、果酱与草莓层层叠起，像一小座塔。'),
  c('food_11', '巧克力瑞士卷', 'dessert_11', 'food', 'epic', '螺旋纹路里卷着绵密的可可奶油。'),
  c('food_12', '星光生日蛋糕', 'dessert_12', 'food', 'legendary', '插着星星蜡烛的蛋糕，只在特别的日子出现。'),

  // ---------------- 动物 ----------------
  c('animal_01', '橘猫', 'pet_01', 'animal', 'common', '看起来有点困，但抓虫时格外敏捷。'),
  c('animal_02', '柴犬', 'pet_02', 'animal', 'common', '笑起来眼睛弯成月牙，尾巴摇成小风扇。'),
  c('animal_03', '白兔', 'pet_03', 'animal', 'common', '耳朵竖得笔直，听见胡萝卜就跳过来。'),
  c('animal_04', '泰迪熊', 'pet_04', 'animal', 'common', '毛茸茸的拥抱，是童年最安心的形状。'),
  c('animal_05', '小狐狸', 'pet_05', 'animal', 'common', '尾巴蓬松，眼神里总藏着一点小聪明。'),
  c('animal_06', '熊猫', 'pet_06', 'animal', 'common', '抱着竹子慢悠悠，是国宝级的悠闲。'),
  c('animal_07', '企鹅', 'pet_07', 'animal', 'rare', '穿着燕尾服的小绅士，走路一摇一摆。'),
  c('animal_08', '考拉', 'pet_08', 'animal', 'rare', '一天睡二十小时，醒来继续发呆。'),
  c('animal_09', '小猪', 'pet_09', 'animal', 'rare', '粉扑扑的鼻子，闻到好吃的就哼唧。'),
  c('animal_10', '刺猬', 'pet_10', 'animal', 'epic', '紧张时缩成一团，熟悉后会露出软肚子。'),
  c('animal_11', '小恐龙', 'pet_11', 'animal', 'epic', '据说已经灭绝，但在这里活得很好。'),
  c('animal_12', '云朵小羊', 'pet_12', 'animal', 'legendary', '毛像云一样软，数着它就能睡着。'),

  // ---------------- 生活用品 ----------------
  c('house_01', '小木屋', 'house_01', 'house', 'common', '屋顶是暖橙色，烟囱里飘着晚饭的香气。'),
  c('house_02', '圆窗小屋', 'house_02', 'house', 'common', '圆圆的窗户像一只好奇的眼睛。'),
  c('house_03', '原木门', 'house_03', 'house', 'common', '推开它，就是属于自己的小世界。'),
  c('house_04', '白栅栏', 'house_04', 'house', 'common', '刷得雪白，围起一小片安静的花园。'),
  c('house_05', '庭院秋千', 'house_05', 'house', 'common', '吱呀吱呀，把午后荡得很长。'),
  c('house_06', '红色信箱', 'house_06', 'house', 'common', '等着远方的来信，也装着日常的期待。'),
  c('house_07', '庭院路灯', 'house_07', 'house', 'rare', '天黑时亮起，为晚归的人留一盏光。'),
  c('house_08', '窗台花箱', 'house_08', 'house', 'rare', '三色小花挤在一起，把窗台变成春天。'),
  c('house_09', '木质鸟屋', 'house_09', 'house', 'rare', '挂在树梢，等着第一只入住的房客。'),
  c('house_10', '摇椅', 'house_10', 'house', 'epic', '摇着摇着，时间就慢了下来。'),
  c('house_11', '砖砌烟囱', 'house_11', 'house', 'epic', '冬天里最温暖的地方，冒着白烟。'),
  c('house_12', '蓝顶梦想屋', 'house_12', 'house', 'legendary', '蓝色屋顶映着星空，是心里最想住的地方。'),

  // ---------------- 节日 ----------------
  c('festival_01', '平安果', 'fruit_01', 'festival', 'common', '红彤彤的苹果，寓意平平安安。'),
  c('festival_02', '招财蕉', 'fruit_02', 'festival', 'common', '弯弯像元宝，讨一个好彩头。'),
  c('festival_03', '莓好时光', 'fruit_03', 'festival', 'common', '草莓季短暂，所以格外值得珍惜。'),
  c('festival_04', '紫气东来', 'fruit_04', 'festival', 'common', '一串紫葡萄，寓意好运将至。'),
  c('festival_05', '大吉大利', 'fruit_05', 'festival', 'common', '橘子谐音吉，是年节果盘的常客。'),
  c('festival_06', '樱有尽有', 'fruit_06', 'festival', 'common', '成双的樱桃，寓意好事成双。'),
  c('festival_07', '清凉一夏', 'fruit_07', 'festival', 'rare', '冰镇西瓜，是夏夜最痛快的甜。'),
  c('festival_08', '好运菠萝', 'fruit_08', 'festival', 'rare', '菠萝谐音旺来，节庆里很受欢迎。'),
  c('festival_09', '桃你喜欢', 'fruit_09', 'festival', 'rare', '水蜜桃饱满多汁，甜得很直接。'),
  c('festival_10', '蓝莓之夜', 'fruit_10', 'festival', 'epic', '深蓝色的果实，像夏夜的星空。'),
  c('festival_11', '柠檬新岁', 'fruit_11', 'festival', 'epic', '酸里带甜，是新一年清醒的开始。'),
  c('festival_12', '红火火龙果', 'fruit_12', 'festival', 'legendary', '切开是热烈的红，寓意日子红红火火。'),
];

export const COLLECTIBLE_BY_ID = new Map(COLLECTIBLES.map((x) => [x.id, x]));

export function collectiblesOfSeries(series: SeriesId): Collectible[] {
  return COLLECTIBLES.filter((x) => x.series === series);
}

export function collectiblesOfRarity(rarity: Rarity): Collectible[] {
  return COLLECTIBLES.filter((x) => x.rarity === rarity);
}
