import { Node } from 'cc';
import { BasePopup } from './BasePopup';
import { createLabel, createSprite } from './UIFactory';
import { PALETTE } from '../core/GameConfig';
import type { GameManager } from '../GameManager';

/** 每日奖励弹窗：7 天循环签到 */
export class DailyRewardUI extends BasePopup {
  constructor(parent: Node, gm: GameManager, onChanged: () => void) {
    super(parent, '每日奖励', 660, 700);

    const info = gm.canClaimDaily();
    const rewards = gm.balance.dailyRewards;
    const currentDay = info.ok ? info.day : ((gm.save.data.dailyReward.streak - 1) % 7) + 1;

    const startX = -252;
    const gap = 84;
    rewards.forEach((amount, i) => {
      const day = i + 1;
      const x = startX + i * gap;
      const y = i % 2 === 0 ? 60 : 130;
      const cell = createSprite(day <= currentDay ? 'textures/ui/btn_secondary' : 'textures/ui/btn_primary', {
        parent: this.panel, x, y, w: 76, h: 96, name: `day_${day}`,
      });
      createLabel(`D${day}`, { parent: cell, y: 18, size: 24, color: '#FFFFFF' });
      createLabel(`${amount}`, { parent: cell, y: -20, size: 20, color: '#FFFFFF' });
      if (day === currentDay && info.ok) {
        createLabel('可领', { parent: cell, y: 66, size: 18, color: PALETTE.gold });
      }
    });

    createLabel(
      info.ok ? `今日可领 ${info.amount} 金币` : '今日已领取，明天再来~',
      { parent: this.panel, y: -20, size: 30, color: PALETTE.primaryDark }
    );

    this.addButton(info.ok ? '领取' : '已领取', -120, () => {
      const r = gm.claimDaily();
      if (r.ok) {
        gm.audio.play('coin');
        onChanged();
        this.close();
      }
    }, info.ok, 300, 88);
    this.addButton('关闭', -220, () => this.close(), true, 300, 88);
  }
}
