/**
 * 金币管理（纯逻辑）：
 * - 增加必须为正数；扣减必须余额充足，否则失败（余额永不为负）
 * - 通过事件通知 UI
 */
export class CurrencyManager {
    constructor(initialCoins, bus) {
        this.coins = Math.max(0, Math.floor(initialCoins));
        this.bus = bus;
    }
    get balance() {
        return this.coins;
    }
    /** 加金币，amount 必须 > 0 */
    add(amount, reason) {
        if (!Number.isFinite(amount) || amount <= 0)
            return false;
        const delta = Math.floor(amount);
        this.coins += delta;
        this.bus.emit('coins:changed', { coins: this.coins, delta, reason });
        return true;
    }
    /** 扣金币，余额不足返回 false（不产生负数） */
    spend(amount, reason) {
        if (!Number.isFinite(amount) || amount <= 0)
            return false;
        const delta = Math.floor(amount);
        if (this.coins < delta)
            return false;
        this.coins -= delta;
        this.bus.emit('coins:changed', { coins: this.coins, delta: -delta, reason });
        return true;
    }
}
