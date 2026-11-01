import { Node, Label } from 'cc';
import { BasePopup } from './BasePopup';
import { createLabel } from './UIFactory';
import { PALETTE } from '../core/GameConfig';

export interface VictoryOpts {
  levelId: number;
  baseReward: number;
  streakBonus: number;
  firstClear: boolean;
  maxCombo: number;
  /** 通关星级 1~3 */
  stars?: number;
  /** 本局道具使用次数 */
  boostersUsed?: number;
  /** 双倍奖励（看广告） */
  onDoubleReward: (close: () => void) => void;
  onNext: () => void;
  onHome: () => void;
}

/** 胜利弹窗（含星级评价与庆祝动画） */
export class VictoryUI extends BasePopup {
  doubled = false;
  private rewardText: Label;

  constructor(parent: Node, private opts: VictoryOpts) {
    super(parent, '通关成功！', 620, 740);
    const { levelId, baseReward, streakBonus, firstClear, maxCombo } = opts;
    createLabel(`第 ${levelId} 关`, { parent: this.panel, y: 200, size: 34, color: PALETTE.text });
    createLabel(`最大连击 x${maxCombo} · 道具使用 ${opts.boostersUsed ?? 0} 次`, { parent: this.panel, y: 148, size: 24, color: PALETTE.textLight, bold: false });
    const lines = [];
    if (firstClear) lines.push(`首次通关  +${baseReward}`);
    else lines.push(`通关奖励  +${baseReward}`);
    if (streakBonus > 0) lines.push(`连续通关加成  +${streakBonus}`);
    this.rewardText = createLabel(lines.join('\n'), { parent: this.panel, y: 40, size: 30, color: PALETTE.gold, bold: true });

    // 星级评价（逐颗弹出动画）
    const stars = opts.stars ?? 1;
    for (let i = 0; i < 3; i++) {
      createLabel(i < stars ? '★' : '☆', { parent: this.panel, x: -90 + i * 90, y: 262, size: 64, color: i < stars ? PALETTE.gold : PALETTE.textLight, name: `star_${i}` });
    }

    // 双倍奖励（广告）
    this.addButton('看视频 金币翻倍', -70, () => {
      if (this.doubled) return;
      this.doubled = true;
      opts.onDoubleReward(() => {
        this.updateDoubled();
        this.close();
      });
    });
    this.addButton('下一关', -180, () => {
      this.close();
      opts.onNext();
    });
    this.addButton('回首页', -290, () => {
      this.close();
      opts.onHome();
    }, true);
  }

  private updateDoubled() {
    const totalMatch = this.rewardText.string.match(/(\d+)$/);
    if (totalMatch) {
      const extra = Number(totalMatch[1]);
      this.rewardText.string = this.rewardText.string.replace(/(\d+)$/, String(extra + extra));
    }
  }
}
