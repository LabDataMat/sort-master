import { Node, Sprite, UITransform, Vec3, tween, UIOpacity, Label, Color, director } from 'cc';
import { createMask, createSprite, createLabel, makeButton } from './UIFactory';
import { PALETTE } from '../core/GameConfig';
import { RARITIES } from '../collection/CollectionData';
import type { GrantResult } from '../collection/CollectionManager';
import type { GameManager } from '../GameManager';
import { Toast } from './Toast';

export interface ChestOpts {
  levelId: number;
  stars: number;
  maxCombo: number;
  coins: number;
  xpGained: number;
  chest: { id: string; result: GrantResult | null };
  onNext: () => void;
  onHome: () => void;
  onCollection: () => void;
}

/**
 * 通关宝箱 UI（Cocos）：
 * 宝箱出现 → 点击开启（晃动 + 光效） → 收藏品弹出（按稀有度差异化） → 进度与下一关
 */
export class ChestUI {
  root: Node;
  private gm: GameManager;
  private opts: ChestOpts;
  private opened = false;

  constructor(parent: Node, gm: GameManager, opts: ChestOpts) {
    this.gm = gm;
    this.opts = opts;
    this.root = new Node('chest_ui');
    this.root.addComponent(UITransform).setContentSize(750, 1334);
    parent.addChild(this.root);
    this.buildStage1();
  }

  private buildStage1() {
    createMask(this.root, 175);
    const title = createLabel('通关成功！', { parent: this.root, y: 420, size: 56, color: '#FFF3C4', bold: true });
    title.node.setScale(0.4, 0.4, 1);
    tween(title.node).to(0.25, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();

    const starText = '★'.repeat(this.opts.stars) + '☆'.repeat(3 - this.opts.stars);
    createLabel(starText, { parent: this.root, y: 340, size: 56, color: PALETTE.gold, bold: true });

    const chest = createSprite('textures/ui/chest_closed', { parent: this.root, y: 60, w: 340, h: 340, name: 'chest' });
    tween(chest)
      .repeatForever(tween(chest).to(1, { position: new Vec3(0, 76, 0) }, { easing: 'sineInOut' }).to(1, { position: new Vec3(0, 60, 0) }, { easing: 'sineInOut' }))
      .start();

    createLabel('点击开启收藏宝箱', { parent: this.root, y: -140, size: 24, color: '#FFF3C4' });

    const rw = createLabel(`金币 +${this.opts.coins}   EXP +${this.opts.xpGained}`, { parent: this.root, y: -200, size: 24, color: '#F7DE8C' });
    void rw;

    const openBtn = createSprite('textures/ui/btn_primary', { parent: this.root, y: -320, w: 380, h: 100, name: 'open' });
    createLabel('开启宝箱', { parent: openBtn, y: 4, size: 34, color: '#FFFFFF' });
    makeButton(openBtn, () => this.open(chest), 800);
  }

  private open(chest: Node) {
    if (this.opened) return;
    this.opened = true;
    const openBtn = this.root.getChildByName('open');
    openBtn?.destroy();
    // 晃动
    tween(chest)
      .to(0.08, { position: new Vec3(-12, 64, 0) })
      .to(0.08, { position: new Vec3(12, 64, 0) })
      .to(0.08, { position: new Vec3(-12, 64, 0) })
      .to(0.08, { position: new Vec3(12, 64, 0) })
      .to(0.08, { position: new Vec3(0, 64, 0) })
      .call(() => {
        chest.destroy();
        this.reveal();
      })
      .start();
  }

  private reveal() {
    // 光效
    const ray = createSprite('textures/ui/light_ray', { parent: this.root, y: 40, w: 700, h: 700, name: 'ray' });
    const op = ray.addComponent(UIOpacity);
    op.opacity = 0;
    tween(op).to(0.5, { opacity: 235 }).start();
    tween(ray).repeatForever(tween(ray).to(6, { angle: 360 })).start();

    const openChest = createSprite('textures/ui/chest_open', { parent: this.root, y: 40, w: 340, h: 340 });

    const result = this.opts.chest.result;
    if (!result) {
      this.showNothing();
      return;
    }
    const def = result.def;
    const rarity = RARITIES[def.rarity];
    const sp = this.gm.collection.seriesProgress(def.series);

    // 收藏品卡片
    const card = new Node('reveal_card');
    card.addComponent(UITransform).setContentSize(600, 620);
    this.root.addChild(card);
    card.setPosition(0, -60, 0);

    createSprite('textures/ui/card_bg', { parent: card, w: 600, h: 620 });

    const imgNode = createSprite(def.texture, { parent: card, y: 160, w: 200, h: 200, name: 'item' });
    createSprite(`textures/ui/frame_${def.rarity}`, { parent: card, y: 160, w: 220, h: 220 });
    createLabel(rarity.label, { parent: card, y: 20, size: 24, color: rarity.color, bold: true });
    createLabel(def.name, { parent: card, y: -30, size: 38, color: PALETTE.text });
    createLabel(`${this.gm.collection.themeName(def.series)} · ${sp.owned}/${sp.total}`, { parent: card, y: -80, size: 22, color: PALETTE.textLight, bold: false });
    createLabel(def.desc, { parent: card, y: -140, size: 20, color: PALETTE.textLight, width: 520, overflow: 'clamp' });
    if (result.isNew) {
      const nb = createLabel('NEW', { parent: card, x: 210, y: 250, size: 26, color: '#FFFFFF' });
      nb.node.setScale(0, 0, 1);
      tween(nb.node).delay(0.4).to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    } else {
      createLabel(`已拥有 · 转化为 ${result.fragmentsGained} 碎片`, { parent: card, y: -200, size: 20, color: rarity.color, bold: false });
    }

    // 卡片弹出
    card.setScale(0.3, 0.3, 1);
    tween(card).to(0.35, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    tween(imgNode).delay(0.1).to(0.3, { scale: new Vec3(1.06, 1.06, 1) }).to(0.2, { scale: new Vec3(1, 1, 1) }).start();

    // 进度
    const barBg = createSprite('textures/ui/btn_secondary', { parent: card, y: -250, w: 460, h: 30 });
    void barBg;
    const pct = sp.percent;
    createLabel(`系列进度 ${sp.owned}/${sp.total}（${pct}%）${sp.complete ? ' · 已解锁主题！' : ''}`, {
      parent: card, y: -250, size: 20, color: '#FFFFFF', bold: true,
    });

    // 按钮
    const nextBtn = createSprite('textures/ui/btn_primary', { parent: this.root, y: -560, w: 360, h: 96 });
    createLabel(`下一关：第 ${this.opts.levelId + 1} 关`, { parent: nextBtn, y: 4, size: 30, color: '#FFFFFF' });
    makeButton(nextBtn, () => {
      this.close();
      this.opts.onNext();
    });
    const colBtn = createSprite('textures/ui/btn_secondary', { parent: this.root, y: -660, w: 300, h: 80 });
    createLabel('查看收藏册', { parent: colBtn, y: 3, size: 26, color: '#FFFFFF' });
    makeButton(colBtn, () => {
      this.close();
      this.opts.onCollection();
    });

    if (def.rarity === 'epic' || def.rarity === 'legendary') {
      Toast.show(this.root, def.rarity === 'legendary' ? '传说收藏品！' : '史诗收藏品！');
    }
  }

  private showNothing() {
    createLabel('本关收藏奖励已领取', { parent: this.root, y: 0, size: 30, color: '#FFFFFF' });
    const nextBtn = createSprite('textures/ui/btn_primary', { parent: this.root, y: -200, w: 360, h: 96 });
    createLabel('下一关', { parent: nextBtn, y: 4, size: 30, color: '#FFFFFF' });
    makeButton(nextBtn, () => {
      this.close();
      this.opts.onNext();
    });
  }

  close() {
    if (this.root.isValid) this.root.destroy();
  }
}
