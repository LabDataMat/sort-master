import type { SeriesId } from './collectibles';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SaveData {
  version: number;
  currentLevel: number;
  maxUnlocked: number;
  completed: number[];
  musicOn: boolean;
  sfxOn: boolean;
  coins: number;
  boosters: { undo: number; hint: number; shuffle: number };
  /** 已解锁收藏品 id */
  collection: string[];
  /** 已领取奖励的系列 id */
  seriesClaimed: SeriesId[];
  /** 当前连续通关数 */
  streak: number;
  bestStreak: number;
  /** 当前皮肤 */
  skin: string;
  /** 已拥有皮肤 */
  skins: string[];
  /** 每日挑战日期（YYYY-MM-DD） */
  dailyDate: string;
  dailyDone: boolean;
}

const KEY = 'sort_master_phaser_v1';
const VERSION = 2;

export function defaultSave(): SaveData {
  return {
    version: VERSION,
    currentLevel: 1,
    maxUnlocked: 1,
    completed: [],
    musicOn: true,
    sfxOn: true,
    coins: 0,
    boosters: { undo: 3, hint: 3, shuffle: 3 },
    collection: [],
    seriesClaimed: [],
    streak: 0,
    bestStreak: 0,
    skin: 'default',
    skins: ['default'],
    dailyDate: '',
    dailyDone: false,
  };
}

/**
 * 存档：localStorage（可注入 Storage 便于测试）。
 * v1 → v2 自动迁移：缺失字段补默认值，旧进度不丢失。
 */
export class SaveManager {
  data: SaveData;

  constructor(private readonly storage: StorageLike | null = null) {
    this.data = defaultSave();
    this.load();
  }

  private get store(): StorageLike | null {
    if (this.storage) return this.storage;
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
      return null;
    }
  }

  load(): void {
    const s = this.store;
    if (!s) return;
    try {
      const raw = s.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const base = defaultSave();
      this.data = {
        ...base,
        ...parsed,
        version: VERSION,
        boosters: { ...base.boosters, ...(parsed.boosters ?? {}) },
        collection: Array.isArray(parsed.collection) ? [...new Set(parsed.collection)] : [],
        seriesClaimed: Array.isArray(parsed.seriesClaimed) ? parsed.seriesClaimed : [],
        skins: Array.isArray(parsed.skins) && parsed.skins.length ? parsed.skins : ['default'],
        completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      };
    } catch {
      this.data = defaultSave();
    }
  }

  save(): void {
    const s = this.store;
    if (!s) return;
    try {
      s.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* 存储不可用时静默降级 */
    }
  }

  // ---------------- 关卡 ----------------

  isUnlocked(levelId: number): boolean {
    return levelId <= this.data.maxUnlocked;
  }

  isCompleted(levelId: number): boolean {
    return this.data.completed.includes(levelId);
  }

  completeLevel(levelId: number, coins: number, maxLevel: number): void {
    if (!this.data.completed.includes(levelId)) this.data.completed.push(levelId);
    if (levelId < maxLevel && levelId + 1 > this.data.maxUnlocked) {
      this.data.maxUnlocked = levelId + 1;
    }
    this.data.currentLevel = Math.min(maxLevel, Math.max(this.data.currentLevel, levelId + 1));
    this.data.coins += coins;
    this.save();
  }

  addCoins(amount: number): void {
    this.data.coins += amount;
    this.save();
  }

  spendCoins(amount: number): boolean {
    if (amount <= 0 || this.data.coins < amount) return false;
    this.data.coins -= amount;
    this.save();
    return true;
  }

  // ---------------- 道具 ----------------

  spendBooster(kind: 'undo' | 'hint' | 'shuffle'): boolean {
    if (this.data.boosters[kind] <= 0) return false;
    this.data.boosters[kind]--;
    this.save();
    return true;
  }

  boosterCount(kind: 'undo' | 'hint' | 'shuffle'): number {
    return this.data.boosters[kind];
  }

  addBooster(kind: 'undo' | 'hint' | 'shuffle', count = 1): void {
    this.data.boosters[kind] += count;
    this.save();
  }

  // ---------------- 收藏 ----------------

  hasCollectible(id: string): boolean {
    return this.data.collection.includes(id);
  }

  /** 添加收藏；已存在返回 false（不重复计入） */
  addCollectible(id: string): boolean {
    if (this.data.collection.includes(id)) return false;
    this.data.collection.push(id);
    this.save();
    return true;
  }

  isSeriesClaimed(series: SeriesId): boolean {
    return this.data.seriesClaimed.includes(series);
  }

  claimSeries(series: SeriesId, coins: number): boolean {
    if (this.data.seriesClaimed.includes(series)) return false;
    this.data.seriesClaimed.push(series);
    this.data.coins += coins;
    this.save();
    return true;
  }

  // ---------------- 连胜 ----------------

  recordClear(): number {
    this.data.streak++;
    if (this.data.streak > this.data.bestStreak) this.data.bestStreak = this.data.streak;
    this.save();
    return this.data.streak;
  }

  resetStreak(): void {
    this.data.streak = 0;
    this.save();
  }

  // ---------------- 皮肤 ----------------

  ownsSkin(id: string): boolean {
    return this.data.skins.includes(id);
  }

  buySkin(id: string, price: number): boolean {
    if (this.ownsSkin(id)) return false;
    if (!this.spendCoins(price)) return false;
    this.data.skins.push(id);
    this.save();
    return true;
  }

  equipSkin(id: string): boolean {
    if (!this.ownsSkin(id)) return false;
    this.data.skin = id;
    this.save();
    return true;
  }

  // ---------------- 每日挑战 ----------------

  canPlayDaily(today: string): boolean {
    return this.data.dailyDate !== today || !this.data.dailyDone;
  }

  markDaily(today: string): void {
    this.data.dailyDate = today;
    this.data.dailyDone = true;
    this.save();
  }

  /** 测试与调试：重置全部进度 */
  resetAll(): void {
    this.data = defaultSave();
    this.save();
  }
}
