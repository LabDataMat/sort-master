import type { BoosterType } from '../../core/GameConfig';
import type { BoosterStock } from '../save/SaveManager';

/** 道具库存（纯逻辑）：数量校验 + 扣减 */
export class BoosterInventory {
  private stock: BoosterStock;
  private onChange?: () => void;

  constructor(initial: BoosterStock, onChange?: () => void) {
    this.stock = {
      undo: Math.max(0, initial.undo | 0),
      shuffle: Math.max(0, initial.shuffle | 0),
      remove: Math.max(0, initial.remove | 0),
      extra_slot: Math.max(0, initial.extra_slot | 0),
    };
    this.onChange = onChange;
  }

  get(type: BoosterType): number {
    return this.stock[type];
  }

  getAll(): BoosterStock {
    return { ...this.stock };
  }

  add(type: BoosterType, count: number): boolean {
    if (!Number.isFinite(count) || count <= 0) return false;
    this.stock[type] += Math.floor(count);
    this.onChange?.();
    return true;
  }

  /** 消耗一个，不足返回 false */
  consume(type: BoosterType): boolean {
    if (this.stock[type] <= 0) return false;
    this.stock[type]--;
    this.onChange?.();
    return true;
  }
}
