/**
 * 轻量类型化事件总线（纯逻辑）。
 * 模块之间通过事件通信，避免循环依赖。
 */
type Handler = (...args: any[]) => void;

export class EventHub<E extends Record<string, any>> {
  private map = new Map<keyof E, Set<Handler>>();

  on<K extends keyof E>(event: K, fn: Handler): void {
    let set = this.map.get(event);
    if (!set) {
      set = new Set();
      this.map.set(event, set);
    }
    set.add(fn);
  }

  off<K extends keyof E>(event: K, fn: Handler): void {
    this.map.get(event)?.delete(fn);
  }

  offAll(): void {
    this.map.clear();
  }

  emit<K extends keyof E>(event: K, ...args: any[]): void {
    const set = this.map.get(event);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        fn(...args);
      } catch (e) {
        // 单个监听器异常不阻断其它监听器
        if (typeof console !== 'undefined') console.error(`[EventHub] handler error on "${String(event)}"`, e);
      }
    }
  }
}
