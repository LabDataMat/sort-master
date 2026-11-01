import type { AdPlacement } from '../core/GameConfig';
import type { IAdService, RewardedAdResult } from './IAdService';

export type MockAdOutcome = 'complete' | 'abandon' | 'fail';

/**
 * Mock 广告服务（浏览器/测试环境使用）。
 * - 可配置模拟结果：完整播放 / 中途关闭 / 加载失败
 * - 明确 mock 标识，统计不混入真实收入
 * - 用于验证奖励发放的正确性
 */
export class MockAdService implements IAdService {
  /** 下一次广告的模拟结果 */
  outcome: MockAdOutcome = 'complete';
  /** 模拟延迟 ms（0 = 同步返回，便于确定性测试） */
  simulateDelayMs = 0;
  /** 统计 */
  stats = { request: 0, show: 0, complete: 0, abandon: 0, fail: 0 };
  initialized = false;

  initialize(): void {
    this.initialized = true;
  }

  isAvailable(): boolean {
    return true; // Mock 永远可用，便于测试
  }

  showRewardedAd(_placement: AdPlacement): Promise<RewardedAdResult> {
    this.stats.request++;
    const outcome = this.outcome;
    if (this.simulateDelayMs <= 0) {
      return Promise.resolve(MockAdService.resolve(outcome, this));
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(MockAdService.resolve(outcome, this)), this.simulateDelayMs);
    });
  }

  private static resolve(outcome: MockAdOutcome, self: MockAdService): RewardedAdResult {
    if (outcome === 'complete') {
      self.stats.complete++;
      self.stats.show++;
      return { completed: true, mock: true };
    }
    if (outcome === 'abandon') {
      self.stats.abandon++;
      self.stats.show++;
      return { completed: false, error: 'mock_user_aborted', mock: true };
    }
    self.stats.fail++;
    self.stats.show++;
    return { completed: false, error: 'mock_load_failed', mock: true };
  }

  showBanner(): void {
    /* Mock 无 Banner */
  }

  hideBanner(): void {
    /* Mock 无 Banner */
  }

  destroy(): void {
    this.initialized = false;
  }
}
