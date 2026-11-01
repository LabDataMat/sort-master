import { BoardModel, type TileSnapshot } from './BoardModel';
import { SlotManager } from './SlotManager';
import type { LevelData, MatchGroup, PickOutcome, SessionState, SlotItem } from './types';

interface Snapshot {
  tiles: TileSnapshot[];
  slot: SlotItem[];
  matchesResolved: number;
  moves: number;
}

/**
 * 单局会话：编排棋盘、收纳槽与消除规则。
 * 逻辑在 pick() 内即时结算，表现层只消费返回值做动画，因此动画不参与判定。
 */
export class GameSession {
  readonly level: LevelData;
  readonly board: BoardModel;
  readonly slots: SlotManager;

  state: SessionState = 'playing';
  moves = 0;
  combo = 0;
  maxCombo = 0;
  boostersUsed = 0;

  private undoSnapshot: Snapshot | null = null;

  constructor(level: LevelData) {
    this.level = level;
    this.board = new BoardModel(level.items ?? []);
    this.slots = new SlotManager(level.slotCapacity > 0 ? level.slotCapacity : 7);
  }

  get canUndo(): boolean {
    return this.undoSnapshot !== null;
  }

  pick(tileId: string): PickOutcome {
    const fail = (reason: string): PickOutcome => ({ ok: false, reason, insertIndex: -1, groups: [], willMatch: false });

    if (this.state !== 'playing') return fail('state');

    const tile = this.board.get(tileId);
    if (!tile || tile.removed) return fail('missing');
    if (tile.frozen > 0) return fail('frozen');
    if (tile.locked) return fail('locked');
    if (this.board.isBlocked(tile)) return fail('occluded');
    if (this.slots.isFull) return fail('slots_full');

    const snapshot = this.capture();
    const insertIndex = this.slots.count;
    const add = this.slots.add(tile.instanceId, tile.itemId);
    if (!add.inserted) return fail(add.reason ?? 'full');

    this.undoSnapshot = snapshot;
    this.board.remove(tileId);
    this.moves++;

    let groups: MatchGroup[] = add.groups;

    if (groups.length > 0) {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      // 每组消除都推进全场冰冻/锁定解锁
      for (let i = 0; i < groups.length; i++) this.board.onMatchResolved();
    } else {
      this.combo = 0;
      if (add.fullAfterInsert) {
        this.state = 'lose';
        return { ok: true, insertIndex, groups, willMatch: false };
      }
    }

    if (this.board.remaining === 0) {
      this.state = 'victory';
    }

    return { ok: true, insertIndex, groups, willMatch: groups.length > 0 };
  }

  undo(): boolean {
    if (!this.undoSnapshot) return false;

    this.board.restore(this.undoSnapshot.tiles);
    this.board.matchesResolved = this.undoSnapshot.matchesResolved;
    this.slots.restore(this.undoSnapshot.slot);
    this.moves = this.undoSnapshot.moves;
    this.combo = 0;
    this.undoSnapshot = null;
    this.state = 'playing';
    this.boostersUsed++;
    return true;
  }

  /** 提示：优先返回「再拿一个即可三消」的可点击物品 */
  hint(): string | null {
    const list = this.board.clickable();
    if (list.length === 0) return null;
    for (const t of list) {
      if (this.slots.countOf(t.itemId) >= 2) return t.instanceId;
    }
    return list[0].instanceId;
  }

  /**
   * 洗牌：仅在当前可点击物品之间交换类型。
   * 不改变位置、层级与遮挡结构，因此不会破坏关卡合法性。
   */
  shuffle(rng: () => number = Math.random): boolean {
    const list = this.board.clickable();
    if (list.length < 2) return false;

    const ids = list.map((t) => t.itemId);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = ids[i];
      ids[i] = ids[j];
      ids[j] = tmp;
    }
    list.forEach((t, i) => {
      t.itemId = ids[i];
    });

    this.boostersUsed++;
    return true;
  }

  /** 星级：1 基础 + 连击≥2 + 未用道具 */
  stars(): number {
    let s = 1;
    if (this.maxCombo >= 2) s++;
    if (this.boostersUsed === 0) s++;
    return Math.min(3, s);
  }

  private capture(): Snapshot {
    return {
      tiles: this.board.snapshot(),
      slot: this.slots.snapshot(),
      matchesResolved: this.board.matchesResolved,
      moves: this.moves,
    };
  }
}
