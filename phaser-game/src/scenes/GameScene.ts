import Phaser from 'phaser';
import { COLORS, FONT, H, LAYOUT, W } from '../theme';
import { MAX_LEVEL, loader, save } from '../services';
import { GameSession } from '../core/GameSession';
import type { LevelData, MatchGroup, PickOutcome, SlotItem } from '../core/types';
import { createButton } from '../ui/Button';
import { showToast } from '../ui/Helpers';
import { playBgm, playSfx } from '../audio';

/** 游戏主场景：棋盘 + 收纳槽 + 道具 + 结算 */
export class GameScene extends Phaser.Scene {
  private levelId = 1;
  private level: LevelData | null = null;
  private session: GameSession | null = null;

  private boardLayer!: Phaser.GameObjects.Container;
  private slotLayer!: Phaser.GameObjects.Container;
  private slotItemLayer!: Phaser.GameObjects.Container;
  private trayImage!: Phaser.GameObjects.Image;

  private remainingText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private undoLabel!: Phaser.GameObjects.Text;
  private hintLabel!: Phaser.GameObjects.Text;
  private shuffleLabel!: Phaser.GameObjects.Text;

  private readonly tileViews = new Map<string, Phaser.GameObjects.Image>();
  private busy = false;
  private ended = false;

  constructor() {
    super('Game');
  }

  init(data: { levelId?: number }): void {
    this.levelId = data?.levelId ?? 1;
    this.tileViews.clear();
    this.busy = false;
    this.ended = false;
  }

  create(): void {
    this.add.image(W / 2, H / 2, 'ui_bg_game').setDisplaySize(W, H);

    this.buildHeader();
    this.buildBoardFrame();
    this.buildTrayFrame();
    this.buildBoosters();

    this.loadLevel();
    playBgm(this, 'audio_bgm_game');
  }

  // ---------------- 构建 ----------------

  private buildHeader(): void {
    this.add
      .text(30, 62, `第 ${this.levelId} 关`, {
        fontFamily: FONT,
        fontSize: '34px',
        color: '#523625',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.remainingText = this.add
      .text(W / 2, 62, '剩余 --', { fontFamily: FONT, fontSize: '28px', color: '#7b6050' })
      .setOrigin(0.5);

    this.comboText = this.add
      .text(W / 2, 100, '', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#e07b28',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    createButton(this, 660, 62, {
      width: 110,
      height: 64,
      label: '暂停',
      fontSize: 24,
      fill: COLORS.panel,
      textColor: '#523625',
      onClick: () => this.openPause(),
    });
  }

  private buildBoardFrame(): void {
    const table = this.add.image(W / 2, LAYOUT.boardTop + LAYOUT.boardH / 2, 'ui_table');
    table.setDisplaySize(W, LAYOUT.boardH);
    this.boardLayer = this.add.container(0, 0);
  }

  private buildTrayFrame(): void {
    this.trayImage = this.add.image(W / 2, LAYOUT.trayY, 'ui_tray');
    this.trayImage.setDisplaySize(W, LAYOUT.trayH);
    // 格位层与物品层分离：刷新物品时不能销毁格位
    this.slotLayer = this.add.container(0, 0);
    this.slotItemLayer = this.add.container(0, 0);
  }

  private buildBoosters(): void {
    this.undoLabel = this.makeBooster(160, 'ui_icon_undo', () => this.onUndo());
    this.hintLabel = this.makeBooster(375, 'ui_icon_star', () => this.onHint());
    this.shuffleLabel = this.makeBooster(590, 'ui_icon_shuffle', () => this.onShuffle());
  }

  private makeBooster(x: number, iconKey: string, onClick: () => void): Phaser.GameObjects.Text {
    const btn = createButton(this, x, LAYOUT.boosterY, {
      width: 190,
      height: 96,
      label: '',
      fill: COLORS.panel,
      textColor: '#523625',
      onClick,
    });

    const icon = this.add.image(-52, 0, iconKey).setDisplaySize(44, 44);
    const label = this.add
      .text(26, 0, 'x0', { fontFamily: FONT, fontSize: '26px', color: '#523625', fontStyle: 'bold' })
      .setOrigin(0.5);

    btn.add([icon, label]);
    return label;
  }

  // ---------------- 关卡 ----------------

  private async loadLevel(): Promise<void> {
    try {
      this.level = await loader.load(this.levelId);
    } catch (e) {
      console.error(e);
      showToast(this, '关卡数据缺失');
      this.time.delayedCall(1200, () => this.scene.start('Menu'));
      return;
    }

    this.session = new GameSession(this.level);
    this.buildSlots();
    this.buildBoard();
    this.refreshBlocked();
    this.refreshSlots();
    this.updateHud();
    this.updateBoosterLabels();
  }

  private buildSlots(): void {
    if (!this.session) return;
    const cap = this.session.slots.capacity;
    const size = LAYOUT.slotCell;

    for (let i = 0; i < cap; i++) {
      const p = this.slotCellPosition(i);

      // 自绘凹陷格位：托盘为浅木色，slot_cell 贴图与其同色几乎不可见，改用高对比绘制
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.14);
      g.fillRoundedRect(p.x - size / 2 + 2, p.y - size / 2 + 5, size, size, 20);
      g.fillStyle(0xc9a97c, 1);
      g.fillRoundedRect(p.x - size / 2, p.y - size / 2, size, size, 20);
      g.fillStyle(0xa9865c, 0.55);
      g.fillRoundedRect(p.x - size / 2 + 5, p.y - size / 2 + 5, size - 10, size - 10, 16);
      g.lineStyle(2, 0x8d6a43, 0.55);
      g.strokeRoundedRect(p.x - size / 2, p.y - size / 2, size, size, 20);

      this.slotLayer.add(g);
    }
  }

  private buildBoard(): void {
    if (!this.session) return;

    for (const tile of this.session.board.tiles) {
      const img = this.add.image(
        tile.x + tile.w / 2,
        LAYOUT.boardTop + tile.y + tile.h / 2,
        `item_${tile.itemId}`,
      );
      img.setDisplaySize(tile.w, tile.h);
      img.setAngle(this.angleFor(tile.instanceId));
      img.setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => this.onTileClick(tile.instanceId));

      this.boardLayer.add(img);
      this.tileViews.set(tile.instanceId, img);
    }
  }

  private rebuildBoard(): void {
    for (const [, view] of this.tileViews) view.destroy();
    this.tileViews.clear();
    this.buildBoard();
  }

  private angleFor(id: string): number {
    let hash = 17;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0x7fffffff;
    return ((hash % 9) - 4) * 1.4;
  }

  private slotCellPosition(index: number): { x: number; y: number } {
    const cap = this.session ? this.session.slots.capacity : 7;
    const total = cap * LAYOUT.slotCell + (cap - 1) * LAYOUT.slotGap;
    const startX = W / 2 - total / 2 + LAYOUT.slotCell / 2;
    return { x: startX + index * (LAYOUT.slotCell + LAYOUT.slotGap), y: LAYOUT.trayY };
  }

  // ---------------- 交互 ----------------

  private onTileClick(tileId: string): void {
    if (!this.session || this.busy || this.ended) return;

    const tile = this.session.board.get(tileId);
    if (!tile || !this.session.board.isClickable(tile)) {
      if (tile && tile.frozen > 0) showToast(this, '该物品被冰冻，先完成消除');
      else if (tile && tile.locked) showToast(this, '该物品已锁定，先完成消除');
      this.shakeTile(tileId);
      return;
    }

    const before = this.session.slots.snapshot();
    const outcome = this.session.pick(tileId);

    if (!outcome.ok) {
      this.handleReject(outcome.reason);
      return;
    }

    this.animatePick(tileId, outcome, before);
  }

  private handleReject(reason?: string): void {
    if (reason === 'slots_full') {
      showToast(this, '收纳槽已满');
      this.shakeTray();
    }
  }

  private animatePick(tileId: string, outcome: PickOutcome, before: SlotItem[]): void {
    if (!this.session) return;

    this.busy = true;
    playSfx(this, 'audio_move');

    const view = this.tileViews.get(tileId);
    const target = this.slotCellPosition(
      Phaser.Math.Clamp(outcome.insertIndex, 0, this.session.slots.capacity - 1),
    );

    if (view) {
      this.tweens.add({
        targets: view,
        x: target.x,
        y: target.y,
        scaleX: view.scaleX * 0.7,
        scaleY: view.scaleY * 0.7,
        angle: 0,
        duration: 165,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          view.destroy();
          this.tileViews.delete(tileId);
        },
      });
    }

    this.time.delayedCall(170, () => {
      this.refreshSlots();

      if (outcome.groups.length > 0) {
        this.playMatch(outcome.groups, before);
        playSfx(this, outcome.groups.length > 1 ? 'audio_combo' : 'audio_match');
      }

      this.refreshBlocked();
      this.updateHud();
      this.busy = false;

      if (this.session && this.session.state !== 'playing') {
        this.ended = true;
        this.time.delayedCall(520, () => this.showResult());
      }
    });
  }

  private playMatch(groups: MatchGroup[], before: SlotItem[]): void {
    for (const group of groups) {
      for (const item of group.items) {
        const idx = before.findIndex((x) => x.instanceId === item.instanceId);
        const p = this.slotCellPosition(idx < 0 ? 0 : idx);

        this.spawnBurst(p.x, p.y);

        const ghost = this.add.image(p.x, p.y, `item_${item.itemId}`).setDisplaySize(84, 84);
        ghost.setDepth(50);
        this.tweens.add({
          targets: ghost,
          scaleX: ghost.scaleX * 1.5,
          scaleY: ghost.scaleY * 1.5,
          alpha: 0,
          y: p.y - 34,
          duration: 300,
          ease: 'Cubic.easeOut',
          onComplete: () => ghost.destroy(),
        });
      }
    }
  }

  private spawnBurst(x: number, y: number): void {
    const emitter = this.add.particles(x, y, 'ui_particle_circle', {
      speed: { min: 60, max: 170 },
      angle: { min: 0, max: 360 },
      lifespan: 420,
      scale: { start: 0.32, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xfac74a, 0xf49c3f, 0xffffff],
      emitting: false,
    });
    emitter.setDepth(60);
    emitter.explode(9);
    this.time.delayedCall(520, () => emitter.destroy());
  }

  private refreshSlots(): void {
    if (!this.session) return;

    this.slotItemLayer.removeAll(true);
    const items = this.session.slots.all;

    items.forEach((item, i) => {
      const p = this.slotCellPosition(i);
      const img = this.add.image(p.x, p.y, `item_${item.itemId}`).setDisplaySize(80, 80);
      const baseX = img.scaleX;
      const baseY = img.scaleY;
      img.setScale(baseX * 0.7, baseY * 0.7);
      this.slotItemLayer.add(img);

      this.tweens.add({
        targets: img,
        scaleX: baseX,
        scaleY: baseY,
        duration: 120,
        ease: 'Back.easeOut',
      });
    });
  }

  private refreshBlocked(): void {
    if (!this.session) return;

    for (const tile of this.session.board.tiles) {
      const view = this.tileViews.get(tile.instanceId);
      if (!view) continue;

      const clickable = this.session.board.isClickable(tile);
      view.setTint(clickable ? 0xffffff : 0x9a9a9a);
      view.setAlpha(clickable ? 1 : 0.92);
    }
  }

  private updateHud(): void {
    if (!this.session) return;
    this.remainingText.setText(`剩余 ${this.session.board.remaining}`);
    this.comboText.setText(this.session.combo >= 2 ? `连击 x${this.session.combo}` : '');
  }

  private updateBoosterLabels(): void {
    this.undoLabel.setText(`x${save.boosterCount('undo')}`);
    this.hintLabel.setText(`x${save.boosterCount('hint')}`);
    this.shuffleLabel.setText(`x${save.boosterCount('shuffle')}`);
  }

  private shakeTile(tileId: string): void {
    const view = this.tileViews.get(tileId);
    if (!view) return;
    const x0 = view.x;
    this.tweens.add({
      targets: view,
      x: x0 + 5,
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        view.x = x0;
      },
    });
  }

  private shakeTray(): void {
    const x0 = this.trayImage.x;
    this.tweens.add({
      targets: this.trayImage,
      x: x0 + 7,
      duration: 55,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.trayImage.x = x0;
      },
    });
  }

  // ---------------- 道具 ----------------

  private onUndo(): void {
    if (!this.session || this.busy || this.ended) return;

    if (!this.session.canUndo) {
      showToast(this, '无法撤回');
      return;
    }
    if (!save.spendBooster('undo')) {
      showToast(this, '道具已用完');
      return;
    }

    this.session.undo();
    this.rebuildBoard();
    this.refreshSlots();
    this.refreshBlocked();
    this.updateHud();
    this.updateBoosterLabels();
    playSfx(this, 'audio_click');
  }

  private onHint(): void {
    if (!this.session || this.busy || this.ended) return;

    if (!save.spendBooster('hint')) {
      showToast(this, '道具已用完');
      return;
    }
    this.updateBoosterLabels();

    const id = this.session.hint();
    if (!id) return;

    const view = this.tileViews.get(id);
    if (view) {
      this.tweens.add({
        targets: view,
        scaleX: view.scaleX * 1.18,
        scaleY: view.scaleY * 1.18,
        duration: 180,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
      });
    }
    showToast(this, '点击高亮物品');
  }

  private onShuffle(): void {
    if (!this.session || this.busy || this.ended) return;

    if (!save.spendBooster('shuffle')) {
      showToast(this, '道具已用完');
      return;
    }

    if (!this.session.shuffle()) {
      showToast(this, '无法洗牌');
      return;
    }

    for (const tile of this.session.board.tiles) {
      const view = this.tileViews.get(tile.instanceId);
      if (!view) continue;
      view.setTexture(`item_${tile.itemId}`);
      view.setDisplaySize(tile.w, tile.h);
    }

    this.updateBoosterLabels();
    this.refreshBlocked();
    playSfx(this, 'audio_booster');
    showToast(this, '已洗牌');
  }

  // ---------------- 弹窗 ----------------

  private openPause(): void {
    if (this.ended) return;

    const layer = this.add.container(0, 0).setDepth(2000);
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5).setInteractive();
    const panel = this.add.image(W / 2, H / 2, 'ui_panel').setDisplaySize(540, 560);

    const title = this.add
      .text(W / 2, H / 2 - 180, '暂停', {
        fontFamily: FONT,
        fontSize: '44px',
        color: '#523625',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const resume = createButton(this, W / 2, H / 2 - 40, {
      width: 380,
      height: 104,
      label: '继续',
      fontSize: 32,
      onClick: () => layer.destroy(),
    });

    const restart = createButton(this, W / 2, H / 2 + 86, {
      width: 380,
      height: 92,
      label: '重新挑战',
      fontSize: 28,
      fill: COLORS.panel,
      textColor: '#523625',
      onClick: () => this.scene.start('Game', { levelId: this.levelId }),
    });

    const menu = createButton(this, W / 2, H / 2 + 200, {
      width: 380,
      height: 88,
      label: '返回主菜单',
      fontSize: 28,
      fill: COLORS.panel,
      textColor: '#523625',
      onClick: () => this.scene.start('Menu'),
    });

    layer.add([overlay, panel, title, resume, restart, menu]);
  }

  private showResult(): void {
    if (!this.session) return;

    const victory = this.session.state === 'victory';
    const stars = this.session.stars();
    const coins = victory ? 20 + stars * 10 : 0;
    if (victory) save.completeLevel(this.levelId, coins, MAX_LEVEL);

    playSfx(this, victory ? 'audio_win' : 'audio_lose');

    const layer = this.add.container(0, 0).setDepth(2000);
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive();
    const panel = this.add.image(W / 2, H / 2, 'ui_panel').setDisplaySize(620, 720);
    layer.add([overlay, panel]);

    panel.setScale(panel.scaleX * 0.86, panel.scaleY * 0.86);
    this.tweens.add({
      targets: panel,
      scaleX: panel.scaleX / 0.86,
      scaleY: panel.scaleY / 0.86,
      duration: 260,
      ease: 'Back.easeOut',
    });

    const title = this.add
      .text(W / 2, H / 2 - 250, victory ? '恭喜通关！' : '挑战失败', {
        fontFamily: FONT,
        fontSize: '52px',
        color: victory ? '#523625' : '#e35a52',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    layer.add(title);

    if (victory) {
      for (let i = 0; i < 3; i++) {
        const star = this.add.image(W / 2 + (i - 1) * 130, H / 2 - 130, 'ui_icon_star');
        const base = Math.min(96 / star.width, 96 / star.height);
        star.setScale(base);
        star.setTint(i < stars ? 0xfac74a : 0xcfc7ba);
        layer.add(star);
        star.setScale(0);
        this.tweens.add({
          targets: star,
          scaleX: base,
          scaleY: base,
          duration: 260,
          delay: 120 + i * 90,
          ease: 'Back.easeOut',
        });
      }

      const coinText = this.add
        .text(W / 2 + 26, H / 2 - 20, `获得金币 ${coins}`, {
          fontFamily: FONT,
          fontSize: '30px',
          color: '#523625',
        })
        .setOrigin(0.5);
      // 金币图标放在文字左侧，按文字实际宽度定位，避免压字
      const coin = this.add
        .image(coinText.x - coinText.width / 2 - 34, H / 2 - 20, 'ui_coin')
        .setDisplaySize(40, 40);
      layer.add([coin, coinText]);

      const nextLabel = this.levelId >= MAX_LEVEL ? '返回关卡选择' : '下一关';
      const next = createButton(this, W / 2, H / 2 + 72, {
        width: 400,
        height: 112,
        label: nextLabel,
        fontSize: 34,
        onClick: () => {
          if (this.levelId >= MAX_LEVEL) this.scene.start('Levels');
          else this.scene.start('Game', { levelId: this.levelId + 1 });
        },
      });

      const retry = createButton(this, W / 2, H / 2 + 184, {
        width: 400,
        height: 96,
        label: '重新挑战',
        fontSize: 30,
        fill: COLORS.panel,
        textColor: '#523625',
        onClick: () => this.scene.start('Game', { levelId: this.levelId }),
      });

      const back = createButton(this, W / 2, H / 2 + 288, {
        width: 400,
        height: 88,
        label: '返回关卡选择',
        fontSize: 28,
        fill: COLORS.panel,
        textColor: '#523625',
        onClick: () => this.scene.start('Levels'),
      });

      layer.add([next, retry, back]);
    } else {
      const hint = this.add
        .text(W / 2, H / 2 - 110, '收纳槽满了，再试一次吧', {
          fontFamily: FONT,
          fontSize: '28px',
          color: '#7b6050',
        })
        .setOrigin(0.5);
      layer.add(hint);

      const retry = createButton(this, W / 2, H / 2 + 10, {
        width: 400,
        height: 112,
        label: '重新挑战',
        fontSize: 34,
        onClick: () => this.scene.start('Game', { levelId: this.levelId }),
      });

      const menu = createButton(this, W / 2, H / 2 + 150, {
        width: 400,
        height: 96,
        label: '返回主菜单',
        fontSize: 28,
        fill: COLORS.panel,
        textColor: '#523625',
        onClick: () => this.scene.start('Menu'),
      });

      layer.add([retry, menu]);
    }
  }
}
