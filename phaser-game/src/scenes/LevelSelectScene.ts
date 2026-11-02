import Phaser from 'phaser';
import { COLORS, FONT, H, W } from '../theme';
import { MAX_LEVEL, save } from '../services';
import { createButton } from '../ui/Button';
import { playBgm } from '../audio';

const COLS = 4;
const CELL = 140;
const GAP = 20;
const VIEW_TOP = 150;
const VIEW_H = 1110;

/** 关卡选择：100 关网格，支持滚轮 / 拖拽滚动、解锁与通关标记。 */
export class LevelSelectScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private readonly cells = new Map<number, Phaser.GameObjects.Container>();
  private minY = 0;
  private dragging = false;
  private moved = false;
  private startY = 0;
  private startContentY = 0;

  constructor() {
    super('Levels');
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
      .text(W / 2, 76, '关卡选择', {
        fontFamily: FONT,
        fontSize: '38px',
        color: '#523625',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add.image(660, 76, 'ui_coin').setDisplaySize(36, 36);
    this.add
      .text(636, 76, String(save.data.coins), {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#523625',
      })
      .setOrigin(1, 0.5);

    this.buildGrid();
    this.setupScroll();
    void this.loadBadges();

    playBgm(this, 'audio_bgm_home');
  }

  private buildGrid(): void {
    this.content = this.add.container(0, VIEW_TOP);

    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(0, VIEW_TOP, W, VIEW_H);
    this.content.setMask(maskShape.createGeometryMask());

    const startX = (W - (COLS * CELL + (COLS - 1) * GAP)) / 2 + CELL / 2;

    for (let id = 1; id <= MAX_LEVEL; id++) {
      const index = id - 1;
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const x = startX + col * (CELL + GAP);
      const y = 90 + row * (CELL + GAP);
      this.content.add(this.createCell(id, x, y));
    }

    const rows = Math.ceil(MAX_LEVEL / COLS);
    const contentH = rows * (CELL + GAP) + 80;
    this.minY = Math.min(VIEW_TOP, VIEW_TOP + VIEW_H - contentH);

    // 初始滚动到当前关卡附近
    const current = Phaser.Math.Clamp(save.data.maxUnlocked, 1, MAX_LEVEL);
    const row = Math.floor((current - 1) / COLS);
    this.content.y = Phaser.Math.Clamp(VIEW_TOP - row * (CELL + GAP) + 160, this.minY, VIEW_TOP);
  }

  private createCell(id: number, x: number, y: number): Phaser.GameObjects.Container {
    const unlocked = save.isUnlocked(id);
    const completed = save.isCompleted(id);
    const isCurrent = id === save.data.maxUnlocked && !completed;

    const cell = this.add.container(x, y);
    const g = this.add.graphics();

    // 投影
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(-CELL / 2 + 2, -CELL / 2 + 6, CELL, CELL, 24);

    // 主体
    g.fillStyle(unlocked ? 0xfffaf2 : 0xe7dfd2, 1);
    g.fillRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 24);

    // 内高光
    g.fillStyle(0xffffff, unlocked ? 0.5 : 0.2);
    g.fillRoundedRect(-CELL / 2 + 8, -CELL / 2 + 8, CELL - 16, 34, 16);

    if (isCurrent) {
      g.lineStyle(5, COLORS.orange, 1);
      g.strokeRoundedRect(-CELL / 2 + 2, -CELL / 2 + 2, CELL - 4, CELL - 4, 22);
    } else {
      g.lineStyle(2, 0xe3d7c6, 1);
      g.strokeRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 24);
    }

    const num = this.add
      .text(0, -18, String(id), {
        fontFamily: FONT,
        fontSize: '46px',
        color: unlocked ? '#523625' : '#a89c8d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    cell.add([g, num]);

    if (completed) {
      const star = this.add.image(CELL / 2 - 26, -CELL / 2 + 26, 'ui_icon_star').setDisplaySize(34, 34);
      cell.add(star);
    }

    if (!unlocked) {
      const lock = this.add.image(0, 12, 'ui_lock_overlay').setDisplaySize(42, 42).setAlpha(0.9);
      cell.add(lock);
      this.cells.set(id, cell);
      return cell;
    }

    cell.setSize(CELL, CELL);
    cell.setInteractive(
      new Phaser.Geom.Rectangle(-CELL / 2, -CELL / 2, CELL, CELL),
      Phaser.Geom.Rectangle.Contains,
    );
    cell.on('pointerup', () => {
      if (this.moved) return;
      this.scene.start('Game', { levelId: id });
    });

    this.cells.set(id, cell);
    return cell;
  }

  /** 异步加载轻量索引，为每个格子追加难度标识 */
  private async loadBadges(): Promise<void> {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}levels/index.json`);
      if (!res.ok) return;
      const index = (await res.json()) as { id: number; tier: string; score: number; special: boolean }[];

      for (const item of index) {
        const cell = this.cells.get(item.id);
        if (!cell) continue;

        const color =
          item.tier === 'tutorial' ? 0x5cb473 : item.tier === 'challenge' ? 0xe35a52 : 0xf49c3f;

        const g = this.add.graphics();
        g.fillStyle(color, 1);
        g.fillRoundedRect(-44, 40, 88, 28, 14);

        const t = this.add
          .text(0, 54, item.score.toFixed(1), {
            fontFamily: FONT,
            fontSize: '17px',
            color: '#ffffff',
            fontStyle: 'bold',
          })
          .setOrigin(0.5);

        cell.add([g, t]);
      }
    } catch {
      /* 索引缺失时不影响关卡选择 */
    }
  }

  private setupScroll(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.moved = false;
      this.startY = p.y;
      this.startContentY = this.content.y;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      const dy = p.y - this.startY;
      if (Math.abs(dy) > 8) this.moved = true;
      this.content.y = Phaser.Math.Clamp(this.startContentY + dy, this.minY, VIEW_TOP);
    });

    this.input.on('pointerup', () => {
      this.dragging = false;
      // 延迟重置，确保同一次 pointerup 中的格子点击能读到 moved
      this.time.delayedCall(0, () => {
        this.moved = false;
      });
    });

    this.input.on(
      'wheel',
      (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
        this.content.y = Phaser.Math.Clamp(this.content.y - dy * 0.6, this.minY, VIEW_TOP);
      },
    );
  }
}
