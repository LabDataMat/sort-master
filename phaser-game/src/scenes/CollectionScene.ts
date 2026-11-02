import Phaser from 'phaser';
import { COLORS, FONT, H, W } from '../theme';
import { collection, save } from '../services';
import {
  RARITY_META,
  SERIES,
  collectiblesOfSeries,
  type Collectible,
  type SeriesId,
} from '../core/collectibles';
import { createButton } from '../ui/Button';
import { playSfx } from '../audio';

const CELL = 140;
const GAP = 14;
const COLS = 4;
const GRID_TOP = 350;

/** 收藏图鉴：系列分类、网格、剪影、详情、系列奖励。 */
export class CollectionScene extends Phaser.Scene {
  private series: SeriesId = 'food';
  private gridLayer!: Phaser.GameObjects.Container;
  private progressText!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private claimButton?: Phaser.GameObjects.Container;
  private tabButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('Collection');
  }

  create(): void {
    this.add.image(W / 2, H / 2, 'ui_bg_home').setDisplaySize(W, H);

    createButton(this, 96, 76, {
      width: 140,
      height: 72,
      label: '返回',
      fontSize: 26,
      fill: COLORS.panel,
      textColor: '#523625',
      onClick: () => this.scene.start('Menu'),
    });

    this.add
      .text(W / 2, 76, '收藏图鉴', { fontFamily: FONT, fontSize: '38px', color: '#523625', fontStyle: 'bold' })
      .setOrigin(0.5);

    this.add.image(660, 76, 'ui_coin').setDisplaySize(36, 36);
    this.add
      .text(636, 76, String(save.data.coins), { fontFamily: FONT, fontSize: '26px', color: '#523625' })
      .setOrigin(1, 0.5);

    this.buildTabs();

    this.progressText = this.add
      .text(W / 2, 232, '', { fontFamily: FONT, fontSize: '24px', color: '#7b6050' })
      .setOrigin(0.5);

    this.progressBar = this.add.graphics();

    this.gridLayer = this.add.container(0, 0);

    this.add
      .text(W / 2, 870, '', { fontFamily: FONT, fontSize: '22px', color: '#a89c8d' })
      .setOrigin(0.5)
      .setName('totalProgress');

    this.refresh();
  }

  private buildTabs(): void {
    const width = 168;
    const gap = 8;
    const total = SERIES.length * width + (SERIES.length - 1) * gap;
    const startX = (W - total) / 2 + width / 2;

    SERIES.forEach((meta, i) => {
      const x = startX + i * (width + gap);
      const btn = this.add.container(x, 164);
      const g = this.add.graphics();
      const label = this.add
        .text(0, 0, meta.name, { fontFamily: FONT, fontSize: '24px', color: '#523625' })
        .setOrigin(0.5);

      btn.add([g, label]);
      btn.setSize(width, 64);
      btn.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -32, width, 64), Phaser.Geom.Rectangle.Contains);
      btn.on('pointerup', () => {
        this.series = meta.id;
        playSfx(this, 'audio_click');
        this.refresh();
      });

      btn.setData('graphics', g);
      btn.setData('label', label);
      btn.setData('width', width);
      this.tabButtons.push(btn);
    });
  }

  private drawTabs(): void {
    SERIES.forEach((meta, i) => {
      const btn = this.tabButtons[i];
      const g = btn.getData('graphics') as Phaser.GameObjects.Graphics;
      const label = btn.getData('label') as Phaser.GameObjects.Text;
      const width = btn.getData('width') as number;
      const active = meta.id === this.series;

      g.clear();
      g.fillStyle(0x000000, 0.1);
      g.fillRoundedRect(-width / 2 + 2, -26, width, 64, 20);
      g.fillStyle(active ? meta.accent : COLORS.panel, 1);
      g.fillRoundedRect(-width / 2, -32, width, 64, 20);
      if (!active) {
        g.lineStyle(2, 0xe3d7c6, 1);
        g.strokeRoundedRect(-width / 2, -32, width, 64, 20);
      }
      label.setColor(active ? '#ffffff' : '#523625');
      label.setFontStyle(active ? 'bold' : 'normal');
    });
  }

  private refresh(): void {
    this.drawTabs();

    const meta = SERIES.find((s) => s.id === this.series)!;
    const list = collectiblesOfSeries(this.series);
    const p = collection.progress(this.series);

    this.progressText.setText(`${meta.name} · 已收集 ${p.owned}/${p.total}`);
    this.progressBar.clear();
    this.progressBar.fillStyle(0x000000, 0.08);
    this.progressBar.fillRoundedRect(45, 258, 660, 14, 7);
    const ratio = p.total === 0 ? 0 : p.owned / p.total;
    if (ratio > 0) {
      this.progressBar.fillStyle(meta.accent, 1);
      this.progressBar.fillRoundedRect(45, 258, Math.max(14, 660 * ratio), 14, 7);
    }

    this.gridLayer.removeAll(true);
    list.forEach((c, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = (W - (COLS * CELL + (COLS - 1) * GAP)) / 2 + CELL / 2 + col * (CELL + GAP);
      const y = GRID_TOP + row * (CELL + GAP);
      this.gridLayer.add(this.createCard(c, x, y));
    });

    this.claimButton?.destroy();
    this.claimButton = undefined;
    if (p.complete && !p.claimed) {
      this.claimButton = createButton(this, W / 2, 790, {
        width: 420,
        height: 96,
        label: `领取系列奖励 +${meta.rewardCoins}`,
        fontSize: 28,
        onClick: () => this.claimSeries(meta.id),
      });
    } else if (p.claimed) {
      this.add
        .text(W / 2, 790, '系列奖励已领取', { fontFamily: FONT, fontSize: '24px', color: '#7b6050' })
        .setOrigin(0.5)
        .setName('claimedTip');
    }

    const total = collection.total();
    const totalText = this.children.getByName('totalProgress') as Phaser.GameObjects.Text | null;
    if (totalText) totalText.setText(`总收集进度 ${total.owned}/${total.total}`);
  }

  private createCard(c: Collectible, x: number, y: number): Phaser.GameObjects.Container {
    const owned = save.hasCollectible(c.id);
    const meta = RARITY_META[c.rarity];
    const card = this.add.container(x, y);

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(-CELL / 2 + 2, -CELL / 2 + 6, CELL, CELL, 22);
    g.fillStyle(owned ? 0xfffaf2 : 0xe7dfd2, 1);
    g.fillRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 22);
    g.lineStyle(3, owned ? meta.color : 0xd8cec0, 1);
    g.strokeRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 22);

    const img = this.add.image(0, -12, `collect_${c.image}`);
    const s = Math.min(96 / img.width, 96 / img.height);
    img.setScale(s);
    if (!owned) {
      img.setTint(0x2b2b2b);
      img.setAlpha(0.85);
    }

    const name = this.add
      .text(0, 52, owned ? c.name : '???', {
        fontFamily: FONT,
        fontSize: '20px',
        color: owned ? '#523625' : '#9b9086',
      })
      .setOrigin(0.5);

    card.add([g, img, name]);

    if (!owned) {
      const lock = this.add.image(0, -12, 'ui_lock_overlay').setDisplaySize(44, 44).setAlpha(0.9);
      card.add(lock);
    }

    card.setSize(CELL, CELL);
    card.setInteractive(new Phaser.Geom.Rectangle(-CELL / 2, -CELL / 2, CELL, CELL), Phaser.Geom.Rectangle.Contains);
    card.on('pointerup', () => {
      playSfx(this, 'audio_click');
      this.openDetail(c);
    });

    return card;
  }

  private openDetail(c: Collectible): void {
    const owned = save.hasCollectible(c.id);
    const meta = RARITY_META[c.rarity];
    const layer = this.add.container(0, 0).setDepth(2000);

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive();
    const panel = this.add.image(W / 2, H / 2, 'ui_panel').setDisplaySize(620, 780);

    const img = this.add.image(W / 2, H / 2 - 220, `collect_${c.image}`);
    const s = Math.min(220 / img.width, 220 / img.height);
    img.setScale(s);
    if (!owned) {
      img.setTint(0x2b2b2b);
      img.setAlpha(0.85);
    }

    const name = this.add
      .text(W / 2, H / 2 - 60, owned ? c.name : '未解锁', {
        fontFamily: FONT,
        fontSize: '42px',
        color: '#523625',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const chip = this.add.graphics();
    chip.fillStyle(meta.color, 1);
    chip.fillRoundedRect(W / 2 - 60, H / 2 - 18, 120, 40, 20);
    const chipText = this.add
      .text(W / 2, H / 2 + 2, meta.name, { fontFamily: FONT, fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5);

    const seriesName = SERIES.find((x) => x.id === c.series)?.name ?? '';
    const seriesText = this.add
      .text(W / 2, H / 2 + 58, seriesName, { fontFamily: FONT, fontSize: '22px', color: '#7b6050' })
      .setOrigin(0.5);

    const desc = this.add
      .text(W / 2, H / 2 + 120, c.desc, {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#523625',
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5, 0);

    const cond = this.add
      .text(W / 2, H / 2 + 210, `获取条件：${c.condition}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#a08974',
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5, 0);

    const close = createButton(this, W / 2, H / 2 + 310, {
      width: 320,
      height: 92,
      label: '关闭',
      fontSize: 30,
      onClick: () => layer.destroy(),
    });

    layer.add([overlay, panel, img, name, chip, chipText, seriesText, desc, cond, close]);
    overlay.on('pointerdown', () => layer.destroy());
  }

  private claimSeries(series: SeriesId): void {
    const gained = collection.claimSeries(series);
    if (gained <= 0) return;

    playSfx(this, 'audio_coin');
    this.celebrate(`系列奖励 +${gained} 金币`);
    this.refresh();

    const tip = this.children.getByName('claimedTip') as Phaser.GameObjects.Text | null;
    if (tip) tip.setText('系列奖励已领取');
  }

  private celebrate(text: string): void {
    const emitter = this.add.particles(W / 2, H / 2 - 40, 'ui_particle_star', {
      speed: { min: 120, max: 320 },
      angle: { min: 0, max: 360 },
      lifespan: 900,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 2,
      tint: [0xfac74a, 0xf49c3f, 0xffffff],
      emitting: false,
    });
    emitter.setDepth(3000);
    emitter.explode(28);
    this.time.delayedCall(1100, () => emitter.destroy());

    const banner = this.add
      .text(W / 2, H / 2 - 40, text, {
        fontFamily: FONT,
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#e07b28',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(3001)
      .setAlpha(0);

    this.tweens.add({ targets: banner, alpha: 1, y: H / 2 - 90, duration: 260, ease: 'Back.easeOut' });
    this.time.delayedCall(1400, () => {
      this.tweens.add({ targets: banner, alpha: 0, duration: 300, onComplete: () => banner.destroy() });
    });
  }
}
