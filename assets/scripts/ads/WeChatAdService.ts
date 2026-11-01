import { Logger } from '../utils/Logger';
import type { AdPlacement } from '../core/GameConfig';
import type { IAdService, RewardedAdResult } from './IAdService';

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
export class WeChatAdService implements IAdService {
  private wx: any;
  private rewardedAd: any = null;
  private adUnitId: string;
  private static MAX_SHOW_RETRY = 2;

  // 生命周期状态
  private loadSuccess = false;
  private loadError: string | null = null;
  private pendingResolve: ((r: RewardedAdResult) => void) | null = null;
  private closedThisSession = false;

  constructor(wxApi: any, adUnitId: string) {
    this.wx = wxApi;
    this.adUnitId = adUnitId;
  }

  initialize(): void {
    if (!this.isAvailable()) return;
    if (this.rewardedAd) return;
    try {
      this.rewardedAd = this.wx.createRewardedVideoAd({ adUnitId: this.adUnitId });
      this.rewardedAd.onLoad(() => {
        this.loadSuccess = true;
        this.loadError = null;
        Logger.info('Ad', '激励视频广告加载成功');
      });
      this.rewardedAd.onError((err: any) => {
        this.loadError = String(err?.errMsg ?? err ?? 'unknown');
        Logger.warn('Ad', '激励视频广告加载错误', this.loadError);
      });
      this.rewardedAd.onClose((res: any) => {
        // 防重复回调：一次播放只处理一次关闭
        if (this.closedThisSession) return;
        this.closedThisSession = true;
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        const completed = !!(res && res.isEnded);
        Logger.info('Ad', `激励视频关闭，完整观看=${completed}`);
        resolve?.({ completed });
      });
      Logger.info('Ad', '微信激励视频广告实例创建成功');
    } catch (e) {
      Logger.error('Ad', '创建激励视频广告失败', e);
      this.rewardedAd = null;
    }
  }

  isAvailable(): boolean {
    return !!this.wx && typeof this.wx.createRewardedVideoAd === 'function' && !!this.adUnitId;
  }

  showRewardedAd(_placement: AdPlacement): Promise<RewardedAdResult> {
    if (!this.rewardedAd) {
      return Promise.resolve({ completed: false, error: 'ad_not_initialized' });
    }
    this.closedThisSession = false;
    return new Promise<RewardedAdResult>((resolve) => {
      this.pendingResolve = resolve;
      let retries = 0;
      const attemptShow = () => {
        this.rewardedAd
          .show()
          .then(() => {
            Logger.info('Ad', '激励视频 show() 成功（播放中）');
          })
          .catch((err: any) => {
            retries++;
            if (retries < WeChatAdService.MAX_SHOW_RETRY) {
              Logger.warn('Ad', `show 失败，尝试 load 后重试 (${retries})`, err);
              // show 失败时手动 load 再重试
              this.rewardedAd
                .load()
                .then(() => attemptShow())
                .catch(() => this.finish({ completed: false, error: 'show_failed_after_retry' }));
            } else {
              this.finish({ completed: false, error: 'show_failed_after_retry' });
            }
          });
      };
      attemptShow();
    });
  }

  private finish(r: RewardedAdResult) {
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    resolve?.(r);
  }

  showBanner(): void {
    // 第一版默认关闭 Banner，确认布局与平台规范后再启用
    Logger.info('Ad', 'Banner 预留接口（第一版默认关闭）');
  }

  hideBanner(): void {
    /* 预留 */
  }

  destroy(): void {
    if (this.rewardedAd) {
      try {
        this.rewardedAd.destroy();
      } catch {
        /* ignore */
      }
      this.rewardedAd = null;
    }
  }
}
