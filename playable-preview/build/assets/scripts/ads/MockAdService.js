/**
 * Mock 广告服务（浏览器/测试环境使用）。
 * - 可配置模拟结果：完整播放 / 中途关闭 / 加载失败
 * - 明确 mock 标识，统计不混入真实收入
 * - 用于验证奖励发放的正确性
 */
export class MockAdService {
    constructor() {
        /** 下一次广告的模拟结果 */
        this.outcome = 'complete';
        /** 模拟延迟 ms（0 = 同步返回，便于确定性测试） */
        this.simulateDelayMs = 0;
        /** 统计 */
        this.stats = { request: 0, show: 0, complete: 0, abandon: 0, fail: 0 };
        this.initialized = false;
    }
    initialize() {
        this.initialized = true;
    }
    isAvailable() {
        return true; // Mock 永远可用，便于测试
    }
    showRewardedAd(_placement) {
        this.stats.request++;
        const outcome = this.outcome;
        if (this.simulateDelayMs <= 0) {
            return Promise.resolve(MockAdService.resolve(outcome, this));
        }
        return new Promise((resolve) => {
            setTimeout(() => resolve(MockAdService.resolve(outcome, this)), this.simulateDelayMs);
        });
    }
    static resolve(outcome, self) {
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
    showBanner() {
        /* Mock 无 Banner */
    }
    hideBanner() {
        /* Mock 无 Banner */
    }
    destroy() {
        this.initialized = false;
    }
}
