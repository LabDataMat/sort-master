import { _decorator, Component, Node, Vec3, tween, director, Label, UIOpacity } from 'cc';
import { GameManager } from '../GameManager';
import { GameSession } from '../gameplay/logic/GameSession';
import { TileView } from '../gameplay/views/TileView';
import { SlotView } from '../gameplay/views/SlotView';
import { FXLayer } from '../gameplay/views/FXLayer';
import { createBackground, createLabel, createSprite, makeButton } from '../ui/UIFactory';
import { CoinBar } from '../ui/CoinBar';
import { SettingsUI } from '../ui/SettingsUI';
import { ChestUI } from '../ui/ChestUI';
import { FailUI } from '../ui/FailUI';
import { Toast } from '../ui/Toast';
import { PALETTE, BASE_SLOT_CAPACITY } from '../core/GameConfig';
import type { BoosterType } from '../core/GameConfig';
import { mulberry32 } from '../utils/Rand';

const { ccclass } = _decorator;

const BOOSTERS: { type: BoosterType; name: string; icon: string }[] = [
  { type: 'undo', name: '撤回', icon: 'textures/ui/icon_undo' },
  { type: 'shuffle', name: '洗牌', icon: 'textures/ui/icon_shuffle' },
  { type: 'remove', name: '移除', icon: 'textures/ui/icon_remove' },
  { type: 'extra_slot', name: '加槽', icon: 'textures/ui/icon_slot' },
];

/**
 * 游戏主场景控制器：
 * - 输入锁：动画期间禁止点击（防重复点击）
 * - 逻辑与动画解耦：GameSession 即时结算，这里只做表现
 * - 胜利/失败/复活（广告/金币）/道具/结算
 */
@ccclass('GameSceneCtl')
export class GameSceneCtl extends Component {
  private gm!: GameManager;
  private session!: GameSession;
  private tileViews = new Map<string, TileView>();
  private slotViews: SlotView[] = [];
  private fx!: FXLayer;
  private boardLayer!: Node;
  private popLayer!: Node;
  private boosterCounts = new Map<BoosterType, Label>();
  private levelId = 1;
  private runId = '';
  private removeMode = false;
  private pendingMatchIds: string[] = [];
  private extraSlotBadge: Label | null = null;
  private settled = false;

  start() {
    this.gm = GameManager.inst;
    this.levelId = this.gm.currentLevel;
    this.runId = `run_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    this.gm.ad.startRun(this.runId);
    this.gm.stats.recordGameStart();

    createBackground(this.node, 'textures/ui/bg_game');
    this.buildTopBar();
    this.buildTray();
    this.buildBoosterBar();
    this.popLayer = new Node('popups');
    this.node.addChild(this.popLayer);

    this.gm.audio.playBgm('bgm_game');
    this.gm.loadLevel(this.levelId, (level) => {
      if (!level) {
        Toast.show(this.popLayer, `关卡 ${this.levelId} 加载失败`);
        return;
      }
      this.startSession(level);
    });
  }

  // ---------------- UI 构建 ----------------

  private buildTopBar() {
    const back = createSprite('textures/ui/icon_undo', { parent: this.node, x: -300, y: 580, w: 56, h: 56, name: 'back' });
    createLabel('首页', { parent: back, y: -42, size: 18, color: PALETTE.textLight });
    makeButton(back, () => {
      this.gm.persist();
      director.loadScene('home');
    });
    createLabel(`第 ${this.levelId} 关`, { parent: this.node, x: 0, y: 590, size: 36, color: PALETTE.text });
    new CoinBar(this.node, this.gm, 170, 580);
    const settingsBtn = createSprite('textures/ui/icon_settings', { parent: this.node, x: 300, y: 580, w: 56, h: 56 });
    makeButton(settingsBtn, () => {
      this.session?.pause();
      new SettingsUI(this.popLayer, this.gm, () => this.session?.resume());
    });
  }

  private buildTray() {
    const tray = createSprite('textures/ui/tray', { parent: this.node, y: -540, w: 710, h: 132, name: 'tray' });
    void tray;
    this.slotViews = [];
    for (let i = 0; i < BASE_SLOT_CAPACITY + 1; i++) {
      const sv = new SlotView(this.node, (i - 3.5) * 94, -540);
      sv.node.active = i < BASE_SLOT_CAPACITY;
      this.slotViews.push(sv);
    }
    createLabel('收纳槽', { parent: this.node, y: -596, size: 18, color: PALETTE.textLight, bold: false });
  }

  private buildBoosterBar() {
    BOOSTERS.forEach((b, i) => {
      const x = -225 + i * 150;
      const btn = createSprite('textures/ui/btn_secondary', { parent: this.node, x, y: -430, w: 132, h: 110, name: `booster_${b.type}` });
      createSprite(b.icon, { parent: btn, y: 16, w: 52, h: 52 });
      createLabel(b.name, { parent: btn, y: -30, size: 20, color: '#FFFFFF' });
      const count = createLabel('x0', { parent: btn, x: 44, y: 40, size: 22, color: PALETTE.gold });
      this.boosterCounts.set(b.type, count);
      makeButton(btn, () => this.onBooster(b.type));
    });
    this.refreshBoosterCounts();
  }

  private refreshBoosterCounts() {
    for (const [type, label] of this.boosterCounts) {
      if (label.isValid) label.string = `x${this.gm.inventory.get(type)}`;
    }
  }

  // ---------------- 会话 ----------------

  private startSession(level: any) {
    this.session = new GameSession(level, {
      capacity: BASE_SLOT_CAPACITY,
      extraSlotMoves: this.gm.balance.extraSlotMoves,
    });
    this.settled = false;
    this.boardLayer = new Node('board');
    this.node.addChild(this.boardLayer);

    // 构建物品视图
    for (const tile of level.itemPositions) {
      const tv = new TileView(this.boardLayer, tile);
      this.tileViews.set(tile.id, tv);
      tv.node.on(Node.TouchEventType.TOUCH_END, () => this.onTileTouch(tile.id));
    }

    // 事件接线（逻辑即时，表现层响应）
    this.session.events.on('tile:picked', ({ tileId, slotIndex }) => {
      const tv = this.tileViews.get(tileId);
      if (tv) {
        const sv = this.slotViews[Math.min(slotIndex, this.slotViews.length - 1)];
        sv.setItem(tv.type, tileId);
        this.gm.audio.play('move');
        tv.flyTo(sv.node.position.clone(), 0.26, () => {
          tv.destroy();
          this.afterPickAnimation();
        });
      } else {
        this.afterPickAnimation();
      }
    });
    this.session.events.on('match:cleared', ({ slotItems, combo }) => {
      this.pendingMatchIds = slotItems.map((s) => s.tileId);
      if (combo >= 2) {
        this.fx.showCombo(combo);
        this.gm.audio.play('combo');
      }
    });
    this.session.events.on('board:changed', () => {
      this.rebuildMissingViews();
      this.refreshTileStates();
    });
    this.session.events.on('slot:full', () => {
      this.slotViews.forEach((sv) => sv.playShake());
      this.gm.audio.play('lose');
    });
    this.session.events.on('slot:tight', ({ occupied, capacity }) => {
      // 槽位紧张预警：轻震动 + 提示（剩余 2 格 / 1 格）
      this.slotViews.forEach((sv) => sv.playShake());
      this.gm.audio.play('click', 0.6);
      if (occupied === capacity - 1) Toast.show(this.popLayer, '槽位只剩 1 格！');
      else if (occupied === capacity - 2) Toast.show(this.popLayer, `槽位紧张（${occupied}/${capacity}）`);
    });
    this.session.events.on('booster:used', ({ type }) => {
      this.gm.audio.play('booster');
      this.refreshBoosterCounts();
      if (type === 'shuffle') this.animateShuffle();
      if (type === 'extra_slot') this.updateExtraSlotVisual();
    });
    this.session.events.on('game:victory', () => {
      /* 在动画结束后统一处理 */
    });
    this.session.events.on('game:failed', () => {
      /* 在动画结束后统一处理 */
    });

    this.fx = new FXLayer(this.node);
    this.session.start();
    // 高难度关卡提示（难度 >= 4）
    if ((level.difficulty ?? 1) >= 4) {
      const limit = level.boosterLimit ? ` · 道具限用 ${level.boosterLimit} 次` : '';
      Toast.show(this.popLayer, `⚠ 高难度关卡：${level.difficultyLabel ?? ''}${limit}`);
    }
    this.refreshTileStates();
  }

  // ---------------- 输入 ----------------

  private onTileTouch(tileId: string) {
    if (!this.session || this.session.inputLocked) return;
    if (this.removeMode) {
      this.tryRemove(tileId);
      return;
    }
    const check = this.session.canPick(tileId);
    if (!check.ok) {
      if (check.reason === 'occluded' || check.reason === 'frozen' || check.reason === 'locked') {
        this.gm.audio.play('click', 0.5);
        const tv = this.tileViews.get(tileId);
        tv?.playTap();
      }
      return;
    }
    // 输入锁 → 逻辑结算 → 动画 → 解锁（快照由 session 内部处理）
    this.session.inputLocked = true;
    this.tileViews.get(tileId)?.playTap();
    this.gm.audio.play('click');
    this.session.pickTile(tileId);
  }

  private afterPickAnimation() {
    // 三消动画
    if (this.pendingMatchIds.length > 0) {
      const ids = this.pendingMatchIds;
      this.pendingMatchIds = [];
      let done = 0;
      let anyPos: Vec3 | null = null;
      for (const sv of this.slotViews) {
        if (sv.tileId && ids.includes(sv.tileId)) {
          anyPos = sv.node.position.clone();
          sv.playMatchOut(() => {
            if (++done === ids.length) this.finishPick();
          });
        }
      }
      if (anyPos) {
        this.fx.burst(anyPos.x, anyPos.y, 10);
        this.gm.audio.play('match');
      }
      if (done === 0) this.finishPick();
    } else {
      this.finishPick();
    }
  }

  private finishPick() {
    this.updateExtraSlotVisual();
    // 连续三连消除后按逻辑状态补位重排槽位（向左补位）
    this.syncSlots();
    this.refreshTileStates();
    if (this.session.state === 'VICTORY') {
      this.onVictory();
      return;
    }
    if (this.session.state === 'FAILED') {
      this.onFail();
      return;
    }
    this.session.inputLocked = false;
  }

  /** 槽位视图与逻辑状态同步（消除补位 / 撤回 / 复活后调用） */
  private syncSlots() {
    if (!this.session) return;
    const extraActive = this.session.slots.hasExtraSlot;
    for (let i = 0; i < this.slotViews.length; i++) {
      const sv = this.slotViews[i];
      sv.node.active = extraActive || i < BASE_SLOT_CAPACITY;
      const it = this.session.slots.items[i];
      if (it) {
        if (sv.tileId !== it.uniqueId) sv.setItem(it.itemType, it.uniqueId);
      } else {
        sv.clearItemImmediate();
      }
    }
  }

  private refreshTileStates() {
    const clickable = new Set(this.session.getClickableTiles().map((t) => t.id));
    for (const [id, tv] of this.tileViews) {
      if (!tv.node.isValid) continue;
      const tile = this.session.board.getTile(id)!;
      tv.showFrozen(tile.frozen > 0);
      tv.showLocked(tile.locked);
      tv.setClickable(this.removeMode ? clickable.has(id) : clickable.has(id) && tile.status !== 'removed');
    }
  }

  /** 撤回/复活后重建缺失的物品视图（view 已销毁但逻辑上仍在场上） */
  private rebuildMissingViews() {
    for (const tile of this.session.board.liveTiles()) {
      let tv = this.tileViews.get(tile.id);
      if (!tv || !tv.node.isValid) {
        tv = new TileView(this.boardLayer, tile);
        this.tileViews.set(tile.id, tv);
        const id = tile.id;
        tv.node.on(Node.TouchEventType.TOUCH_END, () => this.onTileTouch(id));
      } else {
        tv.moveTo(TileView.localPos(tile), 0.05);
      }
    }
  }

  private animateShuffle() {
    for (const [id, tv] of this.tileViews) {
      const tile = this.session.board.getTile(id);
      if (tile && tile.status !== 'removed' && tv.node.isValid) {
        tv.moveTo(TileView.localPos(tile), 0.4, undefined);
      }
    }
  }

  private updateExtraSlotVisual() {
    const extra = this.session.getExtraSlotMovesLeft();
    this.slotViews[BASE_SLOT_CAPACITY].node.active = extra > 0;
    if (!this.extraSlotBadge) {
      this.extraSlotBadge = createLabel('', { parent: this.node, x: 329, y: -588, size: 18, color: PALETTE.textLight, bold: false });
    }
    this.extraSlotBadge.string = extra > 0 ? `额外槽位 ${extra} 次` : '';
  }

  // ---------------- 道具 ----------------

  private onBooster(type: BoosterType) {
    if (!this.session || this.session.inputLocked) return;
    if (!this.session.canUseBooster()) {
      Toast.show(this.popLayer, `本关道具使用已达上限（${this.session.boosterLimit} 次）`);
      return;
    }
    if (this.gm.inventory.get(type) <= 0) {
      Toast.show(this.popLayer, '道具不足，可在商店购买或看广告领取');
      return;
    }
    this.gm.audio.play('click');
    switch (type) {
      case 'undo': {
        if (this.session.useUndo()) {
          this.gm.inventory.consume('undo');
          this.gm.progress.recordEvent('booster_used', 1);
          this.gm.syncCollectionToSave();
          this.gm.persistThrottled();
          this.refreshBoosterCounts();
        } else {
          Toast.show(this.popLayer, '没有可撤回的操作');
        }
        break;
      }
      case 'shuffle': {
        if (this.session.useShuffle(mulberry32(Date.now() & 0xffffffff))) {
          this.gm.inventory.consume('shuffle');
          this.gm.progress.recordEvent('booster_used', 1);
          this.gm.syncCollectionToSave();
          this.gm.persistThrottled();
          this.refreshBoosterCounts();
        }
        break;
      }
      case 'remove': {
        this.removeMode = true;
        this.refreshTileStates();
        Toast.show(this.popLayer, '选择一个可点击的物品移除');
        break;
      }
      case 'extra_slot': {
        if (this.session.useExtraSlot()) {
          this.gm.inventory.consume('extra_slot');
          this.gm.progress.recordEvent('booster_used', 1);
          this.gm.syncCollectionToSave();
          this.gm.persistThrottled();
          this.refreshBoosterCounts();
          this.updateExtraSlotVisual();
        } else {
          Toast.show(this.popLayer, '额外槽位生效中');
        }
        break;
      }
    }
  }

  private tryRemove(tileId: string) {
    if (this.session.useRemove(tileId)) {
      this.gm.inventory.consume('remove');
      this.gm.progress.recordEvent('booster_used', 1);
      this.gm.syncCollectionToSave();
      this.gm.persistThrottled();
      this.refreshBoosterCounts();
      this.removeMode = false;
      this.session.inputLocked = true;
      const tv = this.tileViews.get(tileId)!;
      this.fx.burst(tv.node.position.x, tv.node.position.y, 8);
      this.gm.audio.play('match');
      tv.playMatchOut(() => {
        this.session.inputLocked = false;
        if (this.session.state === 'VICTORY') this.onVictory();
        else if (this.session.state === 'FAILED') this.onFail();
      });
    } else {
      Toast.show(this.popLayer, '该物品当前不可移除');
    }
  }

  // ---------------- 胜负 ----------------

  private onVictory() {
    if (this.settled) return;
    this.settled = true;
    this.gm.audio.play('win');
    this.fx.celebrate();
    this.gm.persist();
    const stars = this.session.getStars();
    const result = this.gm.settleVictory(this.runId, this.levelId, this.session.maxCombo, stars);
    if (!result) {
      director.loadScene('home');
      return;
    }
    this.scheduleOnce(() => {
      new ChestUI(this.popLayer, this.gm, {
        levelId: this.levelId,
        stars,
        maxCombo: this.session.maxCombo,
        coins: result.total,
        xpGained: 20 + stars * 10,
        chest: { id: result.chestId, result: result.chestResult },
        onNext: () => director.loadScene('game'),
        onHome: () => director.loadScene('home'),
        onCollection: () => director.loadScene('collection'),
      });
    }, 0.9);
  }

  private onFail() {
    if (this.settled) return;
    this.settled = true;
    this.slotViews.forEach((sv) => sv.playShake());
    this.gm.audio.play('lose');
    this.scheduleOnce(() => {
      const popup = new FailUI(this.popLayer, {
        reviveCost: this.gm.balance.reviveCost,
        adAvailable: this.gm.ad.canShowRevive(),
        onRevive: (close) => {
          const rid = `revive_${this.runId}`;
          void this.gm.ad.showRewardedAd('revive', rid).then((r) => {
            if (r.completed && this.gm.rewards.grant(`grant_${rid}`)) {
              this.gm.ad.reportRewarded(rid);
              this.doRevive();
              close();
            } else {
              Toast.show(this.popLayer, '广告未完成，未复活');
              this.settled = false;
              close();
            }
          });
        },
        onReviveWithCoins: (close) => {
          if (this.gm.currency.spend(this.gm.balance.reviveCost, 'revive')) {
            this.gm.persist();
            this.doRevive();
            close();
          } else {
            Toast.show(this.popLayer, '金币不足');
            this.settled = false;
          }
        },
        onRestart: () => director.loadScene('game'),
        onHome: () => director.loadScene('home'),
      });
      void popup;
    }, 0.5);
  }

  /** 复活：撤销上一步（槽位回退），且只恢复一次（幂等由 settled/revive 限制保证） */
  private doRevive() {
    this.settled = false;
    if (!this.session.undo()) {
      Toast.show(this.popLayer, '复活失败，请重新开始');
      return;
    }
    // 额外赠送 1 个临时槽位机会，缓解死局
    if (!this.session.slots.hasExtraSlot) this.session.useExtraSlot();
    this.session.inputLocked = false;
    this.refreshTileStates();
    this.updateExtraSlotVisual();
    // 重建槽位显示（与逻辑同步）
    this.syncSlots();
    Toast.show(this.popLayer, '复活成功！');
    this.gm.audio.play('unlock');
  }
}
