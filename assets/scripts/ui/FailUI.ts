import { Node } from 'cc';
import { BasePopup } from './BasePopup';
import { createLabel } from './UIFactory';
import { PALETTE } from '../core/GameConfig';
import type { BoosterType } from '../core/GameConfig';

export interface FailOpts {
  /** 复活：撤销上一步并返还槽位 */
  onRevive: (close: () => void) => void;
  /** 金币复活 */
  onReviveWithCoins: (close: () => void) => void;
  reviveCost: number;
  adAvailable: boolean;
  onRestart: () => void;
  onHome: () => void;
}

/** 失败弹窗 */
export class FailUI extends BasePopup {
  private revived = false;

  constructor(parent: Node, opts: FailOpts) {
    super(parent, '槽位已满', 620, 660);
    createLabel('收纳槽被占满了，再试一次？', { parent: this.panel, y: 130, size: 28, color: PALETTE.text });

    if (opts.adAvailable) {
      this.addButton('看视频复活', -10, () => {
        if (this.revived) return;
        this.revived = true;
        opts.onRevive(() => this.close());
      });
    } else {
      createLabel('（本局复活机会已用完）', { parent: this.panel, y: -10, size: 22, color: PALETTE.textLight });
    }

    this.addButton(`花 ${opts.reviveCost} 金币复活`, -110, () => {
      if (this.revived) return;
      this.revived = true;
      opts.onReviveWithCoins(() => this.close());
    });

    this.addButton('重新开始', -220, () => {
      this.close();
      opts.onRestart();
    });
    this.addButton('回首页', -320, () => {
      this.close();
      opts.onHome();
    }, true);
  }
}
