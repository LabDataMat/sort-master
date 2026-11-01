import { Logger } from '../utils/Logger';
/**
 * 微信小游戏激励视频广告服务（真实实现）。
 * 使用 wx.createRewardedVideoAd 官方 API。
 *
 * 关键规则：
 * - 只有 onClose 回调返回 isEnded=true（完整观看）才允许 completed=true
 * - show() 调用成功 ≠ 播放完成；加载成功 ≠ 播放成功
 * - show 失败有限重试（load 后重试一次）
 * - onClose/onError 防重复回调（幂等）
 * - 广告位 ID 从配置读取；未配置时 isAvailable()=false，游戏正常降级运行
 */
export class WeChatAdService {
    constructor(wxApi, adUnitId) {
        this.rewardedAd = null;
        // 生命周期状态
        this.loadSuccess = false;
        this.loadError = null;
        this.pendingResolve = null;
        this.closedThisSession = false;
        this.wx = wxApi;
        this.adUnitId = adUnitId;
    }
    initialize() {
        if (!this.isAvailable())
            return;
        if (this.rewardedAd)
            return;
        try {
            this.rewardedAd = this.wx.createRewardedVideoAd({ adUnitId: this.adUnitId });
            this.rewardedAd.onLoad(() => {
                this.loadSuccess = true;
                this.loadError = null;
                Logger.info('Ad', '激励视频广告加载成功');
            });
            this.rewardedAd.onError((err) => {
                this.loadError = String(err?.errMsg ?? err ?? 'unknown');
                Logger.warn('Ad', '激励视频广告加载错误', this.loadError);
            });
            this.rewardedAd.onClose((res) => {
                // 防重复回调：一次播放只处理一次关闭
                if (this.closedThisSession)
                    return;
                this.closedThisSession = true;
                const resolve = this.pendingResolve;
                this.pendingResolve = null;
                const completed = !!(res && res.isEnded);
                Logger.info('Ad', `激励视频关闭，完整观看=${completed}`);
                resolve?.({ completed });
            });
            Logger.info('Ad', '微信激励视频广告实例创建成功');
        }
        catch (e) {
            Logger.error('Ad', '创建激励视频广告失败', e);
            this.rewardedAd = null;
        }
    }
    isAvailable() {
        return !!this.wx && typeof this.wx.createRewardedVideoAd === 'function' && !!this.adUnitId;
    }
    showRewardedAd(_placement) {
        if (!this.rewardedAd) {
            return Promise.resolve({ completed: false, error: 'ad_not_initialized' });
        }
        this.closedThisSession = false;
        return new Promise((resolve) => {
            this.pendingResolve = resolve;
            let retries = 0;
            const attemptShow = () => {
                this.rewardedAd
                    .show()
                    .then(() => {
                    Logger.info('Ad', '激励视频 show() 成功（播放中）');
                })
                    .catch((err) => {
                    retries++;
                    if (retries < WeChatAdService.MAX_SHOW_RETRY) {
                        Logger.warn('Ad', `show 失败，尝试 load 后重试 (${retries})`, err);
                        // show 失败时手动 load 再重试
                        this.rewardedAd
                            .load()
                            .then(() => attemptShow())
                            .catch(() => this.finish({ completed: false, error: 'show_failed_after_retry' }));
                    }
                    else {
                        this.finish({ completed: false, error: 'show_failed_after_retry' });
                    }
                });
            };
            attemptShow();
        });
    }
    finish(r) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        resolve?.(r);
    }
    showBanner() {
        // 第一版默认关闭 Banner，确认布局与平台规范后再启用
        Logger.info('Ad', 'Banner 预留接口（第一版默认关闭）');
    }
    hideBanner() {
        /* 预留 */
    }
    destroy() {
        if (this.rewardedAd) {
            try {
                this.rewardedAd.destroy();
            }
            catch {
                /* ignore */
            }
            this.rewardedAd = null;
        }
    }
}
WeChatAdService.MAX_SHOW_RETRY = 2;
