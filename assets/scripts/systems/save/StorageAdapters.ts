/** 存储适配器接口：Web localStorage / 微信 wx.storage / 内存 三种实现。 */
export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
  remove(key: string): void {
    this.map.delete(key);
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  set(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {
      /* 存储满等异常不阻断游戏 */
    }
  }
  remove(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export class WxStorageAdapter implements StorageAdapter {
  constructor(private wx: any) {}
  get(key: string): string | null {
    try {
      const r = this.wx.getStorageSync(key);
      return r === '' || r === undefined || r === null ? null : String(r);
    } catch {
      return null;
    }
  }
  set(key: string, value: string): void {
    try {
      this.wx.setStorageSync(key, value);
    } catch {
      /* ignore */
    }
  }
  remove(key: string): void {
    try {
      this.wx.removeStorageSync(key);
    } catch {
      /* ignore */
    }
  }
}
