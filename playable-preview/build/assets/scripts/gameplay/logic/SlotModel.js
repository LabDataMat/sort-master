/**
 * 收纳槽逻辑（纯逻辑），与动画完全解耦。
 * 容量默认 7，道具可临时 +1 并按使用次数递减。
 */
export class SlotModel {
    constructor(baseCapacity) {
        this.items = [];
        this.extraMovesLeft = 0;
        this.extraCapacity = 0;
        this.baseCapacity = baseCapacity;
        this.items = new Array(baseCapacity).fill(null);
    }
    get capacity() {
        return this.baseCapacity + this.extraCapacity;
    }
    get hasExtraSlot() {
        return this.extraCapacity > 0;
    }
    get occupiedCount() {
        let n = 0;
        for (const it of this.items)
            if (it)
                n++;
        return n;
    }
    isFull() {
        return this.occupiedCount >= this.capacity;
    }
    /** 临时扩容（额外槽位道具），moves 次操作后收回 */
    grantExtraSlot(moves) {
        this.extraCapacity = Math.max(this.extraCapacity, 1);
        this.extraMovesLeft = moves;
        this.items.push(null);
    }
    tickExtraMove() {
        if (this.extraCapacity > 0) {
            this.extraMovesLeft--;
            if (this.extraMovesLeft <= 0) {
                this.extraCapacity = 0;
                // 收回额外槽位：先压缩空位
                this.compact();
                while (this.items.length > this.baseCapacity) {
                    if (this.items[this.items.length - 1] !== null)
                        break; // 不可能：占用数 <= 基础容量才收回
                    this.items.pop();
                }
            }
        }
    }
    /** 压缩空位，使物品靠前排列 */
    compact() {
        const kept = [];
        for (const it of this.items)
            if (it)
                kept.push(it);
        this.items = new Array(this.capacity).fill(null);
        kept.forEach((it, i) => (this.items[i] = it));
    }
    /** 加入一个物品；立即执行三消判定（匹配逻辑独立于动画） */
    add(tileId, type) {
        let index = -1;
        for (let i = 0; i < this.items.length; i++) {
            if (!this.items[i]) {
                index = i;
                break;
            }
        }
        if (index < 0)
            return { inserted: false, index: -1, matched: null, fullAfterInsert: this.isFull() };
        this.items[index] = { tileId, type };
        const matched = this.findTriple(type);
        if (matched) {
            this.removeItems(matched);
        }
        else {
            this.tickExtraMove();
        }
        return { inserted: true, index, matched, fullAfterInsert: this.isFull() };
    }
    /** 找出同类凑满 3 个的槽位物品（取最早进入的 3 个） */
    findTriple(type) {
        const hits = [];
        for (const it of this.items) {
            if (it && it.type === type)
                hits.push(it);
        }
        if (hits.length >= 3)
            return hits.slice(0, 3);
        return null;
    }
    removeItems(list) {
        const ids = new Set(list.map((i) => i.tileId));
        for (let i = 0; i < this.items.length; i++) {
            const it = this.items[i];
            if (it && ids.has(it.tileId))
                this.items[i] = null;
        }
        this.compact();
    }
    /** 用于撤回：整体恢复 */
    restore(items, capacity, extraMovesLeft, baseCapacity) {
        this.baseCapacity = baseCapacity;
        this.items = items.map((it) => (it ? { ...it } : null));
        while (this.items.length < capacity)
            this.items.push(null);
        this.items.length = capacity;
        this.extraCapacity = capacity - baseCapacity;
        this.extraMovesLeft = extraMovesLeft;
    }
}
