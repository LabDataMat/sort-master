/**
 * 奖励发放（纯逻辑）：幂等保护核心。
 * 每次发奖必须携带唯一 requestId，重复请求直接拒绝，
 * 从机制上杜绝：重复发放 / 快速连点重复奖励 / 关卡重复结算。
 */
export class RewardManager {
    constructor() {
        this.usedRequestIds = new Set();
        /** 关卡结算幂等：settleKey -> true */
        this.settledKeys = new Set();
        /** 持久化的已用 requestId 上限 */
        this.maxMemory = 500;
    }
    /**
     * 尝试发放，返回是否首次发放成功。
     * 调用方在 true 时才执行实际加金币等副作用。
     */
    grant(requestId) {
        if (!requestId)
            return false;
        if (this.usedRequestIds.has(requestId))
            return false;
        this.usedRequestIds.add(requestId);
        if (this.usedRequestIds.size > this.maxMemory) {
            // 淘汰最早的一半，保证内存有界
            const arr = Array.from(this.usedRequestIds);
            this.usedRequestIds = new Set(arr.slice(Math.floor(arr.length / 2)));
        }
        return true;
    }
    hasGranted(requestId) {
        return this.usedRequestIds.has(requestId);
    }
    /** 关卡结算防重（每局游戏 runId + 动作） */
    canSettle(settleKey) {
        if (this.settledKeys.has(settleKey))
            return false;
        this.settledKeys.add(settleKey);
        return true;
    }
}
/** 每日签到（纯逻辑）：按本地日期判断，7 天循环奖励 */
export class DailyRewardLogic {
    /** 返回今日是否可领取 */
    static canClaim(lastClaimDate, today) {
        return lastClaimDate !== today;
    }
    /** 领取后的新 streak。昨天领过则 +1（7 天循环），否则重置为 1 */
    static nextStreak(lastClaimDate, lastStreak, today, yesterday) {
        if (lastClaimDate === yesterday)
            return (lastStreak % 7) + 1;
        return 1;
    }
    static localDateStr(d = new Date()) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    static yesterdayStr(d = new Date()) {
        const y = new Date(d.getTime() - 86400000);
        return DailyRewardLogic.localDateStr(y);
    }
}
