import { OCCLUSION_OVERLAP_RATIO, BASE_SLOT_CAPACITY } from '../../core/GameConfig';
import { OcclusionGraph } from './OcclusionGraph';
import type { LevelData, TileData, TilePlacement } from '../../level/LevelTypes';

/**
 * 棋盘逻辑（纯逻辑）：持有全部物品数据与遮挡图。
 * 可点击性 = 未移除 && 未冰冻 && 未锁定 && 无有效上层遮挡者。
 */
export class BoardLogic {
  tiles = new Map<string, TileData>();
  occlusion: OcclusionGraph;
  matchesDone = 0;
  private order: string[] = [];

  constructor(tiles: TileData[], ratio = OCCLUSION_OVERLAP_RATIO) {
    this.occlusion = new OcclusionGraph(ratio);
    for (const t of tiles) {
      this.tiles.set(t.id, t);
      this.order.push(t.id);
    }
    this.occlusion.rebuild(tiles);
  }

  static fromLevel(level: LevelData): BoardLogic {
    const frozen = new Set(level.obstacles.frozenTileIds);
    const locked = new Set(level.obstacles.lockedTileIds);
    const tiles: TileData[] = level.itemPositions.map((p) => BoardLogic.tileFromPlacement(p));
    for (const t of tiles) {
      if (frozen.has(t.id)) t.frozen = 1;
      if (locked.has(t.id)) {
        t.locked = true;
        t.unlockAfterMatches = level.obstacles.lockedUnlockAfterMatches ?? 2;
      }
    }
    return new BoardLogic(tiles);
  }

  static tileFromPlacement(p: TilePlacement): TileData {
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
      status: 'idle',
    };
  }

  get remainingCount(): number {
    let n = 0;
    for (const t of this.tiles.values()) if (t.status !== 'removed') n++;
    return n;
  }

  getTile(id: string): TileData | undefined {
    return this.tiles.get(id);
  }

  allTiles(): TileData[] {
    return this.order.map((id) => this.tiles.get(id)!);
  }

  liveTiles(): TileData[] {
    return this.allTiles().filter((t) => t.status !== 'removed');
  }

  private isBlocking(upperId: string): boolean {
    const t = this.tiles.get(upperId);
    return !!t && t.status !== 'removed';
  }

  isTileClickable(id: string): boolean {
    const t = this.tiles.get(id);
    if (!t || t.status === 'removed') return false;
    if (t.frozen > 0) return false;
    if (t.locked) return false;
    return this.occlusion.activeOccluders(id, this.isBlocking.bind(this)).length === 0;
  }

  /** 当前全部可点击物品 */
  getClickableTiles(): TileData[] {
    return this.liveTiles().filter((t) => this.isTileClickable(t.id));
  }

  /** 标记移除（逻辑立即生效，表现层负责动画） */
  removeTile(id: string): boolean {
    const t = this.tiles.get(id);
    if (!t || t.status === 'removed') return false;
    t.status = 'removed';
    return true;
  }

  /** 每次三消成功调用：冰冻 -1，锁定检查 */
  onMatchResolved(): void {
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
  shuffle(rand: () => number): void {
    const live = this.liveTiles();
    const rects: { layer: number; x: number; y: number; w: number; h: number }[] = live.map((t) => ({
      layer: t.layer,
      x: t.x,
      y: t.y,
      w: t.w,
      h: t.h,
    }));
    // Fisher-Yates 洗矩形
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
}

export { BASE_SLOT_CAPACITY };
