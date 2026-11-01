import Phaser from 'phaser';
import { AUDIO_NAMES, COLORS, FONT, H, ITEM_IDS, UI_NAMES, W } from '../theme';

/**
 * 启动场景：预加载物品、UI 与音频，并显示进度。
 * 只加载通用资源（30 物品 + 必要 UI + 音频），关卡数据在进入关卡时按需 fetch。
 */
export class BootScene extends Phaser.Scene {
  private bar!: Phaser.GameObjects.Graphics;
  private pct!: Phaser.GameObjects.Text;

  constructor() {
    super('Boot');
  }

  preload(): void {
    this.buildLoadingUi();

    const base = import.meta.env.BASE_URL;

    for (const id of ITEM_IDS) {
      this.load.image(`item_${id}`, `${base}assets/items/${id}.png`);
    }
    for (const name of UI_NAMES) {
      this.load.image(`ui_${name}`, `${base}assets/ui/${name}.png`);
    }
    for (const name of AUDIO_NAMES) {
      this.load.audio(`audio_${name}`, `${base}assets/audio/${name}.wav`);
    }

    this.load.on('progress', (p: number) => this.updateProgress(p));
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error('[SortMaster] 资源加载失败：', file.key, file.src);
    });
  }

  create(): void {
    this.scene.start('Menu');
  }

  private buildLoadingUi(): void {
    this.add.rectangle(W / 2, H / 2, W, H, 0x1b1410);

    this.add
      .text(W / 2, H / 2 - 120, '收纳大作战', {
        fontFamily: FONT,
        fontSize: '52px',
        color: '#f7e6c8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H / 2 - 56, 'SORT MASTER', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#c9a97f',
      })
      .setOrigin(0.5);

    const track = this.add.graphics();
    track.fillStyle(0xffffff, 0.12);
    track.fillRoundedRect(W / 2 - 160, H / 2 + 20, 320, 12, 6);

    this.bar = this.add.graphics();

    this.pct = this.add
      .text(W / 2, H / 2 + 64, '0%', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#e8d6bd',
      })
      .setOrigin(0.5);
  }

  private updateProgress(p: number): void {
    const w = 320 * Phaser.Math.Clamp(p, 0, 1);
    this.bar.clear();
    this.bar.fillStyle(COLORS.orange, 1);
    this.bar.fillRoundedRect(W / 2 - 160, H / 2 + 20, Math.max(12, w), 12, 6);
    this.pct.setText(`${Math.round(p * 100)}%`);
  }
}
