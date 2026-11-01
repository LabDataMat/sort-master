/**
 * 遮挡关系图（纯逻辑）。
 * 遮挡关系是一份独立数据：由几何关系构建显式边（upper -> lower），
 * 点击可行性查询这张图，绝不依赖 Sprite 渲染顺序。
 */
export class OcclusionGraph {
    constructor(ratio) {
        /** lowerId -> 遮挡它的 upperId 集合 */
        this.blockedBy = new Map();
        this.ratio = ratio;
    }
    /** 由全部在场物品重建显式遮挡边 */
    rebuild(tiles) {
        this.blockedBy.clear();
        for (const t of tiles)
            this.blockedBy.set(t.id, new Set());
        const live = tiles.filter((t) => t.status !== 'removed');
        for (let i = 0; i < live.length; i++) {
            for (let j = 0; j < live.length; j++) {
                if (i === j)
                    continue;
                const up = live[i];
                const low = live[j];
                if (up.layer <= low.layer)
                    continue;
                if (OcclusionGraph.overlaps(up, low, this.ratio)) {
                    this.blockedBy.get(low.id).add(up.id);
                }
            }
        }
    }
    static overlaps(up, low, ratio) {
        const overlapX = Math.min(up.x + up.w, low.x + low.w) - Math.max(up.x, low.x);
        const overlapY = Math.min(up.y + up.h, low.y + low.h) - Math.max(up.y, low.y);
        if (overlapX <= 0 || overlapY <= 0)
            return false;
        const minW = Math.min(up.w, low.w);
        const minH = Math.min(up.h, low.h);
        return overlapX >= minW * ratio && overlapY >= minH * ratio;
    }
    /** 遮挡 tileId 的、仍在上层的有效遮挡者 */
    activeOccluders(tileId, isBlocking) {
        const set = this.blockedBy.get(tileId);
        if (!set)
            return [];
        const out = [];
        for (const id of set)
            if (isBlocking(id))
                out.push(id);
        return out;
    }
    /** 调试：导出边列表 */
    exportEdges() {
        const edges = [];
        for (const [lower, uppers] of this.blockedBy) {
            for (const upper of uppers)
                edges.push({ upper, lower });
        }
        return edges;
    }
}
