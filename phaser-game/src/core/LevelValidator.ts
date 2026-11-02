import { GameSession } from './GameSession';
import { MATCH_SIZE } from './MatchSystem';
import type { LevelData, LevelItem } from './types';

const RATIO = 0.35;
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

export interface LevelMetrics {
  items: number;
  types: number;
  layers: number;
  edges: number;
  clickable: number;
  slotCapacity: number;
  boosters: number;
  hidden: number;
  /** 计算得出的难度分（1~10） */
  difficulty: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  metrics?: LevelMetrics;
}

function isAbove(a: LevelItem, ai: number, b: LevelItem, bi: number): boolean {
  return a.layer > b.layer || (a.layer === b.layer && ai > bi);
}

function overlaps(a: LevelItem, b: LevelItem): boolean {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (ox <= 0 || oy <= 0) return false;
  return ox >= Math.min(a.w, b.w) * RATIO && oy >= Math.min(a.h, b.h) * RATIO;
}

/** 统计遮挡边数与每个物品被遮挡的次数 */
export function computeOcclusion(items: LevelItem[]): { edges: number; blocked: number[] } {
  const n = items.length;
  const blocked = new Array<number>(n).fill(0);
  let edges = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      if (!isAbove(items[i], i, items[j], j)) continue;
      if (!overlaps(items[i], items[j])) continue;
      edges++;
      blocked[j]++;
    }
  }
  return { edges, blocked };
}

/**
 * 难度评分（1~10）。
 * 综合物品量、类型数、层数、遮挡密度、初始可点击稀缺度、
 * 槽容量、可用道具与隐藏物品比例——不以物品数量作为唯一指标。
 */
export function computeDifficulty(level: LevelData): number {
  const items = level.items;
  const n = items.length;
  if (n === 0) return 1;

  const { edges, blocked } = computeOcclusion(items);
  const clickable = items.filter((t, i) => !t.hidden && blocked[i] === 0).length;
  const layers = Math.max(...items.map((t) => t.layer)) + 1;
  const types = new Set(items.map((t) => t.itemId)).size;
  const hidden = items.filter((t) => t.hidden).length;

  const itemsN = clamp((n - 9) / 111, 0, 1);
  const typesN = clamp((types - 3) / 7, 0, 1);
  const layersN = clamp((layers - 1) / 5, 0, 1);
  const occN = clamp(edges / n / 5, 0, 1);
  const scarceN = clamp(1 - clickable / n, 0, 1);
  const slotN = clamp((7 - level.slotCapacity) / 2, 0, 1);
  const boosterN = clamp((3 - level.boosterLimit) / 3, 0, 1);
  const hiddenN = clamp((hidden / n) * 4, 0, 1);

  const raw =
    itemsN * 0.15 +
    typesN * 0.1 +
    layersN * 0.12 +
    occN * 0.25 +
    scarceN * 0.23 +
    slotN * 0.05 +
    boosterN * 0.04 +
    hiddenN * 0.06;

  return Math.round(clamp(1 + (9 * raw) / 0.8, 1, 10) * 10) / 10;
}

/**
 * 关卡校验：结构合法性 + 真实可解性回放 + 难度评估。
 * 回放使用与游戏完全相同的 BoardModel / SlotManager / GameSession。
 */
export function validateLevel(level: LevelData | null | undefined): ValidationResult {
  const errors: string[] = [];

  if (!level) return { ok: false, errors: ['关卡数据为空'] };
  if (!Array.isArray(level.items) || level.items.length === 0) return { ok: false, errors: ['没有物品'] };
  if (level.slotCapacity < 1) errors.push('收纳槽容量非法');
  if (level.itemCount !== level.items.length) errors.push('itemCount 与实际物品数不一致');

  const ids = new Set<string>();
  const counts = new Map<string, number>();
  for (const it of level.items) {
    if (ids.has(it.instanceId)) errors.push(`重复 instanceId：${it.instanceId}`);
    ids.add(it.instanceId);
    counts.set(it.itemId, (counts.get(it.itemId) ?? 0) + 1);
    if (it.x < 0 || it.y < 0 || it.x + it.w > 750 || it.y + it.h > 900) {
      errors.push(`物品越界：${it.instanceId}`);
    }
  }
  for (const [itemId, c] of counts) {
    if (c % MATCH_SIZE !== 0) errors.push(`类型 ${itemId} 数量 ${c} 不是 3 的倍数`);
  }
  if (!Array.isArray(level.solution) || level.solution.length === 0) errors.push('缺少可解性回放序列');

  if (errors.length > 0) return { ok: false, errors };

  const session = new GameSession(level);
  for (let i = 0; i < level.solution.length; i++) {
    const id = level.solution[i];
    const r = session.pick(id);
    if (!r.ok) {
      errors.push(`回放第 ${i} 步失败（${id}）：${r.reason}`);
      return { ok: false, errors };
    }
  }

  if (session.state !== 'victory') errors.push(`回放结束未通关，剩余 ${session.board.remaining}`);

  const { edges, blocked } = computeOcclusion(level.items);
  const clickable = level.items.filter((t, i) => !t.hidden && blocked[i] === 0).length;

  return {
    ok: errors.length === 0,
    errors,
    metrics: {
      items: level.items.length,
      types: counts.size,
      layers: Math.max(...level.items.map((t) => t.layer)) + 1,
      edges,
      clickable,
      slotCapacity: level.slotCapacity,
      boosters: level.boosterLimit,
      hidden: level.items.filter((t) => t.hidden).length,
      difficulty: computeDifficulty(level),
    },
  };
}

export interface LevelReport {
  levelId: number;
  ok: boolean;
  errors: string[];
  metrics?: LevelMetrics;
}

export interface BatchReport {
  total: number;
  passed: number;
  failed: LevelReport[];
  duplicates: string[];
  levels: LevelReport[];
}

/** 批量校验：逐关校验 + 重复布局检测 */
export function validateAll(levels: LevelData[]): BatchReport {
  const reports: LevelReport[] = [];
  const signatures = new Map<string, number[]>();

  for (const lv of levels) {
    const r = validateLevel(lv);
    reports.push({ levelId: lv.levelId, ok: r.ok, errors: r.errors, metrics: r.metrics });

    const sig = lv.items
      .map((t) => `${t.layer}:${Math.round(t.x)},${Math.round(t.y)},${t.itemId}`)
      .join('|');
    const list = signatures.get(sig) ?? [];
    list.push(lv.levelId);
    signatures.set(sig, list);
  }

  const duplicates: string[] = [];
  for (const [, ids] of signatures) {
    if (ids.length > 1) duplicates.push(ids.join(','));
  }

  return {
    total: reports.length,
    passed: reports.filter((r) => r.ok).length,
    failed: reports.filter((r) => !r.ok),
    duplicates,
    levels: reports,
  };
}
