/**
 * 预览端全局状态与业务编排（与 Cocos 端共用同一套纯逻辑模块）。
 */
import { PlatformManager } from '../../assets/scripts/platform/PlatformManager';
import { SaveManager } from '../../assets/scripts/systems/save/SaveManager';
import { CurrencyManager } from '../../assets/scripts/systems/economy/CurrencyManager';
import { RewardManager, DailyRewardLogic } from '../../assets/scripts/systems/economy/RewardManager';
import { BoosterInventory } from '../../assets/scripts/systems/economy/BoosterInventory';
import { AdManager } from '../../assets/scripts/ads/AdManager';
import { CollectionManager, GrantResult } from '../../assets/scripts/collection/CollectionManager';
import { ProgressManager } from '../../assets/scripts/systems/progress/ProgressManager';
import { SERIES, SERIES_ORDER, SeriesId, RARITIES, Rarity } from '../../assets/scripts/collection/CollectionData';
import type { BoosterType } from '../../assets/scripts/core/GameConfig';

export const platform = new PlatformManager();
export const save = new SaveManager(platform.storage);
const bus = { listeners: new Map<string, Set<Function>>() };
export const emit = (ev: string, data?: any) => bus.listeners.get(ev)?.forEach((f) => f(data));
export const on = (ev: string, fn: Function) => {
  if (!bus.listeners.has(ev)) bus.listeners.set(ev, new Set());
  bus.listeners.get(ev)!.add(fn);
};

export const currency = new CurrencyManager(save.data.coins, { emit } as any);
export const inventory = new BoosterInventory(save.data.boosters);
export const rewards = new RewardManager();
export const ad = new AdManager(platform.adService, { reviveMaxPerRun: 1, maxAdsPerRun: 10 });

export const collection = new CollectionManager(
  {
    owned: save.data.collection ?? {},
    fragments: save.data.fragments ?? 0,
    seriesCompleted: (save.data.seriesCompleted ?? []) as SeriesId[],
  },
  () => {
    syncCollection();
  }
);

export const progress = new ProgressManager(
  { level: save.data.playerLevel ?? 1, xp: save.data.playerXp ?? 0 },
  save.data.dailyTasks ?? { date: '', progress: {}, claimed: [] },
  {
    onCoins: (n, reason) => currency.add(n, reason),
    onFragments: (n) => collection.addFragments(n),
  }
);
progress.ensureToday(DailyRewardLogic.localDateStr());

export const BOOSTER_PRICES: Record<BoosterType, number> = { undo: 150, shuffle: 150, remove: 250, extra_slot: 200 };

// ---------------- 持久化 ----------------

export function syncCollection() {
  save.data.collection = collection.state.owned;
  save.data.fragments = collection.state.fragments;
  save.data.seriesCompleted = collection.state.seriesCompleted.slice();
}

export function persist() {
  save.data.coins = currency.balance;
  save.data.boosters = inventory.getAll();
  save.data.playerLevel = progress.player.level;
  save.data.playerXp = progress.player.xp;
  save.data.dailyTasks = progress.tasks;
  syncCollection();
  save.save();
}

export function setCurrentLevel(n: number) {
  save.data.currentLevel = n;
  save.data.maxUnlockedLevel = Math.max(save.data.maxUnlockedLevel, n);
  persist();
}

export function currentLevel(): number {
  return save.data.currentLevel;
}

export function addFragments(n: number) {
  collection.addFragments(n);
  syncCollection();
  persist();
}

// ---------------- 结算与宝箱 ----------------

export interface VictorySettle {
  coins: number;
  stars: number;
  first: boolean;
  xpGained: number;
  levelUps: number;
  chest: { id: string; result: GrantResult | null };
  milestoneCoins: number;
  milestoneFragments: number;
}

/**
 * 通关结算（按 runId 幂等）：
 * 金币 / 星级 / 经验 / 每日任务 / 里程碑 / 宝箱收藏品（立即持久化，宝箱只做展示）。
 */
export function settleVictory(runId: string, levelId: number, maxCombo: number, stars: number): VictorySettle | null {
  if (!rewards.canSettle(`victory:${runId}`)) return null;
  const first = !save.data.completedLevels.includes(levelId);
  const base = first ? 100 : 30;
  const streak = levelId % 10 === 0 ? 50 : levelId % 5 === 0 ? 20 : levelId % 3 === 0 ? 10 : 0;
  const coins = base + streak;
  currency.add(coins, 'victory');
  if (first) save.data.completedLevels.push(levelId);
  save.data.levelStars = save.data.levelStars ?? {};
  save.data.levelStars[String(levelId)] = Math.max(save.data.levelStars[String(levelId)] ?? 0, stars);
  save.data.maxUnlockedLevel = Math.max(save.data.maxUnlockedLevel, levelId + 1);
  save.data.currentLevel = Math.max(save.data.currentLevel, levelId + 1);
  save.data.stats.gamesPlayed++;
  save.data.stats.wins++;
  save.data.stats.maxCombo = Math.max(save.data.stats.maxCombo, maxCombo);

  // 成长
  const xpGained = 20 + stars * 10;
  const up = progress.addXp(xpGained);
  progress.recordEvent('level_clear', 1);
  if (maxCombo >= 2) progress.recordEvent('combo_clear', 1);

  // 里程碑（幂等）
  let milestoneCoins = 0;
  let milestoneFragments = 0;
  const ms = ProgressManager.milestoneFor(levelId);
  if (ms && rewards.grant(`milestone:${levelId}`)) {
    milestoneCoins = ms.coins;
    milestoneFragments = ms.fragments;
    currency.add(ms.coins, 'milestone');
    collection.addFragments(ms.fragments);
  }

  // 宝箱收藏品（首次通关必得；重复转碎片）
  const chestId = `chest:${runId}:${levelId}`;
  let result: GrantResult | null = null;
  if (rewards.grant(chestId)) {
    result = collection.resolveLevelReward(levelId);
    if (result?.isNew) progress.recordEvent('new_collectible', 1);
  }
  syncCollection();
  persist();
  return { coins, stars, first, xpGained, levelUps: up.levelsGained, chest: { id: chestId, result }, milestoneCoins, milestoneFragments };
}

// ---------------- 收藏 ----------------

export function exchangeCollectible(id: string): GrantResult | null {
  const r = collection.exchange(id);
  if (r) {
    progress.recordEvent('new_collectible', 1);
    syncCollection();
    persist();
  }
  return r;
}

export function isThemeUnlocked(s: SeriesId): boolean {
  return collection.isThemeUnlocked(s);
}

/** 当前主题（最近完成的系列；无则默认） */
export function activeTheme(): SeriesId | null {
  const done = collection.state.seriesCompleted;
  return done.length ? done[done.length - 1] : null;
}

// ---------------- 每日 ----------------

export function canClaimDaily(): boolean {
  return DailyRewardLogic.canClaim(save.data.dailyReward.lastClaimDate, DailyRewardLogic.localDateStr());
}

export function claimDaily(): { ok: boolean; amount: number } {
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
  currency.add(amount, 'daily');
  persist();
  return { ok: true, amount };
}

export function claimTask(id: string) {
  const r = progress.claimTask(id);
  if (r.ok) {
    syncCollection();
    persist();
  }
  return r;
}

// ---------------- 道具 ----------------

export function buyBooster(t: BoosterType): boolean {
  const price = BOOSTER_PRICES[t];
  if (!currency.spend(price, `buy_${t}`)) return false;
  inventory.add(t, 1);
  persist();
  return true;
}

export function useBoosterStock(t: BoosterType): boolean {
  const ok = inventory.consume(t);
  if (ok) {
    progress.recordEvent('booster_used', 1);
    persist();
  }
  return ok;
}

// ---------------- 展示辅助 ----------------

export function rarityMeta(r: Rarity) {
  return RARITIES[r];
}

export function seriesMeta(s: SeriesId) {
  return SERIES[s];
}

export const SERIES_LIST = SERIES_ORDER;

export function playerInfo() {
  return {
    level: progress.player.level,
    xp: progress.player.xp,
    xpPercent: Math.round(progress.xpProgress * 100),
    coins: currency.balance,
    fragments: collection.fragments,
    owned: collection.ownedCount,
    total: collection.totalCount,
    percent: collection.overallPercent,
  };
}
