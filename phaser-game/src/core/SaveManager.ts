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
}

const KEY = 'sort_master_phaser_v1';

export function defaultSave(): SaveData {
  return {
    version: 1,
    currentLevel: 1,
    maxUnlocked: 1,
    completed: [],
    musicOn: true,
    sfxOn: true,
    coins: 0,
    boosters: { undo: 3, hint: 3, shuffle: 3 },
  };
}

/**
 * 存档：localStorage（可注入 Storage 便于测试）。
 * 浏览器关闭/刷新后仍保留；读写失败时降级为内存态，不影响游戏进行。
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
      this.data = { ...defaultSave(), ...parsed, boosters: { ...defaultSave().boosters, ...(parsed.boosters ?? {}) } };
      if (!Array.isArray(this.data.completed)) this.data.completed = [];
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

  spendBooster(kind: 'undo' | 'hint' | 'shuffle'): boolean {
    if (this.data.boosters[kind] <= 0) return false;
    this.data.boosters[kind]--;
    this.save();
    return true;
  }

  boosterCount(kind: 'undo' | 'hint' | 'shuffle'): number {
    return this.data.boosters[kind];
  }
}
