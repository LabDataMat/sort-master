import type { LevelData } from './types';

/**
 * 关卡加载器：按需从静态目录读取 JSON（不做一次性全量加载）。
 * baseUrl 由调用方注入（浏览器传 import.meta.env.BASE_URL），便于测试与子路径部署。
 */
export class LevelLoader {
  private cache = new Map<number, LevelData>();

  constructor(private readonly baseUrl: string = '') {}

  url(levelId: number): string {
    return `${this.baseUrl}levels/level_${String(levelId).padStart(3, '0')}.json`;
  }

  async load(levelId: number): Promise<LevelData> {
    const cached = this.cache.get(levelId);
    if (cached) return cached;

    const res = await fetch(this.url(levelId), { cache: 'no-cache' });
    if (!res.ok) throw new Error(`关卡 ${levelId} 加载失败：HTTP ${res.status}`);

    const data = (await res.json()) as LevelData;
    if (!data || !Array.isArray(data.items)) throw new Error(`关卡 ${levelId} 数据格式错误`);

    this.cache.set(levelId, data);
    return data;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
