import { LevelLoader } from './core/LevelLoader';
import { SaveManager } from './core/SaveManager';

/** 关卡总数 */
export const MAX_LEVEL = 100;

/** 全局存档（localStorage） */
export const save = new SaveManager();

/** 关卡加载器：使用 Vite 的 BASE_URL，兼容 GitHub Pages 子路径 */
export const loader = new LevelLoader(import.meta.env.BASE_URL);
