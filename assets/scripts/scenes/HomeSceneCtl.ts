import { _decorator, Component, Node, Vec3, tween, director, Label } from 'cc';
import { GameManager } from '../GameManager';
import { createBackground, createLabel, createSprite, makeButton } from '../ui/UIFactory';
import { PALETTE } from '../core/GameConfig';
import { DailyRewardUI } from '../ui/DailyRewardUI';
import { BoosterShopUI } from '../ui/BoosterShopUI';
import { SettingsUI } from '../ui/SettingsUI';
import { DailyTaskUI } from '../ui/DailyTaskUI';
import { Toast } from '../ui/Toast';
import { SERIES_ORDER, SERIES } from '../collection/CollectionData';

const { ccclass } = _decorator;

/** 首页：玩家等级 / 当前挑战 / 收藏册入口 / 每日任务与签到 */
@ccclass('HomeSceneCtl')
export class HomeSceneCtl extends Component {
  private gm!: GameManager;
  private popLayer!: Node;
  private root!: Node;

  start() {
    this.gm = GameManager.inst;
    this.root = this.node;
    this.popLayer = new Node('popups');
    this.node.addChild(this.popLayer);
    this.build();
  }

  private build() {
    const c = this.node;
    c.removeAllChildren();
    this.popLayer = new Node('popups');
    c.addChild(this.popLayer);
    createBackground(c, 'textures/ui/bg_home');

    // 玩家信息（左）
    createSprite('textures/ui/icon_star', { parent: c, x: -300, y: 590, w: 60, h: 60 });
    createLabel(`Lv.${this.gm.progress.player.level}`, { parent: c, x: -240, y: 606, size: 24, color: PALETTE.text });
    const xpPct = Math.round(this.gm.progress.xpProgress * 100);
    createLabel(`EXP ${xpPct}%`, { parent: c, x: -240, y: 574, size: 18, color: PALETTE.textLight, bold: false });

    // 金币 / 碎片
    createSprite('textures/ui/coin', { parent: c, x: 130, y: 590, w: 44, h: 44 });
    createLabel(String(this.gm.currency.balance), { parent: c, x: 196, y: 590, size: 24, color: PALETTE.text });
    createSprite('textures/ui/icon_fragment', { parent: c, x: 268, y: 590, w: 44, h: 44 });
    createLabel(String(this.gm.collection.fragments), { parent: c, x: 320, y: 590, size: 24, color: PALETTE.text });

    // Logo
    const logo = createSprite('textures/ui/logo', { parent: c, y: 430, w: 480, h: 190 });
    createLabel('收纳大作战', { parent: c, y: 450, size: 56, color: PALETTE.primaryDark });
    createLabel('SORT MASTER', { parent: c, y: 370, size: 26, color: PALETTE.sageDark });
    tween(logo).repeatForever(tween(logo).to(1.4, { position: new Vec3(0, 442, 0) }, { easing: 'sineInOut' }).to(1.4, { position: new Vec3(0, 418, 0) }, { easing: 'sineInOut' })).start();

    // 当前挑战卡
    const level = this.gm.currentLevel;
    createSprite('textures/ui/panel', { parent: c, y: 130, w: 660, h: 230 });
    createLabel('当前挑战', { parent: c, x: -220, y: 190, size: 22, color: PALETTE.textLight, bold: false });
    createLabel(`第 ${level} 关`, { parent: c, x: -220, y: 140, size: 52, color: PALETTE.primaryDark });
    const stars = this.gm.save.data.levelStars?.[String(level)] ?? 0;
    createLabel('★'.repeat(stars) + '☆'.repeat(3 - stars), { parent: c, x: -220, y: 96, size: 26, color: PALETTE.gold });
    const startBtn = createSprite('textures/ui/btn_primary', { parent: c, x: 150, y: 130, w: 280, h: 110 });
    createLabel('开始挑战', { parent: startBtn, y: 4, size: 34, color: '#FFFFFF' });
    makeButton(startBtn, () => {
      this.gm.audio.play('click');
      GameManager.goScene('game');
    });
    tween(startBtn).repeatForever(tween(startBtn).to(0.9, { scale: new Vec3(1.04, 1.04, 1) }).to(0.9, { scale: new Vec3(1, 1, 1) })).start();

    // 收藏册入口
    const colCard = createSprite('textures/ui/card_bg', { parent: c, y: -60, w: 660, h: 190 });
    createSprite('textures/ui/icon_book', { parent: colCard, x: -250, y: 10, w: 70, h: 70 });
    createLabel('收藏册', { parent: colCard, x: -110, y: 40, size: 30, color: PALETTE.text });
    createLabel(`${this.gm.collection.ownedCount}/${this.gm.collection.totalCount} 件 · ${this.gm.collection.overallPercent}%`, {
      parent: colCard, x: -80, y: 2, size: 20, color: PALETTE.textLight, bold: false,
    });
    createLabel('查看全部 ›', { parent: colCard, x: 220, y: 6, size: 22, color: PALETTE.primaryDark });
    makeButton(colCard, () => {
      this.gm.audio.play('click');
      GameManager.goScene('collection');
    });

    // 系列小进度
    SERIES_ORDER.forEach((s, i) => {
      const p = this.gm.collection.seriesProgress(s);
      createLabel(`${SERIES[s].name.replace('系列', '')} ${p.owned}/12`, {
        parent: c, x: -240 + i * 160, y: -180, size: 18, color: PALETTE.textLight, bold: false,
      });
    });

    // 四个快捷入口
    const entries: { name: string; icon: string; cb: () => void }[] = [
      { name: '每日任务', icon: 'icon_task_clear', cb: () => new DailyTaskUI(this.popLayer, this.gm, () => {}) },
      { name: '每日签到', icon: 'icon_daily', cb: () => new DailyRewardUI(this.popLayer, this.gm, () => {}) },
      { name: '道具商店', icon: 'icon_slot', cb: () => new BoosterShopUI(this.popLayer, this.gm, () => {}, (m) => Toast.show(this.popLayer, m)) },
      { name: '设置', icon: 'icon_settings', cb: () => new SettingsUI(this.popLayer, this.gm, () => {}) },
    ];
    entries.forEach((e, i) => {
      const x = -240 + i * 160;
      const btn = createSprite('textures/ui/card_bg', { parent: c, x, y: -300, w: 140, h: 160 });
      createSprite(`textures/ui/${e.icon}`, { parent: btn, y: 16, w: 56, h: 56 });
      createLabel(e.name, { parent: btn, y: -46, size: 18, color: PALETTE.text, bold: false });
      makeButton(btn, () => {
        this.gm.audio.play('click');
        e.cb();
      });
    });

    // 装饰物品
    ['apple', 'donut', 'duck', 'pencil', 'bear'].forEach((id, i) => {
      const d = createSprite(`textures/items/${id}`, { parent: c, x: -240 + i * 120, y: -500, w: 84, h: 84 });
      tween(d)
        .delay(i * 0.2)
        .repeatForever(tween(d).to(1.2 + i * 0.15, { position: new Vec3(-240 + i * 120, -486, 0) }, { easing: 'sineInOut' }).to(1.2 + i * 0.15, { position: new Vec3(-240 + i * 120, -500, 0) }, { easing: 'sineInOut' }))
        .start();
    });

    const mockTag = this.gm.platform.isMockAd ? 'Mock 广告模式（非真实广告）' : '微信广告模式';
    createLabel(mockTag, { parent: c, y: -600, size: 18, color: PALETTE.textLight, bold: false });

    this.gm.audio.playBgm('bgm_home');
    void Label;
  }
}
