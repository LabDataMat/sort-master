import { strHash } from '../../utils/Rand';
import { Logger } from '../../utils/Logger';
export const SAVE_KEY = 'sort_master_save_v1';
export const SCHEMA_VERSION = 1;
export function defaultSave() {
    return {
        schemaVersion: SCHEMA_VERSION,
        currentLevel: 1,
        maxUnlockedLevel: 1,
        completedLevels: [],
        coins: 300,
        boosters: { undo: 1, shuffle: 1, remove: 1, extra_slot: 1 },
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
function computeChecksum(data) {
    return strHash(JSON.stringify(data));
}
/**
 * 本地存档管理（纯逻辑，存储可注入）。
 * - schemaVersion 与迁移钩子
 * - 缺失字段补默认值
 * - checksum 完整性校验，损坏则回退默认存档（游戏仍可启动）
 */
export class SaveManager {
    constructor(storage) {
        this.storage = storage;
        this.data = this.load();
    }
    load() {
        const fallback = defaultSave();
        try {
            const raw = this.storage.get(SAVE_KEY);
            if (!raw)
                return fallback;
            let parsed = JSON.parse(raw);
            parsed = this.migrate(parsed);
            const merged = this.fillDefaults(parsed);
            // 校验和必须使用存档中携带的值（fillDefaults 会保留它）
            // v0 旧档没有 checksum 字段：走迁移路径直接接受（防篡改校验仅对 v1+ 生效）
            const { checksum, ...rest } = merged;
            if (typeof checksum === 'number' && parsed.checksum !== undefined && checksum !== computeChecksum(rest)) {
                Logger.warn('Save', '存档校验失败，回退默认存档（游戏可正常启动）');
                return fallback;
            }
            return merged;
        }
        catch (e) {
            Logger.warn('Save', '存档解析失败，回退默认存档', e);
            return fallback;
        }
    }
    save() {
        try {
            const { checksum, ...rest } = this.data;
            const payload = { ...rest, checksum: computeChecksum(rest) };
            this.storage.set(SAVE_KEY, JSON.stringify(payload));
        }
        catch (e) {
            Logger.warn('Save', '存档写入失败', e);
        }
    }
    /** 缺失字段补默认值（深度合并一层） */
    fillDefaults(parsed) {
        const def = defaultSave();
        const out = { ...def };
        for (const k of Object.keys(def)) {
            if (k === 'checksum')
                continue;
            const dv = def[k];
            const pv = parsed?.[k];
            if (pv === undefined || pv === null)
                continue;
            if (Array.isArray(dv)) {
                if (Array.isArray(pv))
                    out[k] = pv;
            }
            else if (typeof dv === 'object') {
                out[k] = { ...dv, ...pv };
            }
            else {
                out[k] = pv;
            }
        }
        out.schemaVersion = SCHEMA_VERSION;
        // 保留存档自带的校验和（load 时验证用）
        out.checksum = typeof parsed?.checksum === 'number' ? parsed.checksum : 0;
        // 数值合法性
        if (typeof out.coins !== 'number' || !isFinite(out.coins) || out.coins < 0)
            out.coins = def.coins;
        if (typeof out.currentLevel !== 'number' || out.currentLevel < 1)
            out.currentLevel = 1;
        if (typeof out.maxUnlockedLevel !== 'number' || out.maxUnlockedLevel < 1)
            out.maxUnlockedLevel = 1;
        return out;
    }
    /** 版本迁移：旧版本逐级升级 */
    migrate(parsed) {
        let v = parsed?.schemaVersion ?? 0;
        // v0 -> v1 示例迁移点（未来加 v2 时在此追加）
        if (v < 1) {
            parsed.boosters = parsed.boosters ?? defaultSave().boosters;
            parsed.stats = parsed.stats ?? defaultSave().stats;
            v = 1;
        }
        parsed.schemaVersion = v;
        return parsed;
    }
}
