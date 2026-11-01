import {
  COLLECTIBLES,
  COLLECTIBLE_BY_ID,
  CollectibleDef,
  MILESTONES,
  RARITIES,
  Rarity,
  SERIES,
  SERIES_ORDER,
  SeriesId,
  collectiblesOfSeries,
  rarityAllowedAt,
} from './CollectionData';

export interface CollectionState {
  /** 收藏品 id -> 获得时间 ISO */
  owned: Record<string, string>;
  /** 收藏碎片 */
  fragments: number;
  /** 已完成系列（解锁主题） */
  seriesCompleted: SeriesId[];
}

export interface GrantResult {
  def: CollectibleDef;
  isNew: boolean;
  fragmentsGained: number;
}

export interface SeriesProgress {
  series: SeriesId;
  owned: number;
  total: number;
  percent: number;
  complete: boolean;
}

/**
 * 收藏品管理（纯逻辑）。
 * 发奖公平性设计（不依赖随机概率）：
 * - 首次通关必定获得一件收藏品；
 * - 里程碑关卡必定获得指定主题收藏品；
 * - 可获得的稀有度随关卡进度逐步提升；
 * - 已拥有则转化为收藏碎片（不浪费）；
 * - 碎片可兑换未拥有的收藏品。
 */
export class CollectionManager {
  state: CollectionState;
  private onSeriesComplete?: (series: SeriesId) => void;

  constructor(state: CollectionState, onSeriesComplete?: (series: SeriesId) => void) {
    this.state = state;
    this.onSeriesComplete = onSeriesComplete;
  }

  static emptyState(): CollectionState {
    return { owned: {}, fragments: 0, seriesCompleted: [] };
  }

  has(id: string): boolean {
    return !!this.state.owned[id];
  }

  get obtainedAt(): Record<string, string> {
    return this.state.owned;
  }

  get fragments(): number {
    return this.state.fragments;
  }

  get ownedCount(): number {
    return Object.keys(this.state.owned).length;
  }

  get totalCount(): number {
    return COLLECTIBLES.length;
  }

  getDef(id: string): CollectibleDef | undefined {
    return COLLECTIBLE_BY_ID.get(id);
  }

  addFragments(n: number): number {
    if (!Number.isFinite(n) || n <= 0) return this.state.fragments;
    this.state.fragments += Math.floor(n);
    return this.state.fragments;
  }

  /** 发放一件收藏品：新获得则入库，重复则转碎片 */
  grant(id: string, now: string = new Date().toISOString()): GrantResult | null {
    const def = COLLECTIBLE_BY_ID.get(id);
    if (!def) return null;
    if (this.state.owned[id]) {
      const fv = RARITIES[def.rarity].fragmentValue;
      this.state.fragments += fv;
      return { def, isNew: false, fragmentsGained: fv };
    }
    this.state.owned[id] = now;
    this.checkSeriesCompletion();
    return { def, isNew: true, fragmentsGained: 0 };
  }

  /**
   * 通关奖励（确定性，非随机）：
   * 1. 里程碑关卡 -> 指定收藏品
   * 2. 否则在"未拥有且当前关卡允许的稀有度"中按关卡号确定性选取
   * 3. 全部拥有后 -> 重复转化碎片
   */
  resolveLevelReward(levelId: number, now: string = new Date().toISOString()): GrantResult | null {
    const milestoneId = MILESTONES[levelId];
    if (milestoneId) {
      const r = this.grant(milestoneId, now);
      if (r) return r;
    }
    const allowed = COLLECTIBLES.filter((c) => !this.state.owned[c.id] && rarityAllowedAt(levelId, c.rarity));
    if (allowed.length > 0) {
      const idx = (levelId * 37 + 11) % allowed.length;
      return this.grant(allowed[idx].id, now);
    }
    // 已收集完当前可获得的全部收藏品：重复转化为碎片
    const pool = COLLECTIBLES.filter((c) => rarityAllowedAt(levelId, c.rarity));
    const idx = (levelId * 53 + 7) % pool.length;
    return this.grant(pool[idx].id, now);
  }

  /** 碎片兑换：只能兑换未拥有的收藏品 */
  canExchange(id: string): { ok: boolean; cost: number; reason?: string } {
    const def = COLLECTIBLE_BY_ID.get(id);
    if (!def) return { ok: false, cost: 0, reason: 'not_found' };
    const cost = RARITIES[def.rarity].exchangeCost;
    if (this.state.owned[id]) return { ok: false, cost, reason: 'owned' };
    if (this.state.fragments < cost) return { ok: false, cost, reason: 'insufficient' };
    return { ok: true, cost };
  }

  exchange(id: string, now: string = new Date().toISOString()): GrantResult | null {
    const check = this.canExchange(id);
    if (!check.ok) return null;
    this.state.fragments -= check.cost;
    const def = COLLECTIBLE_BY_ID.get(id)!;
    this.state.owned[id] = now;
    this.checkSeriesCompletion();
    return { def, isNew: true, fragmentsGained: 0 };
  }

  /** 系列进度 */
  seriesProgress(series: SeriesId): SeriesProgress {
    const list = collectiblesOfSeries(series);
    const owned = list.filter((c) => !!this.state.owned[c.id]).length;
    return {
      series,
      owned,
      total: list.length,
      percent: Math.round((owned / list.length) * 100),
      complete: owned === list.length,
    };
  }

  allSeriesProgress(): SeriesProgress[] {
    return SERIES_ORDER.map((s) => this.seriesProgress(s));
  }

  get overallPercent(): number {
    return Math.round((this.ownedCount / this.totalCount) * 100);
  }

  /** 系列集齐 -> 解锁主题 */
  private checkSeriesCompletion(): void {
    for (const s of SERIES_ORDER) {
      if (this.state.seriesCompleted.includes(s)) continue;
      const p = this.seriesProgress(s);
      if (p.complete) {
        this.state.seriesCompleted.push(s);
        this.onSeriesComplete?.(s);
      }
    }
  }

  isThemeUnlocked(series: SeriesId): boolean {
    return this.state.seriesCompleted.includes(series);
  }

  themeName(series: SeriesId): string {
    return SERIES[series].themeName;
  }

  /** 兑换建议：当前可兑换的最低稀有度未拥有收藏品 */
  suggestExchange(): { id: string; cost: number } | null {
    const unowned = COLLECTIBLES.filter((c) => !this.state.owned[c.id]).sort(
      (a, b) => RARITIES[a.rarity].exchangeCost - RARITIES[b.rarity].exchangeCost
    );
    if (!unowned.length) return null;
    return { id: unowned[0].id, cost: RARITIES[unowned[0].rarity].exchangeCost };
  }

  /** 稀有度统计（收藏册展示用） */
  rarityCounts(): Record<Rarity, { owned: number; total: number }> {
    const out = {} as Record<Rarity, { owned: number; total: number }>;
    (Object.keys(RARITIES) as Rarity[]).forEach((r) => {
      const all = COLLECTIBLES.filter((c) => c.rarity === r);
      out[r] = { owned: all.filter((c) => !!this.state.owned[c.id]).length, total: all.length };
    });
    return out;
  }
}
