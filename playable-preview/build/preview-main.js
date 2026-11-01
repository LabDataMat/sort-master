var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// playable-preview/src/dom.ts
function el(html) {
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  return d.firstElementChild;
}
function toast(msg, root = document.body) {
  const t = el(`<div class="toast">${msg}</div>`);
  root.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}
function fmt(n) {
  return n >= 1e4 ? `${(n / 1e3).toFixed(1)}k` : String(n);
}
function modal(html) {
  const m = el(`<div class="overlay">${html}</div>`);
  document.getElementById("app").appendChild(m);
  return m;
}
var ASSET;
var init_dom = __esm({
  "playable-preview/src/dom.ts"() {
    ASSET = {
      collect: (id) => `./assets/resources/textures/collect/${id}.png`,
      item: (id) => `./assets/resources/textures/items/${id}.png`,
      ui: (id) => `./assets/resources/textures/ui/${id}.png`
    };
  }
});

// assets/scripts/systems/save/StorageAdapters.ts
var MemoryStorageAdapter, LocalStorageAdapter, WxStorageAdapter;
var init_StorageAdapters = __esm({
  "assets/scripts/systems/save/StorageAdapters.ts"() {
    MemoryStorageAdapter = class {
      constructor() {
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        return this.map.has(key) ? this.map.get(key) : null;
      }
      set(key, value) {
        this.map.set(key, value);
      }
      remove(key) {
        this.map.delete(key);
      }
    };
    LocalStorageAdapter = class {
      get(key) {
        try {
          return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
        } catch {
          return null;
        }
      }
      set(key, value) {
        try {
          if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
        } catch {
        }
      }
      remove(key) {
        try {
          if (typeof localStorage !== "undefined") localStorage.removeItem(key);
        } catch {
        }
      }
    };
    WxStorageAdapter = class {
      constructor(wx) {
        this.wx = wx;
      }
      get(key) {
        try {
          const r = this.wx.getStorageSync(key);
          return r === "" || r === void 0 || r === null ? null : String(r);
        } catch {
          return null;
        }
      }
      set(key, value) {
        try {
          this.wx.setStorageSync(key, value);
        } catch {
        }
      }
      remove(key) {
        try {
          this.wx.removeStorageSync(key);
        } catch {
        }
      }
    };
  }
});

// assets/scripts/platform/WxTypes.ts
function isWeChatEnv() {
  return typeof globalThis.wx !== "undefined" && !!globalThis.wx.getStorageSync;
}
var init_WxTypes = __esm({
  "assets/scripts/platform/WxTypes.ts"() {
  }
});

// assets/scripts/utils/Logger.ts
var _Logger, Logger;
var init_Logger = __esm({
  "assets/scripts/utils/Logger.ts"() {
    _Logger = class _Logger {
      static setEnabled(v) {
        _Logger.enabled = v;
      }
      static info(tag, ...args) {
        if (_Logger.enabled && typeof console !== "undefined") console.log(`[${tag}]`, ...args);
      }
      static warn(tag, ...args) {
        if (typeof console !== "undefined") console.warn(`[${tag}]`, ...args);
      }
      static error(tag, ...args) {
        if (typeof console !== "undefined") console.error(`[${tag}]`, ...args);
      }
    };
    _Logger.enabled = true;
    Logger = _Logger;
  }
});

// assets/scripts/ads/WeChatAdService.ts
var _WeChatAdService, WeChatAdService;
var init_WeChatAdService = __esm({
  "assets/scripts/ads/WeChatAdService.ts"() {
    init_Logger();
    _WeChatAdService = class _WeChatAdService {
      constructor(wxApi, adUnitId) {
        this.rewardedAd = null;
        // 生命周期状态
        this.loadSuccess = false;
        this.loadError = null;
        this.pendingResolve = null;
        this.closedThisSession = false;
        this.wx = wxApi;
        this.adUnitId = adUnitId;
      }
      initialize() {
        if (!this.isAvailable()) return;
        if (this.rewardedAd) return;
        try {
          this.rewardedAd = this.wx.createRewardedVideoAd({ adUnitId: this.adUnitId });
          this.rewardedAd.onLoad(() => {
            this.loadSuccess = true;
            this.loadError = null;
            Logger.info("Ad", "\u6FC0\u52B1\u89C6\u9891\u5E7F\u544A\u52A0\u8F7D\u6210\u529F");
          });
          this.rewardedAd.onError((err) => {
            this.loadError = String(err?.errMsg ?? err ?? "unknown");
            Logger.warn("Ad", "\u6FC0\u52B1\u89C6\u9891\u5E7F\u544A\u52A0\u8F7D\u9519\u8BEF", this.loadError);
          });
          this.rewardedAd.onClose((res) => {
            if (this.closedThisSession) return;
            this.closedThisSession = true;
            const resolve = this.pendingResolve;
            this.pendingResolve = null;
            const completed = !!(res && res.isEnded);
            Logger.info("Ad", `\u6FC0\u52B1\u89C6\u9891\u5173\u95ED\uFF0C\u5B8C\u6574\u89C2\u770B=${completed}`);
            resolve?.({ completed });
          });
          Logger.info("Ad", "\u5FAE\u4FE1\u6FC0\u52B1\u89C6\u9891\u5E7F\u544A\u5B9E\u4F8B\u521B\u5EFA\u6210\u529F");
        } catch (e) {
          Logger.error("Ad", "\u521B\u5EFA\u6FC0\u52B1\u89C6\u9891\u5E7F\u544A\u5931\u8D25", e);
          this.rewardedAd = null;
        }
      }
      isAvailable() {
        return !!this.wx && typeof this.wx.createRewardedVideoAd === "function" && !!this.adUnitId;
      }
      showRewardedAd(_placement) {
        if (!this.rewardedAd) {
          return Promise.resolve({ completed: false, error: "ad_not_initialized" });
        }
        this.closedThisSession = false;
        return new Promise((resolve) => {
          this.pendingResolve = resolve;
          let retries = 0;
          const attemptShow = () => {
            this.rewardedAd.show().then(() => {
              Logger.info("Ad", "\u6FC0\u52B1\u89C6\u9891 show() \u6210\u529F\uFF08\u64AD\u653E\u4E2D\uFF09");
            }).catch((err) => {
              retries++;
              if (retries < _WeChatAdService.MAX_SHOW_RETRY) {
                Logger.warn("Ad", `show \u5931\u8D25\uFF0C\u5C1D\u8BD5 load \u540E\u91CD\u8BD5 (${retries})`, err);
                this.rewardedAd.load().then(() => attemptShow()).catch(() => this.finish({ completed: false, error: "show_failed_after_retry" }));
              } else {
                this.finish({ completed: false, error: "show_failed_after_retry" });
              }
            });
          };
          attemptShow();
        });
      }
      finish(r) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        resolve?.(r);
      }
      showBanner() {
        Logger.info("Ad", "Banner \u9884\u7559\u63A5\u53E3\uFF08\u7B2C\u4E00\u7248\u9ED8\u8BA4\u5173\u95ED\uFF09");
      }
      hideBanner() {
      }
      destroy() {
        if (this.rewardedAd) {
          try {
            this.rewardedAd.destroy();
          } catch {
          }
          this.rewardedAd = null;
        }
      }
    };
    _WeChatAdService.MAX_SHOW_RETRY = 2;
    WeChatAdService = _WeChatAdService;
  }
});

// assets/scripts/ads/MockAdService.ts
var MockAdService;
var init_MockAdService = __esm({
  "assets/scripts/ads/MockAdService.ts"() {
    MockAdService = class _MockAdService {
      constructor() {
        /** 下一次广告的模拟结果 */
        this.outcome = "complete";
        /** 模拟延迟 ms（0 = 同步返回，便于确定性测试） */
        this.simulateDelayMs = 0;
        /** 统计 */
        this.stats = { request: 0, show: 0, complete: 0, abandon: 0, fail: 0 };
        this.initialized = false;
      }
      initialize() {
        this.initialized = true;
      }
      isAvailable() {
        return true;
      }
      showRewardedAd(_placement) {
        this.stats.request++;
        const outcome = this.outcome;
        if (this.simulateDelayMs <= 0) {
          return Promise.resolve(_MockAdService.resolve(outcome, this));
        }
        return new Promise((resolve) => {
          setTimeout(() => resolve(_MockAdService.resolve(outcome, this)), this.simulateDelayMs);
        });
      }
      static resolve(outcome, self) {
        if (outcome === "complete") {
          self.stats.complete++;
          self.stats.show++;
          return { completed: true, mock: true };
        }
        if (outcome === "abandon") {
          self.stats.abandon++;
          self.stats.show++;
          return { completed: false, error: "mock_user_aborted", mock: true };
        }
        self.stats.fail++;
        self.stats.show++;
        return { completed: false, error: "mock_load_failed", mock: true };
      }
      showBanner() {
      }
      hideBanner() {
      }
      destroy() {
        this.initialized = false;
      }
    };
  }
});

// assets/scripts/platform/PlatformManager.ts
var _PlatformManager, PlatformManager;
var init_PlatformManager = __esm({
  "assets/scripts/platform/PlatformManager.ts"() {
    init_StorageAdapters();
    init_WxTypes();
    init_WeChatAdService();
    init_MockAdService();
    _PlatformManager = class _PlatformManager {
      constructor() {
        this.isWeChat = isWeChatEnv();
        if (this.isWeChat) {
          const wxApi = globalThis.wx;
          this.storage = new WxStorageAdapter(wxApi);
          this.adService = _PlatformManager.WECHAT_REWARDED_AD_UNIT_ID && _PlatformManager.WECHAT_APP_ID ? new WeChatAdService(wxApi, _PlatformManager.WECHAT_REWARDED_AD_UNIT_ID) : new MockAdService();
        } else {
          this.storage = typeof localStorage !== "undefined" ? new LocalStorageAdapter() : new MemoryStorageAdapter();
          this.adService = new MockAdService();
        }
      }
      get isMockAd() {
        return this.adService instanceof MockAdService;
      }
      /** 安全区域顶部（刘海），微信环境用系统信息 */
      getSafeAreaTop() {
        if (this.isWeChat) {
          try {
            const info = globalThis.wx.getSystemInfoSync();
            return info.safeArea?.top ?? 44;
          } catch {
            return 44;
          }
        }
        return 0;
      }
    };
    /** 配置入口：发布前在 ads/AdConfig.ts 或构建时注入 */
    _PlatformManager.WECHAT_APP_ID = "";
    _PlatformManager.WECHAT_REWARDED_AD_UNIT_ID = "";
    PlatformManager = _PlatformManager;
  }
});

// assets/scripts/utils/Rand.ts
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffleArray(arr, rand) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}
function strHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) + h + s.charCodeAt(i) | 0;
  }
  return h >>> 0;
}
var init_Rand = __esm({
  "assets/scripts/utils/Rand.ts"() {
  }
});

// assets/scripts/systems/save/SaveManager.ts
function defaultSave() {
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
    dailyTasks: { date: "", progress: {}, claimed: [] },
    claims: [],
    dailyReward: { lastClaimDate: "", streak: 0 },
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
        ad_error_count: 0
      }
    },
    checksum: 0
  };
}
function computeChecksum(data) {
  return strHash(JSON.stringify(data));
}
var SAVE_KEY, SCHEMA_VERSION, SaveManager;
var init_SaveManager = __esm({
  "assets/scripts/systems/save/SaveManager.ts"() {
    init_Rand();
    init_Logger();
    SAVE_KEY = "sort_master_save_v1";
    SCHEMA_VERSION = 2;
    SaveManager = class {
      constructor(storage) {
        this.storage = storage;
        this.data = this.load();
      }
      load() {
        const fallback = defaultSave();
        try {
          const raw = this.storage.get(SAVE_KEY);
          if (!raw) return fallback;
          const parsed = JSON.parse(raw);
          const rawChecksum = parsed?.checksum;
          const { checksum: _c, ...rawRest } = parsed ?? {};
          if (typeof rawChecksum === "number" && rawChecksum !== computeChecksum(rawRest)) {
            Logger.warn("Save", "\u5B58\u6863\u6821\u9A8C\u5931\u8D25\uFF0C\u56DE\u9000\u9ED8\u8BA4\u5B58\u6863\uFF08\u6E38\u620F\u53EF\u6B63\u5E38\u542F\u52A8\uFF09");
            return fallback;
          }
          const migrated = this.migrate(parsed);
          const merged = this.fillDefaults(migrated);
          return merged;
        } catch (e) {
          Logger.warn("Save", "\u5B58\u6863\u89E3\u6790\u5931\u8D25\uFF0C\u56DE\u9000\u9ED8\u8BA4\u5B58\u6863", e);
          return fallback;
        }
      }
      save() {
        try {
          const { checksum, ...rest } = this.data;
          const payload = { ...rest, checksum: computeChecksum(rest) };
          this.storage.set(SAVE_KEY, JSON.stringify(payload));
        } catch (e) {
          Logger.warn("Save", "\u5B58\u6863\u5199\u5165\u5931\u8D25", e);
        }
      }
      /** 缺失字段补默认值（深度合并一层） */
      fillDefaults(parsed) {
        const def2 = defaultSave();
        const out = { ...def2 };
        for (const k of Object.keys(def2)) {
          if (k === "checksum") continue;
          const dv = def2[k];
          const pv = parsed?.[k];
          if (pv === void 0 || pv === null) continue;
          if (Array.isArray(dv)) {
            if (Array.isArray(pv)) out[k] = pv;
          } else if (typeof dv === "object") {
            out[k] = { ...dv, ...pv };
          } else {
            out[k] = pv;
          }
        }
        out.schemaVersion = SCHEMA_VERSION;
        out.checksum = typeof parsed?.checksum === "number" ? parsed.checksum : 0;
        if (typeof out.coins !== "number" || !isFinite(out.coins) || out.coins < 0) out.coins = def2.coins;
        if (typeof out.currentLevel !== "number" || out.currentLevel < 1) out.currentLevel = 1;
        if (typeof out.maxUnlockedLevel !== "number" || out.maxUnlockedLevel < 1) out.maxUnlockedLevel = 1;
        if (typeof out.playerLevel !== "number" || out.playerLevel < 1) out.playerLevel = 1;
        if (typeof out.playerXp !== "number" || out.playerXp < 0) out.playerXp = 0;
        if (typeof out.fragments !== "number" || out.fragments < 0) out.fragments = 0;
        if (!out.collection || typeof out.collection !== "object" || Array.isArray(out.collection)) out.collection = {};
        if (!Array.isArray(out.seriesCompleted)) out.seriesCompleted = [];
        if (!Array.isArray(out.claims)) out.claims = [];
        if (out.claims.length > 300) out.claims = out.claims.slice(-300);
        if (!out.dailyTasks || typeof out.dailyTasks !== "object") out.dailyTasks = { date: "", progress: {}, claimed: [] };
        if (!out.levelStars || typeof out.levelStars !== "object" || Array.isArray(out.levelStars)) out.levelStars = {};
        return out;
      }
      /** 版本迁移：旧版本逐级升级 */
      migrate(parsed) {
        let v = parsed?.schemaVersion ?? 0;
        if (v < 1) {
          parsed.boosters = parsed.boosters ?? defaultSave().boosters;
          parsed.stats = parsed.stats ?? defaultSave().stats;
          v = 1;
        }
        if (v < 2) {
          const def2 = defaultSave();
          parsed.levelStars = parsed.levelStars ?? {};
          parsed.playerLevel = parsed.playerLevel ?? def2.playerLevel;
          parsed.playerXp = parsed.playerXp ?? def2.playerXp;
          parsed.collection = parsed.collection ?? {};
          parsed.fragments = parsed.fragments ?? 0;
          parsed.seriesCompleted = parsed.seriesCompleted ?? [];
          parsed.dailyTasks = parsed.dailyTasks ?? def2.dailyTasks;
          parsed.claims = parsed.claims ?? [];
          v = 2;
        }
        parsed.schemaVersion = v;
        return parsed;
      }
    };
  }
});

// assets/scripts/systems/economy/CurrencyManager.ts
var CurrencyManager;
var init_CurrencyManager = __esm({
  "assets/scripts/systems/economy/CurrencyManager.ts"() {
    CurrencyManager = class {
      constructor(initialCoins, bus2) {
        this.coins = Math.max(0, Math.floor(initialCoins));
        this.bus = bus2;
      }
      get balance() {
        return this.coins;
      }
      /** 加金币，amount 必须 > 0 */
      add(amount, reason) {
        if (!Number.isFinite(amount) || amount <= 0) return false;
        const delta = Math.floor(amount);
        this.coins += delta;
        this.bus.emit("coins:changed", { coins: this.coins, delta, reason });
        return true;
      }
      /** 扣金币，余额不足返回 false（不产生负数） */
      spend(amount, reason) {
        if (!Number.isFinite(amount) || amount <= 0) return false;
        const delta = Math.floor(amount);
        if (this.coins < delta) return false;
        this.coins -= delta;
        this.bus.emit("coins:changed", { coins: this.coins, delta: -delta, reason });
        return true;
      }
    };
  }
});

// assets/scripts/systems/economy/RewardManager.ts
var RewardManager, DailyRewardLogic;
var init_RewardManager = __esm({
  "assets/scripts/systems/economy/RewardManager.ts"() {
    RewardManager = class {
      constructor() {
        this.usedRequestIds = /* @__PURE__ */ new Set();
        /** 关卡结算幂等：settleKey -> true */
        this.settledKeys = /* @__PURE__ */ new Set();
        /** 持久化的已用 requestId 上限 */
        this.maxMemory = 500;
      }
      /**
       * 尝试发放，返回是否首次发放成功。
       * 调用方在 true 时才执行实际加金币等副作用。
       */
      grant(requestId) {
        if (!requestId) return false;
        if (this.usedRequestIds.has(requestId)) return false;
        this.usedRequestIds.add(requestId);
        if (this.usedRequestIds.size > this.maxMemory) {
          const arr = Array.from(this.usedRequestIds);
          this.usedRequestIds = new Set(arr.slice(Math.floor(arr.length / 2)));
        }
        return true;
      }
      hasGranted(requestId) {
        return this.usedRequestIds.has(requestId);
      }
      /** 关卡结算防重（每局游戏 runId + 动作） */
      canSettle(settleKey) {
        if (this.settledKeys.has(settleKey)) return false;
        this.settledKeys.add(settleKey);
        return true;
      }
    };
    DailyRewardLogic = class _DailyRewardLogic {
      /** 返回今日是否可领取 */
      static canClaim(lastClaimDate, today) {
        return lastClaimDate !== today;
      }
      /** 领取后的新 streak。昨天领过则 +1（7 天循环），否则重置为 1 */
      static nextStreak(lastClaimDate, lastStreak, today, yesterday) {
        if (lastClaimDate === yesterday) return lastStreak % 7 + 1;
        return 1;
      }
      static localDateStr(d = /* @__PURE__ */ new Date()) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
      static yesterdayStr(d = /* @__PURE__ */ new Date()) {
        const y = new Date(d.getTime() - 864e5);
        return _DailyRewardLogic.localDateStr(y);
      }
    };
  }
});

// assets/scripts/systems/economy/BoosterInventory.ts
var BoosterInventory;
var init_BoosterInventory = __esm({
  "assets/scripts/systems/economy/BoosterInventory.ts"() {
    BoosterInventory = class {
      constructor(initial, onChange) {
        this.stock = {
          undo: Math.max(0, initial.undo | 0),
          shuffle: Math.max(0, initial.shuffle | 0),
          remove: Math.max(0, initial.remove | 0),
          extra_slot: Math.max(0, initial.extra_slot | 0)
        };
        this.onChange = onChange;
      }
      get(type) {
        return this.stock[type];
      }
      getAll() {
        return { ...this.stock };
      }
      add(type, count) {
        if (!Number.isFinite(count) || count <= 0) return false;
        this.stock[type] += Math.floor(count);
        this.onChange?.();
        return true;
      }
      /** 消耗一个，不足返回 false */
      consume(type) {
        if (this.stock[type] <= 0) return false;
        this.stock[type]--;
        this.onChange?.();
        return true;
      }
    };
  }
});

// assets/scripts/ads/AdManager.ts
var AdManager;
var init_AdManager = __esm({
  "assets/scripts/ads/AdManager.ts"() {
    AdManager = class {
      constructor(service, opts) {
        // 本局限制
        this.runId = "";
        this.runCount = 0;
        this.reviveUsed = 0;
        /** 幂等：requestId -> 承诺结果 */
        this.handled = /* @__PURE__ */ new Map();
        this.service = service;
        this.opts = {
          reviveMaxPerRun: opts.reviveMaxPerRun ?? 1,
          maxAdsPerRun: opts.maxAdsPerRun ?? 10,
          onStats: opts.onStats
        };
        this.stats = {
          ad_request_count: 0,
          ad_load_success_count: 0,
          ad_show_count: 0,
          ad_complete_count: 0,
          ad_reward_count: 0,
          ad_error_count: 0
        };
      }
      initialize() {
        this.service.initialize();
      }
      isAvailable() {
        return this.service.isAvailable();
      }
      /** 每局开始时调用，重置本局限制 */
      startRun(runId2) {
        this.runId = runId2;
        this.runCount = 0;
        this.reviveUsed = 0;
        this.handled.clear();
      }
      /** 本局复活广告是否还可用 */
      canShowRevive() {
        return this.reviveUsed < this.opts.reviveMaxPerRun && this.runCount < this.opts.maxAdsPerRun;
      }
      /**
       * 展示激励视频（业务唯一入口）。
       * - 返回 completed=true 时调用方必须用 RewardManager.grant(requestId) 做最终幂等后发奖
       * - 重复 requestId 返回 completed=false（防重复奖励）
       */
      async showRewardedAd(placement, requestId) {
        if (this.handled.has(requestId)) {
          return { completed: false, error: "duplicate_request" };
        }
        if (this.runCount >= this.opts.maxAdsPerRun) {
          this.stats.ad_error_count++;
          return { completed: false, error: "run_limit_reached" };
        }
        if (placement === "revive" && this.reviveUsed >= this.opts.reviveMaxPerRun) {
          this.stats.ad_error_count++;
          return { completed: false, error: "revive_limit_reached" };
        }
        if (!this.service.isAvailable()) {
          this.stats.ad_error_count++;
          return { completed: false, error: "service_unavailable" };
        }
        this.handled.set(requestId, { completed: false, error: "pending" });
        this.stats.ad_request_count++;
        this.runCount++;
        if (placement === "revive") this.reviveUsed++;
        try {
          const result = await this.service.showRewardedAd(placement);
          if (result.completed) {
            this.stats.ad_complete_count++;
          } else if (result.error) {
            this.stats.ad_error_count++;
          }
          this.stats.ad_show_count++;
          if (result.mock) {
          }
          this.handled.set(requestId, result);
          this.opts.onStats?.({ ...this.stats });
          return result;
        } catch (e) {
          this.stats.ad_error_count++;
          const r = { completed: false, error: String(e?.message ?? e) };
          this.handled.set(requestId, r);
          this.opts.onStats?.({ ...this.stats });
          return r;
        }
      }
      /** 发奖成功后由业务回执，用于统计 ad_reward_count */
      reportRewarded(requestId) {
        if (this.handled.has(requestId)) {
          this.stats.ad_reward_count++;
          this.opts.onStats?.({ ...this.stats });
        }
      }
      showBanner() {
        this.service.showBanner();
      }
      hideBanner() {
        this.service.hideBanner();
      }
      destroy() {
        this.service.destroy();
      }
      get mockMode() {
        return this.service?.constructor?.name === "MockAdService";
      }
    };
  }
});

// assets/scripts/collection/CollectionData.ts
function def(series, index, name, rarity, desc) {
  const id = `${series}_${String(index).padStart(2, "0")}`;
  return { id, name, series, rarity, desc, texture: `textures/collect/${id}` };
}
function collectiblesOfSeries(series) {
  return COLLECTIBLES.filter((c) => c.series === series);
}
function rarityAllowedAt(levelId2, rarity) {
  switch (rarity) {
    case "common":
      return true;
    case "rare":
      return levelId2 >= 6;
    case "epic":
      return levelId2 >= 16;
    case "legendary":
      return levelId2 >= 31;
  }
}
var RARITIES, SERIES, SERIES_ORDER, COLLECTIBLES, COLLECTIBLE_BY_ID, MILESTONES;
var init_CollectionData = __esm({
  "assets/scripts/collection/CollectionData.ts"() {
    RARITIES = {
      common: { id: "common", label: "\u666E\u901A", color: "#9C9184", glow: "rgba(156,145,132,0.5)", fragmentValue: 5, exchangeCost: 40 },
      rare: { id: "rare", label: "\u7A00\u6709", color: "#4E9BD6", glow: "rgba(78,155,214,0.55)", fragmentValue: 10, exchangeCost: 70 },
      epic: { id: "epic", label: "\u53F2\u8BD7", color: "#A15FD3", glow: "rgba(161,95,211,0.6)", fragmentValue: 20, exchangeCost: 110 },
      legendary: { id: "legendary", label: "\u4F20\u8BF4", color: "#E8A020", glow: "rgba(232,160,32,0.7)", fragmentValue: 40, exchangeCost: 180 }
    };
    SERIES = {
      dessert: { id: "dessert", name: "\u751C\u54C1\u7CFB\u5217", subtitle: "\u751C\u5230\u5FC3\u91CC\u7684\u4E0B\u5348\u8336", themeName: "\u7CD6\u971C\u4E3B\u9898", accent: "#F4A0B4" },
      pet: { id: "pet", name: "\u840C\u5BA0\u7CFB\u5217", subtitle: "\u6BDB\u8338\u8338\u7684\u5C0F\u4F19\u4F34", themeName: "\u6696\u7ED2\u4E3B\u9898", accent: "#F2C48A" },
      fruit: { id: "fruit", name: "\u6C34\u679C\u7CFB\u5217", subtitle: "\u9633\u5149\u679C\u56ED\u7684\u9988\u8D60", themeName: "\u679C\u56ED\u4E3B\u9898", accent: "#9CB98F" },
      house: { id: "house", name: "\u68A6\u5E7B\u5C0F\u5C4B\u7CFB\u5217", subtitle: "\u7AE5\u8BDD\u91CC\u7684\u5C0F\u623F\u5B50", themeName: "\u661F\u706F\u4E3B\u9898", accent: "#8FC7E8" }
    };
    SERIES_ORDER = ["dessert", "pet", "fruit", "house"];
    COLLECTIBLES = [
      // ---------------- 甜品系列 ----------------
      def("dessert", 1, "\u8349\u8393\u5976\u6CB9\u86CB\u7CD5", "common", "\u4E09\u5C42\u6D77\u7EF5\u86CB\u7CD5\u5939\u7740\u8349\u8393\u679C\u9171\uFF0C\u9876\u4E0A\u5367\u7740\u4E00\u9897\u65B0\u9C9C\u8349\u8393\u3002"),
      def("dessert", 2, "\u7126\u7CD6\u5E03\u4E01", "common", "\u5FAE\u5FAE\u98A4\u52A8\u7684\u5E03\u4E01\uFF0C\u6DCB\u7740\u4E00\u5C42\u7425\u73C0\u8272\u7126\u7CD6\u3002"),
      def("dessert", 3, "\u5F69\u8679\u751C\u751C\u5708", "common", "\u88F9\u7740\u7C89\u8272\u7CD6\u971C\u7684\u751C\u751C\u5708\uFF0C\u6492\u6EE1\u5F69\u8272\u7CD6\u9488\u3002"),
      def("dessert", 4, "\u5DE7\u514B\u529B\u66F2\u5947", "common", "\u8FB9\u7F18\u5FAE\u8106\u3001\u4E2D\u5FC3\u67D4\u8F6F\uFF0C\u85CF\u7740\u5927\u9897\u5DE7\u514B\u529B\u8C46\u3002"),
      def("dessert", 5, "\u9999\u8349\u51B0\u6DC7\u6DCB", "common", "\u4E24\u7403\u9999\u8349\u51B0\u6DC7\u6DCB\uFF0C\u63D2\u7740\u4E00\u652F\u8584\u8106\u86CB\u5377\u3002"),
      def("dessert", 6, "\u8702\u871C\u534E\u592B\u997C", "common", "\u683C\u5B50\u7EB9\u8DEF\u91D1\u9EC4\u9165\u8106\uFF0C\u6DCB\u4E0A\u7425\u73C0\u8272\u8702\u871C\u3002"),
      def("dessert", 7, "\u84DD\u8393\u6155\u65AF", "rare", "\u5165\u53E3\u5373\u5316\u7684\u6155\u65AF\uFF0C\u9876\u90E8\u70B9\u7F00\u4E00\u5708\u84DD\u8393\u3002"),
      def("dessert", 8, "\u62B9\u8336\u9A6C\u5361\u9F99", "rare", "\u5916\u58F3\u9165\u8106\u3001\u5185\u9985\u7EF5\u5BC6\u7684\u62B9\u8336\u9A6C\u5361\u9F99\u3002"),
      def("dessert", 9, "\u5976\u6CB9\u6CE1\u8299", "rare", "\u5706\u6EDA\u6EDA\u7684\u6CE1\u8299\uFF0C\u585E\u6EE1\u51B0\u51C9\u7684\u9999\u8349\u5976\u6CB9\u3002"),
      def("dessert", 10, "\u6C34\u679C\u5854", "epic", "\u9165\u76AE\u5854\u58F3\u4E0A\u5806\u6EE1\u5F53\u5B63\u6C34\u679C\uFF0C\u95EA\u7740\u7CD6\u6D46\u5149\u6CFD\u3002"),
      def("dessert", 11, "\u8089\u6842\u5377", "epic", "\u87BA\u65CB\u7EB9\u8DEF\u6DCB\u7740\u767D\u8272\u7CD6\u971C\uFF0C\u6563\u53D1\u7740\u8089\u6842\u6696\u9999\u3002"),
      def("dessert", 12, "\u661F\u613F\u86CB\u7CD5", "legendary", "\u4F20\u8BF4\u4E2D\u53EA\u5728\u751F\u65E5\u591C\u51FA\u73B0\u7684\u86CB\u7CD5\uFF0C\u70DB\u5149\u91CC\u85CF\u7740\u613F\u671B\u3002"),
      // ---------------- 萌宠系列 ----------------
      def("pet", 1, "\u6A58\u732B\u56E2\u5B50", "common", "\u559C\u6B22\u8DB4\u5728\u7A97\u53F0\u4E0A\u6652\u592A\u9633\u7684\u6A58\u732B\uFF0C\u5C3E\u5DF4\u4E00\u6447\u4E00\u6447\u3002"),
      def("pet", 2, "\u67F4\u72AC\u5C0F\u8C46", "common", "\u7B11\u8D77\u6765\u773C\u775B\u5F2F\u6210\u6708\u7259\u7684\u67F4\u72AC\uFF0C\u6700\u7231\u6563\u6B65\u3002"),
      def("pet", 3, "\u96EA\u7403\u5154", "common", "\u62B1\u7740\u80E1\u841D\u535C\u4E0D\u6492\u624B\u7684\u767D\u5154\uFF0C\u8033\u6735\u603B\u662F\u7AD6\u7740\u3002"),
      def("pet", 4, "\u4ED3\u9F20\u9F13\u9F13", "common", "\u816E\u5E2E\u5B50\u6C38\u8FDC\u585E\u6EE1\u74DC\u5B50\u7684\u4ED3\u9F20\uFF0C\u8DD1\u8F6E\u9AD8\u624B\u3002"),
      def("pet", 5, "\u5C0F\u72D0\u72F8", "common", "\u5C3E\u5DF4\u84EC\u677E\u7684\u5C0F\u72D0\u72F8\uFF0C\u559C\u6B22\u5728\u843D\u53F6\u5806\u91CC\u6253\u6EDA\u3002"),
      def("pet", 6, "\u718A\u732B\u56E2\u5B50", "common", "\u62B1\u7740\u7AF9\u5B50\u6253\u76F9\u7684\u718A\u732B\uFF0C\u5706\u6EDA\u6EDA\u50CF\u4E2A\u7CEF\u7C73\u56E2\u3002"),
      def("pet", 7, "\u4F01\u9E45\u8C46\u8C46", "rare", "\u8D70\u8DEF\u4E00\u6447\u4E00\u6446\u7684\u5C0F\u4F01\u9E45\uFF0C\u6ED1\u51B0\u65F6\u5374\u683C\u5916\u4F18\u96C5\u3002"),
      def("pet", 8, "\u8003\u62C9\u62B1\u62B1", "rare", "\u6574\u5929\u6302\u5728\u6849\u6811\u4E0A\u6253\u778C\u7761\u7684\u8003\u62C9\uFF0C\u62B1\u7740\u6811\u5C31\u4E0D\u6492\u624B\u3002"),
      def("pet", 9, "\u7C89\u7EA2\u5C0F\u732A", "rare", "\u9F3B\u5B50\u7C89\u7C89\u7684\u5C0F\u732A\uFF0C\u6700\u7231\u5728\u6CE5\u5751\u91CC\u6253\u6EDA\u3002"),
      def("pet", 10, "\u523A\u732C\u6817\u5B50", "epic", "\u80CC\u7740\u4E00\u8EAB\u5C0F\u523A\u7684\u523A\u732C\uFF0C\u9047\u5230\u5371\u9669\u5C31\u7F29\u6210\u4E00\u9897\u6817\u5B50\u3002"),
      def("pet", 11, "\u5C0F\u6050\u9F99", "epic", "\u4ECE\u86CB\u58F3\u91CC\u5B75\u51FA\u7684\u5C0F\u6050\u9F99\uFF0C\u5C3E\u5DF4\u7529\u5F97\u98DE\u5FEB\u3002"),
      def("pet", 12, "\u6708\u5149\u72EC\u89D2\u517D", "legendary", "\u53EA\u5728\u6EE1\u6708\u591C\u73B0\u8EAB\u7684\u72EC\u89D2\u517D\uFF0C\u9B03\u6BDB\u50CF\u6D41\u52A8\u7684\u661F\u6CB3\u3002"),
      // ---------------- 水果系列 ----------------
      def("fruit", 1, "\u7EA2\u82F9\u679C", "common", "\u6E05\u6668\u6458\u4E0B\u7684\u7EA2\u82F9\u679C\uFF0C\u54AC\u4E00\u53E3\u8106\u751F\u751F\u3002"),
      def("fruit", 2, "\u9999\u8549\u8239", "common", "\u5F2F\u5F2F\u7684\u9999\u8549\u50CF\u4E00\u6761\u5C0F\u8239\uFF0C\u751C\u5F97\u521A\u521A\u597D\u3002"),
      def("fruit", 3, "\u5976\u6CB9\u8349\u8393", "common", "\u5E26\u7740\u9732\u73E0\u7684\u8349\u8393\uFF0C\u5C16\u4E0A\u4E00\u70B9\u7EA2\u6700\u751C\u3002"),
      def("fruit", 4, "\u7D2B\u8461\u8404\u4E32", "common", "\u4E00\u4E32\u9971\u6EE1\u7684\u7D2B\u8461\u8404\uFF0C\u9897\u9897\u90FD\u900F\u7740\u5149\u3002"),
      def("fruit", 5, "\u9633\u5149\u6A59\u5B50", "common", "\u5207\u5F00\u6765\u6EE1\u662F\u9633\u5149\u5473\u9053\u7684\u6A59\u5B50\uFF0C\u6C41\u6C34\u5145\u8DB3\u3002"),
      def("fruit", 6, "\u53CC\u751F\u6A31\u6843", "common", "\u4E24\u9897\u5E76\u6392\u7684\u6A31\u6843\uFF0C\u7528\u4E00\u6839\u6897\u8FDE\u5728\u4E00\u8D77\u3002"),
      def("fruit", 7, "\u897F\u74DC\u5207\u7247", "rare", "\u6C99\u74E4\u897F\u74DC\u5207\u6210\u4E00\u89D2\uFF0C\u9ED1\u7C7D\u6392\u6210\u5C0F\u661F\u661F\u3002"),
      def("fruit", 8, "\u83E0\u841D\u7687\u51A0", "rare", "\u9876\u7740\u7EFF\u53F6\u7687\u51A0\u7684\u83E0\u841D\uFF0C\u9999\u6C14\u80FD\u98D8\u6EE1\u6574\u95F4\u5C4B\u5B50\u3002"),
      def("fruit", 9, "\u871C\u6843", "rare", "\u7ED2\u6BDB\u67D4\u8F6F\u7684\u6C34\u871C\u6843\uFF0C\u4E00\u634F\u5C31\u6EA2\u51FA\u871C\u6C41\u3002"),
      def("fruit", 10, "\u84DD\u8393\u7C07", "epic", "\u4E00\u5C0F\u7C07\u6DF1\u84DD\u6D46\u679C\uFF0C\u8868\u9762\u8986\u7740\u8584\u8584\u7684\u767D\u971C\u3002"),
      def("fruit", 11, "\u67E0\u6AAC\u534A\u5207", "epic", "\u5207\u5F00\u4E00\u534A\u7684\u67E0\u6AAC\uFF0C\u679C\u8089\u7EB9\u8DEF\u50CF\u592A\u9633\u7684\u5149\u8292\u3002"),
      def("fruit", 12, "\u706B\u9F99\u679C\u4E4B\u5FC3", "legendary", "\u5256\u5F00\u7684\u706B\u9F99\u679C\uFF0C\u7D2B\u7EA2\u679C\u8089\u91CC\u7F00\u6EE1\u9ED1\u8272\u661F\u70B9\u3002"),
      // ---------------- 梦幻小屋系列 ----------------
      def("house", 1, "\u5976\u6CB9\u5C0F\u5C4B", "common", "\u5976\u767D\u8272\u5899\u9762\u914D\u6A59\u8272\u5C4B\u9876\u7684\u5C0F\u5C4B\uFF0C\u70DF\u56F1\u5192\u7740\u70ED\u6C14\u3002"),
      def("house", 2, "\u5706\u7A97\u9601\u697C", "common", "\u9601\u697C\u4E0A\u4E00\u6247\u5706\u5706\u7684\u5C0F\u7A97\uFF0C\u665A\u4E0A\u4F1A\u4EAE\u8D77\u706F\u3002"),
      def("house", 3, "\u6728\u7EB9\u5927\u95E8", "common", "\u5E26\u94DC\u73AF\u7684\u6728\u8D28\u5927\u95E8\uFF0C\u63A8\u5F00\u5C31\u662F\u6E29\u6696\u7684\u5BB6\u3002"),
      def("house", 4, "\u82B1\u56ED\u6805\u680F", "common", "\u5237\u6210\u767D\u8272\u7684\u6728\u6805\u680F\uFF0C\u722C\u6EE1\u4E86\u5C0F\u91CE\u82B1\u3002"),
      def("house", 5, "\u95E8\u524D\u79CB\u5343", "common", "\u6302\u5728\u8001\u6811\u4E0A\u7684\u6728\u79CB\u5343\uFF0C\u98CE\u4E00\u5439\u5C31\u8F7B\u8F7B\u6447\u3002"),
      def("house", 6, "\u7EA2\u9876\u4FE1\u7BB1", "common", "\u95E8\u53E3\u7684\u7EA2\u9876\u4FE1\u7BB1\uFF0C\u6BCF\u5929\u90FD\u6709\u597D\u6D88\u606F\u3002"),
      def("house", 7, "\u82B1\u56ED\u8DEF\u706F", "rare", "\u9EC4\u660F\u81EA\u52A8\u4EAE\u8D77\u7684\u8DEF\u706F\uFF0C\u5149\u6655\u662F\u6696\u6A58\u8272\u7684\u3002"),
      def("house", 8, "\u7A97\u53F0\u82B1\u575B", "rare", "\u7A97\u53F0\u4E0B\u7684\u5C0F\u82B1\u575B\uFF0C\u56DB\u5B63\u90FD\u6709\u82B1\u5F00\u3002"),
      def("house", 9, "\u5C0F\u9E1F\u5C4B", "rare", "\u6302\u5728\u6811\u68A2\u7684\u8FF7\u4F60\u9E1F\u5C4B\uFF0C\u4F4F\u7740\u4E00\u5BB6\u9EBB\u96C0\u3002"),
      def("house", 10, "\u6447\u6905\u4E00\u89D2", "epic", "\u95E8\u5ECA\u4E0A\u7684\u6728\u8D28\u6447\u6905\uFF0C\u65C1\u8FB9\u653E\u7740\u70ED\u53EF\u53EF\u3002"),
      def("house", 11, "\u7816\u780C\u70DF\u56F1", "epic", "\u7EA2\u7816\u70DF\u56F1\u5192\u7740\u8885\u8885\u767D\u70DF\uFF0C\u50CF\u5728\u6253\u54C8\u6B20\u3002"),
      def("house", 12, "\u661F\u706F\u5C0F\u5C4B", "legendary", "\u5C4B\u6A90\u6302\u6EE1\u661F\u661F\u706F\u7684\u5C0F\u5C4B\uFF0C\u662F\u7AE5\u8BDD\u7684\u6700\u540E\u4E00\u9875\u3002")
    ];
    COLLECTIBLE_BY_ID = new Map(COLLECTIBLES.map((c) => [c.id, c]));
    MILESTONES = {
      5: "dessert_12",
      // 星愿蛋糕（传说）
      10: "pet_12",
      // 月光独角兽（传说）
      15: "fruit_12",
      // 火龙果之心（传说）
      20: "house_12",
      // 星灯小屋（传说）
      30: "dessert_10",
      40: "pet_10",
      50: "fruit_10",
      60: "house_10",
      75: "dessert_11",
      90: "pet_11",
      100: "house_11"
    };
  }
});

// assets/scripts/collection/CollectionManager.ts
var CollectionManager;
var init_CollectionManager = __esm({
  "assets/scripts/collection/CollectionManager.ts"() {
    init_CollectionData();
    CollectionManager = class {
      constructor(state, onSeriesComplete) {
        this.state = state;
        this.onSeriesComplete = onSeriesComplete;
      }
      static emptyState() {
        return { owned: {}, fragments: 0, seriesCompleted: [] };
      }
      has(id) {
        return !!this.state.owned[id];
      }
      get obtainedAt() {
        return this.state.owned;
      }
      get fragments() {
        return this.state.fragments;
      }
      get ownedCount() {
        return Object.keys(this.state.owned).length;
      }
      get totalCount() {
        return COLLECTIBLES.length;
      }
      getDef(id) {
        return COLLECTIBLE_BY_ID.get(id);
      }
      addFragments(n) {
        if (!Number.isFinite(n) || n <= 0) return this.state.fragments;
        this.state.fragments += Math.floor(n);
        return this.state.fragments;
      }
      /** 发放一件收藏品：新获得则入库，重复则转碎片 */
      grant(id, now = (/* @__PURE__ */ new Date()).toISOString()) {
        const def2 = COLLECTIBLE_BY_ID.get(id);
        if (!def2) return null;
        if (this.state.owned[id]) {
          const fv = RARITIES[def2.rarity].fragmentValue;
          this.state.fragments += fv;
          return { def: def2, isNew: false, fragmentsGained: fv };
        }
        this.state.owned[id] = now;
        this.checkSeriesCompletion();
        return { def: def2, isNew: true, fragmentsGained: 0 };
      }
      /**
       * 通关奖励（确定性，非随机）：
       * 1. 里程碑关卡 -> 指定收藏品
       * 2. 否则在"未拥有且当前关卡允许的稀有度"中按关卡号确定性选取
       * 3. 全部拥有后 -> 重复转化碎片
       */
      resolveLevelReward(levelId2, now = (/* @__PURE__ */ new Date()).toISOString()) {
        const milestoneId = MILESTONES[levelId2];
        if (milestoneId) {
          const r = this.grant(milestoneId, now);
          if (r) return r;
        }
        const allowed = COLLECTIBLES.filter((c) => !this.state.owned[c.id] && rarityAllowedAt(levelId2, c.rarity));
        if (allowed.length > 0) {
          const idx2 = (levelId2 * 37 + 11) % allowed.length;
          return this.grant(allowed[idx2].id, now);
        }
        const pool = COLLECTIBLES.filter((c) => rarityAllowedAt(levelId2, c.rarity));
        const idx = (levelId2 * 53 + 7) % pool.length;
        return this.grant(pool[idx].id, now);
      }
      /** 碎片兑换：只能兑换未拥有的收藏品 */
      canExchange(id) {
        const def2 = COLLECTIBLE_BY_ID.get(id);
        if (!def2) return { ok: false, cost: 0, reason: "not_found" };
        const cost = RARITIES[def2.rarity].exchangeCost;
        if (this.state.owned[id]) return { ok: false, cost, reason: "owned" };
        if (this.state.fragments < cost) return { ok: false, cost, reason: "insufficient" };
        return { ok: true, cost };
      }
      exchange(id, now = (/* @__PURE__ */ new Date()).toISOString()) {
        const check = this.canExchange(id);
        if (!check.ok) return null;
        this.state.fragments -= check.cost;
        const def2 = COLLECTIBLE_BY_ID.get(id);
        this.state.owned[id] = now;
        this.checkSeriesCompletion();
        return { def: def2, isNew: true, fragmentsGained: 0 };
      }
      /** 系列进度 */
      seriesProgress(series) {
        const list = collectiblesOfSeries(series);
        const owned = list.filter((c) => !!this.state.owned[c.id]).length;
        return {
          series,
          owned,
          total: list.length,
          percent: Math.round(owned / list.length * 100),
          complete: owned === list.length
        };
      }
      allSeriesProgress() {
        return SERIES_ORDER.map((s) => this.seriesProgress(s));
      }
      get overallPercent() {
        return Math.round(this.ownedCount / this.totalCount * 100);
      }
      /** 系列集齐 -> 解锁主题 */
      checkSeriesCompletion() {
        for (const s of SERIES_ORDER) {
          if (this.state.seriesCompleted.includes(s)) continue;
          const p = this.seriesProgress(s);
          if (p.complete) {
            this.state.seriesCompleted.push(s);
            this.onSeriesComplete?.(s);
          }
        }
      }
      isThemeUnlocked(series) {
        return this.state.seriesCompleted.includes(series);
      }
      themeName(series) {
        return SERIES[series].themeName;
      }
      /** 兑换建议：当前可兑换的最低稀有度未拥有收藏品 */
      suggestExchange() {
        const unowned = COLLECTIBLES.filter((c) => !this.state.owned[c.id]).sort(
          (a, b) => RARITIES[a.rarity].exchangeCost - RARITIES[b.rarity].exchangeCost
        );
        if (!unowned.length) return null;
        return { id: unowned[0].id, cost: RARITIES[unowned[0].rarity].exchangeCost };
      }
      /** 稀有度统计（收藏册展示用） */
      rarityCounts() {
        const out = {};
        Object.keys(RARITIES).forEach((r) => {
          const all = COLLECTIBLES.filter((c) => c.rarity === r);
          out[r] = { owned: all.filter((c) => !!this.state.owned[c.id]).length, total: all.length };
        });
        return out;
      }
    };
  }
});

// assets/scripts/systems/progress/ProgressManager.ts
function xpToNext(level) {
  return 100 + (level - 1) * 40;
}
var DAILY_TASKS, ProgressManager;
var init_ProgressManager = __esm({
  "assets/scripts/systems/progress/ProgressManager.ts"() {
    DAILY_TASKS = [
      { id: "clear3", name: "\u5B8C\u6210 3 \u4E2A\u5173\u5361", target: 3, coins: 120, fragments: 10, event: "level_clear", icon: "icon_task_clear" },
      { id: "booster2", name: "\u4F7F\u7528 2 \u6B21\u9053\u5177", target: 2, coins: 80, fragments: 5, event: "booster_used", icon: "icon_task_booster" },
      { id: "newcollect1", name: "\u83B7\u5F97 1 \u4EF6\u65B0\u6536\u85CF\u54C1", target: 1, coins: 150, fragments: 15, event: "new_collectible", icon: "icon_task_collect" },
      { id: "combo1", name: "\u5B8C\u6210 1 \u6B21\u8FDE\u51FB\u901A\u5173\uFF08Combo\u22652\uFF09", target: 1, coins: 100, fragments: 10, event: "combo_clear", icon: "icon_task_combo" }
    ];
    ProgressManager = class {
      constructor(player, tasks, hooks = {}) {
        this.player = player;
        this.tasks = tasks;
        this.hooks = hooks;
      }
      static emptyTasks(today) {
        return { date: today, progress: {}, claimed: [] };
      }
      /** 跨天重置任务（保留已领取记录不跨天） */
      ensureToday(today) {
        if (this.tasks.date === today) return false;
        this.tasks.date = today;
        this.tasks.progress = {};
        this.tasks.claimed = [];
        return true;
      }
      // ---------------- 等级 ----------------
      /** 增加经验，返回升了几级（每级奖励由调用方通过 hooks 发放） */
      addXp(amount) {
        if (!Number.isFinite(amount) || amount <= 0) return { levelsGained: 0, coins: 0, fragments: 0 };
        this.player.xp += Math.floor(amount);
        let gained = 0;
        while (this.player.xp >= xpToNext(this.player.level)) {
          this.player.xp -= xpToNext(this.player.level);
          this.player.level++;
          gained++;
        }
        const coins = gained * 100;
        const fragments = gained * 20;
        if (gained > 0) {
          if (coins) this.hooks.onCoins?.(coins, "level_up");
          if (fragments) this.hooks.onFragments?.(fragments, "level_up");
        }
        return { levelsGained: gained, coins, fragments };
      }
      get xpProgress() {
        return Math.min(1, this.player.xp / xpToNext(this.player.level));
      }
      // ---------------- 每日任务 ----------------
      recordEvent(event, amount = 1) {
        for (const t of DAILY_TASKS) {
          if (t.event !== event) continue;
          const cur = this.tasks.progress[t.id] ?? 0;
          if (cur >= t.target) continue;
          this.tasks.progress[t.id] = Math.min(t.target, cur + amount);
        }
      }
      taskProgress(id) {
        return this.tasks.progress[id] ?? 0;
      }
      isTaskComplete(id) {
        const t = DAILY_TASKS.find((x) => x.id === id);
        if (!t) return false;
        return this.taskProgress(id) >= t.target;
      }
      isTaskClaimed(id) {
        return this.tasks.claimed.includes(id);
      }
      /** 领取任务奖励：未完成 / 已领取都会被拒绝（幂等） */
      claimTask(id) {
        const t = DAILY_TASKS.find((x) => x.id === id);
        if (!t) return { ok: false, coins: 0, fragments: 0, reason: "not_found" };
        if (!this.isTaskComplete(id)) return { ok: false, coins: 0, fragments: 0, reason: "incomplete" };
        if (this.isTaskClaimed(id)) return { ok: false, coins: 0, fragments: 0, reason: "claimed" };
        this.tasks.claimed.push(id);
        this.hooks.onCoins?.(t.coins, `task_${id}`);
        this.hooks.onFragments?.(t.fragments, `task_${id}`);
        return { ok: true, coins: t.coins, fragments: t.fragments };
      }
      get completedTaskCount() {
        return DAILY_TASKS.filter((t) => this.isTaskComplete(t.id)).length;
      }
      get claimedTaskCount() {
        return this.tasks.claimed.length;
      }
      get allTasksDone() {
        return DAILY_TASKS.every((t) => this.isTaskComplete(t.id));
      }
      // ---------------- 里程碑 ----------------
      /** 每 5 关的里程碑奖励（金币 + 碎片） */
      static milestoneFor(levelId2) {
        if (levelId2 % 5 !== 0) return null;
        const tier = Math.floor(levelId2 / 5);
        return { coins: 100 + tier * 20, fragments: 5 + Math.floor(tier / 2) * 5 };
      }
    };
  }
});

// playable-preview/src/app-state.ts
function syncCollection() {
  save.data.collection = collection.state.owned;
  save.data.fragments = collection.state.fragments;
  save.data.seriesCompleted = collection.state.seriesCompleted.slice();
}
function persist() {
  save.data.coins = currency.balance;
  save.data.boosters = inventory.getAll();
  save.data.playerLevel = progress.player.level;
  save.data.playerXp = progress.player.xp;
  save.data.dailyTasks = progress.tasks;
  syncCollection();
  save.save();
}
function currentLevel() {
  return save.data.currentLevel;
}
function addFragments(n) {
  collection.addFragments(n);
  syncCollection();
  persist();
}
function settleVictory(runId2, levelId2, maxCombo, stars) {
  if (!rewards.canSettle(`victory:${runId2}`)) return null;
  const first = !save.data.completedLevels.includes(levelId2);
  const base = first ? 100 : 30;
  const streak = levelId2 % 10 === 0 ? 50 : levelId2 % 5 === 0 ? 20 : levelId2 % 3 === 0 ? 10 : 0;
  const coins = base + streak;
  currency.add(coins, "victory");
  if (first) save.data.completedLevels.push(levelId2);
  save.data.levelStars = save.data.levelStars ?? {};
  save.data.levelStars[String(levelId2)] = Math.max(save.data.levelStars[String(levelId2)] ?? 0, stars);
  save.data.maxUnlockedLevel = Math.max(save.data.maxUnlockedLevel, levelId2 + 1);
  save.data.currentLevel = Math.max(save.data.currentLevel, levelId2 + 1);
  save.data.stats.gamesPlayed++;
  save.data.stats.wins++;
  save.data.stats.maxCombo = Math.max(save.data.stats.maxCombo, maxCombo);
  const xpGained = 20 + stars * 10;
  const up = progress.addXp(xpGained);
  progress.recordEvent("level_clear", 1);
  if (maxCombo >= 2) progress.recordEvent("combo_clear", 1);
  let milestoneCoins = 0;
  let milestoneFragments = 0;
  const ms = ProgressManager.milestoneFor(levelId2);
  if (ms && rewards.grant(`milestone:${levelId2}`)) {
    milestoneCoins = ms.coins;
    milestoneFragments = ms.fragments;
    currency.add(ms.coins, "milestone");
    collection.addFragments(ms.fragments);
  }
  const chestId = `chest:${runId2}:${levelId2}`;
  let result = null;
  if (rewards.grant(chestId)) {
    result = collection.resolveLevelReward(levelId2);
    if (result?.isNew) progress.recordEvent("new_collectible", 1);
  }
  syncCollection();
  persist();
  return { coins, stars, first, xpGained, levelUps: up.levelsGained, chest: { id: chestId, result }, milestoneCoins, milestoneFragments };
}
function exchangeCollectible(id) {
  const r = collection.exchange(id);
  if (r) {
    progress.recordEvent("new_collectible", 1);
    syncCollection();
    persist();
  }
  return r;
}
function isThemeUnlocked(s) {
  return collection.isThemeUnlocked(s);
}
function activeTheme() {
  const done = collection.state.seriesCompleted;
  return done.length ? done[done.length - 1] : null;
}
function canClaimDaily() {
  return DailyRewardLogic.canClaim(save.data.dailyReward.lastClaimDate, DailyRewardLogic.localDateStr());
}
function claimDaily() {
  const today = DailyRewardLogic.localDateStr();
  if (!DailyRewardLogic.canClaim(save.data.dailyReward.lastClaimDate, today)) return { ok: false, amount: 0 };
  if (!rewards.grant(`daily:${today}`)) return { ok: false, amount: 0 };
  const next = DailyRewardLogic.nextStreak(
    save.data.dailyReward.lastClaimDate,
    save.data.dailyReward.streak,
    today,
    DailyRewardLogic.yesterdayStr()
  );
  save.data.dailyReward = { lastClaimDate: today, streak: next };
  const amount = [50, 60, 80, 100, 120, 150, 200][((next - 1) % 7 + 7) % 7];
  currency.add(amount, "daily");
  persist();
  return { ok: true, amount };
}
function claimTask(id) {
  const r = progress.claimTask(id);
  if (r.ok) {
    syncCollection();
    persist();
  }
  return r;
}
function buyBooster(t) {
  const price = BOOSTER_PRICES[t];
  if (!currency.spend(price, `buy_${t}`)) return false;
  inventory.add(t, 1);
  persist();
  return true;
}
function seriesMeta(s) {
  return SERIES[s];
}
function playerInfo() {
  return {
    level: progress.player.level,
    xp: progress.player.xp,
    xpPercent: Math.round(progress.xpProgress * 100),
    coins: currency.balance,
    fragments: collection.fragments,
    owned: collection.ownedCount,
    total: collection.totalCount,
    percent: collection.overallPercent
  };
}
var platform, save, bus, emit, currency, inventory, rewards, ad, collection, progress, BOOSTER_PRICES, SERIES_LIST;
var init_app_state = __esm({
  "playable-preview/src/app-state.ts"() {
    init_PlatformManager();
    init_SaveManager();
    init_CurrencyManager();
    init_RewardManager();
    init_BoosterInventory();
    init_AdManager();
    init_CollectionManager();
    init_ProgressManager();
    init_CollectionData();
    platform = new PlatformManager();
    save = new SaveManager(platform.storage);
    bus = { listeners: /* @__PURE__ */ new Map() };
    emit = (ev, data) => bus.listeners.get(ev)?.forEach((f) => f(data));
    currency = new CurrencyManager(save.data.coins, { emit });
    inventory = new BoosterInventory(save.data.boosters);
    rewards = new RewardManager();
    ad = new AdManager(platform.adService, { reviveMaxPerRun: 1, maxAdsPerRun: 10 });
    collection = new CollectionManager(
      {
        owned: save.data.collection ?? {},
        fragments: save.data.fragments ?? 0,
        seriesCompleted: save.data.seriesCompleted ?? []
      },
      () => {
        syncCollection();
      }
    );
    progress = new ProgressManager(
      { level: save.data.playerLevel ?? 1, xp: save.data.playerXp ?? 0 },
      save.data.dailyTasks ?? { date: "", progress: {}, claimed: [] },
      {
        onCoins: (n, reason) => currency.add(n, reason),
        onFragments: (n) => collection.addFragments(n)
      }
    );
    progress.ensureToday(DailyRewardLogic.localDateStr());
    BOOSTER_PRICES = { undo: 150, shuffle: 150, remove: 250, extra_slot: 200 };
    SERIES_LIST = SERIES_ORDER;
  }
});

// playable-preview/src/view-collection.ts
var view_collection_exports = {};
__export(view_collection_exports, {
  addFragments: () => addFragments,
  persist: () => persist,
  showCollection: () => showCollection
});
function showCollection(root, onBack) {
  const render = () => {
    const total = collection.ownedCount;
    const all = collection.totalCount;
    const tabs = SERIES_LIST.map((s) => {
      const p = collection.seriesProgress(s);
      return `<button class="series-tab ${s === lastTab ? "active" : ""}" data-tab="${s}" style="--ac:${seriesMeta(s).accent}">
        <span class="tab-name">${seriesMeta(s).name}</span>
        <span class="tab-count">${p.owned}/${p.total}</span>
        ${p.complete ? '<i class="tab-done">\u2713</i>' : ""}
      </button>`;
    }).join("");
    const sp = collection.seriesProgress(lastTab);
    const list = collectiblesOfSeries(lastTab);
    const cards = list.map((c) => {
      const owned = collection.has(c.id);
      const rarity = RARITIES[c.rarity];
      return `<div class="cc-card ${owned ? "owned" : "locked"} rarity-${c.rarity}" data-id="${c.id}">
          <div class="cc-imgwrap">
            <img class="cc-img" src="${ASSET.collect(c.id)}">
            ${owned ? `<img class="cc-frame" src="${ASSET.ui("frame_" + c.rarity)}">` : '<div class="cc-q">?</div>'}
          </div>
          <div class="cc-name">${owned ? c.name : "\u672A\u89E3\u9501"}</div>
          <div class="cc-rarity" style="color:${rarity.color}">${rarity.label}</div>
        </div>`;
    }).join("");
    const themes = SERIES_LIST.filter((s) => isThemeUnlocked(s)).map((s) => `<span class="theme-chip">${seriesMeta(s).themeName}</span>`).join("");
    root.innerHTML = "";
    const page = el(`
      <div class="page collection">
        <div class="col-header">
          <button class="btn small ghost" id="back">\u2039 \u8FD4\u56DE</button>
          <h2>\u6536\u85CF\u518C</h2>
          <div class="pill"><img src="${ASSET.ui("icon_fragment")}"><b>${collection.fragments}</b></div>
        </div>
        <div class="col-summary">
          <div class="cs-row"><span>\u603B\u6536\u96C6\u8FDB\u5EA6</span><b>${total} / ${all}</b></div>
          <div class="col-bar"><i style="width:${collection.overallPercent}%"></i></div>
          <div class="theme-row">${themes ? "\u5DF2\u89E3\u9501\u4E3B\u9898\uFF1A" + themes : "\u96C6\u9F50\u4E00\u4E2A\u7CFB\u5217\u53EF\u89E3\u9501\u4E13\u5C5E\u4E3B\u9898"}</div>
        </div>
        <div class="series-tabs">${tabs}</div>
        <div class="series-panel">
          <div class="series-banner" style="--ac:${seriesMeta(lastTab).accent}">
            <div class="sb-text"><b>${seriesMeta(lastTab).name}</b><span>${seriesMeta(lastTab).subtitle}</span></div>
            <div class="sb-progress"><b>${sp.owned}</b> / ${sp.total}</div>
          </div>
          ${sp.complete ? `<div class="series-complete">\u{1F389} \u7CFB\u5217\u96C6\u9F50\uFF01\u5DF2\u89E3\u9501\u300C${seriesMeta(lastTab).themeName}\u300D</div>` : ""}
          <div class="collect-grid">${cards}</div>
        </div>
      </div>`);
    root.appendChild(page);
    page.querySelector("#back").addEventListener("click", onBack);
    page.querySelectorAll(".series-tab").forEach(
      (b) => b.addEventListener("click", () => {
        lastTab = b.dataset.tab;
        render();
      })
    );
    page.querySelectorAll(".cc-card").forEach(
      (card) => card.addEventListener("click", () => openDetail(root, card.dataset.id, render))
    );
    if (sp.complete) celebrate(root);
  };
  render();
}
function openDetail(root, id, refresh) {
  const def2 = collection.getDef(id);
  const owned = collection.has(id);
  const rarity = RARITIES[def2.rarity];
  const obtained = collection.obtainedAt[id];
  const check = collection.canExchange(id);
  const m = modal(`
    <div class="popup detail-popup rarity-${def2.rarity}">
      <div class="detail-imgwrap">
        <img class="detail-img" src="${ASSET.collect(def2.id)}">
        ${owned ? `<img class="cc-frame" src="${ASSET.ui("frame_" + def2.rarity)}">` : ""}
      </div>
      <div class="rarity-chip" style="--rc:${rarity.color}">${rarity.label}</div>
      <h3>${def2.name}</h3>
      <div class="detail-series">${seriesMeta(def2.series).name}</div>
      <p class="detail-desc">${def2.desc}</p>
      ${owned ? `<div class="detail-obtained">\u83B7\u5F97\u65F6\u95F4\uFF1A${new Date(obtained).toLocaleString("zh-CN")}</div>` : `<div class="detail-obtained">\u5C1A\u672A\u83B7\u5F97</div>
           <button class="btn primary" id="exchange" ${check.ok ? "" : "disabled"}>
             ${check.ok ? `\u7528 ${check.cost} \u788E\u7247\u5151\u6362` : check.reason === "insufficient" ? `\u788E\u7247\u4E0D\u8DB3\uFF08\u9700 ${check.cost}\uFF09` : "\u5DF2\u62E5\u6709"}
           </button>`}
      <button class="btn small ghost" id="closeDetail">\u5173\u95ED</button>
    </div>`);
  m.querySelector("#closeDetail").addEventListener("click", () => m.remove());
  const ex = m.querySelector("#exchange");
  ex?.addEventListener("click", () => {
    const r = exchangeCollectible(id);
    if (r) {
      toast(`\u83B7\u5F97\u6536\u85CF\u54C1\uFF1A${r.def.name}`);
      m.remove();
      refresh();
    } else toast("\u788E\u7247\u4E0D\u8DB3");
  });
  void root;
}
function celebrate(root) {
  const layer = el(`<div class="celebrate-layer"></div>`);
  for (let i = 0; i < 24; i++) {
    layer.appendChild(el(`<i style="left:${Math.random() * 100}%;animation-delay:${Math.random() * 0.6}s;background:${["#F5C542", "#F4A0B4", "#8FC7E8", "#9CB98F"][i % 4]}"></i>`));
  }
  root.querySelector(".page.collection")?.appendChild(layer);
  setTimeout(() => layer.remove(), 2600);
}
var lastTab;
var init_view_collection = __esm({
  "playable-preview/src/view-collection.ts"() {
    init_dom();
    init_app_state();
    init_CollectionData();
    lastTab = "dessert";
  }
});

// playable-preview/src/home.ts
init_dom();
init_app_state();
init_view_collection();

// playable-preview/src/view-tasks.ts
init_dom();
init_app_state();
init_ProgressManager();
function showTasks(root, onBack) {
  const render = () => {
    const cards = DAILY_TASKS.map((t) => {
      const cur = progress.taskProgress(t.id);
      const pct = Math.min(100, Math.round(cur / t.target * 100));
      const done = progress.isTaskComplete(t.id);
      const claimed = progress.isTaskClaimed(t.id);
      return `<div class="task-card ${claimed ? "claimed" : done ? "done" : ""}">
        <div class="task-icon"><img src="${ASSET.ui(t.icon)}"></div>
        <div class="task-main">
          <div class="task-name">${t.name}</div>
          <div class="task-bar"><i style="width:${pct}%"></i></div>
          <div class="task-meta">
            <span>${cur} / ${t.target}</span>
            <span class="task-rw"><img src="${ASSET.ui("coin")}">${t.coins}<img src="${ASSET.ui("icon_fragment")}">${t.fragments}</span>
          </div>
        </div>
        <button class="btn small ${claimed ? "ghost" : "primary"}" data-task="${t.id}" ${done && !claimed ? "" : "disabled"}>
          ${claimed ? "\u5DF2\u9886\u53D6" : done ? "\u9886\u53D6" : "\u8FDB\u884C\u4E2D"}
        </button>
      </div>`;
    }).join("");
    const dailyReady = canClaimDaily();
    const streak = save.data.dailyReward.streak;
    root.innerHTML = "";
    const page = el(`
      <div class="page tasks-page">
        <div class="col-header">
          <button class="btn small ghost" id="back">\u2039 \u8FD4\u56DE</button>
          <h2>\u6BCF\u65E5\u4EFB\u52A1</h2>
          <div class="pill"><img src="${ASSET.ui("icon_fragment")}"><b>${collection.fragments}</b></div>
        </div>
        <div class="tasks-hint">\u4EFB\u52A1\u6BCF\u5929 0 \u70B9\u91CD\u7F6E \xB7 \u8FDB\u5EA6\u7531\u771F\u5B9E\u5BF9\u5C40\u884C\u4E3A\u8BB0\u5F55</div>
        <div class="tasks-list">${cards}</div>
        <div class="signin-card">
          <div class="si-left">
            <b>\u6BCF\u65E5\u7B7E\u5230</b>
            <span>\u8FDE\u7EED\u7B7E\u5230 ${streak} \u5929 \xB7 \u5956\u52B1\u968F\u5929\u6570\u63D0\u5347</span>
          </div>
          <button class="btn small ${dailyReady ? "primary" : "ghost"}" id="signin" ${dailyReady ? "" : "disabled"}>
            ${dailyReady ? "\u7B7E\u5230\u9886\u53D6" : "\u4ECA\u65E5\u5DF2\u7B7E"}
          </button>
        </div>
      </div>`);
    root.appendChild(page);
    page.querySelector("#back").addEventListener("click", onBack);
    page.querySelectorAll("[data-task]").forEach(
      (b) => b.addEventListener("click", () => {
        const id = b.dataset.task;
        const r = claimTask(id);
        if (r.ok) {
          toast(`\u9886\u53D6\u6210\u529F +${r.coins} \u91D1\u5E01 +${r.fragments} \u788E\u7247`);
          render();
        } else toast(r.reason === "claimed" ? "\u5DF2\u9886\u53D6" : "\u4EFB\u52A1\u672A\u5B8C\u6210");
      })
    );
    page.querySelector("#signin").addEventListener("click", () => {
      const r = claimDaily();
      if (r.ok) {
        toast(`\u7B7E\u5230\u6210\u529F +${r.amount} \u91D1\u5E01`);
        render();
      } else toast("\u4ECA\u65E5\u5DF2\u7B7E\u5230");
    });
    void currency;
  };
  render();
}

// playable-preview/src/view-shop.ts
init_dom();
init_app_state();
var NAMES = { undo: "\u64A4\u56DE", shuffle: "\u6D17\u724C", remove: "\u79FB\u9664", extra_slot: "\u989D\u5916\u69FD\u4F4D" };
var ICONS = { undo: "book", shuffle: "blocks", remove: "eraser", extra_slot: "penholder" };
var PRICES = { undo: 150, shuffle: 150, remove: 250, extra_slot: 200 };
function showShop(_root, onBack) {
  const render = () => {
    const m = modal(`
      <div class="popup shop-popup">
        <h3>\u9053\u5177\u5546\u5E97</h3>
        <div class="shop-list">
          ${["undo", "shuffle", "remove", "extra_slot"].map(
      (t) => `<div class="shop-row">
                <img src="${ASSET.item(ICONS[t])}">
                <div class="shop-info"><b>${NAMES[t]}</b><span>\u6301\u6709 ${inventory.get(t)}</span></div>
                <button class="btn small primary" data-buy="${t}">${PRICES[t]} \u91D1\u5E01</button>
              </div>`
    ).join("")}
        </div>
        <button class="btn ghost" id="adFree">\u770B\u5E7F\u544A\uFF08Mock\uFF09+1 \u64A4\u56DE +80 \u91D1\u5E01</button>
        <button class="btn small" id="close">\u5173\u95ED</button>
      </div>`);
    m.querySelector("#close").addEventListener("click", () => {
      m.remove();
      onBack();
    });
    m.querySelectorAll("[data-buy]").forEach(
      (b) => b.addEventListener("click", () => {
        const t = b.dataset.buy;
        if (buyBooster(t)) {
          toast("\u8D2D\u4E70\u6210\u529F");
          m.remove();
          render();
        } else toast("\u91D1\u5E01\u4E0D\u8DB3");
      })
    );
    m.querySelector("#adFree").addEventListener("click", async () => {
      const rid = `shop_ad_${Date.now()}`;
      const r = await ad.showRewardedAd("booster", rid);
      if (r.completed && rewards.grant(rid)) {
        inventory.add("undo", 1);
        currency.add(80, "ad");
        persist();
        toast("\u9886\u53D6\u6210\u529F\uFF08Mock \u5E7F\u544A\uFF09");
        m.remove();
        render();
      } else toast("\u5E7F\u544A\u672A\u5B8C\u6210\uFF0C\u672A\u53D1\u653E\u5956\u52B1");
    });
  };
  render();
  void addFragments;
}

// playable-preview/src/view-settings.ts
init_dom();
init_app_state();
function showSettings(_root, onBack) {
  const info = playerInfo();
  const st = save.data.stats;
  const m = modal(`
    <div class="popup settings-popup">
      <h3>\u8BBE\u7F6E</h3>
      <div class="setting-row">
        <span>\u80CC\u666F\u97F3\u4E50</span>
        <button class="btn small ${save.data.settings.musicOn ? "primary" : "ghost"}" id="music">${save.data.settings.musicOn ? "\u5F00" : "\u5173"}</button>
      </div>
      <div class="setting-row">
        <span>\u6E38\u620F\u97F3\u6548</span>
        <button class="btn small ${save.data.settings.sfxOn ? "primary" : "ghost"}" id="sfx">${save.data.settings.sfxOn ? "\u5F00" : "\u5173"}</button>
      </div>
      <div class="stats-card">
        <div><b>Lv.${info.level}</b><span>\u73A9\u5BB6\u7B49\u7EA7</span></div>
        <div><b>${info.owned}</b><span>\u6536\u85CF\u54C1</span></div>
        <div><b>${collection.fragments}</b><span>\u788E\u7247</span></div>
        <div><b>${st.wins}</b><span>\u901A\u5173\u6B21\u6570</span></div>
      </div>
      <div class="settings-note">\u5B58\u6863 schemaVersion ${save.data.schemaVersion} \xB7 \u6570\u636E\u4EC5\u4FDD\u5B58\u5728\u672C\u673A</div>
      <button class="btn small" id="close">\u5173\u95ED</button>
    </div>`);
  const toggle = (key) => {
    save.data.settings[key] = !save.data.settings[key];
    persist();
    toast(save.data.settings[key] ? "\u5DF2\u5F00\u542F" : "\u5DF2\u5173\u95ED");
    m.remove();
    showSettings(_root, onBack);
  };
  m.querySelector("#music").addEventListener("click", () => toggle("musicOn"));
  m.querySelector("#sfx").addEventListener("click", () => toggle("sfxOn"));
  m.querySelector("#close").addEventListener("click", () => {
    m.remove();
    onBack();
  });
  void el;
  void ASSET;
}

// playable-preview/src/game.ts
init_dom();

// assets/scripts/core/EventHub.ts
var EventHub = class {
  constructor() {
    this.map = /* @__PURE__ */ new Map();
  }
  on(event, fn) {
    let set = this.map.get(event);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.map.set(event, set);
    }
    set.add(fn);
  }
  off(event, fn) {
    this.map.get(event)?.delete(fn);
  }
  offAll() {
    this.map.clear();
  }
  emit(event, ...args) {
    const set = this.map.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        fn(...args);
      } catch (e) {
        if (typeof console !== "undefined") console.error(`[EventHub] handler error on "${String(event)}"`, e);
      }
    }
  }
};

// assets/scripts/core/GameConfig.ts
var BASE_SLOT_CAPACITY = 7;
var OCCLUSION_OVERLAP_RATIO = 0.35;
var MAX_UNDO_HISTORY = 10;
var EXTRA_SLOT_MOVES = 15;

// assets/scripts/gameplay/logic/OcclusionGraph.ts
var OcclusionGraph = class _OcclusionGraph {
  constructor(ratio) {
    /** lowerId -> 遮挡它的 upperId 集合 */
    this.blockedBy = /* @__PURE__ */ new Map();
    this.ratio = ratio;
  }
  /** 由全部在场物品重建显式遮挡边（传入数组顺序即渲染顺序） */
  rebuild(tiles) {
    this.blockedBy.clear();
    for (const t of tiles) this.blockedBy.set(t.id, /* @__PURE__ */ new Set());
    const n = tiles.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const a = tiles[i];
        const b = tiles[j];
        if (a.status === "removed" || b.status === "removed") continue;
        const aAbove = a.layer > b.layer || a.layer === b.layer && i > j;
        if (!aAbove) continue;
        if (_OcclusionGraph.overlaps(a, b, this.ratio)) {
          this.blockedBy.get(b.id).add(a.id);
        }
      }
    }
  }
  static overlaps(up, low, ratio) {
    const overlapX = Math.min(up.x + up.w, low.x + low.w) - Math.max(up.x, low.x);
    const overlapY = Math.min(up.y + up.h, low.y + low.h) - Math.max(up.y, low.y);
    if (overlapX <= 0 || overlapY <= 0) return false;
    const minW = Math.min(up.w, low.w);
    const minH = Math.min(up.h, low.h);
    return overlapX >= minW * ratio && overlapY >= minH * ratio;
  }
  /** 遮挡 tileId 的、仍在上层的有效遮挡者 */
  activeOccluders(tileId, isBlocking) {
    const set = this.blockedBy.get(tileId);
    if (!set) return [];
    const out = [];
    for (const id of set) if (isBlocking(id)) out.push(id);
    return out;
  }
  /** 调试：导出边列表 */
  exportEdges() {
    const edges = [];
    for (const [lower, uppers] of this.blockedBy) {
      for (const upper of uppers) edges.push({ upper, lower });
    }
    return edges;
  }
};

// assets/scripts/gameplay/logic/BoardLogic.ts
var BoardLogic = class _BoardLogic {
  constructor(tiles, ratio = OCCLUSION_OVERLAP_RATIO) {
    this.tiles = /* @__PURE__ */ new Map();
    this.matchesDone = 0;
    this.order = [];
    this.occlusion = new OcclusionGraph(ratio);
    for (const t of tiles) {
      this.tiles.set(t.id, t);
      this.order.push(t.id);
    }
    this.occlusion.rebuild(tiles);
  }
  static fromLevel(level) {
    const frozen = new Set(level.obstacles.frozenTileIds);
    const locked = new Set(level.obstacles.lockedTileIds);
    const tiles = level.itemPositions.map((p) => _BoardLogic.tileFromPlacement(p));
    for (const t of tiles) {
      if (frozen.has(t.id)) t.frozen = 1;
      if (locked.has(t.id)) {
        t.locked = true;
        t.unlockAfterMatches = level.obstacles.lockedUnlockAfterMatches ?? 2;
      }
    }
    return new _BoardLogic(tiles);
  }
  static tileFromPlacement(p) {
    return {
      id: p.id,
      type: p.type,
      layer: p.layer,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
      frozen: 0,
      locked: false,
      unlockAfterMatches: 0,
      status: "idle"
    };
  }
  get remainingCount() {
    let n = 0;
    for (const t of this.tiles.values()) if (t.status !== "removed") n++;
    return n;
  }
  getTile(id) {
    return this.tiles.get(id);
  }
  allTiles() {
    return this.order.map((id) => this.tiles.get(id));
  }
  liveTiles() {
    return this.allTiles().filter((t) => t.status !== "removed");
  }
  isBlocking(upperId) {
    const t = this.tiles.get(upperId);
    return !!t && t.status !== "removed";
  }
  isTileClickable(id) {
    const t = this.tiles.get(id);
    if (!t || t.status === "removed") return false;
    if (t.frozen > 0) return false;
    if (t.locked) return false;
    return this.occlusion.activeOccluders(id, this.isBlocking.bind(this)).length === 0;
  }
  /** 当前全部可点击物品 */
  getClickableTiles() {
    return this.liveTiles().filter((t) => this.isTileClickable(t.id));
  }
  /** 标记移除（逻辑立即生效，表现层负责动画） */
  removeTile(id) {
    const t = this.tiles.get(id);
    if (!t || t.status === "removed") return false;
    t.status = "removed";
    return true;
  }
  /** 每次三消成功调用：冰冻 -1，锁定检查 */
  onMatchResolved() {
    this.matchesDone++;
    for (const t of this.tiles.values()) {
      if (t.frozen > 0) t.frozen--;
      if (t.locked && this.matchesDone >= t.unlockAfterMatches && t.unlockAfterMatches > 0) {
        t.locked = false;
      }
    }
  }
  /**
   * 洗牌：把剩余物品的位置/层（矩形）重新分配，保持数量与遮挡结构规模不变。
   * 洗牌后重建遮挡图。
   */
  shuffle(rand) {
    const live = this.liveTiles();
    const rects = live.map((t) => ({
      layer: t.layer,
      x: t.x,
      y: t.y,
      w: t.w,
      h: t.h
    }));
    for (let i = rects.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = rects[i];
      rects[i] = rects[j];
      rects[j] = tmp;
    }
    live.forEach((t, i) => {
      t.layer = rects[i].layer;
      t.x = rects[i].x;
      t.y = rects[i].y;
    });
    this.occlusion.rebuild(this.allTiles());
  }
  /** 导出显式遮挡边（供校验/调试） */
  exportEdges() {
    return this.occlusion.exportEdges();
  }
};

// assets/scripts/gameplay/logic/MatchManager.ts
var MatchManager = class _MatchManager {
  /**
   * 扫描一次：返回所有「三个连续相同」的组（不修改数据）。
   * 四连同类型（理论上玩家连拿四个相同）只消费前三个，剩余一个继续参与后续扫描。
   */
  static findConsecutiveTriples(items) {
    const groups = [];
    let i = 0;
    while (i <= items.length - 3) {
      const a = items[i];
      const b = items[i + 1];
      const c = items[i + 2];
      if (a.itemType === b.itemType && b.itemType === c.itemType) {
        groups.push({ items: [a, b, c], startIndex: i });
        a.state = "matching";
        b.state = "matching";
        c.state = "matching";
        i += 3;
      } else {
        i++;
      }
    }
    return groups;
  }
  /**
   * 结算：单轮扫描消除全部「三个连续相同」组，剩余物品向左补位一次。
   * （按官方用例语义：[A,A,B,B,B,A,A] 只消除中间三个 B，两侧剩余 A 补位后不再触发消除；
   *   自然游玩中物品只从槽尾追加，任何新三连必然由最后一次拾取构成，单轮已完备。）
   * 消除即从数据中移除，从机制上杜绝重复消除与数据错乱。
   */
  static resolve(items) {
    const groups = _MatchManager.findConsecutiveTriples(items);
    if (groups.length === 0) {
      return { groups, remaining: items.slice() };
    }
    const removed = /* @__PURE__ */ new Set();
    for (const g of groups) {
      for (const it of g.items) {
        it.state = "removed";
        removed.add(it.uniqueId);
      }
    }
    const remaining = items.filter((it) => !removed.has(it.uniqueId));
    return { groups, remaining };
  }
  /**
   * 判断追加一个 type 到槽尾是否会立即触发消除（供求解器/提示使用）。
   * 只有槽尾两个与 type 相同（追加后构成三连）才会触发。
   */
  static appendingCompletesTriple(items, type) {
    const n = items.length;
    return n >= 2 && items[n - 1].itemType === type && items[n - 2].itemType === type;
  }
  /** 槽尾物品类型（尾部配对启发式用） */
  static tailType(items) {
    return items.length ? items[items.length - 1].itemType : null;
  }
};

// assets/scripts/gameplay/logic/SlotModel.ts
var SlotModel = class {
  constructor(baseCapacity) {
    this.items = [];
    this.extraMovesLeft = 0;
    this.extraCapacity = 0;
    this.baseCapacity = baseCapacity;
  }
  get capacity() {
    return this.baseCapacity + this.extraCapacity;
  }
  get occupiedCount() {
    return this.items.length;
  }
  isFull() {
    return this.items.length >= this.capacity;
  }
  get hasExtraSlot() {
    return this.extraCapacity > 0;
  }
  /** 临时扩容（额外槽位道具），moves 次操作后收回 */
  grantExtraSlot(moves) {
    this.extraCapacity = Math.max(this.extraCapacity, 1);
    this.extraMovesLeft = moves;
  }
  tickExtraMove() {
    if (this.extraCapacity > 0) {
      this.extraMovesLeft--;
      if (this.extraMovesLeft <= 0) {
        this.extraCapacity = 0;
        while (this.items.length > this.baseCapacity) {
          this.items.pop();
        }
      }
    }
  }
  /**
   * 追加一个物品：按进入顺序放到槽位尾部，然后由 MatchManager 结算连续消除（含级联）。
   */
  add(tileId, type) {
    if (this.isFull()) return { inserted: false, index: -1, groups: [], fullAfterInsert: this.isFull() };
    const item = { uniqueId: tileId, itemType: type, state: "entering" };
    this.items.push(item);
    const index = this.items.length - 1;
    item.state = "idle";
    const { groups, remaining } = MatchManager.resolve(this.items);
    this.items = remaining;
    if (groups.length === 0) {
      this.tickExtraMove();
    }
    return { inserted: true, index, groups: groups.map((g) => g.items), fullAfterInsert: this.isFull() };
  }
  /** 用于撤回：整体恢复（拷贝） */
  restore(items, capacity, extraMovesLeft, baseCapacity) {
    this.baseCapacity = baseCapacity;
    this.items = items.map((it) => ({ ...it }));
    this.extraCapacity = capacity - baseCapacity;
    this.extraMovesLeft = extraMovesLeft;
  }
  /** 兼容视图序列化 */
  snapshot() {
    const out = new Array(this.capacity).fill(null);
    this.items.forEach((it, i) => {
      if (i < out.length) out[i] = { ...it };
    });
    return out;
  }
};

// assets/scripts/gameplay/logic/GameSession.ts
var GameSession = class {
  constructor(level, opts = {}) {
    this.state = "READY";
    this.combo = 0;
    this.maxCombo = 0;
    /** 本局道具使用次数（星级评价用） */
    this.boostersUsed = 0;
    /** 表现层动画期间置 true，锁输入防止重复点击 */
    this.inputLocked = false;
    this.events = new EventHub();
    this.history = [];
    /** 有限道具：0 = 不限制 */
    this.boosterLimit = 0;
    this.level = level;
    this.opts = {
      capacity: opts.capacity ?? 7,
      extraSlotMoves: opts.extraSlotMoves ?? EXTRA_SLOT_MOVES
    };
    this.boosterLimit = level.boosterLimit ?? 0;
    this.board = BoardLogic.fromLevel(level);
    this.slots = new SlotModel(this.opts.capacity);
  }
  /** 道具是否仍可用（关卡限制） */
  canUseBooster() {
    return this.boosterLimit === 0 || this.boostersUsed < this.boosterLimit;
  }
  getBoosterLimitRemaining() {
    return this.boosterLimit === 0 ? Infinity : Math.max(0, this.boosterLimit - this.boostersUsed);
  }
  start() {
    this.setState("PLAYING");
  }
  setState(s) {
    const from = this.state;
    this.state = s;
    this.events.emit("state:changed", { from, to: s });
  }
  // ---------------- 快照 / 撤回 ----------------
  snapshot() {
    this.history.push({
      tiles: this.board.allTiles().map((t) => ({
        id: t.id,
        status: t.status,
        frozen: t.frozen,
        locked: t.locked
      })),
      slots: this.slots.items.map((it) => ({ ...it })),
      capacity: this.slots.capacity,
      combo: this.combo,
      extraMovesLeft: this.slots.extraMovesLeft
    });
    if (this.history.length > MAX_UNDO_HISTORY) this.history.shift();
  }
  /** 是否可撤回（至少存在一次有效操作，且槽位道具状态允许） */
  canUndo() {
    return this.state === "PLAYING" && this.history.length > 0;
  }
  /** 撤回：恢复上一次有效操作前的状态 */
  undo() {
    if (!this.canUndo()) return false;
    const snap = this.history.pop();
    for (const s of snap.tiles) {
      const t = this.board.getTile(s.id);
      if (t) {
        t.status = s.status;
        t.frozen = s.frozen;
        t.locked = s.locked;
      }
    }
    this.slots.restore(snap.slots, snap.capacity, snap.extraMovesLeft, this.opts.capacity);
    this.combo = snap.combo;
    this.board.occlusion.rebuild(this.board.allTiles());
    this.events.emit("board:changed", {});
    return true;
  }
  // ---------------- 核心拾取流程 ----------------
  /**
   * 纯逻辑可行性检查（不含表现层输入锁）。
   * inputLocked 是表现层闸门：视图层在触摸入口处自行检查并拦截。
   */
  canPick(tileId) {
    if (this.state !== "PLAYING") return { ok: false, reason: `state=${this.state}` };
    const t = this.board.getTile(tileId);
    if (!t || t.status === "removed") return { ok: false, reason: "not_exists" };
    if (t.frozen > 0) return { ok: false, reason: "frozen" };
    if (t.locked) return { ok: false, reason: "locked" };
    if (!this.board.isTileClickable(tileId)) return { ok: false, reason: "occluded" };
    if (this.slots.isFull()) return { ok: false, reason: "slots_full" };
    return { ok: true };
  }
  /**
   * 玩家点击物品（逻辑立即结算；表现层监听事件做动画）。
   * 注意：防重复点击由视图层的 inputLocked 闸门保证（入口处检查），
   * 本方法不做输入锁检查，供视图层在置锁后安全调用。
   */
  pickTile(tileId) {
    const check = this.canPick(tileId);
    if (!check.ok) {
      this.events.emit("tile:rejected", { tileId, reason: check.reason ?? "unknown" });
      return check;
    }
    const tile = this.board.getTile(tileId);
    this.snapshot();
    const res = this.slots.add(tileId, tile.type);
    if (!res.inserted) return { ok: false, reason: "slots_full" };
    this.board.removeTile(tileId);
    this.events.emit("tile:picked", { tileId, type: tile.type, slotIndex: res.index });
    this.events.emit("board:changed", {});
    if (res.groups.length > 0) {
      this.setState("MATCHING");
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      res.groups.forEach((group, groupIndex) => {
        this.board.onMatchResolved();
        this.events.emit("match:cleared", {
          type: group[0].itemType,
          slotItems: group.map((g) => ({ tileId: g.uniqueId, type: g.itemType })),
          combo: this.combo,
          groupIndex
        });
      });
    } else {
      if (this.combo > 0) this.combo = 0;
      if (res.fullAfterInsert) {
        this.events.emit("slot:full", {});
      } else if (this.slots.occupiedCount >= this.slots.capacity - 2) {
        this.events.emit("slot:tight", { occupied: this.slots.occupiedCount, capacity: this.slots.capacity });
      }
    }
    this.evaluateEnd();
    if (this.state === "MATCHING") this.setState("PLAYING");
    return { ok: true, willMatch: res.groups.length > 0 };
  }
  /** 通关星级：1 基础 + (最大连击≥2) + (未用道具) */
  getStars() {
    let stars = 1;
    if (this.maxCombo >= 2) stars++;
    if (this.boostersUsed === 0) stars++;
    return Math.min(3, stars);
  }
  evaluateEnd() {
    if (this.board.remainingCount === 0) {
      this.setState("VICTORY");
      this.events.emit("game:victory", { bonusCoins: 0, stars: this.getStars() });
      return;
    }
    if (this.slots.isFull()) {
      this.setState("FAILED");
      this.events.emit("game:failed", {});
    }
  }
  // ---------------- 道具 ----------------
  useUndo() {
    if (!this.canUseBooster()) return false;
    const ok = this.undo();
    if (ok) {
      this.boostersUsed++;
      this.events.emit("booster:used", { type: "undo" });
    }
    return ok;
  }
  useShuffle(rand = Math.random) {
    if (!this.canUseBooster()) return false;
    if (this.state !== "PLAYING" || this.board.remainingCount === 0) return false;
    this.snapshot();
    this.board.shuffle(rand);
    this.boostersUsed++;
    this.events.emit("booster:used", { type: "shuffle" });
    this.events.emit("board:changed", {});
    return true;
  }
  /** 移除道具：直接移除一个合法（可点击）物品，不进入槽位 */
  useRemove(tileId) {
    if (!this.canUseBooster()) return false;
    const t = this.board.getTile(tileId);
    if (this.state !== "PLAYING" || !t || t.status === "removed" || !this.board.isTileClickable(tileId)) {
      return false;
    }
    this.snapshot();
    this.board.removeTile(tileId);
    this.boostersUsed++;
    this.events.emit("booster:used", { type: "remove" });
    this.events.emit("board:changed", {});
    this.evaluateEnd();
    return true;
  }
  useExtraSlot() {
    if (!this.canUseBooster()) return false;
    if (this.state !== "PLAYING") return false;
    if (this.slots.hasExtraSlot) return false;
    this.slots.grantExtraSlot(this.opts.extraSlotMoves);
    this.boostersUsed++;
    this.events.emit("booster:used", { type: "extra_slot" });
    this.events.emit("board:changed", {});
    return true;
  }
  /** 额外槽位剩余有效次数（显示用） */
  getExtraSlotMovesLeft() {
    return this.slots.hasExtraSlot ? this.slots.extraMovesLeft : 0;
  }
  // ---------------- 查询 ----------------
  get remainingCount() {
    return this.board.remainingCount;
  }
  getClickableTiles() {
    return this.board.getClickableTiles();
  }
  /** 暂停 / 恢复（弹窗、广告播放时使用） */
  pause() {
    if (this.state === "PLAYING") this.setState("PAUSED");
  }
  resume() {
    if (this.state === "PAUSED") this.setState("PLAYING");
  }
  /** 胜利时的收集奖励统计 */
  getBonusCollected() {
    const bonus = this.level.specialObjectives?.bonusTypes ?? [];
    return bonus.map((b) => ({ typeId: b.typeId, count: b.count }));
  }
};

// assets/scripts/level/LevelGenerator.ts
init_Rand();

// assets/scripts/items/ItemCatalog.ts
var ITEM_CATALOG = [
  { id: "apple", name: "\u82F9\u679C", category: "fruit" },
  { id: "banana", name: "\u9999\u8549", category: "fruit" },
  { id: "strawberry", name: "\u8349\u8393", category: "fruit" },
  { id: "grape", name: "\u8461\u8404", category: "fruit" },
  { id: "orange", name: "\u6A59\u5B50", category: "fruit" },
  { id: "cherry", name: "\u6A31\u6843", category: "fruit" },
  { id: "cake", name: "\u86CB\u7CD5", category: "dessert" },
  { id: "donut", name: "\u751C\u751C\u5708", category: "dessert" },
  { id: "cookie", name: "\u66F2\u5947", category: "dessert" },
  { id: "icecream", name: "\u51B0\u6DC7\u6DCB", category: "dessert" },
  { id: "macaron", name: "\u9A6C\u5361\u9F99", category: "dessert" },
  { id: "pudding", name: "\u5E03\u4E01", category: "dessert" },
  { id: "bear", name: "\u5C0F\u718A", category: "toy" },
  { id: "blocks", name: "\u79EF\u6728", category: "toy" },
  { id: "duck", name: "\u9E2D\u5B50", category: "toy" },
  { id: "car", name: "\u6C7D\u8F66", category: "toy" },
  { id: "ball", name: "\u76AE\u7403", category: "toy" },
  { id: "robot", name: "\u673A\u5668\u4EBA", category: "toy" },
  { id: "cup", name: "\u6C34\u676F", category: "household" },
  { id: "clock", name: "\u95F9\u949F", category: "household" },
  { id: "headphones", name: "\u8033\u673A", category: "household" },
  { id: "toothbrush", name: "\u7259\u5237", category: "household" },
  { id: "soap", name: "\u9999\u7682", category: "household" },
  { id: "key", name: "\u94A5\u5319", category: "household" },
  { id: "pencil", name: "\u94C5\u7B14", category: "stationery" },
  { id: "book", name: "\u4E66\u672C", category: "stationery" },
  { id: "eraser", name: "\u6A61\u76AE", category: "stationery" },
  { id: "scissors", name: "\u526A\u5200", category: "stationery" },
  { id: "ruler", name: "\u5C3A\u5B50", category: "stationery" },
  { id: "penholder", name: "\u7B14\u7B52", category: "stationery" }
];
var ALL_TYPE_IDS = ITEM_CATALOG.map((i) => i.id);

// assets/scripts/level/LevelGenerator.ts
var TILE = 100;
var DEBUG = (() => {
  try {
    const g = globalThis;
    return !!(g && g.process && g.process.env && g.process.env.LEVELGEN_DEBUG === "1");
  } catch {
    return false;
  }
})();
var PILE_CENTER = { x: 375, y: 470 };
var PILE_MAX_R = 262;
var SAFE = { x0: 30, x1: 604, y0: 24, y1: 742 };
var PATTERNS = [
  { cost: 1, seq: "AAA" },
  { cost: 2, seq: "AABBBA" },
  { cost: 3, seq: "AABBBCCCA" },
  { cost: 2, seq: "ABBBAA" }
];
function expandPattern(p, typeIds) {
  const map = /* @__PURE__ */ new Map();
  const out = [];
  let ti = 0;
  for (const ch of p.seq) {
    if (!map.has(ch)) {
      if (ti >= typeIds.length) return null;
      map.set(ch, typeIds[ti++]);
    }
    out.push(map.get(ch));
  }
  return out;
}
function deriveEdges(positions) {
  const edges = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      const a = positions[i];
      const b = positions[j];
      const aAbove = a.layer > b.layer || a.layer === b.layer && i > j;
      if (!aAbove) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox >= Math.min(a.w, b.w) * OCCLUSION_OVERLAP_RATIO && oy >= Math.min(a.h, b.h) * OCCLUSION_OVERLAP_RATIO) {
        edges.push({ upper: a.id, lower: b.id });
      }
    }
  }
  return edges;
}
function measureDensity(positions) {
  const n = positions.length;
  let hidden = 0;
  let visibleSum = 0;
  const S = 5;
  for (let i = 0; i < n; i++) {
    const t = positions[i];
    let vis = 0;
    for (let gx = 0; gx < S; gx++) {
      for (let gy = 0; gy < S; gy++) {
        const px = t.x + 10 + gx * 20;
        const py = t.y + 10 + gy * 20;
        let covered = false;
        for (let j = 0; j < n && !covered; j++) {
          if (j === i) continue;
          const o = positions[j];
          const above = o.layer > t.layer || o.layer === t.layer && j > i;
          if (!above) continue;
          if (px >= o.x && px < o.x + o.w && py >= o.y && py < o.y + o.h) covered = true;
        }
        if (!covered) vis++;
      }
    }
    visibleSum += vis / (S * S);
    if (vis === 0) hidden++;
  }
  return { hiddenRatio: hidden / n, avgVisible: visibleSum / n };
}
function buildGeometry(spec, rand, layers, radius, minDist, total) {
  const weights = Array.from({ length: layers }, (_, l) => {
    const mid = (layers - 1) / 2;
    return 0.75 + 0.55 * (1 - Math.abs(l - mid) / Math.max(1, mid));
  });
  const wSum = weights.reduce((a, b) => a + b, 0);
  const layerCounts = weights.map((w) => Math.max(2, Math.round(total * w / wSum)));
  let diff = total - layerCounts.reduce((a, b) => a + b, 0);
  let li = 0;
  while (diff !== 0 && li < 4e3) {
    const idx = li % layers;
    if (diff > 0) {
      layerCounts[idx]++;
      diff--;
    } else if (layerCounts[idx] > 2) {
      layerCounts[idx]--;
      diff++;
    }
    li++;
  }
  const layerPoints = Array.from({ length: layers }, () => []);
  const layerOffset = Array.from({ length: layers }, () => ({
    x: (rand() * 2 - 1) * 26,
    y: (rand() * 2 - 1) * 22,
    rot: (rand() * 2 - 1) * 0.28
  }));
  const placeOf = (l) => {
    const shrink = 1 - l * 0.075;
    const off = layerOffset[l];
    let best = { x: PILE_CENTER.x, y: PILE_CENTER.y };
    let bestScore = -1;
    for (let attempt = 0; attempt < 40; attempt++) {
      const spill = rand() < spec.gen.spill;
      const rr = radius * shrink * (spill ? 0.94 + rand() * 0.16 : 0.34 + 0.6 * Math.sqrt(rand()));
      const ang = rand() * Math.PI * 2 + off.rot;
      const x = PILE_CENTER.x + off.x + Math.cos(ang) * rr;
      const y = PILE_CENTER.y + off.y + Math.sin(ang) * rr * 0.92;
      let md = Infinity;
      for (const c of layerPoints[l]) {
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < md) md = d;
      }
      if (md >= minDist) {
        best = { x, y };
        break;
      }
      if (md > bestScore) {
        bestScore = md;
        best = { x, y };
      }
    }
    layerPoints[l].push(best);
    return best;
  };
  const out = [];
  for (let l = 0; l < layers; l++) {
    for (let k = 0; k < layerCounts[l]; k++) {
      const c = placeOf(l);
      out.push({
        id: `t${out.length}`,
        type: "",
        layer: l,
        x: Math.max(SAFE.x0, Math.min(SAFE.x1, Math.round(c.x))),
        y: Math.max(SAFE.y0, Math.min(SAFE.y1, Math.round(c.y))),
        w: TILE,
        h: TILE
      });
    }
  }
  return out;
}
function recenter(positions) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of positions) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x + p.w);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y + p.h);
  }
  const dx = PILE_CENTER.x - (minX + maxX) / 2;
  const dy = PILE_CENTER.y - (minY + maxY) / 2;
  for (const p of positions) {
    p.x = Math.max(SAFE.x0, Math.min(SAFE.x1, Math.round(p.x + dx)));
    p.y = Math.max(SAFE.y0, Math.min(SAFE.y1, Math.round(p.y + dy)));
  }
  return positions;
}
function peelOrder(positions, edges, rand) {
  const n = positions.length;
  const idx = new Map(positions.map((p, i) => [p.id, i]));
  const blocked = new Array(n).fill(0);
  const occludes = Array.from({ length: n }, () => []);
  for (const e of edges) {
    const u = idx.get(e.upper);
    const l = idx.get(e.lower);
    if (u === void 0 || l === void 0) continue;
    occludes[u].push(l);
    blocked[l]++;
  }
  const removed = new Array(n).fill(false);
  const order = [];
  for (let step = 0; step < n; step++) {
    const free = [];
    for (let i = 0; i < n; i++) if (!removed[i] && blocked[i] === 0) free.push(i);
    if (!free.length) return null;
    const pick = free[Math.floor(rand() * free.length)];
    removed[pick] = true;
    order.push(pick);
    for (const l of occludes[pick]) blocked[l]--;
  }
  return order;
}
function replaySolution(level, moves, edges = level.blockerRelations) {
  const idx = new Map(level.itemPositions.map((p, i) => [p.id, i]));
  const pos = level.itemPositions;
  const frozenSet = new Set(level.obstacles.frozenTileIds);
  const lockedSet = new Set(level.obstacles.lockedTileIds);
  const unlockAfter = level.obstacles.lockedUnlockAfterMatches ?? 2;
  const n = pos.length;
  const removed = new Array(n).fill(false);
  const frozen = pos.map((p) => frozenSet.has(p.id) ? 1 : 0);
  const locked = pos.map((p) => lockedSet.has(p.id));
  const blocked = new Array(n).fill(0);
  const occludes = Array.from({ length: n }, () => []);
  for (const e of edges) {
    const u = idx.get(e.upper);
    const l = idx.get(e.lower);
    if (u === void 0 || l === void 0) continue;
    occludes[u].push(l);
    blocked[l]++;
  }
  let slots = [];
  let matches = 0;
  let remaining = n;
  for (const id of moves) {
    const i = idx.get(id);
    if (i === void 0 || removed[i]) return false;
    if (frozen[i] > 0 || locked[i] || blocked[i] > 0) return false;
    if (slots.length >= BASE_SLOT_CAPACITY) return false;
    removed[i] = true;
    remaining--;
    for (const l of occludes[i]) blocked[l]--;
    slots.push(pos[i].type);
    const rm = [];
    let k = 0;
    while (k <= slots.length - 3) {
      if (slots[k] === slots[k + 1] && slots[k + 1] === slots[k + 2]) {
        rm.push(k, k + 1, k + 2);
        k += 3;
      } else k++;
    }
    if (rm.length) {
      const set = new Set(rm);
      slots = slots.filter((_, ii) => !set.has(ii));
      matches++;
      for (let t = 0; t < n; t++) {
        if (frozen[t] > 0) frozen[t]--;
        if (locked[t] && matches >= unlockAfter) locked[t] = false;
      }
    }
  }
  return remaining === 0 && slots.length === 0;
}
function generateLevel(spec, seed) {
  const total = Math.round(spec.itemCount / 3) * 3;
  let attempts = 0;
  for (let attempt = 0; attempt < 24; attempt++) {
    attempts = attempt + 1;
    const s = seed + attempt * 7919 >>> 0;
    const rand = mulberry32(s);
    const typePool = shuffleArray(ALL_TYPE_IDS, rand).slice(0, Math.max(2, spec.typeCount));
    let positions = null;
    let usedLayers = spec.layerCount;
    let radius = spec.gen.radius;
    let minDist = spec.gen.minDist;
    let fallback = null;
    let fallbackLayers = usedLayers;
    for (let a = 0; a < 16 && !positions; a++) {
      const candLayers = usedLayers;
      const cand = recenter(buildGeometry(spec, rand, candLayers, radius, minDist, total));
      const d2 = measureDensity(cand);
      fallback = cand;
      fallbackLayers = candLayers;
      if (d2.hiddenRatio <= 0.58 && d2.avgVisible >= 0.12) {
        positions = cand;
        usedLayers = candLayers;
      } else {
        if (radius < PILE_MAX_R) radius = Math.min(PILE_MAX_R, radius + 10);
        else if (minDist < 54) minDist += 3;
        else if (usedLayers > Math.min(5, spec.layerCount)) usedLayers -= 1;
      }
    }
    if (!positions) {
      positions = fallback;
      usedLayers = fallbackLayers;
    }
    if (!positions || positions.length !== total) {
      if (DEBUG) console.warn(`[gen] L${spec.levelId} seed=${s} \u51E0\u4F55\u65E0\u6548 len=${positions ? positions.length : "null"}/${total}`);
      continue;
    }
    const edges = deriveEdges(positions);
    const order = peelOrder(positions, edges, rand);
    if (!order) {
      if (DEBUG) console.warn(`[gen] L${spec.levelId} seed=${s} \u5265\u79BB\u987A\u5E8F\u5931\u8D25`);
      continue;
    }
    const typeSeq = [];
    let poolIdx = 0;
    let bad = false;
    while (typeSeq.length < total) {
      const remain = total - typeSeq.length;
      const candidates = PATTERNS.filter((p) => p.cost * 3 <= remain);
      if (!candidates.length) {
        bad = true;
        break;
      }
      const pat = candidates[Math.floor(rand() * candidates.length)];
      const ids = [];
      for (let i = 0; i < pat.cost; i++) ids.push(typePool[(poolIdx + i) % typePool.length]);
      poolIdx += pat.cost;
      const expanded = expandPattern(pat, ids);
      if (!expanded) {
        bad = true;
        break;
      }
      typeSeq.push(...expanded);
    }
    if (bad) {
      if (DEBUG) console.warn(`[gen] L${spec.levelId} seed=${s} \u7C7B\u578B\u5206\u914D\u5931\u8D25 remain=${total - typeSeq.length}`);
      continue;
    }
    order.forEach((posIdx, i) => {
      positions[posIdx].type = typeSeq[i];
    });
    const frozenCandidates = order.map((_, i) => i).filter((i) => i >= 8);
    const frozenIdx = shuffleArray(frozenCandidates, rand).slice(0, Math.min(spec.frozenCount, frozenCandidates.length));
    const lockedCandidates = shuffleArray(
      frozenCandidates.filter((i) => !frozenIdx.includes(i)),
      rand
    ).filter((i) => i >= 14);
    const lockedIdx = lockedCandidates.slice(0, Math.min(spec.lockedCount, lockedCandidates.length));
    const placements = positions.map((p) => ({
      id: p.id,
      type: p.type,
      layer: p.layer,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h
    }));
    const usedTypes = Array.from(new Set(placements.map((p) => p.type)));
    const level = {
      levelId: spec.levelId,
      name: spec.name,
      difficulty: spec.difficulty,
      difficultyLabel: spec.difficultyLabel,
      itemTypes: usedTypes,
      itemCount: placements.length,
      layerCount: usedLayers,
      itemPositions: placements,
      blockerRelations: [],
      occlusion: { derivedFromGeometry: true, edgeCount: edges.length },
      obstacles: {
        frozenTileIds: frozenIdx.map((i) => positions[order[i]].id),
        lockedTileIds: lockedIdx.map((i) => positions[order[i]].id),
        lockedUnlockAfterMatches: 2
      },
      specialObjectives: {
        bonusTypes: usedTypes.slice(0, 2).map((t) => ({ typeId: t, count: placements.filter((p) => p.type === t).length }))
      },
      boosterLimit: spec.boosterLimit,
      solutionValidation: {
        verified: false,
        method: "runtime_generated",
        attempts,
        verifiedAt: "",
        seed: s,
        solution: []
      }
    };
    const counts = /* @__PURE__ */ new Map();
    for (const p of placements) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
    let typeOk = true;
    for (const [, c] of counts) if (c % 3 !== 0) typeOk = false;
    if (!typeOk) {
      if (DEBUG) console.warn(`[gen] L${spec.levelId} seed=${s} \u7C7B\u578B\u6570\u91CF\u975E 3 \u500D\u6570`);
      continue;
    }
    const moves = order.map((i) => positions[i].id);
    if (!replaySolution(level, moves, edges)) {
      if (DEBUG) console.warn(`[gen] L${spec.levelId} seed=${s} \u56DE\u653E\u5931\u8D25\uFF08items=${moves.length}, frozen=${level.obstacles.frozenTileIds.length}, locked=${level.obstacles.lockedTileIds.length}\uFF09`);
      continue;
    }
    level.solutionValidation = {
      verified: true,
      method: "runtime_generated + replay",
      attempts,
      verifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
      seed: s,
      solution: moves
    };
    const d = measureDensity(positions);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of positions) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + p.w);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y + p.h);
    }
    return {
      level,
      seed: s,
      attempts,
      metrics: { pileW: maxX - minX, pileH: maxY - minY, avgVisible: d.avgVisible, hiddenRatio: d.hiddenRatio, clickable: 0 }
    };
  }
  throw new Error(`\u5173\u5361 ${spec.levelId} \u751F\u6210\u5931\u8D25\uFF08seed=${seed}\uFF09`);
}

// playable-preview/src/game.ts
init_Rand();
init_app_state();

// playable-preview/src/view-chest.ts
init_dom();
init_app_state();
init_CollectionData();
function showChest(levelId2, stars, maxCombo, settle, onNext, onHome) {
  const app2 = document.getElementById("app");
  const result = settle.chest.result;
  const overlay = el(`
    <div class="overlay chest-overlay stage-1">
      <div class="chest-scene">
        <div class="rays"></div>
        <div class="confetti"></div>
        <h2 class="chest-title">\u901A\u5173\u6210\u529F\uFF01</h2>
        <div class="chest-stars">${"\u2605".repeat(stars)}${"\u2606".repeat(3 - stars)}</div>
        <div class="chest-wrap">
          <img class="chest-img" id="chestImg" src="${ASSET.ui("chest_closed")}">
          <div class="chest-hint">\u70B9\u51FB\u5F00\u542F\u6536\u85CF\u5B9D\u7BB1</div>
        </div>
        <div class="chest-rewards">
          <span class="rw-chip"><img src="${ASSET.ui("coin")}">+${settle.coins}</span>
          ${settle.milestoneCoins ? `<span class="rw-chip"><img src="${ASSET.ui("coin")}">\u91CC\u7A0B\u7891 +${settle.milestoneCoins}</span>` : ""}
          ${settle.milestoneFragments ? `<span class="rw-chip"><img src="${ASSET.ui("icon_fragment")}">+${settle.milestoneFragments}</span>` : ""}
          <span class="rw-chip">EXP +${settle.xpGained}</span>
        </div>
        <button class="btn primary" id="openChest">\u5F00\u542F\u5B9D\u7BB1</button>
      </div>
    </div>`);
  app2.appendChild(overlay);
  const openBtn = overlay.querySelector("#openChest");
  const chestImg = overlay.querySelector("#chestImg");
  openBtn.addEventListener("click", () => {
    openBtn.remove();
    overlay.classList.add("opening");
    setTimeout(() => {
      chestImg.src = ASSET.ui("chest_open");
      overlay.classList.remove("opening");
      overlay.classList.add("opened");
      if (result) revealItem(overlay, levelId2, stars, maxCombo, settle, onNext, onHome);
      else revealNothing(overlay, levelId2, onNext, onHome);
    }, 1e3);
  });
  overlay.addEventListener("click", (e) => e.stopPropagation());
}
function revealItem(overlay, levelId2, stars, maxCombo, settle, onNext, onHome) {
  const r = settle.chest.result;
  const def2 = r.def;
  const rarity = RARITIES[def2.rarity];
  const sp = collection.seriesProgress(def2.series);
  const nextLevel = levelId2 + 1;
  const panel = el(`
    <div class="reveal-panel rarity-${def2.rarity}">
      <div class="reveal-card">
        <div class="reveal-glow" style="--rc:${rarity.color}"></div>
        <div class="reveal-imgwrap">
          <img class="reveal-img" src="${ASSET.collect(def2.id)}">
          <img class="reveal-frame" src="${ASSET.ui("frame_" + def2.rarity)}">
          ${r.isNew ? '<span class="new-badge">NEW</span>' : ""}
        </div>
        <div class="rarity-chip" style="--rc:${rarity.color}">${rarity.label}</div>
        <h3 class="reveal-name">${def2.name}</h3>
        <div class="reveal-series">${seriesMeta(def2.series).name}</div>
        <p class="reveal-desc">${def2.desc}</p>
        ${r.isNew ? "" : `<p class="dup-note">\u5DF2\u62E5\u6709 \xB7 \u8F6C\u5316\u4E3A <b>${r.fragmentsGained}</b> \u6536\u85CF\u788E\u7247</p>`}
        <div class="series-progress">
          <div class="sp-head"><span>${seriesMeta(def2.series).name}</span><b>${sp.owned} / ${sp.total}</b></div>
          <div class="sp-bar"><i style="width:${sp.percent}%"></i></div>
          ${sp.complete ? `<div class="sp-done">\u7CFB\u5217\u96C6\u9F50\uFF01\u89E3\u9501\u4E3B\u9898\u300C${seriesMeta(def2.series).themeName}\u300D</div>` : ""}
        </div>
        <div class="next-info">\u4E0B\u4E00\u5173\uFF1A\u7B2C ${nextLevel} \u5173 \xB7 ${nextLevel <= 5 ? "\u96BE\u5EA6\u7EE7\u7EED\u63D0\u5347" : "\u66F4\u9AD8\u96BE\u5EA6\u6311\u6218"}</div>
        <div class="reveal-actions">
          <button class="btn primary" id="nextLv">\u4E0B\u4E00\u5173</button>
          <button class="btn ghost" id="toCollection">\u67E5\u770B\u6536\u85CF\u518C</button>
          <button class="btn small" id="toHome">\u56DE\u9996\u9875</button>
        </div>
      </div>
    </div>`);
  overlay.querySelector(".chest-scene").appendChild(panel);
  if (def2.rarity === "epic" || def2.rarity === "legendary") {
    overlay.classList.add("high-rarity");
    spawnParticles(overlay, def2.rarity === "legendary" ? 18 : 12);
  }
  panel.querySelector("#nextLv").addEventListener("click", () => {
    overlay.remove();
    onNext();
  });
  panel.querySelector("#toCollection").addEventListener("click", async () => {
    overlay.remove();
    const { showCollection: showCollection2 } = await Promise.resolve().then(() => (init_view_collection(), view_collection_exports));
    const app2 = document.getElementById("app");
    showCollection2(app2, () => onHome());
  });
  panel.querySelector("#toHome").addEventListener("click", () => {
    overlay.remove();
    onHome();
  });
  void maxCombo;
}
function revealNothing(overlay, levelId2, onNext, onHome) {
  const panel = el(`
    <div class="reveal-panel">
      <div class="reveal-card">
        <h3 class="reveal-name">\u5B9D\u7BB1\u5DF2\u9886\u53D6</h3>
        <p class="reveal-desc">\u672C\u5173\u6536\u85CF\u5956\u52B1\u5DF2\u53D1\u653E\uFF0C\u53EF\u5728\u6536\u85CF\u518C\u67E5\u770B\u3002</p>
        <div class="reveal-actions">
          <button class="btn primary" id="nextLv">\u4E0B\u4E00\u5173</button>
          <button class="btn small" id="toHome">\u56DE\u9996\u9875</button>
        </div>
      </div>
    </div>`);
  overlay.querySelector(".chest-scene").appendChild(panel);
  panel.querySelector("#nextLv").addEventListener("click", () => {
    overlay.remove();
    onNext();
  });
  panel.querySelector("#toHome").addEventListener("click", () => {
    overlay.remove();
    onHome();
  });
  void levelId2;
}
function spawnParticles(overlay, n) {
  const layer = overlay.querySelector(".confetti");
  for (let i = 0; i < n; i++) {
    const p = el(`<i class="confetti-piece" style="left:${40 + Math.random() * 20}%;animation-delay:${i * 0.05}s"></i>`);
    layer.appendChild(p);
  }
}

// playable-preview/src/game.ts
var session = null;
var tileEls = /* @__PURE__ */ new Map();
var settled = false;
var removeMode = false;
var runId = "";
var levelId = 1;
var runSeed = 0;
var renderedSlotIds = /* @__PURE__ */ new Set();
var specCache = /* @__PURE__ */ new Map();
async function loadSpec(id) {
  if (specCache.has(id)) return specCache.get(id);
  try {
    const res = await fetch(`./assets/resources/data/levels/level_${String(id).padStart(3, "0")}.json`);
    const spec = await res.json();
    specCache.set(id, spec);
    return spec;
  } catch {
    return null;
  }
}
function pickSeed(level) {
  const search = globalThis?.location?.search ?? "";
  const q = new URLSearchParams(search).get("seed");
  if (q !== null && q !== "" && Number.isFinite(Number(q))) return Number(q) >>> 0;
  return (Date.now() ^ Math.floor(Math.random() * 4294967295)) >>> 0;
}
async function startLevel(root, id) {
  const spec = await loadSpec(id);
  if (!spec) {
    toast(`\u5173\u5361 ${id} \u52A0\u8F7D\u5931\u8D25`);
    return;
  }
  runSeed = pickSeed(id);
  const gen = generateLevel(spec, runSeed);
  const lv = gen.level;
  levelId = id;
  runId = `run_${Date.now()}_${Math.floor(Math.random() * 1e5)}`;
  console.log(
    `[SortMaster] \u5173\u5361 ${id} \u5E03\u5C40\u751F\u6210 seed=${gen.seed} \u5C1D\u8BD5=${gen.attempts} \u7269\u54C1=${lv.itemCount} \u7C7B\u578B=${lv.itemTypes.length} \u5C42=${lv.layerCount} \u906E\u6321\u8FB9=${lv.occlusion?.edgeCount}`
  );
  window.__SORT_MASTER__ = {
    levelId: id,
    seed: gen.seed,
    level: lv,
    getSession: () => session
  };
  settled = false;
  removeMode = false;
  session = new GameSession(lv, { capacity: BASE_SLOT_CAPACITY, extraSlotMoves: 15 });
  tileEls = /* @__PURE__ */ new Map();
  renderedSlotIds.clear();
  ad.startRun(runId);
  root.innerHTML = "";
  const page = el(`
    <div class="page game">
      <div class="topbar">
        <button class="btn small ghost" id="home">\u2039 \u9996\u9875</button>
        <div class="game-level">\u7B2C ${id} \u5173<span>${lv.difficultyLabel ?? ""}</span></div>
        <div class="top-wallet">
          <div class="pill"><img src="${ASSET.ui("coin")}"><b id="coins">${fmt(currency.balance)}</b></div>
          <div class="pill"><img src="${ASSET.ui("icon_fragment")}"><b>${collection.fragments}</b></div>
        </div>
      </div>
      <div class="board" id="board"></div>
      <div class="combo" id="combo"></div>
      <div class="boosters" id="boosters"></div>
      <div class="tray" id="tray"></div>
      <div class="tray-label">\u6536\u7EB3\u69FD \xB7 \u8FDE\u7EED\u4E09\u4E2A\u76F8\u540C\u624D\u80FD\u6D88\u9664</div>
    </div>`);
  root.appendChild(page);
  const board = page.querySelector("#board");
  for (const t of lv.itemPositions) {
    const d = el(`<div class="tile" data-id="${t.id}"><img src="${ASSET.item(t.type)}"></div>`);
    d.style.left = `${t.x}px`;
    d.style.top = `${t.y}px`;
    const seed = (t.id.charCodeAt(1) || 0) * 37 + (t.id.charCodeAt(2) || 0) * 11 + (t.id.charCodeAt(3) || 0);
    d.style.setProperty("--rot", `${(seed % 9 - 4) * 1.75 + 0.4}deg`);
    board.appendChild(d);
    tileEls.set(t.id, d);
    d.addEventListener("click", () => onTile(t.id));
  }
  const tray = page.querySelector("#tray");
  for (let i = 0; i < BASE_SLOT_CAPACITY + 1; i++) {
    const c = el(`<div class="slot" data-idx="${i}"></div>`);
    if (i >= BASE_SLOT_CAPACITY) c.classList.add("extra", "hidden");
    tray.appendChild(c);
  }
  buildBoosters(page);
  session.events.on("tile:picked", ({ tileId, slotIndex }) => {
    const d = tileEls.get(tileId);
    const slot = tray.querySelector(`.slot[data-idx="${Math.min(slotIndex, BASE_SLOT_CAPACITY)}"]`);
    if (slot) slot.classList.remove("gather", "clearing");
    if (d && slot) {
      d.classList.add("pressed");
      setTimeout(() => {
        d.classList.remove("pressed");
        d.classList.add("lifted");
      }, 70);
      setTimeout(() => {
        d.classList.add("flying");
        const boardRect = board.getBoundingClientRect();
        const r = slot.getBoundingClientRect();
        d.style.left = `${r.left - boardRect.left}px`;
        d.style.top = `${r.top - boardRect.top}px`;
      }, 150);
      setTimeout(() => {
        d.remove();
        rebuildSlots();
      }, 400);
    }
  });
  session.events.on("match:cleared", ({ slotItems, combo }) => {
    setTimeout(() => {
      const matchedSlots = [];
      for (const it of slotItems) {
        const slot = tray.querySelector(`.slot[data-tile="${it.tileId}"]`);
        if (slot) {
          slot.classList.add("gather");
          matchedSlots.push(slot);
        }
      }
      if (matchedSlots.length) {
        const trayRect = tray.getBoundingClientRect();
        const r = matchedSlots[Math.floor(matchedSlots.length / 2)].getBoundingClientRect();
        const cx = r.left - trayRect.left + r.width / 2;
        const cy = r.top - trayRect.top + r.height / 2;
        spawnSparks(tray, cx, cy, 12);
        spawnRing(tray, cx, cy, 64);
        tray.classList.add("flash");
        setTimeout(() => tray.classList.remove("flash"), 450);
      }
      if (combo >= 2) {
        const c = page.querySelector("#combo");
        c.textContent = `COMBO x${combo}!`;
        c.classList.add("show");
        setTimeout(() => c.classList.remove("show"), 900);
      }
      setTimeout(() => {
        document.querySelectorAll(".slot.gather, .slot.clearing").forEach((el3) => el3.classList.remove("gather", "clearing"));
        rebuildSlots();
      }, 320);
    }, 300);
  });
  session.events.on("board:changed", () => {
    rebuildMissingTiles();
    refresh();
  });
  session.events.on("slot:full", () => {
    tray.classList.add("shake", "tight");
    setTimeout(() => tray.classList.remove("shake"), 500);
    setTimeout(() => tray.classList.remove("tight"), 1500);
  });
  session.events.on("slot:tight", ({ occupied, capacity }) => {
    tray.classList.add("tight");
    if (occupied === capacity - 1) toast("\u69FD\u4F4D\u53EA\u5269 1 \u683C\uFF01");
    else toast(`\u69FD\u4F4D\u7D27\u5F20\uFF08${occupied}/${capacity}\uFF09`);
    setTimeout(() => tray.classList.remove("tight"), 900);
  });
  page.querySelector("#home").addEventListener("click", () => {
    persist();
    renderHome(root);
  });
  if ((lv.difficulty ?? 1) >= 4) {
    toast(`\u26A0 \u9AD8\u96BE\u5EA6\uFF1A${lv.difficultyLabel}${lv.boosterLimit ? ` \xB7 \u9053\u5177\u9650\u7528 ${lv.boosterLimit} \u6B21` : ""}`);
  }
  session.start();
  refresh();
  rebuildSlots();
  function rebuildSlots() {
    if (!session) return;
    document.querySelectorAll(".slot").forEach((s) => {
      const se = s;
      se.classList.remove("gather", "clearing");
      se.innerHTML = "";
      se.dataset.tile = "";
    });
    const nowIds = /* @__PURE__ */ new Set();
    session.slots.items.forEach((it, i) => {
      const slot = tray.querySelector(`.slot[data-idx="${i}"]`);
      if (slot) {
        const isNew = !renderedSlotIds.has(it.uniqueId);
        slot.innerHTML = `<img class="${isNew ? "landed" : ""}" src="${ASSET.item(it.itemType)}">`;
        slot.dataset.tile = it.uniqueId;
        nowIds.add(it.uniqueId);
      }
    });
    renderedSlotIds.clear();
    nowIds.forEach((id2) => renderedSlotIds.add(id2));
    const extra = tray.querySelector(".slot.extra");
    extra?.classList.toggle("hidden", !session.slots.hasExtraSlot);
  }
  function spawnSparks(host, cx, cy, n) {
    for (let i = 0; i < n; i++) {
      const ang = Math.PI * 2 * i / n + Math.random() * 0.4;
      const dist = 34 + Math.random() * 46;
      const sp = el(`<i class="spark" style="left:${cx}px;top:${cy}px;--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist}px"></i>`);
      host.appendChild(sp);
      setTimeout(() => sp.remove(), 700);
    }
  }
  function spawnRing(host, cx, cy, size) {
    const ring = el(`<i class="ring" style="left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px"></i>`);
    host.appendChild(ring);
    setTimeout(() => ring.remove(), 560);
  }
  function rebuildMissingTiles() {
    if (!session) return;
    for (const t of session.board.liveTiles()) {
      let d = tileEls.get(t.id);
      if (!d || !document.body.contains(d)) {
        d = el(`<div class="tile" data-id="${t.id}"><img src="${ASSET.item(t.type)}"></div>`);
        d.style.left = `${t.x}px`;
        d.style.top = `${t.y}px`;
        board.appendChild(d);
        tileEls.set(t.id, d);
        const tid = t.id;
        d.addEventListener("click", () => onTile(tid));
      }
    }
  }
  function refresh() {
    if (!session) return;
    const clickable = new Set(session.getClickableTiles().map((t) => t.id));
    for (const t of session.board.liveTiles()) {
      const d = tileEls.get(t.id);
      if (!d) continue;
      d.classList.toggle("dim", !clickable.has(t.id));
      d.classList.toggle("frozen", t.frozen > 0);
      d.classList.toggle("locked", t.locked);
    }
  }
  function onTile(tileId) {
    if (!session || session.inputLocked) return;
    if (removeMode) {
      if (session.useRemove(tileId)) {
        removeMode = false;
        inventory.consume("remove");
        persist();
        const d = tileEls.get(tileId);
        d?.classList.add("clearing");
        setTimeout(() => d?.remove(), 300);
        refreshBoosters();
        checkEnd();
      } else toast("\u8BE5\u7269\u54C1\u5F53\u524D\u4E0D\u53EF\u79FB\u9664");
      return;
    }
    const check = session.canPick(tileId);
    if (!check.ok) {
      if (check.reason === "occluded") toast("\u7269\u54C1\u88AB\u4E0A\u5C42\u906E\u6321");
      else if (check.reason === "frozen") toast("\u7269\u54C1\u88AB\u51B0\u51BB\uFF0C\u5148\u5B8C\u6210\u4E00\u6B21\u6D88\u9664");
      else if (check.reason === "locked") toast("\u7269\u54C1\u88AB\u9501\u5B9A");
      return;
    }
    session.inputLocked = true;
    session.pickTile(tileId);
    setTimeout(() => {
      if (session) session.inputLocked = false;
      checkEnd();
    }, 430);
  }
  function buildBoosters(p) {
    const box = p.querySelector("#boosters");
    const defs = [
      { t: "undo", name: "\u64A4\u56DE", icon: "icon_undo" },
      { t: "shuffle", name: "\u6D17\u724C", icon: "icon_shuffle" },
      { t: "remove", name: "\u79FB\u9664", icon: "icon_remove" },
      { t: "extra_slot", name: "\u52A0\u69FD", icon: "icon_slot" }
    ];
    box.innerHTML = defs.map(
      (d) => `<button class="booster" data-b="${d.t}"><img src="${ASSET.ui(d.icon)}"><span class="cnt" id="cnt_${d.t}">${inventory.get(d.t)}</span><span class="lbl">${d.name}</span></button>`
    ).join("");
    box.querySelectorAll(".booster").forEach(
      (b) => b.addEventListener("click", () => useBooster(b.dataset.b))
    );
  }
  function refreshBoosters() {
    ["undo", "shuffle", "remove", "extra_slot"].forEach((t) => {
      const c = document.getElementById(`cnt_${t}`);
      if (c) c.textContent = String(inventory.get(t));
      const btn = document.querySelector(`.booster[data-b="${t}"]`);
      btn?.classList.toggle("empty", inventory.get(t) <= 0);
    });
  }
  function useBooster(t) {
    if (!session) return;
    if (!session.canUseBooster()) {
      toast(`\u672C\u5173\u9053\u5177\u4F7F\u7528\u5DF2\u8FBE\u4E0A\u9650\uFF08${session.boosterLimit} \u6B21\uFF09`);
      return;
    }
    if (inventory.get(t) <= 0) {
      toast("\u9053\u5177\u4E0D\u8DB3\uFF0C\u53EF\u5728\u5546\u5E97\u8D2D\u4E70");
      return;
    }
    if (t === "undo") {
      if (session.useUndo()) {
        inventory.consume("undo");
        progress.recordEvent("booster_used", 1);
        rebuildSlots();
        rebuildMissingTiles();
        refresh();
      } else toast("\u6CA1\u6709\u53EF\u64A4\u56DE\u7684\u64CD\u4F5C");
    } else if (t === "shuffle") {
      if (session.useShuffle(mulberry32(Date.now() & 4294967295))) {
        inventory.consume("shuffle");
        progress.recordEvent("booster_used", 1);
        for (const tile of session.board.liveTiles()) {
          const d = tileEls.get(tile.id);
          if (d) {
            d.style.left = `${tile.x}px`;
            d.style.top = `${tile.y}px`;
          }
        }
      }
    } else if (t === "remove") {
      removeMode = true;
      toast("\u70B9\u51FB\u4E00\u4E2A\u53EF\u70B9\u51FB\u7684\u7269\u54C1\u79FB\u9664");
    } else if (t === "extra_slot") {
      if (session.useExtraSlot()) {
        inventory.consume("extra_slot");
        progress.recordEvent("booster_used", 1);
        rebuildSlots();
      } else toast("\u989D\u5916\u69FD\u4F4D\u751F\u6548\u4E2D");
    }
    const btn = document.querySelector(`.booster[data-b="${t}"]`);
    btn?.classList.add("used");
    setTimeout(() => btn?.classList.remove("used"), 520);
    refreshBoosters();
    refresh();
    persist();
  }
  function checkEnd() {
    if (!session || settled) return;
    if (session.state === "VICTORY") {
      settled = true;
      onVictory();
    } else if (session.state === "FAILED") {
      settled = true;
      onFail();
    }
  }
  function onVictory() {
    const stars = session ? session.getStars() : 1;
    const maxCombo = session ? session.maxCombo : 0;
    const settle = settleVictory(runId, levelId, maxCombo, stars);
    if (!settle) {
      renderHome(root);
      return;
    }
    setTimeout(() => {
      showChest(levelId, stars, maxCombo, settle, () => startLevel(root, levelId + 1), () => renderHome(root));
    }, 500);
  }
  function onFail() {
    const m = el(`
      <div class="overlay"><div class="popup">
        <h3>\u69FD\u4F4D\u5DF2\u6EE1</h3>
        <p>\u6536\u7EB3\u69FD\u88AB\u5360\u6EE1\u4E86\uFF0C\u518D\u8BD5\u4E00\u6B21\uFF1F</p>
        <button class="btn ghost" id="adRevive">\u770B\u5E7F\u544A\uFF08Mock\uFF09\u590D\u6D3B</button>
        <button class="btn primary" id="coinRevive">\u82B1 200 \u91D1\u5E01\u590D\u6D3B</button>
        <button class="btn small" id="restart">\u91CD\u65B0\u5F00\u59CB</button>
        <button class="btn small" id="toHome">\u56DE\u9996\u9875</button>
      </div></div>`);
    root.appendChild(m);
    const revive = () => {
      if (session && session.undo()) {
        if (!session.slots.hasExtraSlot) session.useExtraSlot();
        rebuildSlots();
        rebuildMissingTiles();
        refresh();
        settled = false;
        m.remove();
        toast("\u590D\u6D3B\u6210\u529F");
      }
    };
    m.querySelector("#adRevive").addEventListener("click", async () => {
      const rid = `revive_${runId}`;
      const r = await ad.showRewardedAd("revive", rid);
      if (r.completed && rewards.grant(`g_${rid}`)) {
        ad.reportRewarded(rid);
        revive();
      } else toast("\u5E7F\u544A\u672A\u5B8C\u6210\uFF0C\u672A\u590D\u6D3B");
    });
    m.querySelector("#coinRevive").addEventListener("click", () => {
      if (currency.spend(200, "revive")) {
        persist();
        revive();
      } else toast("\u91D1\u5E01\u4E0D\u8DB3");
    });
    m.querySelector("#restart").addEventListener("click", () => {
      m.remove();
      startLevel(root, levelId);
    });
    m.querySelector("#toHome").addEventListener("click", () => {
      m.remove();
      renderHome(root);
    });
  }
}

// playable-preview/src/home.ts
function renderHome(root) {
  const info = playerInfo();
  const lv = currentLevel();
  const theme = activeTheme();
  const levelStars = save.data.levelStars?.[String(lv)] ?? 0;
  const diffLabel = save.data.completedLevels.includes(lv) ? "\u5DF2\u901A\u5173\uFF0C\u53EF\u518D\u6311\u6218" : lv <= 5 ? "\u5FEB\u901F\u4E0A\u624B" : lv <= 20 ? "\u591A\u5C42\u5806\u53E0" : "\u9AD8\u96BE\u6311\u6218";
  const dailyReady = canClaimDaily();
  const tasksDone = progress.completedTaskCount;
  const tasksClaimable = progress.tasks.claimed.length;
  const seriesMini = SERIES_LIST.map((s) => {
    const p = collection.seriesProgress(s);
    return `<div class="mini-series" title="${seriesMeta(s).name}">
      <div class="mini-ring" style="--p:${p.percent};--c:${seriesMeta(s).accent}"><span>${p.owned}</span></div>
      <span class="mini-name">${seriesMeta(s).name.replace("\u7CFB\u5217", "")}</span>
    </div>`;
  }).join("");
  root.innerHTML = "";
  const page = el(`
    <div class="page home ${theme ? "theme-" + theme : ""}">
      <div class="home-top">
        <div class="player-card">
          <div class="avatar">Lv.${info.level}</div>
          <div class="xp-wrap">
            <div class="xp-bar"><i style="width:${info.xpPercent}%"></i></div>
            <span class="xp-text">${info.xp} / ${100 + (info.level - 1) * 40} EXP</span>
          </div>
        </div>
        <div class="wallet">
          <div class="pill"><img src="${ASSET.ui("coin")}"><b id="coins">${fmt(info.coins)}</b></div>
          <div class="pill"><img src="${ASSET.ui("icon_fragment")}"><b id="frags">${info.fragments}</b></div>
        </div>
      </div>

      <div class="logo-wrap">
        <img class="logo" src="${ASSET.ui("logo")}">
        <div class="logo-sub">SORT MASTER</div>
      </div>

      <div class="level-card">
        <div class="lc-glow"></div>
        <div class="lc-left">
          <div class="lc-label">\u5F53\u524D\u6311\u6218</div>
          <div class="lc-num">\u7B2C ${lv} \u5173</div>
          <div class="lc-sub">${diffLabel} \xB7 <span class="stars">${"\u2605".repeat(levelStars)}${"\u2606".repeat(3 - levelStars)}</span></div>
        </div>
        <button class="btn primary start-btn" id="start">\u5F00\u59CB\u6311\u6218</button>
      </div>

      <div class="collection-card" id="collectionEntry">
        <div class="cc-head">
          <img class="cc-icon" src="${ASSET.ui("icon_book")}">
          <div class="cc-title"><b>\u6536\u85CF\u518C</b><span>${info.owned} / ${info.total} \u4EF6\u6536\u85CF\u54C1</span></div>
          <b class="cc-pct">${info.percent}%</b>
        </div>
        <div class="cc-bar"><i style="width:${info.percent}%"></i></div>
        <div class="cc-series">${seriesMini}</div>
      </div>

      <div class="quick-grid">
        <button class="quick" id="qTasks">
          <span class="q-icon"><img src="${ASSET.ui("icon_task_clear")}"></span>
          <span class="q-label">\u6BCF\u65E5\u4EFB\u52A1</span>
          ${tasksClaimable > 0 ? `<i class="badge">${tasksClaimable}</i>` : tasksDone > 0 ? `<i class="badge dot"></i>` : ""}
        </button>
        <button class="quick" id="qDaily">
          <span class="q-icon"><img src="${ASSET.ui("icon_daily")}"></span>
          <span class="q-label">\u6BCF\u65E5\u7B7E\u5230</span>
          ${dailyReady ? '<i class="badge dot"></i>' : ""}
        </button>
        <button class="quick" id="qShop">
          <span class="q-icon"><img src="${ASSET.ui("icon_slot")}"></span>
          <span class="q-label">\u9053\u5177\u5546\u5E97</span>
        </button>
        <button class="quick" id="qSettings">
          <span class="q-icon"><img src="${ASSET.ui("icon_settings")}"></span>
          <span class="q-label">\u8BBE\u7F6E</span>
        </button>
      </div>

      <div class="deco">
        <img src="${ASSET.item("apple")}"><img src="${ASSET.item("donut")}"><img src="${ASSET.item("duck")}">
        <img src="${ASSET.item("pencil")}"><img src="${ASSET.item("bear")}">
      </div>
      <div class="ad-mode">${platformIsMock() ? "Mock \u5E7F\u544A\u6A21\u5F0F\uFF08\u975E\u771F\u5B9E\u5E7F\u544A\uFF09" : "\u5FAE\u4FE1\u5E7F\u544A\u6A21\u5F0F"}</div>
    </div>`);
  root.appendChild(page);
  page.querySelector("#start").addEventListener("click", () => startLevel(root, currentLevel()));
  page.querySelector("#collectionEntry").addEventListener("click", () => showCollection(root, () => renderHome(root)));
  page.querySelector("#qTasks").addEventListener("click", () => showTasks(root, () => renderHome(root)));
  page.querySelector("#qShop").addEventListener("click", () => showShop(root, () => renderHome(root)));
  page.querySelector("#qSettings").addEventListener("click", () => showSettings(root, () => renderHome(root)));
  page.querySelector("#qDaily").addEventListener("click", () => {
    if (!canClaimDaily()) {
      toast("\u4ECA\u65E5\u5DF2\u7B7E\u5230\uFF0C\u660E\u5929\u518D\u6765");
      return;
    }
    const r = claimDaily();
    if (r.ok) {
      toast(`\u7B7E\u5230\u6210\u529F +${r.amount} \u91D1\u5E01`);
      renderHome(root);
    }
  });
}
function platformIsMock() {
  return globalThis.__SORT_MASTER_MOCK__ !== false;
}

// playable-preview/src/preview-main.ts
var app = document.getElementById("app");
renderHome(app);
