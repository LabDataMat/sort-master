import type { AdStats, BoosterStock } from '../save/SaveManager';
import type { AdStatsLocal } from '../../ads/AdManager';

/** 游戏统计（纯逻辑）+ 广告统计透传 */
export class StatsRecorder {
  gamesPlayed = 0;
  wins = 0;
  coinsEarned = 0;
  coinsSpent = 0;
  maxCombo = 0;
  adStats: AdStats = {
    ad_request_count: 0,
    ad_load_success_count: 0,
    ad_show_count: 0,
    ad_complete_count: 0,
    ad_reward_count: 0,
    ad_error_count: 0,
  };

  recordGameStart() {
    this.gamesPlayed++;
  }

  recordWin(maxCombo: number) {
    this.wins++;
    this.maxCombo = Math.max(this.maxCombo, maxCombo);
  }

  recordCoins(delta: number) {
    if (delta >= 0) this.coinsEarned += delta;
    else this.coinsSpent += -delta;
  }

  recordAdStats(stats: AdStatsLocal) {
    this.adStats = {
      ad_request_count: stats.ad_request_count,
      ad_load_success_count: stats.ad_load_success_count,
      ad_show_count: stats.ad_show_count,
      ad_complete_count: stats.ad_complete_count,
      ad_reward_count: stats.ad_reward_count,
      ad_error_count: stats.ad_error_count,
    };
  }
}
