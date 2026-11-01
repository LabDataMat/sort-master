import { LocalStorageAdapter, MemoryStorageAdapter, StorageAdapter, WxStorageAdapter } from '../systems/save/StorageAdapters';
import { isWeChatEnv } from './WxTypes';
import { WeChatAdService } from '../ads/WeChatAdService';
import { MockAdService } from '../ads/MockAdService';
import type { IAdService } from '../ads/IAdService';

/**
 * 平台管理（纯逻辑）：
 * - 检测运行环境（微信小游戏 / 浏览器）
 * - 选择存储适配器与广告服务
 * - 广告位 ID 配置入口（未配置时自动降级 Mock，游戏正常运行）
 */
export class PlatformManager {
  readonly isWeChat: boolean;
  readonly storage: StorageAdapter;
  readonly adService: IAdService;
  /** 配置入口：发布前在 ads/AdConfig.ts 或构建时注入 */
  static WECHAT_APP_ID = '';
  static WECHAT_REWARDED_AD_UNIT_ID = '';

  constructor() {
    this.isWeChat = isWeChatEnv();
    if (this.isWeChat) {
      const wxApi = (globalThis as any).wx;
      this.storage = new WxStorageAdapter(wxApi);
      this.adService =
        PlatformManager.WECHAT_REWARDED_AD_UNIT_ID && PlatformManager.WECHAT_APP_ID
          ? new WeChatAdService(wxApi, PlatformManager.WECHAT_REWARDED_AD_UNIT_ID)
          : new MockAdService(); // 未配置广告位：Mock 降级，游戏正常可玩
    } else {
      this.storage = typeof localStorage !== 'undefined' ? new LocalStorageAdapter() : new MemoryStorageAdapter();
      this.adService = new MockAdService();
    }
  }

  get isMockAd(): boolean {
    return this.adService instanceof MockAdService;
  }

  /** 安全区域顶部（刘海），微信环境用系统信息 */
  getSafeAreaTop(): number {
    if (this.isWeChat) {
      try {
        const info = (globalThis as any).wx.getSystemInfoSync();
        return info.safeArea?.top ?? 44;
      } catch {
        return 44;
      }
    }
    return 0;
  }
}
