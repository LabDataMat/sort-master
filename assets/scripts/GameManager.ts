import { Node, director, game, JsonAsset, resources } from 'cc';
import { EventHub } from './core/EventHub';
import { PlatformManager } from './platform/PlatformManager';
import { SaveManager } from './systems/save/SaveManager';
import { CurrencyManager } from './systems/economy/CurrencyManager';
import { RewardManager } from './systems/economy/RewardManager';
import { BoosterInventory } from './systems/economy/BoosterInventory';
import { StatsRecorder } from './systems/stats/StatsRecorder';
import { AdManager } from './ads/AdManager';
import { AudioManager } from './systems/audio/AudioManager';
import { DailyRewardLogic } from './systems/economy/RewardManager';
import { CollectionManager, GrantResult } from './collection/CollectionManager';
import { ProgressManager } from './systems/progress/ProgressManager';
import { DAILY_TASKS } from './systems/progress/ProgressManager';
import type { SeriesId } from './collection/CollectionData';
import type { BoosterType, AdPlacement } from './core/GameConfig';
import type { BoosterStock, AdStats } from './systems/save/SaveManager';
import type { LevelData } from './level/LevelTypes';
import { generateLevel, LevelSpec } from './level/LevelGenerator';
import { Logger } from './utils/Logger';

export interface BalanceConfig {
  initialCoins: number;
  firstClearReward: number;
  clearReward: number;
  streakBonus: Record<string, number>;
  dailyRewards: number[];
  reviveCost: number;
  boosterPrices: Record<BoosterType, number>;
  initialBoosters: BoosterStock;
  extraSlotMoves: number;
  ads: { reviveMaxPerRun: number; maxAdsPerRun: number; bannerEnabledByDefault: boolean };
}

export const AD_COIN_REWARD = 80; // booster 广告奖励金币
export const DOUBLE_REWARD_MULT = 2;

/**
 * 全局管理器：组装各系统（平台/存档/经济/道具/统计/广告/音频）。
 * 所有系统之间通过本对象与事件总线协作，避免循环依赖。
 */
export class GameManager {
  private static _inst: GameManager | null = null;
  static get inst(): GameManager {
    if (!GameManager._inst) throw new Error('GameManager 未初始化');
    return GameManager._inst;
  }
  static create(): GameManager {
    if (!GameManager._inst) GameManager._inst = new GameManager();
    return GameManager._inst;
  }

  bus = new EventHub<any>();
  platform: PlatformManager;
  save: SaveManager;
  currency: CurrencyManager;
  rewards = new RewardManager();
  inventory: BoosterInventory;
  stats = new StatsRecorder();
  ad: AdManager;
  audio = AudioManager.inst;
  balance: BalanceConfig;
  collection: CollectionManager;
  progress: ProgressManager;
  /** 待开启的宝箱（runId -> 奖励），领取幂等 */
  private pendingChest = new Map<string, { levelId: number; result: GrantResult | null; claimed: boolean }>();
  /** 关卡规格缓存（布局每次进入实时生成，不缓存布局） */
  private specCache = new Map<number, LevelSpec>();
  /** 本局布局种子（用于复现与排查） */
  lastLevelSeed = 0;

  constructor() {
    this.platform = new PlatformManager();
    this.save = new SaveManager(this.platform.storage);
    this.currency = new CurrencyManager(this.save.data.coins, this.bus);
    this.inventory = new BoosterInventory(this.save.data.boosters, () => this.persist());
    this.ad = new AdManager(this.platform.adService, {
      reviveMaxPerRun: 1,
      maxAdsPerRun: 10,
      onStats: (s: AdStats) => {
        this.stats.recordAdStats(s as any);
        this.save.data.stats.adStats = { ...s };
        this.persistThrottled();
      },
    });
    this.ad.initialize();
    this.balance = this.defaultBalance();
    this.collection = new CollectionManager(
      {
        owned: this.save.data.collection ?? {},
        fragments: this.save.data.fragments ?? 0,
        seriesCompleted: (this.save.data.seriesCompleted ?? []) as SeriesId[],
      },
      (series) => {
        this.syncCollectionToSave();
        this.bus.emit('series:completed', { series });
      }
    );
    this.progress = new ProgressManager(
      { level: this.save.data.playerLevel ?? 1, xp: this.save.data.playerXp ?? 0 },
      this.save.data.dailyTasks ?? { date: '', progress: {}, claimed: [] },
      {
        onCoins: (n, reason) => this.currency.add(n, reason),
        onFragments: (n) => this.addFragments(n),
      }
    );
    this.progress.ensureToday(DailyRewardLogic.localDateStr());
    this.audio.musicOn = this.save.data.settings.musicOn;
    this.audio.sfxOn = this.save.data.settings.sfxOn;
    this.bus.on('coins:changed', ({ coins, delta }) => {
      this.save.data.coins = coins;
      this.stats.recordCoins(delta);
      this.persistThrottled();
    });
  }

  private defaultBalance(): BalanceConfig {
    return {
      initialCoins: 300,
      firstClearReward: 100,
      clearReward: 30,
      streakBonus: { '3': 10, '5': 20, '10': 50 },
      dailyRewards: [50, 60, 80, 100, 120, 150, 200],
      reviveCost: 200,
      boosterPrices: { undo: 150, shuffle: 150, remove: 250, extra_slot: 200 },
      initialBoosters: { undo: 1, shuffle: 1, remove: 1, extra_slot: 1 },
      extraSlotMoves: 15,
      ads: { reviveMaxPerRun: 1, maxAdsPerRun: 10, bannerEnabledByDefault: false },
    };
  }

  /** 从 resources 加载 balance.json（失败则用内置默认，保证可启动） */
  loadBalance(onDone: () => void) {
    resources.load('data/balance', JsonAsset, (err, asset) => {
      if (!err && asset?.json) {
        try {
          this.balance = { ...this.defaultBalance(), ...(asset.json as any) };
        } catch {
          Logger.warn('GM', 'balance.json 解析失败，使用默认经济配置');
        }
      } else {
        Logger.warn('GM', 'balance.json 加载失败，使用默认经济配置');
      }
      onDone();
    });
  }

  // ---------------- 收藏 / 成长 ----------------

  /** 将收藏与成长状态同步回存档对象 */
  syncCollectionToSave() {
    this.save.data.collection = this.collection.state.owned;
    this.save.data.fragments = this.collection.state.fragments;
    this.save.data.seriesCompleted = this.collection.state.seriesCompleted.slice();
    this.save.data.playerLevel = this.progress.player.level;
    this.save.data.playerXp = this.progress.player.xp;
    this.save.data.dailyTasks = this.progress.tasks;
    this.persistThrottled();
  }

  addFragments(n: number) {
    this.collection.addFragments(n);
    this.syncCollectionToSave();
  }

  /** 准备通关宝箱（首次通关必得收藏品；重复则转碎片） */
  prepareChest(levelId: number, runId: string): string {
    const rewardId = `chest:${runId}:${levelId}`;
    if (!this.pendingChest.has(rewardId)) {
      const result = this.collection.resolveLevelReward(levelId);
      this.pendingChest.set(rewardId, { levelId, result, claimed: false });
    }
    return rewardId;
  }

  /** 开启宝箱领取收藏品（幂等：同一 rewardId 只能领取一次） */
  claimChest(rewardId: string): GrantResult | null {
    const entry = this.pendingChest.get(rewardId);
    if (!entry || entry.claimed) return null;
    if (!this.rewards.grant(rewardId)) return null;
    entry.claimed = true;
    this.syncCollectionToSave();
    if (entry.result?.isNew) this.progress.recordEvent('new_collectible', 1);
    this.syncCollectionToSave();
    this.persist();
    return entry.result;
  }

  /** 碎片兑换未拥有的收藏品 */
  exchangeCollectible(id: string): GrantResult | null {
    const r = this.collection.exchange(id);
    if (r) {
      this.syncCollectionToSave();
      this.persist();
    }
    return r;
  }

  /** 领取每日任务奖励（未完成/已领会被拒绝） */
  claimDailyTask(id: string) {
    const r = this.progress.claimTask(id);
    if (r.ok) {
      this.syncCollectionToSave();
      this.persist();
    }
    return r;
  }

  // ---------------- 关卡 ----------------

  /**
   * 加载关卡：读取规格 → 按本局种子实时生成布局 → 可解性回放验证通过后返回。
   * 每次进入关卡都会得到不同的物品堆；同 seed 可完全复现。
   */
  loadLevel(levelId: number, cb: (level: LevelData | null) => void) {
    const build = (spec: LevelSpec) => {
      try {
        const seed = ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) as number;
        const gen = generateLevel(spec, seed);
        this.lastLevelSeed = gen.seed;
        Logger.info(
          'GM',
          `关卡 ${levelId} 布局生成 seed=${gen.seed} 尝试=${gen.attempts} 物品=${gen.level.itemCount} 层=${gen.level.layerCount} 遮挡边=${gen.level.occlusion?.edgeCount}`
        );
        if (!gen.level.solutionValidation.verified) {
          Logger.warn('GM', `关卡 ${levelId} 布局未通过验证（不应发生）`);
        }
        cb(gen.level);
      } catch (e) {
        Logger.error('GM', `关卡 ${levelId} 布局生成失败`, e);
        cb(null);
      }
    };

    const cached = this.specCache.get(levelId);
    if (cached) {
      build(cached);
      return;
    }
    resources.load(`data/levels/level_${String(levelId).padStart(3, '0')}`, JsonAsset, (err, asset) => {
      if (err || !asset?.json) {
        Logger.error('GM', `关卡规格 ${levelId} 加载失败`, err);
        cb(null);
        return;
      }
      const spec = asset.json as unknown as LevelSpec;
      this.specCache.set(levelId, spec);
      build(spec);
    });
  }

  get currentLevel(): number {
    return this.save.data.currentLevel;
  }

  get maxLevel(): number {
    return this.save.data.maxUnlockedLevel;
  }

  // ---------------- 存档 ----------------

  persist() {
    this.save.data.boosters = this.inventory.getAll();
    this.save.data.settings.musicOn = this.audio.musicOn;
    this.save.data.settings.sfxOn = this.audio.sfxOn;
    this.save.save();
  }

  private lastPersist = 0;
  /** 节流持久化（避免频繁写盘） */
  persistThrottled() {
    const now = Date.now();
    if (now - this.lastPersist < 2000) return;
    this.lastPersist = now;
    this.persist();
  }

  // ---------------- 关卡结算（幂等） ----------------

  /**
   * 通关结算。每个 runId 只允许结算一次（防重复发奖）。
   * 返回奖励明细；未结算返回 null。
   */
  settleVictory(
    runId: string,
    levelId: number,
    maxCombo: number,
    stars = 1
  ): {
    total: number;
    first: boolean;
    base: number;
    streak: number;
    bonus: number;
    milestoneCoins: number;
    milestoneFragments: number;
    chestId: string;
    chestResult: GrantResult | null;
  } | null {
    if (!this.rewards.canSettle(`victory:${runId}`)) return null;
    const first = !this.save.data.completedLevels.includes(levelId);
    const base = first ? this.balance.firstClearReward : this.balance.clearReward;
    let streak = 0;
    if (levelId === this.save.data.currentLevel) {
      streak = this.balance.streakBonus[String(levelId % 10)] ?? 0;
    }
    const total = base + streak;
    this.currency.add(total, 'victory');
    if (first) this.save.data.completedLevels.push(levelId);
    // 星级（保留历史最好）
    this.save.data.levelStars = this.save.data.levelStars ?? {};
    this.save.data.levelStars[String(levelId)] = Math.max(this.save.data.levelStars[String(levelId)] ?? 0, stars);
    this.save.data.maxUnlockedLevel = Math.max(this.save.data.maxUnlockedLevel, levelId + 1);
    this.save.data.currentLevel = Math.max(this.save.data.currentLevel, levelId + 1);
    this.stats.recordWin(maxCombo);
    this.save.data.stats.maxCombo = Math.max(this.save.data.stats.maxCombo, maxCombo);
    this.save.data.stats.gamesPlayed++;

    // 成长：经验 + 任务事件 + 里程碑
    const xp = 20 + stars * 10;
    this.progress.addXp(xp);
    this.progress.recordEvent('level_clear', 1);
    if (maxCombo >= 2) this.progress.recordEvent('combo_clear', 1);
    const ms = ProgressManager.milestoneFor(levelId);
    let milestoneCoins = 0;
    let milestoneFragments = 0;
    if (ms && this.rewards.grant(`milestone:${levelId}`)) {
      milestoneCoins = ms.coins;
      milestoneFragments = ms.fragments;
      this.currency.add(ms.coins, 'milestone');
      this.addFragments(ms.fragments);
    }
    // 收藏宝箱：立即结算并持久化（开箱动画只做展示，避免玩家中途退出丢失奖励）
    const chestId = this.prepareChest(levelId, runId);
    const chestResult = this.claimChest(chestId);
    this.syncCollectionToSave();
    this.persist();
    return { total, first, base, streak, bonus: 0, milestoneCoins, milestoneFragments, chestId, chestResult };
  }

  /** 每日奖励（幂等：requestId=日期） */
  canClaimDaily(): { ok: boolean; day: number; amount: number } {
    const today = DailyRewardLogic.localDateStr();
    const can = DailyRewardLogic.canClaim(this.save.data.dailyReward.lastClaimDate, today);
    const streakNext = can
      ? DailyRewardLogic.nextStreak(this.save.data.dailyReward.lastClaimDate, this.save.data.dailyReward.streak, today, DailyRewardLogic.yesterdayStr())
      : this.save.data.dailyReward.streak;
    const day = ((streakNext - 1) % 7) + 1;
    const amount = this.balance.dailyRewards[day - 1] ?? 50;
    return { ok: can, day, amount };
  }

  claimDaily(): { ok: boolean; amount: number } {
    const info = this.canClaimDaily();
    if (!info.ok) return { ok: false, amount: 0 };
    const today = DailyRewardLogic.localDateStr();
    if (!this.rewards.grant(`daily:${today}`)) return { ok: false, amount: 0 };
    const nextStreak = DailyRewardLogic.nextStreak(this.save.data.dailyReward.lastClaimDate, this.save.data.dailyReward.streak, today, DailyRewardLogic.yesterdayStr());
    this.save.data.dailyReward.lastClaimDate = today;
    this.save.data.dailyReward.streak = nextStreak;
    this.currency.add(info.amount, 'daily');
    this.persist();
    return { ok: true, amount: info.amount };
  }

  // ---------------- 道具购买 ----------------

  buyBooster(type: BoosterType): boolean {
    const price = this.balance.boosterPrices[type] ?? 999999;
    if (!this.currency.spend(price, `buy_${type}`)) return false;
    if (!this.inventory.add(type, 1)) {
      // 回滚（防御性，正常不会发生）
      this.currency.add(price, 'refund');
      return false;
    }
    this.persist();
    return true;
  }

  /** 广告领取道具（booster 广告位）：幂等 requestId */
  claimBoosterViaAd(type: BoosterType, requestId: string, onComplete: (ok: boolean, err?: string) => void) {
    void this.ad.showRewardedAd('booster' as AdPlacement, requestId).then((r) => {
      if (!r.completed) {
        onComplete(false, r.error);
        return;
      }
      if (!this.rewards.grant(`booster_ad:${requestId}`)) {
        onComplete(false, 'duplicate');
        return;
      }
      this.inventory.add(type, 1);
      this.ad.reportRewarded(requestId);
      this.persist();
      onComplete(true);
    });
  }

  /** 广告领取金币（booster 位复用）：幂等 */
  claimCoinsViaAd(requestId: string, onComplete: (ok: boolean, err?: string) => void) {
    void this.ad.showRewardedAd('booster' as AdPlacement, requestId).then((r) => {
      if (!r.completed) {
        onComplete(false, r.error);
        return;
      }
      if (!this.rewards.grant(`coin_ad:${requestId}`)) {
        onComplete(false, 'duplicate');
        return;
      }
      this.currency.add(AD_COIN_REWARD, 'ad_coins');
      this.ad.reportRewarded(requestId);
      this.persist();
      onComplete(true);
    });
  }

  // ---------------- 场景 ----------------

  static goScene(name: string) {
    director.loadScene(name);
  }

  static makePersistent(root: Node) {
    game.addPersistRootNode(root);
  }
}
