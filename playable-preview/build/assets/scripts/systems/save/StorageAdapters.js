export class MemoryStorageAdapter {
    constructor() {
        this.map = new Map();
    }
    get(key) {
        return this.map.has(key) ? this.map.get(key) : null;
    }
    set(key, value) {
        this.map.set(key, value);
    }
    remove(key) {
        this.map.delete(key);
    }
}
export class LocalStorageAdapter {
    get(key) {
        try {
            return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        }
        catch {
            return null;
        }
    }
    set(key, value) {
        try {
            if (typeof localStorage !== 'undefined')
                localStorage.setItem(key, value);
        }
        catch {
            /* 存储满等异常不阻断游戏 */
        }
    }
    remove(key) {
        try {
            if (typeof localStorage !== 'undefined')
                localStorage.removeItem(key);
        }
        catch {
            /* ignore */
        }
    }
}
export class WxStorageAdapter {
    constructor(wx) {
        this.wx = wx;
    }
    get(key) {
        try {
            const r = this.wx.getStorageSync(key);
            return r === '' || r === undefined || r === null ? null : String(r);
        }
        catch {
            return null;
        }
    }
    set(key, value) {
        try {
            this.wx.setStorageSync(key, value);
        }
        catch {
            /* ignore */
        }
    }
    remove(key) {
        try {
            this.wx.removeStorageSync(key);
        }
        catch {
            /* ignore */
        }
    }
}
