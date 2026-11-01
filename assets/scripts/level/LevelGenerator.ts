import { mulberry32, shuffleArray } from '../utils/Rand';
import { ALL_TYPE_IDS } from '../items/ItemCatalog';
import type { LevelData, TilePlacement } from './LevelTypes';
import { OCCLUSION_OVERLAP_RATIO, BASE_SLOT_CAPACITY } from '../core/GameConfig';

/**
 * 运行时关卡生成器（纯逻辑，三端共用：预览 / Cocos / Node 测试）。
 *
 * 目标：每次进入关卡都生成一套新的集中式物品堆（位置、旋转、层级、遮挡均随机），
 * 但保持该关卡的物品总数、物品种类数、层数、障碍与难度参数不变；
 * 每套布局都必须是"构造式可解 + 真实规则回放"通过后才返回。
 *
 * 可解性保证：
 * 1. 由 z 序（层号大在上、同层数组靠后在上）求出一条合法的"剥离顺序"（每次只能取当前无遮挡物品）
 * 2. 沿剥离顺序用安全连续匹配模式分配类型（峰值槽位 ≤6）：
 *    [A,A,A] / [A,A,B,B,B,A] / [A,A,B,B,B,C,C,C,A] / [A,B,B,B,A,A]
 * 3. 用与 GameSession 完全一致的规则回放该序列（7 格槽、连续三连、补位、冰冻/锁定解锁）
 * 4. 不通过则换子种子重建
 *
 * 稳定性：生成为一次性调用，返回的 LevelData 在本局内不再变化。
 */

export interface LevelSpec {
  levelId: number;
  name: string;
  difficulty: number;
  difficultyLabel: string;
  /** 物品总数（3 的倍数） */
  itemCount: number;
  /** 物品种类数 */
  typeCount: number;
  /** 层数 */
  layerCount: number;
  frozenCount: number;
  lockedCount: number;
  boosterLimit: number;
  /** 堆叠参数 */
  gen: { radius: number; minDist: number; spill: number };
}

export interface GenerateResult {
  level: LevelData;
  seed: number;
  attempts: number;
  metrics: { pileW: number; pileH: number; avgVisible: number; hiddenRatio: number; clickable: number };
}

const TILE = 100;
/** 调试开关：环境变量 LEVELGEN_DEBUG=1 时输出失败原因（避免直接引用 node 的 process） */
const DEBUG = (() => {
  try {
    const g: any = globalThis as any;
    return !!(g && g.process && g.process.env && g.process.env.LEVELGEN_DEBUG === '1');
  } catch {
    return false;
  }
})();
/** 主堆中心（设计分辨率坐标，tile 左上角语义下的中心点） */
export const PILE_CENTER = { x: 375, y: 470 };
/** 硬性半径上限：保证整堆落在 734×920 棋盘安全区内 */
const PILE_MAX_R = 262;
const SAFE = { x0: 30, x1: 604, y0: 24, y1: 742 };

interface Pos {
  id: string;
  type: string;
  layer: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 安全连续匹配模式（cost = 消耗的三元组数） */
const PATTERNS: { cost: number; seq: string }[] = [
  { cost: 1, seq: 'AAA' },
  { cost: 2, seq: 'AABBBA' },
  { cost: 3, seq: 'AABBBCCCA' },
  { cost: 2, seq: 'ABBBAA' },
];

function expandPattern(p: { cost: number; seq: string }, typeIds: string[]): string[] | null {
  const map = new Map<string, string>();
  const out: string[] = [];
  let ti = 0;
  for (const ch of p.seq) {
    if (!map.has(ch)) {
      if (ti >= typeIds.length) return null;
      map.set(ch, typeIds[ti++]);
    }
    out.push(map.get(ch)!);
  }
  return out;
}

/** z 序遮挡边（与运行时 OcclusionGraph 完全一致） */
export function deriveEdges(positions: { id: string; layer: number; x: number; y: number; w: number; h: number }[]) {
  const edges: { upper: string; lower: string }[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      const a = positions[i];
      const b = positions[j];
      const aAbove = a.layer > b.layer || (a.layer === b.layer && i > j);
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

/** 5×5 采样：完全不可见比例 / 平均可见率 */
function measureDensity(positions: Pos[]) {
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
          const above = o.layer > t.layer || (o.layer === t.layer && j > i);
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

function buildGeometry(spec: LevelSpec, rand: () => number, layers: number, radius: number, minDist: number, total: number): Pos[] {
  const weights = Array.from({ length: layers }, (_, l) => {
    const mid = (layers - 1) / 2;
    return 0.75 + 0.55 * (1 - Math.abs(l - mid) / Math.max(1, mid));
  });
  const wSum = weights.reduce((a, b) => a + b, 0);
  const layerCounts = weights.map((w) => Math.max(2, Math.round((total * w) / wSum)));
  let diff = total - layerCounts.reduce((a, b) => a + b, 0);
  let li = 0;
  while (diff !== 0 && li < 4000) {
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

  const layerPoints: { x: number; y: number }[][] = Array.from({ length: layers }, () => []);
  const layerOffset = Array.from({ length: layers }, () => ({
    x: (rand() * 2 - 1) * 26,
    y: (rand() * 2 - 1) * 22,
    rot: (rand() * 2 - 1) * 0.28,
  }));

  const placeOf = (l: number) => {
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

  const out: Pos[] = [];
  for (let l = 0; l < layers; l++) {
    for (let k = 0; k < layerCounts[l]; k++) {
      const c = placeOf(l);
      out.push({
        id: `t${out.length}`,
        type: '',
        layer: l,
        x: Math.max(SAFE.x0, Math.min(SAFE.x1, Math.round(c.x))),
        y: Math.max(SAFE.y0, Math.min(SAFE.y1, Math.round(c.y))),
        w: TILE,
        h: TILE,
      });
    }
  }
  return out;
}

function recenter(positions: Pos[]): Pos[] {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
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

/** 剥离顺序：反复取当前无遮挡物品 */
function peelOrder(positions: Pos[], edges: { upper: string; lower: string }[], rand: () => number): number[] | null {
  const n = positions.length;
  const idx = new Map(positions.map((p, i) => [p.id, i]));
  const blocked = new Array(n).fill(0);
  const occludes: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    const u = idx.get(e.upper);
    const l = idx.get(e.lower);
    if (u === undefined || l === undefined) continue;
    occludes[u].push(l);
    blocked[l]++;
  }
  const removed = new Array(n).fill(false);
  const order: number[] = [];
  for (let step = 0; step < n; step++) {
    const free: number[] = [];
    for (let i = 0; i < n; i++) if (!removed[i] && blocked[i] === 0) free.push(i);
    if (!free.length) return null;
    const pick = free[Math.floor(rand() * free.length)];
    removed[pick] = true;
    order.push(pick);
    for (const l of occludes[pick]) blocked[l]--;
  }
  return order;
}

/** 与 GameSession 完全一致的回放验证 */
export function replaySolution(level: LevelData, moves: string[], edges = level.blockerRelations): boolean {
  const idx = new Map(level.itemPositions.map((p, i) => [p.id, i]));
  const pos = level.itemPositions;
  const frozenSet = new Set(level.obstacles.frozenTileIds);
  const lockedSet = new Set(level.obstacles.lockedTileIds);
  const unlockAfter = level.obstacles.lockedUnlockAfterMatches ?? 2;
  const n = pos.length;
  const removed = new Array(n).fill(false);
  const frozen = pos.map((p) => (frozenSet.has(p.id) ? 1 : 0));
  const locked = pos.map((p) => lockedSet.has(p.id));
  const blocked = new Array(n).fill(0);
  const occludes: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    const u = idx.get(e.upper);
    const l = idx.get(e.lower);
    if (u === undefined || l === undefined) continue;
    occludes[u].push(l);
    blocked[l]++;
  }
  let slots: string[] = [];
  let matches = 0;
  let remaining = n;
  for (const id of moves) {
    const i = idx.get(id);
    if (i === undefined || removed[i]) return false;
    if (frozen[i] > 0 || locked[i] || blocked[i] > 0) return false;
    if (slots.length >= BASE_SLOT_CAPACITY) return false;
    removed[i] = true;
    remaining--;
    for (const l of occludes[i]) blocked[l]--;
    slots.push(pos[i].type);
    // 单轮连续三连消除（与 MatchManager 一致）
    const rm: number[] = [];
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

/**
 * 生成一关（确定性：同 spec + 同 seed → 完全相同布局）。
 * 内部会在几何/密度/可解性不满足时使用派生子种子重试。
 */
export function generateLevel(spec: LevelSpec, seed: number): GenerateResult {
  const total = Math.round(spec.itemCount / 3) * 3;
  let attempts = 0;
  for (let attempt = 0; attempt < 24; attempt++) {
    attempts = attempt + 1;
    const s = (seed + attempt * 7919) >>> 0;
    const rand = mulberry32(s);

    // 类型池（种类数固定）
    const typePool = shuffleArray(ALL_TYPE_IDS, rand).slice(0, Math.max(2, spec.typeCount));

    // 几何（自适应密度）
    let positions: Pos[] | null = null;
    let usedLayers = spec.layerCount;
    let radius = spec.gen.radius;
    let minDist = spec.gen.minDist;
    let fallback: Pos[] | null = null;
    let fallbackLayers = usedLayers;
    for (let a = 0; a < 16 && !positions; a++) {
      const candLayers = usedLayers;
      const cand = recenter(buildGeometry(spec, rand, candLayers, radius, minDist, total));
      const d = measureDensity(cand);
      fallback = cand;
      fallbackLayers = candLayers;
      if (d.hiddenRatio <= 0.58 && d.avgVisible >= 0.12) {
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
      if (DEBUG) console.warn(`[gen] L${spec.levelId} seed=${s} 几何无效 len=${positions ? positions.length : 'null'}/${total}`);
      continue;
    }

    const edges = deriveEdges(positions);
    const order = peelOrder(positions, edges, rand);
    if (!order) {
      if (DEBUG) console.warn(`[gen] L${spec.levelId} seed=${s} 剥离顺序失败`);
      continue;
    }

    // 沿剥离顺序分配类型（安全模式）
    const typeSeq: string[] = [];
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
      const ids: string[] = [];
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
      if (DEBUG) console.warn(`[gen] L${spec.levelId} seed=${s} 类型分配失败 remain=${total - typeSeq.length}`);
      continue;
    }
    order.forEach((posIdx, i) => {
      positions![posIdx].type = typeSeq[i];
    });

    // 障碍：剥离顺序靠后的位置（拾取时已解冻/解锁）
    const frozenCandidates = order.map((_, i) => i).filter((i) => i >= 8);
    const frozenIdx = shuffleArray(frozenCandidates, rand).slice(0, Math.min(spec.frozenCount, frozenCandidates.length));
    const lockedCandidates = shuffleArray(
      frozenCandidates.filter((i) => !frozenIdx.includes(i)),
      rand
    ).filter((i) => i >= 14);
    const lockedIdx = lockedCandidates.slice(0, Math.min(spec.lockedCount, lockedCandidates.length));

    const placements: TilePlacement[] = positions.map((p) => ({
      id: p.id,
      type: p.type,
      layer: p.layer,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
    }));

    const usedTypes = Array.from(new Set(placements.map((p) => p.type)));
    const level: LevelData = {
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
        frozenTileIds: frozenIdx.map((i) => positions![order[i]].id),
        lockedTileIds: lockedIdx.map((i) => positions![order[i]].id),
        lockedUnlockAfterMatches: 2,
      },
      specialObjectives: {
        bonusTypes: usedTypes.slice(0, 2).map((t) => ({ typeId: t, count: placements.filter((p) => p.type === t).length })),
      },
      boosterLimit: spec.boosterLimit,
      solutionValidation: {
        verified: false,
        method: 'runtime_generated',
        attempts,
        verifiedAt: '',
        seed: s,
        solution: [],
      },
    };

    // 每种类型数量必须是 3 的倍数
    const counts = new Map<string, number>();
    for (const p of placements) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
    let typeOk = true;
    for (const [, c] of counts) if (c % 3 !== 0) typeOk = false;
    if (!typeOk) {
      if (DEBUG) console.warn(`[gen] L${spec.levelId} seed=${s} 类型数量非 3 倍数`);
      continue;
    }

    const moves = order.map((i) => positions![i].id);
    if (!replaySolution(level, moves, edges)) {
      if (DEBUG) console.warn(`[gen] L${spec.levelId} seed=${s} 回放失败（items=${moves.length}, frozen=${level.obstacles.frozenTileIds.length}, locked=${level.obstacles.lockedTileIds.length}）`);
      continue;
    }

    level.solutionValidation = {
      verified: true,
      method: 'runtime_generated + replay',
      attempts,
      verifiedAt: new Date().toISOString(),
      seed: s,
      solution: moves,
    };

    // 指标（调试/测试用）
    const d = measureDensity(positions);
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
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
      metrics: { pileW: maxX - minX, pileH: maxY - minY, avgVisible: d.avgVisible, hiddenRatio: d.hiddenRatio, clickable: 0 },
    };
  }
  // 理论上不会到这里（构造式生成 + 多子种子重试）
  throw new Error(`关卡 ${spec.levelId} 生成失败（seed=${seed}）`);
}
