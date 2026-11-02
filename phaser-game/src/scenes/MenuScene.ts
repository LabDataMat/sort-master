import Phaser from 'phaser';
import { COLORS, FONT, H, W } from '../theme';
import { collection, save, MAX_LEVEL } from '../services';
import { createButton, createIconButton } from '../ui/Button';
import { addFittedImage, showToast } from '../ui/Helpers';
import { applyAudioSettings, playBgm, playSfx } from '../audio';

/** 主菜单：Logo、开始游戏、关卡选择、收藏、商店、每日挑战、设置。 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.add.image(W / 2, H / 2, 'ui_bg_home').setDisplaySize(W, H);

    addFittedImage(this, W / 2, 360, 'ui_logo', 460, 230);

    // 金币
    this.add.image(596, 54, 'ui_coin').setDisplaySize(40, 40);
    this.add
      .text(566, 54, String(save.data.coins), { fontFamily: FONT, fontSize: '28px', color: '#523625' })
      .setOrigin(1, 0.5);

    // 每日挑战（右上）
    this.buildDailyButton();

    // 主按钮
    createButton(this, W / 2, 648, {
      width: 420,
      height: 112,
      label: '开始游戏',
      fontSize: 40,
      onClick: () => this.startCurrentLevel(),
    });

    createButton(this, W / 2, 776, {
      width: 420,
      height: 92,
      label: '关卡选择',
      fontSize: 32,
      fill: COLORS.panel,
      textColor: '#523625',
      onClick: () => this.scene.start('Levels'),
    });

    createButton(this, W / 2, 878, {
      width: 420,
      height: 92,
      label: '收藏图鉴',
      fontSize: 32,
      fill: COLORS.panel,
      textColor: '#523625',
      onClick: () => this.scene.start('Collection'),
    });

    createButton(this, W / 2, 980, {
      width: 420,
      height: 92,
      label: '商店',
      fontSize: 32,
      fill: COLORS.panel,
      textColor: '#523625',
      onClick: () => this.scene.start('Shop'),
    });

    createButton(this, W / 2, 1078, {
      width: 320,
      height: 84,
      label: '设置',
      fontSize: 28,
      fill: COLORS.panel,
      textColor: '#523625',
      onClick: () => this.openSettings(),
    });

    // 进度摘要
    const total = collection.total();
    const streak = save.data.streak;
    this.add
      .text(
        W / 2,
        1160,
        `收藏 ${total.owned}/${total.total} · 连胜 ${streak} · 最佳 ${save.data.bestStreak}`,
        { fontFamily: FONT, fontSize: '22px', color: '#7b6050' },
      )
      .setOrigin(0.5);

    this.add
      .text(W / 2, 1258, 'v1.0.0', { fontFamily: FONT, fontSize: '22px', color: '#7b6050' })
      .setOrigin(0.5);

    playBgm(this, 'audio_bgm_home');
    this.input.once('pointerdown', () => {
      this.sound.unlock();
      playBgm(this, 'audio_bgm_home');
    });
  }

  private buildDailyButton(): void {
    const today = new Date().toISOString().slice(0, 10);
    const available = save.canPlayDaily(today);

    const btn = createButton(this, 630, 140, {
      width: 190,
      height: 64,
      label: available ? '每日挑战' : '今日已完成',
      fontSize: 24,
      fill: available ? COLORS.green : COLORS.brownSoft,
      onClick: () => {
        if (!save.canPlayDaily(today)) {
          showToast(this, '今日挑战已完成，明天再来');
          return;
        }
        this.scene.start('Game', { levelId: 26, daily: true });
      },
    });
    btn.setAlpha(available ? 1 : 0.75);
  }

  private startCurrentLevel(): void {
    const level = Phaser.Math.Clamp(save.data.maxUnlocked, 1, MAX_LEVEL);
    this.scene.start('Game', { levelId: level });
  }

  private openSettings(): void {
    const layer = this.add.container(0, 0).setDepth(1000);

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5).setInteractive();
    const panel = this.add.image(W / 2, H / 2, 'ui_panel').setDisplaySize(620, 600);

    const title = this.add
      .text(W / 2, 430, '设置', { fontFamily: FONT, fontSize: '44px', color: '#523625', fontStyle: 'bold' })
      .setOrigin(0.5);

    const musicLabel = this.add
      .text(300, 560, '音乐', { fontFamily: FONT, fontSize: '32px', color: '#523625' })
      .setOrigin(0.5);

    const musicToggle = this.makeToggle(500, 560, save.data.musicOn, (v) => {
      save.data.musicOn = v;
      save.save();
      applyAudioSettings();
      if (v) playBgm(this, 'audio_bgm_home');
    });

    const sfxLabel = this.add
      .text(300, 670, '音效', { fontFamily: FONT, fontSize: '32px', color: '#523625' })
      .setOrigin(0.5);

    const sfxToggle = this.makeToggle(500, 670, save.data.sfxOn, (v) => {
      save.data.sfxOn = v;
      save.save();
      if (v) playSfx(this, 'audio_click');
    });

    const close = createButton(this, W / 2, 820, {
      width: 340,
      height: 100,
      label: '返回',
      fontSize: 32,
      onClick: () => layer.destroy(),
    });

    layer.add([overlay, panel, title, musicLabel, musicToggle, sfxLabel, sfxToggle, close]);
    overlay.on('pointerdown', () => layer.destroy());
  }

  private makeToggle(
    x: number,
    y: number,
    initial: boolean,
    onChange: (v: boolean) => void,
  ): Phaser.GameObjects.Container {
    let value = initial;
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    const label = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);

    const draw = (): void => {
      g.clear();
      g.fillStyle(0x000000, 0.14);
      g.fillRoundedRect(-76, -34, 156, 76, 38);
      g.fillStyle(value ? COLORS.green : COLORS.brownSoft, 1);
      g.fillRoundedRect(-80, -40, 160, 76, 38);
      g.fillStyle(0xffffff, 0.18);
      g.fillRoundedRect(-70, -34, 140, 24, 18);
      label.setText(value ? '开' : '关');
    };
    draw();

    container.add([g, label]);
    container.setSize(160, 76);
    container.setInteractive(new Phaser.Geom.Rectangle(-80, -40, 160, 76), Phaser.Geom.Rectangle.Contains);
    container.on('pointerup', () => {
      value = !value;
      draw();
      playSfx(this, 'audio_click');
      onChange(value);
    });

    return container;
  }
}
