import { LevelLoader } from './core/LevelLoader';
import { SaveManager } from './core/SaveManager';
import { CollectionManager } from './core/CollectionManager';
import { RewardService } from './core/RewardService';

/** 关卡总数 */
export const MAX_LEVEL = 100;

/** 全局存档（localStorage） */
export const save = new SaveManager();

/** 收藏系统 */
export const collection = new CollectionManager(save);

/** 奖励系统 */
export const rewards = new RewardService(save, collection);

/** 关卡加载器：使用 Vite 的 BASE_URL，兼容 GitHub Pages 子路径 */
export const loader = new LevelLoader(import.meta.env.BASE_URL);
