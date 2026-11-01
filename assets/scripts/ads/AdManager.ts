import type { AdPlacement } from '../core/GameConfig';
import type { IAdService, RewardedAdResult } from './IAdService';
import type { AdStats } from '../systems/save/SaveManager';

export interface AdManagerOptions {
  /** 每局（run）复活广告上限 */
  reviveMaxPerRun: number;
  /** 每局广告总次数上限 */
  maxAdsPerRun: number;
  /** 上报统计回调（持久化由调用方决定） */
  onStats?: (stats: AdStats) => void;
}

export interface AdStatsLocal extends AdStats {
  /** 本局已用次数 */
  perRun: number;
}

/**
 * 广告管理器（纯逻辑，服务可注入）。
 * - 统一入口，业务不直接接触 wx.*
 * - 幂等：每个激励广告请求必须携带唯一 requestId，重复请求直接拒绝
 * - 只有 service 返回 completed=true 才允许发奖，且发奖动作由业务在回调后用
 *   RewardManager.grant(requestId) 再做一次幂等保护
 * - 每局广告次数限制 / 每关复活一次限制
 * - 完整统计（请求/加载成功/展示/完整观看/发奖/错误）
 */
export class AdManager {
  private service: IAdService;
  private opts: Required<Omit<AdManagerOptions, 'onStats'>> & { onStats?: (s: AdStats) => void };
  stats: AdStats;
  // 本局限制
  private runId = '';
  private runCount = 0;
  private reviveUsed = 0;
  /** 幂等：requestId -> 承诺结果 */
  private handled = new Map<string, RewardedAdResult>();

  constructor(service: IAdService, opts: AdManagerOptions) {
    this.service = service;
    this.opts = {
      reviveMaxPerRun: opts.reviveMaxPerRun ?? 1,
      maxAdsPerRun: opts.maxAdsPerRun ?? 10,
      onStats: opts.onStats,
    };
    this.stats = {
      ad_request_count: 0,
      ad_load_success_count: 0,
      ad_show_count: 0,
      ad_complete_count: 0,
      ad_reward_count: 0,
      ad_error_count: 0,
    };
  }

  initialize(): void {
    this.service.initialize();
  }

  isAvailable(): boolean {
    return this.service.isAvailable();
  }

  /** 每局开始时调用，重置本局限制 */
  startRun(runId: string): void {
    this.runId = runId;
    this.runCount = 0;
    this.reviveUsed = 0;
    this.handled.clear();
  }

  /** 本局复活广告是否还可用 */
  canShowRevive(): boolean {
    return this.reviveUsed < this.opts.reviveMaxPerRun && this.runCount < this.opts.maxAdsPerRun;
  }

  /**
   * 展示激励视频（业务唯一入口）。
   * - 返回 completed=true 时调用方必须用 RewardManager.grant(requestId) 做最终幂等后发奖
   * - 重复 requestId 返回 completed=false（防重复奖励）
   */
  async showRewardedAd(placement: AdPlacement, requestId: string): Promise<RewardedAdResult> {
    // 重复请求幂等保护
    if (this.handled.has(requestId)) {
      return { completed: false, error: 'duplicate_request' };
    }
    // 本局限制
    if (this.runCount >= this.opts.maxAdsPerRun) {
      this.stats.ad_error_count++;
      return { completed: false, error: 'run_limit_reached' };
    }
    if (placement === 'revive' && this.reviveUsed >= this.opts.reviveMaxPerRun) {
      this.stats.ad_error_count++;
      return { completed: false, error: 'revive_limit_reached' };
    }
    if (!this.service.isAvailable()) {
      this.stats.ad_error_count++;
      return { completed: false, error: 'service_unavailable' };
    }

    this.handled.set(requestId, { completed: false, error: 'pending' });
    this.stats.ad_request_count++;
    this.runCount++;
    if (placement === 'revive') this.reviveUsed++;

    try {
      const result = await this.service.showRewardedAd(placement);
      // 只有完整观看才算播放成功
      if (result.completed) {
        this.stats.ad_complete_count++;
      } else if (result.error) {
        this.stats.ad_error_count++;
      }
      this.stats.ad_show_count++;
      if (result.mock) {
        // Mock 明确标识，不计真实收入相关统计口径（此处仅本地统计）
      }
      this.handled.set(requestId, result);
      this.opts.onStats?.({ ...this.stats });
      return result;
    } catch (e: any) {
      this.stats.ad_error_count++;
      const r: RewardedAdResult = { completed: false, error: String(e?.message ?? e) };
      this.handled.set(requestId, r);
      this.opts.onStats?.({ ...this.stats });
      return r;
    }
  }

  /** 发奖成功后由业务回执，用于统计 ad_reward_count */
  reportRewarded(requestId: string): void {
    if (this.handled.has(requestId)) {
      this.stats.ad_reward_count++;
      this.opts.onStats?.({ ...this.stats });
    }
  }

  showBanner(): void {
    this.service.showBanner();
  }

  hideBanner(): void {
    this.service.hideBanner();
  }

  destroy(): void {
    this.service.destroy();
  }

  get mockMode(): boolean {
    return (this.service as any)?.constructor?.name === 'MockAdService';
  }
}
