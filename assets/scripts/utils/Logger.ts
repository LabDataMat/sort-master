/** 统一日志工具（纯逻辑）。 */
export class Logger {
  private static enabled = true;

  static setEnabled(v: boolean) {
    Logger.enabled = v;
  }

  static info(tag: string, ...args: any[]) {
    if (Logger.enabled && typeof console !== 'undefined') console.log(`[${tag}]`, ...args);
  }

  static warn(tag: string, ...args: any[]) {
    if (typeof console !== 'undefined') console.warn(`[${tag}]`, ...args);
  }

  static error(tag: string, ...args: any[]) {
    if (typeof console !== 'undefined') console.error(`[${tag}]`, ...args);
  }
}
