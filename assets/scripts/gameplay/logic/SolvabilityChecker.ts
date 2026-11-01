import { BASE_SLOT_CAPACITY, OCCLUSION_OVERLAP_RATIO } from '../../core/GameConfig';
import type { LevelData } from '../../level/LevelTypes';
import { mulberry32 } from '../../utils/Rand';

/**
 * 可解性求解器（纯逻辑）。
 *
 * 与 GameSession/MatchManager 完全一致的规则：
 * - 只有未冰冻、未锁定、无有效上层遮挡的物品可拾取
 * - 槽容量 7；物品按进入顺序追加到槽尾
 * - 只有「三个连续相同」才消除（连续匹配语义，非全局数量统计）
 * - 消除后向左补位，可能级联
 * - 槽满且无法消除即失败
 * - 每次三消成功：全场冰冻 -1；达到解锁次数后锁定解除
 *
 * 实现采用「显式遮挡边 + 阻挡计数」增量模拟 + 槽位数组快照回溯：
 * - 小关卡（<= SMALL_LEVEL_TILES）：完整回溯 DFS
 * - 大关卡：启发式贪心（尾部配对优先）+ 固定种子随机重启（结果可复现）
 *
 * 只有真实搜索到通关拾取序列才返回 solved=true。
 */
export const SMALL_LEVEL_TILES = 40;
const GREEDY_RESTARTS = 1000;
const DFS_BUDGET = 400000;

export interface SolveResult {
  solved: boolean;
  method: string;
  attempts: number;
  /** 通关拾取序列（调试用） */
  moves?: string[];
}

interface SimTile {
  id: string;
  type: string;
  removed: boolean;
  frozen: number;
  locked: boolean;
  occludes: number[];
  blockedCount: number;
  unlockAfter: number;
}

/** 槽位数组（连续匹配语义：追加到尾部 + 单轮连续三连消除 + 左补位一次，与 MatchManager 一致） */
function slotAppend(types: string[], type: string): { slots: string[]; matched: boolean } {
  const slots = types.slice();
  slots.push(type);
  // 单轮扫描：找全部三连组，移除后补位一次（不再重扫）
  const removed: number[] = [];
  let i = 0;
  while (i <= slots.length - 3) {
    if (slots[i] === slots[i + 1] && slots[i + 1] === slots[i + 2]) {
      removed.push(i, i + 1, i + 2);
      i += 3;
    } else {
      i++;
    }
  }
  let matched = false;
  if (removed.length > 0) {
    matched = true;
    const rm = new Set(removed);
    for (let k = slots.length - 1; k >= 0; k--) {
      if (rm.has(k)) slots.splice(k, 1);
    }
  }
  return { slots, matched };
}

/** 槽尾两个与 type 相同 => 追加即触发消除 */
function appendingCompletes(slots: string[], type: string): boolean {
  const n = slots.length;
  return n >= 2 && slots[n - 1] === type && slots[n - 2] === type;
}

class SolverState {
  tiles: SimTile[] = [];
  slots: string[] = [];
  capacity: number;
  matchesDone = 0;
  remaining: number;
  matchCount = 0;

  constructor(level: LevelData, capacity: number) {
    this.capacity = capacity;
    const frozenSet = new Set(level.obstacles?.frozenTileIds ?? []);
    const lockedSet = new Set(level.obstacles?.lockedTileIds ?? []);
    const unlockAfter = level.obstacles?.lockedUnlockAfterMatches ?? 2;
    const tiles: SimTile[] = level.itemPositions.map((p) => ({
      id: p.id,
      type: p.type,
      removed: false,
      frozen: frozenSet.has(p.id) ? 1 : 0,
      locked: lockedSet.has(p.id),
      occludes: [],
      blockedCount: 0,
      unlockAfter,
    }));
    for (let i = 0; i < tiles.length; i++) {
      const a = level.itemPositions[i];
      for (let j = 0; j < tiles.length; j++) {
        if (i === j) continue;
        const b = level.itemPositions[j];
        // z 序与 OcclusionGraph 一致：层号大在上；同层时索引大在上
        const aAbove = a.layer > b.layer || (a.layer === b.layer && i > j);
        if (!aAbove) continue;
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (overlapX >= Math.min(a.w, b.w) * OCCLUSION_OVERLAP_RATIO && overlapY >= Math.min(a.h, b.h) * OCCLUSION_OVERLAP_RATIO) {
          tiles[i].occludes.push(j);
          tiles[j].blockedCount++;
        }
      }
    }
    this.tiles = tiles;
    this.remaining = tiles.length;
  }

  clickable(i: number): boolean {
    const t = this.tiles[i];
    return !t.removed && t.frozen === 0 && !t.locked && t.blockedCount === 0;
  }

  /** 拾取并结算；返回是否触发消除 */
  pick(i: number): boolean {
    const t = this.tiles[i];
    if (this.slots.length >= this.capacity) return false;
    t.removed = true;
    this.remaining--;
    for (const low of t.occludes) this.tiles[low].blockedCount--;
    const res = slotAppend(this.slots, t.type);
    this.slots = res.slots;
    if (res.matched) {
      this.matchCount++;
      this.matchesDone++;
      for (const tt of this.tiles) {
        if (tt.frozen > 0) tt.frozen--;
        if (tt.locked && tt.unlockAfter > 0 && this.matchesDone >= tt.unlockAfter) tt.locked = false;
      }
    }
    return res.matched;
  }

  /** 回滚一次 pick（配合外部快照） */
  unpick(i: number, slotsSnap: string[], matchesSnap: number, frozenSnap: number[], lockedSnap: boolean[]): void {
    const t = this.tiles[i];
    t.removed = false;
    this.remaining++;
    for (const low of t.occludes) this.tiles[low].blockedCount++;
    this.slots = slotsSnap.slice();
    this.matchesDone = matchesSnap;
    for (let k = 0; k < this.tiles.length; k++) {
      this.tiles[k].frozen = frozenSnap[k];
      this.tiles[k].locked = lockedSnap[k];
    }
  }
}

/** 带快照的 DFS（小关卡）。 */
function solveDFS(level: LevelData): SolveResult {
  const st = new SolverState(level, BASE_SLOT_CAPACITY);
  let budget = DFS_BUDGET;
  const moves: string[] = [];

  const dfs = (): boolean => {
    if (st.remaining === 0) return true;
    if (budget-- <= 0) return false;
    const clickable: number[] = [];
    for (let i = 0; i < st.tiles.length; i++) if (st.clickable(i)) clickable.push(i);
    if (clickable.length === 0 || st.slots.length >= st.capacity) return false;
    // 启发式排序：追加即凑成三连 > 与槽尾同类型 > 已在槽中的类型
    const inSlot = (type: string) => st.slots.includes(type);
    const tail = st.slots.length ? st.slots[st.slots.length - 1] : null;
    clickable.sort((a, b) => {
      const ta = st.tiles[a].type;
      const tb = st.tiles[b].type;
      const va = (appendingCompletes(st.slots, ta) ? 1000 : 0) + (tail === ta ? 100 : 0) + (inSlot(ta) ? 10 : 0);
      const vb = (appendingCompletes(st.slots, tb) ? 1000 : 0) + (tail === tb ? 100 : 0) + (inSlot(tb) ? 10 : 0);
      return vb - va;
    });
    for (const idx of clickable) {
      const slotsSnap = st.slots.slice();
      const matchesSnap = st.matchesDone;
      const frozenSnap = st.tiles.map((t) => t.frozen);
      const lockedSnap = st.tiles.map((t) => t.locked);
      if (!st.pick(idx)) continue;
      moves.push(st.tiles[idx].id);
      if (dfs()) return true;
      moves.pop();
      st.unpick(idx, slotsSnap, matchesSnap, frozenSnap, lockedSnap);
    }
    return false;
  };

  const solved = dfs();
  return { solved, method: 'dfs_consecutive_backtracking', attempts: DFS_BUDGET - Math.max(0, budget), moves: solved ? [...moves] : undefined };
}

/** 启发式贪心 + 随机重启（大关卡）。策略即真实玩家打法：凑尾巴、停车。 */
function solveGreedy(level: LevelData, seed: number): SolveResult {
  for (let r = 0; r < GREEDY_RESTARTS; r++) {
    const rand = mulberry32(seed + r * 7919);
    const st = new SolverState(level, BASE_SLOT_CAPACITY);
    const moves: string[] = [];
    let alive = true;
    while (st.remaining > 0) {
      if (st.slots.length >= st.capacity) {
        alive = false;
        break;
      }
      // 收集可点击
      const clickable: number[] = [];
      for (let i = 0; i < st.tiles.length; i++) if (st.clickable(i)) clickable.push(i);
      if (clickable.length === 0) {
        alive = false;
        break;
      }
      const tail = st.slots.length ? st.slots[st.slots.length - 1] : null;
      let bestIdx = -1;
      let bestScore = -Infinity;
      for (const i of clickable) {
        const type = st.tiles[i].type;
        let s = 0;
        if (appendingCompletes(st.slots, type)) s += 1000; // 立即凑成三连
        else if (tail === type) s += 120; // 与尾部配对（次优：攒连续）
        else if (st.slots.includes(type)) s += 30; // 已停车 1 个
        if (rand() < 0.25) s += rand() * 40; // 多样性
        if (s > bestScore) {
          bestScore = s;
          bestIdx = i;
        }
      }
      st.pick(bestIdx);
      moves.push(st.tiles[bestIdx].id);
    }
    if (alive && st.remaining === 0) {
      return { solved: true, method: 'greedy_consecutive_randomized', attempts: r + 1, moves };
    }
  }
  return { solved: false, method: 'greedy_consecutive_randomized', attempts: GREEDY_RESTARTS };
}

/** 可解性验证入口：不修改传入 level。 */
export function solveLevel(level: LevelData, seed = 20260101): SolveResult {
  const count = level.itemPositions.length;
  if (count % 3 !== 0) return { solved: false, method: 'count_check', attempts: 0 };
  if (count <= SMALL_LEVEL_TILES) return solveDFS(level);
  return solveGreedy(level, seed);
}
