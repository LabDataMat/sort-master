import { MatchManager, SlotItem } from './MatchManager';

export interface AddResult {
  inserted: boolean;
  /** 插入下标（压缩语义下等于追加前的尾部） */
  index: number;
  /** 触发的消除组（级联顺序，可能 0~N 组）；旧字段 matched 保留单组语义便于兼容 */
  groups: SlotItem[][];
  /** 插入并结算后槽位是否已满 */
  fullAfterInsert: boolean;
}

/**
 * 收纳槽逻辑（纯逻辑），与动画完全解耦。
 * 消除规则唯一：槽内三个连续相同物品消除（见 MatchManager），
 * 绝不做"统计全局同类数量达到三个就消除"。
 * 容量默认 7，道具可临时 +1 并按使用次数递减。
 */
export class SlotModel {
  items: SlotItem[] = [];
  baseCapacity: number;
  extraMovesLeft = 0;
  private extraCapacity = 0;

  constructor(baseCapacity: number) {
    this.baseCapacity = baseCapacity;
  }

  get capacity(): number {
    return this.baseCapacity + this.extraCapacity;
  }

  get occupiedCount(): number {
    return this.items.length;
  }

  isFull(): boolean {
    return this.items.length >= this.capacity;
  }

  get hasExtraSlot(): boolean {
    return this.extraCapacity > 0;
  }

  /** 临时扩容（额外槽位道具），moves 次操作后收回 */
  grantExtraSlot(moves: number): void {
    this.extraCapacity = Math.max(this.extraCapacity, 1);
    this.extraMovesLeft = moves;
  }

  private tickExtraMove(): void {
    if (this.extraCapacity > 0) {
      this.extraMovesLeft--;
      if (this.extraMovesLeft <= 0) {
        this.extraCapacity = 0;
        while (this.items.length > this.baseCapacity) {
          // 占用数不会超过基础容量时才可能到这里（消除保证了占用<=容量）
          this.items.pop();
        }
      }
    }
  }

  /**
   * 追加一个物品：按进入顺序放到槽位尾部，然后由 MatchManager 结算连续消除（含级联）。
   */
  add(tileId: string, type: string): AddResult {
    if (this.isFull()) return { inserted: false, index: -1, groups: [], fullAfterInsert: this.isFull() };
    const item: SlotItem = { uniqueId: tileId, itemType: type, state: 'entering' };
    this.items.push(item);
    const index = this.items.length - 1;
    item.state = 'idle';

    const { groups, remaining } = MatchManager.resolve(this.items);
    this.items = remaining;
    if (groups.length === 0) {
      this.tickExtraMove();
    }
    return { inserted: true, index, groups: groups.map((g) => g.items), fullAfterInsert: this.isFull() };
  }

  /** 用于撤回：整体恢复（拷贝） */
  restore(items: SlotItem[], capacity: number, extraMovesLeft: number, baseCapacity: number): void {
    this.baseCapacity = baseCapacity;
    this.items = items.map((it) => ({ ...it }));
    this.extraCapacity = capacity - baseCapacity;
    this.extraMovesLeft = extraMovesLeft;
  }

  /** 兼容视图序列化 */
  snapshot(): (SlotItem | null)[] {
    const out: (SlotItem | null)[] = new Array(this.capacity).fill(null);
    this.items.forEach((it, i) => {
      if (i < out.length) out[i] = { ...it };
    });
    return out;
  }
}
