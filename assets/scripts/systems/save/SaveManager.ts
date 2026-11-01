import { strHash } from '../../utils/Rand';
import { Logger } from '../../utils/Logger';
import type { StorageAdapter } from './StorageAdapters';

export const SAVE_KEY = 'sort_master_save_v1';
/** 存档键名保持 v1（兼容旧档），schemaVersion 表示数据版本 */
export const SCHEMA_VERSION = 2;

/** 道具库存 */
export interface BoosterStock {
  undo: number;
  shuffle: number;
  remove: number;
  extra_slot: number;
}

export interface AdStats {
  ad_request_count: number;
  ad_load_success_count: number;
  ad_show_count: number;
  ad_complete_count: number;
  ad_reward_count: number;
  ad_error_count: number;
}

export interface SaveData {
  schemaVersion: number;
  currentLevel: number;
  maxUnlockedLevel: number;
  completedLevels: number[];
  /** 每关通关星级（levelId -> 1~3） */
  levelStars: Record<string, number>;
  coins: number;
  boosters: BoosterStock;
  /** 玩家等级与经验 */
  playerLevel: number;
  playerXp: number;
  /** 收藏品：id -> 获得时间 ISO */
  collection: Record<string, string>;
  /** 收藏碎片 */
  fragments: number;
  /** 已完成系列（解锁主题） */
  seriesCompleted: string[];
  /** 每日任务状态 */
  dailyTasks: {
    date: string;
    progress: Record<string, number>;
    claimed: string[];
  };
  /** 已发放奖励的业务 ID（幂等） */
  claims: string[];
  dailyReward: {
    lastClaimDate: string; // YYYY-MM-DD，'' 表示未领
    streak: number;
  };
  settings: {
    musicOn: boolean;
    sfxOn: boolean;
  };
  stats: {
    gamesPlayed: number;
    wins: number;
    coinsEarned: number;
    coinsSpent: number;
    maxCombo: number;
    adStats: AdStats;
  };
  checksum: number;
}

export function defaultSave(): SaveData {
  return {
    schemaVersion: SCHEMA_VERSION,
    currentLevel: 1,
    maxUnlockedLevel: 1,
    completedLevels: [],
    levelStars: {},
    coins: 300,
    boosters: { undo: 1, shuffle: 1, remove: 1, extra_slot: 1 },
    playerLevel: 1,
    playerXp: 0,
    collection: {},
    fragments: 0,
    seriesCompleted: [],
    dailyTasks: { date: '', progress: {}, claimed: [] },
    claims: [],
    dailyReward: { lastClaimDate: '', streak: 0 },
    settings: { musicOn: true, sfxOn: true },
    stats: {
      gamesPlayed: 0,
      wins: 0,
      coinsEarned: 0,
      coinsSpent: 0,
      maxCombo: 0,
      adStats: {
        ad_request_count: 0,
        ad_load_success_count: 0,
        ad_show_count: 0,
        ad_complete_count: 0,
        ad_reward_count: 0,
        ad_error_count: 0,
      },
    },
    checksum: 0,
  };
}

function computeChecksum(data: Omit<SaveData, 'checksum'>): number {
  return strHash(JSON.stringify(data));
}

/**
 * 本地存档管理（纯逻辑，存储可注入）。
 * - schemaVersion 与迁移钩子
 * - 缺失字段补默认值
 * - checksum 完整性校验，损坏则回退默认存档（游戏仍可启动）
 */
export class SaveManager {
  private storage: StorageAdapter;
  data: SaveData;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
    this.data = this.load();
  }

  load(): SaveData {
    const fallback = defaultSave();
    try {
      const raw = this.storage.get(SAVE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      // 关键：校验必须在迁移之前、针对原始数据计算。
      // （迁移会新增字段，若用迁移后的数据校验，所有旧档都会被误判损坏）
      const rawChecksum = parsed?.checksum;
      const { checksum: _c, ...rawRest } = parsed ?? {};
      if (typeof rawChecksum === 'number' && rawChecksum !== computeChecksum(rawRest as any)) {
        Logger.warn('Save', '存档校验失败，回退默认存档（游戏可正常启动）');
        return fallback;
      }
      const migrated = this.migrate(parsed);
      const merged = this.fillDefaults(migrated);
      return merged;
    } catch (e) {
      Logger.warn('Save', '存档解析失败，回退默认存档', e);
      return fallback;
    }
  }

  save(): void {
    try {
      const { checksum, ...rest } = this.data;
      const payload = { ...rest, checksum: computeChecksum(rest) };
      this.storage.set(SAVE_KEY, JSON.stringify(payload));
    } catch (e) {
      Logger.warn('Save', '存档写入失败', e);
    }
  }

  /** 缺失字段补默认值（深度合并一层） */
  private fillDefaults(parsed: any): SaveData {
    const def = defaultSave();
    const out: any = { ...def };
    for (const k of Object.keys(def)) {
      if (k === 'checksum') continue;
      const dv = (def as any)[k];
      const pv = parsed?.[k];
      if (pv === undefined || pv === null) continue;
      if (Array.isArray(dv)) {
        if (Array.isArray(pv)) out[k] = pv;
      } else if (typeof dv === 'object') {
        out[k] = { ...dv, ...pv };
      } else {
        out[k] = pv;
      }
    }
    out.schemaVersion = SCHEMA_VERSION;
    // 保留存档自带的校验和（load 时验证用）
    out.checksum = typeof parsed?.checksum === 'number' ? parsed.checksum : 0;
    // 数值合法性
    if (typeof out.coins !== 'number' || !isFinite(out.coins) || out.coins < 0) out.coins = def.coins;
    if (typeof out.currentLevel !== 'number' || out.currentLevel < 1) out.currentLevel = 1;
    if (typeof out.maxUnlockedLevel !== 'number' || out.maxUnlockedLevel < 1) out.maxUnlockedLevel = 1;
    if (typeof out.playerLevel !== 'number' || out.playerLevel < 1) out.playerLevel = 1;
    if (typeof out.playerXp !== 'number' || out.playerXp < 0) out.playerXp = 0;
    if (typeof out.fragments !== 'number' || out.fragments < 0) out.fragments = 0;
    if (!out.collection || typeof out.collection !== 'object' || Array.isArray(out.collection)) out.collection = {};
    if (!Array.isArray(out.seriesCompleted)) out.seriesCompleted = [];
    if (!Array.isArray(out.claims)) out.claims = [];
    if (out.claims.length > 300) out.claims = out.claims.slice(-300);
    if (!out.dailyTasks || typeof out.dailyTasks !== 'object') out.dailyTasks = { date: '', progress: {}, claimed: [] };
    if (!out.levelStars || typeof out.levelStars !== 'object' || Array.isArray(out.levelStars)) out.levelStars = {};
    return out as SaveData;
  }

  /** 版本迁移：旧版本逐级升级 */
  private migrate(parsed: any): any {
    let v = parsed?.schemaVersion ?? 0;
    if (v < 1) {
      parsed.boosters = parsed.boosters ?? defaultSave().boosters;
      parsed.stats = parsed.stats ?? defaultSave().stats;
      v = 1;
    }
    if (v < 2) {
      // v1 -> v2：新增收藏品 / 成长 / 任务数据，旧进度（关卡、金币、道具）完整保留
      const def = defaultSave();
      parsed.levelStars = parsed.levelStars ?? {};
      parsed.playerLevel = parsed.playerLevel ?? def.playerLevel;
      parsed.playerXp = parsed.playerXp ?? def.playerXp;
      parsed.collection = parsed.collection ?? {};
      parsed.fragments = parsed.fragments ?? 0;
      parsed.seriesCompleted = parsed.seriesCompleted ?? [];
      parsed.dailyTasks = parsed.dailyTasks ?? def.dailyTasks;
      parsed.claims = parsed.claims ?? [];
      v = 2;
    }
    parsed.schemaVersion = v;
    return parsed;
  }
}
