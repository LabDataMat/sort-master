import { _decorator, Component, Node, Sprite, UITransform, Vec3, tween, Color } from 'cc';
import { GameManager } from '../GameManager';
import { createBackground, createLabel, createSprite, makeButton, createMask } from '../ui/UIFactory';
import { PALETTE } from '../core/GameConfig';
import { RARITIES, SERIES, SERIES_ORDER, SeriesId, collectiblesOfSeries } from '../collection/CollectionData';
import { Toast } from '../ui/Toast';

const { ccclass } = _decorator;

/** 收藏册场景：4 系列 × 12 件，已收集显示图片，未收集显示剪影 */
@ccclass('CollectionSceneCtl')
export class CollectionSceneCtl extends Component {
  private gm!: GameManager;
  private tab: SeriesId = 'dessert';
  private content!: Node;
  private tabBar!: Node;
  private summaryLabel: any = null;

  start() {
    this.gm = GameManager.inst;
    createBackground(this.node, 'textures/ui/bg_home');
    this.buildHeader();
    this.content = new Node('content');
    this.node.addChild(this.content);
    this.render();
  }

  private buildHeader() {
    const back = createSprite('textures/ui/icon_undo', { parent: this.node, x: -300, y: 590, w: 56, h: 56 });
    createLabel('返回', { parent: back, y: -42, size: 18, color: PALETTE.textLight });
    makeButton(back, () => {
      this.gm.audio.play('click');
      GameManager.goScene('home');
    });

    createLabel('收藏册', { parent: this.node, y: 596, size: 40, color: PALETTE.text });
    createSprite('textures/ui/icon_fragment', { parent: this.node, x: 250, y: 590, w: 44, h: 44 });
    createLabel(String(this.gm.collection.fragments), { parent: this.node, x: 300, y: 590, size: 26, color: PALETTE.text });

    this.summaryLabel = createLabel('', { parent: this.node, y: 520, size: 22, color: PALETTE.textLight, bold: false });

    // 系列 tab
    this.tabBar = new Node('tabs');
    this.node.addChild(this.tabBar);
    this.tabBar.setPosition(0, 440, 0);
  }

  private render() {
    this.content.removeAllChildren();
    this.tabBar.removeAllChildren();
    const c = this.gm.collection;
    this.summaryLabel.string = `总进度 ${c.ownedCount}/${c.totalCount}（${c.overallPercent}%）`;

    SERIES_ORDER.forEach((s, i) => {
      const p = c.seriesProgress(s);
      const btn = createSprite(s === this.tab ? 'textures/ui/btn_secondary' : 'textures/ui/btn_primary', {
        parent: this.tabBar, x: -270 + i * 180, w: 168, h: 66,
      });
      createLabel(`${SERIES[s].name.replace('系列', '')} ${p.owned}/12`, { parent: btn, y: 3, size: 20, color: '#FFFFFF' });
      makeButton(btn, () => {
        this.tab = s;
        this.gm.audio.play('click');
        this.render();
      });
    });

    const sp = c.seriesProgress(this.tab);
    createLabel(`${SERIES[this.tab].name} · ${SERIES[this.tab].subtitle}`, { parent: this.content, y: 360, size: 26, color: PALETTE.text });
    createLabel(`${sp.owned} / ${sp.total}${sp.complete ? ` · 已解锁主题「${SERIES[this.tab].themeName}」` : ''}`, {
      parent: this.content, y: 320, size: 20, color: sp.complete ? PALETTE.sageDark : PALETTE.textLight, bold: false,
    });

    const list = collectiblesOfSeries(this.tab);
    list.forEach((def, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const x = -255 + col * 170;
      const y = 200 - row * 190;
      const owned = c.has(def.id);
      const card = createSprite(owned ? 'textures/ui/card_bg' : 'textures/ui/card_locked', { parent: this.content, x, y, w: 150, h: 180 });
      if (owned) {
        createSprite(def.texture, { parent: card, y: 26, w: 96, h: 96 });
        createSprite(`textures/ui/frame_${def.rarity}`, { parent: card, y: 26, w: 104, h: 104 });
        createLabel(def.name, { parent: card, y: -44, size: 16, color: PALETTE.text, width: 136, overflow: 'shrink' });
        createLabel(RARITIES[def.rarity].label, { parent: card, y: -70, size: 14, color: RARITIES[def.rarity].color });
      } else {
        createLabel('?', { parent: card, y: 20, size: 52, color: '#C9B692' });
        createLabel('未解锁', { parent: card, y: -44, size: 15, color: '#A89880', bold: false });
      }
      makeButton(card, () => this.openDetail(def.id));
    });
  }

  private openDetail(id: string) {
    const c = this.gm.collection;
    const def = c.getDef(id)!;
    const owned = c.has(id);
    const rarity = RARITIES[def.rarity];
    const layer = new Node('detail');
    layer.addComponent(UITransform).setContentSize(750, 1334);
    this.node.addChild(layer);
    createMask(layer, 170);
    const panel = createSprite('textures/ui/panel', { parent: layer, w: 600, h: 720, y: 0 });
    createSprite(def.texture, { parent: panel, y: 160, w: 200, h: 200 });
    if (owned) createSprite(`textures/ui/frame_${def.rarity}`, { parent: panel, y: 160, w: 220, h: 220 });
    createLabel(rarity.label, { parent: panel, y: 20, size: 24, color: rarity.color });
    createLabel(def.name, { parent: panel, y: -30, size: 38, color: PALETTE.text });
    createLabel(SERIES[def.series].name, { parent: panel, y: -80, size: 20, color: PALETTE.textLight, bold: false });
    createLabel(def.desc, { parent: panel, y: -140, size: 20, color: PALETTE.textLight, width: 520, overflow: 'clamp' });

    if (!owned) {
      const check = c.canExchange(id);
      const btn = createSprite('textures/ui/btn_primary', { parent: panel, y: -230, w: 400, h: 84 });
      createLabel(check.ok ? `用 ${check.cost} 碎片兑换` : check.reason === 'insufficient' ? `碎片不足（需 ${check.cost}）` : '已拥有', {
        parent: btn, y: 3, size: 24, color: '#FFFFFF',
      });
      if (check.ok) {
        makeButton(btn, () => {
          const r = this.gm.exchangeCollectible(id);
          if (r) {
            Toast.show(layer, `获得收藏品：${r.def.name}`);
            this.gm.audio.play('unlock');
            layer.destroy();
            this.render();
          }
        });
      }
    } else {
      createLabel('已收藏', { parent: panel, y: -230, size: 24, color: PALETTE.sageDark });
    }
    const close = createSprite('textures/ui/btn_secondary', { parent: panel, y: -300, w: 240, h: 76 });
    createLabel('关闭', { parent: close, y: 3, size: 24, color: '#FFFFFF' });
    makeButton(close, () => layer.destroy());
    layer.setScale(0.85, 0.85, 1);
    tween(layer).to(0.18, { scale: new Vec3(1, 1, 1) }).start();
    void Sprite;
    void Color;
  }
}
