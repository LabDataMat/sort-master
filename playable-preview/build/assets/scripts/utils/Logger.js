/** 统一日志工具（纯逻辑）。 */
export class Logger {
    static setEnabled(v) {
        Logger.enabled = v;
    }
    static info(tag, ...args) {
        if (Logger.enabled && typeof console !== 'undefined')
            console.log(`[${tag}]`, ...args);
    }
    static warn(tag, ...args) {
        if (typeof console !== 'undefined')
            console.warn(`[${tag}]`, ...args);
    }
    static error(tag, ...args) {
        if (typeof console !== 'undefined')
            console.error(`[${tag}]`, ...args);
    }
}
Logger.enabled = true;
