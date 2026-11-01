export class EventHub {
    constructor() {
        this.map = new Map();
    }
    on(event, fn) {
        let set = this.map.get(event);
        if (!set) {
            set = new Set();
            this.map.set(event, set);
        }
        set.add(fn);
    }
    off(event, fn) {
        this.map.get(event)?.delete(fn);
    }
    offAll() {
        this.map.clear();
    }
    emit(event, ...args) {
        const set = this.map.get(event);
        if (!set)
            return;
        for (const fn of Array.from(set)) {
            try {
                fn(...args);
            }
            catch (e) {
                // 单个监听器异常不阻断其它监听器
                if (typeof console !== 'undefined')
                    console.error(`[EventHub] handler error on "${String(event)}"`, e);
            }
        }
    }
}
