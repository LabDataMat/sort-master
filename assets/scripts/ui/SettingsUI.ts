import { Node, Sprite } from 'cc';
import { BasePopup } from './BasePopup';
import { createLabel, createSprite, makeButton, loadSpriteFrame } from './UIFactory';
import { PALETTE } from '../core/GameConfig';
import type { GameManager } from '../GameManager';

/** 设置弹窗：音乐/音效开关 */
export class SettingsUI extends BasePopup {
  constructor(parent: Node, gm: GameManager, onChanged: () => void) {
    super(parent, '设置', 620, 520);

    const makeToggle = (label: string, y: number, get: () => boolean, set: (v: boolean) => void) => {
      createLabel(label, { parent: this.panel, x: -110, y, size: 32, color: PALETTE.text });
      const btn = createSprite(get() ? 'textures/ui/btn_secondary' : 'textures/ui/btn_primary', {
        parent: this.panel, x: 140, y, w: 150, h: 70,
      });
      const lb = createLabel(get() ? '开' : '关', { parent: btn, y: 4, size: 30, color: '#FFFFFF' });
      makeButton(btn, () => {
        const nv = !get();
        set(nv);
        lb.string = nv ? '开' : '关';
        loadSpriteFrame(nv ? 'textures/ui/btn_secondary' : 'textures/ui/btn_primary', (sf) => {
          if (sf) btn.getComponent(Sprite)!.spriteFrame = sf;
        });
        gm.persist();
        onChanged();
      });
    };

    makeToggle('背景音乐', 90, () => gm.audio.musicOn, (v) => gm.audio.setMusic(v));
    makeToggle('游戏音效', -10, () => gm.audio.sfxOn, (v) => gm.audio.setSfx(v));

    const st = gm.save.data.stats;
    createLabel(
      `游戏 ${st.gamesPlayed} 局 · 通关 ${st.wins} 次\n累计金币 +${st.coinsEarned} / -${st.coinsSpent}\n最高连击 x${st.maxCombo}`,
      { parent: this.panel, y: -140, size: 24, color: PALETTE.textLight, bold: false }
    );
    this.addButton('关闭', -230, () => this.close(), true, 260, 80);
  }
}
