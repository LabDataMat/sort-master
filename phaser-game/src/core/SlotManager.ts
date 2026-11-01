import { resolveMatches } from './MatchSystem';
import type { MatchGroup, SlotItem } from './types';

export interface SlotAddResult {
  inserted: boolean;
  reason?: string;
  groups: MatchGroup[];
  fullAfterInsert: boolean;
}

/**
 * 收纳槽模型（纯逻辑）。
 * 只负责容量、顺序与调用 MatchSystem，不参与消除规则判断。
 */
export class SlotManager {
  capacity: number;
  private items: SlotItem[] = [];

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
  }

  get all(): readonly SlotItem[] {
    return this.items;
  }

  get count(): number {
    return this.items.length;
  }

  get isFull(): boolean {
    return this.items.length >= this.capacity;
  }

  get freeSlots(): number {
    return this.capacity - this.items.length;
  }

  /** 追加到槽尾并立即结算；槽满时拒绝插入 */
  add(instanceId: string, itemId: string): SlotAddResult {
    if (this.isFull) {
      return { inserted: false, reason: 'full', groups: [], fullAfterInsert: true };
    }

    this.items.push({ instanceId, itemId });
    const resolved = resolveMatches(this.items);

    if (resolved.groups.length > 0) {
      this.items = resolved.remaining;
    }

    return {
      inserted: true,
      groups: resolved.groups,
      fullAfterInsert: this.isFull,
    };
  }

  clear(): void {
    this.items = [];
  }

  snapshot(): SlotItem[] {
    return this.items.map((x) => ({ ...x }));
  }

  restore(items: readonly SlotItem[]): void {
    this.items = items.map((x) => ({ ...x }));
  }

  countOf(itemId: string): number {
    let n = 0;
    for (const it of this.items) if (it.itemId === itemId) n++;
    return n;
  }
}
