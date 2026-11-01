/** 道具库存（纯逻辑）：数量校验 + 扣减 */
export class BoosterInventory {
    constructor(initial, onChange) {
        this.stock = {
            undo: Math.max(0, initial.undo | 0),
            shuffle: Math.max(0, initial.shuffle | 0),
            remove: Math.max(0, initial.remove | 0),
            extra_slot: Math.max(0, initial.extra_slot | 0),
        };
        this.onChange = onChange;
    }
    get(type) {
        return this.stock[type];
    }
    getAll() {
        return { ...this.stock };
    }
    add(type, count) {
        if (!Number.isFinite(count) || count <= 0)
            return false;
        this.stock[type] += Math.floor(count);
        this.onChange?.();
        return true;
    }
    /** 消耗一个，不足返回 false */
    consume(type) {
        if (this.stock[type] <= 0)
            return false;
        this.stock[type]--;
        this.onChange?.();
        return true;
    }
}
