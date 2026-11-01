/** 微信小游戏 API 最小类型子集（项目实际用到的部分）。 */
export interface WxApi {
  createRewardedVideoAd(opts: { adUnitId: string }): any;
  getStorageSync(key: string): any;
  setStorageSync(key: string, value: any): void;
  removeStorageSync(key: string): void;
  getSystemInfoSync(): { screenWidth: number; screenHeight: number; safeArea?: { top: number; bottom: number } };
  showToast?(opts: any): void;
  vibrateShort?(opts?: any): void;
  onShow?(cb: () => void): void;
  onHide?(cb: () => void): void;
  getLaunchOptionsSync?(): { query?: Record<string, string> };
}

declare global {
  const wx: WxApi | undefined;
}

/** 环境检测：是否运行在微信小游戏 */
export function isWeChatEnv(): boolean {
  return typeof (globalThis as any).wx !== 'undefined' && !!(globalThis as any).wx.getStorageSync;
}
