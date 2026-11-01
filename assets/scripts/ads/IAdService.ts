import type { AdPlacement } from '../core/GameConfig';

export interface RewardedAdResult {
  /** 是否完整观看（唯一发奖依据） */
  completed: boolean;
  error?: string;
  /** 模拟模式标识 */
  mock?: boolean;
}

/**
 * 广告服务统一接口。
 * 游戏业务代码只依赖此接口与 AdManager，绝不直接调用 wx.*。
 */
export interface IAdService {
  /** 初始化（创建广告实例等） */
  initialize(): void;
  /** 当前环境/配置下是否可用 */
  isAvailable(): boolean;
  /**
   * 展示激励视频。
   * 返回 completed=true 表示用户完整观看，才允许发奖。
   * show() 成功、加载成功都不能视为播放完成。
   */
  showRewardedAd(placement: AdPlacement): Promise<RewardedAdResult>;
  showBanner(): void;
  hideBanner(): void;
  destroy(): void;
}
