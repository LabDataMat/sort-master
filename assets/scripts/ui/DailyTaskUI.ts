import { Node, UITransform, Vec3, tween } from 'cc';
import { BasePopup } from './BasePopup';
import { createLabel, createSprite, makeButton } from './UIFactory';
import { PALETTE } from '../core/GameConfig';
import { DAILY_TASKS } from '../systems/progress/ProgressManager';
import type { GameManager } from '../GameManager';
import { Toast } from './Toast';

/** 每日任务弹窗：进度由真实对局事件驱动，未完成不可领取 */
export class DailyTaskUI extends BasePopup {
  private gm: GameManager;
  private list!: Node;
  private onChanged: () => void;

  constructor(parent: Node, gm: GameManager, onChanged: () => void) {
    super(parent, '每日任务', 660, 800);
    this.gm = gm;
    this.onChanged = onChanged;
    this.list = new Node('task_list');
    this.list.addComponent(UITransform).setContentSize(600, 520);
    this.panel.addChild(this.list);
    this.list.setPosition(0, 40, 0);
    this.render();

    const signBtn = createSprite('textures/ui/btn_primary', { parent: this.panel, y: -260, w: 420, h: 84 });
    createLabel('每日签到', { parent: signBtn, y: 3, size: 26, color: '#FFFFFF' });
    makeButton(signBtn, () => {
      const r = this.gm.claimDaily();
      if (r.ok) {
        Toast.show(this.root, `签到成功 +${r.amount} 金币`);
        this.gm.audio.play('coin');
        this.onChanged();
      } else Toast.show(this.root, '今日已签到');
    });
    this.addButton('关闭', -350, () => this.close(), true, 240, 72);
  }

  private render() {
    this.list.removeAllChildren();
    const pm = this.gm.progress;
    DAILY_TASKS.forEach((t, i) => {
      const y = 200 - i * 120;
      const cur = pm.taskProgress(t.id);
      const done = pm.isTaskComplete(t.id);
      const claimed = pm.isTaskClaimed(t.id);
      createSprite('textures/ui/card_bg', { parent: this.list, y, w: 560, h: 108 });
      createSprite(`textures/ui/${t.icon}`, { parent: this.list, x: -230, y, w: 60, h: 60 });
      createLabel(t.name, { parent: this.list, x: -150, y: y + 22, size: 22, color: PALETTE.text, width: 300, overflow: 'shrink' });
      createLabel(`${cur}/${t.target} · 金币${t.coins} 碎片${t.fragments}`, {
        parent: this.list, x: -150, y: y - 16, size: 18, color: PALETTE.textLight, bold: false,
      });
      const btn = createSprite(done && !claimed ? 'textures/ui/btn_primary' : 'textures/ui/btn_secondary', {
        parent: this.list, x: 210, y, w: 130, h: 64,
      });
      createLabel(claimed ? '已领' : done ? '领取' : '进行中', { parent: btn, y: 3, size: 20, color: '#FFFFFF' });
      if (done && !claimed) {
        makeButton(btn, () => {
          const r = this.gm.claimDailyTask(t.id);
          if (r.ok) {
            Toast.show(this.root, `领取成功 +${r.coins} 金币 +${r.fragments} 碎片`);
            this.gm.audio.play('coin');
            this.onChanged();
            this.render();
          }
        });
      }
      if (done && !claimed) {
        tween(btn).repeatForever(tween(btn).to(0.6, { scale: new Vec3(1.06, 1.06, 1) }).to(0.6, { scale: new Vec3(1, 1, 1) })).start();
      }
    });
  }
}
