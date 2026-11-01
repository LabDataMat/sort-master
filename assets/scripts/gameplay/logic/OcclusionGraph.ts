import type { TileData } from '../../level/LevelTypes';

/**
 * 遮挡关系图（纯逻辑）。
 *
 * 遮挡关系是一份独立数据：由几何关系构建显式边（upper -> lower），
 * 点击可行性查询这张图，绝不依赖 Sprite 渲染顺序。
 *
 * z 序定义（与渲染顺序严格一致）：
 *   - 层号大者在上；
 *   - 同层时，数组中靠后者渲染在上（场景/预览均按数组顺序创建节点）。
 * 因此"逻辑可点击"与"视觉可点击"完全等价：
 * 任何在视觉上盖住物品中心点的遮挡者，必然构成 >=35% 重叠的遮挡边，被判定为不可点击。
 */
export class OcclusionGraph {
  /** lowerId -> 遮挡它的 upperId 集合 */
  private blockedBy = new Map<string, Set<string>>();
  private ratio: number;

  constructor(ratio: number) {
    this.ratio = ratio;
  }

  /** 由全部在场物品重建显式遮挡边（传入数组顺序即渲染顺序） */
  rebuild(tiles: TileData[]): void {
    this.blockedBy.clear();
    for (const t of tiles) this.blockedBy.set(t.id, new Set());
    const n = tiles.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const a = tiles[i];
        const b = tiles[j];
        if (a.status === 'removed' || b.status === 'removed') continue;
        // z 序：层号大在上；同层时索引大在上
        const aAbove = a.layer > b.layer || (a.layer === b.layer && i > j);
        if (!aAbove) continue;
        if (OcclusionGraph.overlaps(a, b, this.ratio)) {
          this.blockedBy.get(b.id)!.add(a.id);
        }
      }
    }
  }

  static overlaps(up: TileData, low: TileData, ratio: number): boolean {
    const overlapX = Math.min(up.x + up.w, low.x + low.w) - Math.max(up.x, low.x);
    const overlapY = Math.min(up.y + up.h, low.y + low.h) - Math.max(up.y, low.y);
    if (overlapX <= 0 || overlapY <= 0) return false;
    const minW = Math.min(up.w, low.w);
    const minH = Math.min(up.h, low.h);
    return overlapX >= minW * ratio && overlapY >= minH * ratio;
  }

  /** 遮挡 tileId 的、仍在上层的有效遮挡者 */
  activeOccluders(tileId: string, isBlocking: (upperId: string) => boolean): string[] {
    const set = this.blockedBy.get(tileId);
    if (!set) return [];
    const out: string[] = [];
    for (const id of set) if (isBlocking(id)) out.push(id);
    return out;
  }

  /** 调试：导出边列表 */
  exportEdges(): { upper: string; lower: string }[] {
    const edges: { upper: string; lower: string }[] = [];
    for (const [lower, uppers] of this.blockedBy) {
      for (const upper of uppers) edges.push({ upper, lower });
    }
    return edges;
  }
}
