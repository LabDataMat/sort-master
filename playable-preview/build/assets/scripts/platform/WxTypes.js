/** 环境检测：是否运行在微信小游戏 */
export function isWeChatEnv() {
    return typeof globalThis.wx !== 'undefined' && !!globalThis.wx.getStorageSync;
}
