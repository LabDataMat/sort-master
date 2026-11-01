import { LocalStorageAdapter, MemoryStorageAdapter, WxStorageAdapter } from '../systems/save/StorageAdapters';
import { isWeChatEnv } from './WxTypes';
import { WeChatAdService } from '../ads/WeChatAdService';
import { MockAdService } from '../ads/MockAdService';
/**
 * 平台管理（纯逻辑）：
 * - 检测运行环境（微信小游戏 / 浏览器）
 * - 选择存储适配器与广告服务
 * - 广告位 ID 配置入口（未配置时自动降级 Mock，游戏正常运行）
 */
export class PlatformManager {
    constructor() {
        this.isWeChat = isWeChatEnv();
        if (this.isWeChat) {
            const wxApi = globalThis.wx;
            this.storage = new WxStorageAdapter(wxApi);
            this.adService =
                PlatformManager.WECHAT_REWARDED_AD_UNIT_ID && PlatformManager.WECHAT_APP_ID
                    ? new WeChatAdService(wxApi, PlatformManager.WECHAT_REWARDED_AD_UNIT_ID)
                    : new MockAdService(); // 未配置广告位：Mock 降级，游戏正常可玩
        }
        else {
            this.storage = typeof localStorage !== 'undefined' ? new LocalStorageAdapter() : new MemoryStorageAdapter();
            this.adService = new MockAdService();
        }
    }
    get isMockAd() {
        return this.adService instanceof MockAdService;
    }
    /** 安全区域顶部（刘海），微信环境用系统信息 */
    getSafeAreaTop() {
        if (this.isWeChat) {
            try {
                const info = globalThis.wx.getSystemInfoSync();
                return info.safeArea?.top ?? 44;
            }
            catch {
                return 44;
            }
        }
        return 0;
    }
}
/** 配置入口：发布前在 ads/AdConfig.ts 或构建时注入 */
PlatformManager.WECHAT_APP_ID = '';
PlatformManager.WECHAT_REWARDED_AD_UNIT_ID = '';
