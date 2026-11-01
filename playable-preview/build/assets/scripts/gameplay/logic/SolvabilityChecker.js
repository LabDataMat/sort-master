import { BASE_SLOT_CAPACITY, OCCLUSION_OVERLAP_RATIO } from '../../core/GameConfig';
import { mulberry32 } from '../../utils/Rand';
/**
 * 可解性求解器（纯逻辑）。
 *
 * 规则与 GameSession 完全一致：
 * - 只有未冰冻、未锁定、无有效上层遮挡的物品可拾取
 * - 槽容量 7；凑满 3 个同类型即消除；槽满且无法消除即失败
 * - 每次三消成功：全场冰冻 -1；达到解锁次数后锁定解除
 *
 * 实现采用「显式遮挡边 + 阻挡计数」增量模拟，支持高效回溯：
 * - 小关卡（<= SMALL_LEVEL_TILES）：完整回溯 DFS
 * - 大关卡：启发式贪心 + 固定种子随机重启（结果可复现）
 *
 * 只有真实搜索到通关拾取序列才返回 solved=true。
 */
export const SMALL_LEVEL_TILES = 40;
const GREEDY_RESTARTS = 400;
const DFS_BUDGET = 300000;
class SolverState {
    constructor(level, capacity) {
        this.tiles = [];
        this.slotTypeCount = new Map();
        this.occupied = 0;
        this.matchesDone = 0;
        /** 撤销栈 */
        this.undoStack = [];
        this.capacity = capacity;
        // 构建物品
        const frozenSet = new Set(level.obstacles?.frozenTileIds ?? []);
        const lockedSet = new Set(level.obstacles?.lockedTileIds ?? []);
        const unlockAfter = level.obstacles?.lockedUnlockAfterMatches ?? 2;
        const tiles = level.itemPositions.map((p) => ({
            id: p.id,
            type: p.type,
            removed: false,
            frozen: frozenSet.has(p.id) ? 1 : 0,
            locked: lockedSet.has(p.id),
            occludes: [],
            blockedCount: 0,
            unlockAfter,
        }));
        // 几何遮挡（与游戏运行时 OcclusionGraph 完全一致）
        for (let i = 0; i < tiles.length; i++) {
            const a = level.itemPositions[i];
            for (let j = 0; j < tiles.length; j++) {
                if (i === j)
                    continue;
                const b = level.itemPositions[j];
                if (a.layer <= b.layer)
                    continue;
                const up = { x: a.x, y: a.y, w: a.w, h: a.h };
                const low = { x: b.x, y: b.y, w: b.w, h: b.h };
                const overlapX = Math.min(up.x + up.w, low.x + low.w) - Math.max(up.x, low.x);
                const overlapY = Math.min(up.y + up.h, low.y + low.h) - Math.max(up.y, low.y);
                if (overlapX >= Math.min(up.w, low.w) * OCCLUSION_OVERLAP_RATIO && overlapY >= Math.min(up.h, low.h) * OCCLUSION_OVERLAP_RATIO) {
                    tiles[i].occludes.push(j);
                    tiles[j].blockedCount++;
                }
            }
        }
        this.tiles = tiles;
        this.remaining = tiles.length;
    }
    clickable(i) {
        const t = this.tiles[i];
        return !t.removed && t.frozen === 0 && !t.locked && t.blockedCount === 0;
    }
    pick(i) {
        const t = this.tiles[i];
        if (this.occupied >= this.capacity)
            return false;
        t.removed = true;
        this.remaining--;
        for (const low of t.occludes)
            this.tiles[low].blockedCount--;
        const c = (this.slotTypeCount.get(t.type) ?? 0) + 1;
        this.slotTypeCount.set(t.type, c);
        let matched = false;
        if (c >= 3) {
            this.slotTypeCount.set(t.type, c - 3);
            this.occupied -= 3;
            this.matchesDone++;
            matched = true;
            for (const tt of this.tiles) {
                if (tt.frozen > 0)
                    tt.frozen--;
                if (tt.locked && tt.unlockAfter > 0 && this.matchesDone >= tt.unlockAfter)
                    tt.locked = false;
            }
        }
        else {
            this.occupied++;
        }
        this.undoStack.push({ idx: i, matched });
        return true;
    }
    undo() {
        const top = this.undoStack.pop();
        if (!top)
            return;
        const t = this.tiles[top.idx];
        t.removed = false;
        this.remaining++;
        if (top.matched) {
            // 反向：恢复冰冻与锁定（matchesDone 回退）
            this.matchesDone--;
            // 精确恢复成本高，此处采用重算策略：DFS 回溯场景下冻结/锁定状态由外层快照处理
            throw new Error('undo of matched pick must use snapshot path');
        }
        else {
            const c = (this.slotTypeCount.get(t.type) ?? 0);
            this.slotTypeCount.set(t.type, c - 1);
            this.occupied--;
        }
    }
}
/** 带快照的 DFS（小关卡）。快照 = 槽计数 + 冰冻数组，成本低。 */
function solveDFS(level) {
    const st = new SolverState(level, BASE_SLOT_CAPACITY);
    let budget = DFS_BUDGET;
    const moves = [];
    const frozenSnap = st.tiles.map((t) => t.frozen);
    const lockedSnap = st.tiles.map((t) => t.locked);
    const dfs = () => {
        if (st.remaining === 0)
            return true;
        if (budget-- <= 0)
            return false;
        // 收集可点击
        const clickable = [];
        for (let i = 0; i < st.tiles.length; i++)
            if (st.clickable(i))
                clickable.push(i);
        if (clickable.length === 0)
            return false;
        // 启发式排序：优先能凑成三消的
        clickable.sort((a, b) => {
            const ca = st.slotTypeCount.get(st.tiles[a].type) ?? 0;
            const cb = st.slotTypeCount.get(st.tiles[b].type) ?? 0;
            const va = (ca >= 2 ? 100 : 0) + ca;
            const vb = (cb >= 2 ? 100 : 0) + cb;
            return vb - va;
        });
        for (const idx of clickable) {
            // 快照
            const slotSnap = new Map(st.slotTypeCount);
            const occupiedSnap = st.occupied;
            const matchesSnap = st.matchesDone;
            const fSnap = st.tiles.map((t) => t.frozen);
            const lSnap = st.tiles.map((t) => t.locked);
            if (!st.pick(idx))
                continue;
            moves.push(st.tiles[idx].id);
            if (dfs())
                return true;
            moves.pop();
            // 手工回滚
            const t = st.tiles[idx];
            t.removed = false;
            st.remaining++;
            const c = slotSnap.get(t.type) ?? 0;
            st.slotTypeCount.set(t.type, c);
            st.occupied = occupiedSnap;
            st.matchesDone = matchesSnap;
            for (let k = 0; k < st.tiles.length; k++) {
                st.tiles[k].frozen = fSnap[k];
                st.tiles[k].locked = lSnap[k];
            }
            for (const low of t.occludes)
                st.tiles[low].blockedCount++;
        }
        return false;
    };
    const solved = dfs();
    return { solved, method: 'dfs_backtracking', attempts: DFS_BUDGET - Math.max(0, budget), moves: solved ? [...moves] : undefined };
}
/** 启发式贪心 + 随机重启（大关卡）。 */
function solveGreedy(level, seed) {
    for (let r = 0; r < GREEDY_RESTARTS; r++) {
        const rand = mulberry32(seed + r * 7919);
        const st = new SolverState(level, BASE_SLOT_CAPACITY);
        const moves = [];
        let alive = true;
        while (st.remaining > 0) {
            // 收集可点击（含"拾取后立即消除"优先）
            let bestIdx = -1;
            let bestScore = -1;
            let anyClickable = false;
            for (let i = 0; i < st.tiles.length; i++) {
                if (!st.clickable(i))
                    continue;
                anyClickable = true;
                const c = st.slotTypeCount.get(st.tiles[i].type) ?? 0;
                let s = c * 10 + (c >= 2 ? 100 : 0);
                if (rand() < 0.3)
                    s += rand() * 20; // 多样性
                if (s > bestScore) {
                    bestScore = s;
                    bestIdx = i;
                }
            }
            if (!anyClickable || st.occupied >= st.capacity) {
                alive = false;
                break;
            }
            st.pick(bestIdx);
            moves.push(st.tiles[bestIdx].id);
        }
        if (alive && st.remaining === 0) {
            return { solved: true, method: 'greedy_randomized', attempts: r + 1, moves };
        }
    }
    return { solved: false, method: 'greedy_randomized', attempts: GREEDY_RESTARTS };
}
/** 可解性验证入口：不修改传入 level。 */
export function solveLevel(level, seed = 20260101) {
    const count = level.itemPositions.length;
    if (count % 3 !== 0)
        return { solved: false, method: 'count_check', attempts: 0 };
    if (count <= SMALL_LEVEL_TILES)
        return solveDFS(level);
    return solveGreedy(level, seed);
}
