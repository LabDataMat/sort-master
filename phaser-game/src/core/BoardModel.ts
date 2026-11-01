import type { LevelItem } from './types';

/** 遮挡判定阈值：宽/高重叠均需达到较小边的 35% */
export const OCCLUSION_RATIO = 0.35;

export interface Tile extends LevelItem {
  /** 同层绘制顺序：越大越靠上 */
  index: number;
  removed: boolean;
}

export interface TileSnapshot {
  id: string;
  removed: boolean;
  frozen: number;
  locked: boolean;
}

/**
 * 棋盘模型：物品集合 + 遮挡关系 + 可点击判定（纯逻辑）。
 *
 * z 序：层号大者在上；同层时 index 大者在上。
 * 遮挡：两物品矩形重叠达到阈值才算遮挡；被任一未移除上层物品遮挡即不可点击。
 */
export class BoardModel {
  readonly tiles: Tile[] = [];
  private byId = new Map<string, Tile>();
  matchesResolved = 0;

  constructor(items: readonly LevelItem[]) {
    this.load(items);
  }

  load(items: readonly LevelItem[]): void {
    this.tiles.length = 0;
    this.byId.clear();
    this.matchesResolved = 0;

    items.forEach((it, i) => {
      const tile: Tile = { ...it, index: i, removed: false };
      this.tiles.push(tile);
      this.byId.set(tile.instanceId, tile);
    });
  }

  get(id: string): Tile | undefined {
    return this.byId.get(id);
  }

  get remaining(): number {
    let n = 0;
    for (const t of this.tiles) if (!t.removed) n++;
    return n;
  }

  private static isAbove(a: Tile, b: Tile): boolean {
    return a.layer > b.layer || (a.layer === b.layer && a.index > b.index);
  }

  private static overlapsEnough(a: Tile, b: Tile): boolean {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox <= 0 || oy <= 0) return false;
    return ox >= Math.min(a.w, b.w) * OCCLUSION_RATIO && oy >= Math.min(a.h, b.h) * OCCLUSION_RATIO;
  }

  /** 是否被上层物品遮挡 */
  isBlocked(tile: Tile): boolean {
    if (tile.removed) return false;
    for (const other of this.tiles) {
      if (other === tile || other.removed) continue;
      if (!BoardModel.isAbove(other, tile)) continue;
      if (BoardModel.overlapsEnough(other, tile)) return true;
    }
    return false;
  }

  /** 综合可点击：未移除、无冰冻、未锁定、未被遮挡 */
  isClickable(tile: Tile): boolean {
    if (tile.removed) return false;
    if (tile.frozen > 0 || tile.locked) return false;
    return !this.isBlocked(tile);
  }

  clickable(): Tile[] {
    return this.tiles.filter((t) => this.isClickable(t));
  }

  remove(id: string): boolean {
    const t = this.get(id);
    if (!t || t.removed) return false;
    t.removed = true;
    return true;
  }

  /** 每完成一次消除：全场冰冻 -1；累计消除达到阈值的锁定物品解锁 */
  onMatchResolved(): void {
    this.matchesResolved++;
    for (const t of this.tiles) {
      if (t.removed) continue;
      if (t.frozen > 0) t.frozen--;
      if (t.locked && this.matchesResolved >= t.unlockAfterMatches) t.locked = false;
    }
  }

  snapshot(): TileSnapshot[] {
    return this.tiles.map((t) => ({ id: t.instanceId, removed: t.removed, frozen: t.frozen, locked: t.locked }));
  }

  restore(states: readonly TileSnapshot[]): void {
    for (const s of states) {
      const t = this.get(s.id);
      if (!t) continue;
      t.removed = s.removed;
      t.frozen = s.frozen;
      t.locked = s.locked;
    }
  }
}
