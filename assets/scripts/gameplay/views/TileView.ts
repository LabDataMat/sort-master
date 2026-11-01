import { Node, Sprite, UITransform, UIOpacity, Vec3, tween, Color } from 'cc';
import type { TileData } from '../../level/LevelTypes';
import { createSprite, loadSpriteFrame } from '../../ui/UIFactory';
import { TILE_SIZE } from '../../core/GameConfig';

/**
 * 物品视图：只负责表现（纹理/冰冻/锁定/可点击变暗），不含玩法逻辑。
 */
export class TileView {
  node: Node;
  tileId: string;
  type: string;
  private sprite: Sprite;
  private opacity: UIOpacity;
  private frozenNode: Node | null = null;
  private lockedNode: Node | null = null;
  private baseScale = 1;

  constructor(parent: Node, tile: TileData) {
    this.tileId = tile.id;
    this.type = tile.type;
    this.node = new Node(`tile_${tile.id}`);
    const ut = this.node.addComponent(UITransform);
    this.baseScale = (tile.w / TILE_SIZE) * 0.98;
    ut.setContentSize(tile.w, tile.h);
    this.node.addComponent(UIOpacity);
    this.opacity = this.node.getComponent(UIOpacity)!;

    // 接触阴影（先创建 → 渲染在物品下方）
    const shadow = createSprite('textures/ui/shadow_soft', {
      parent: this.node, w: 92, h: 46, y: -34, name: 'contact_shadow',
    });
    const shadowOp = shadow.addComponent(UIOpacity);
    shadowOp.opacity = 150;

    // 物品本体（子节点，保证阴影在下）
    const art = new Node('art');
    art.addComponent(UITransform).setContentSize(tile.w, tile.h);
    this.node.addChild(art);
    this.sprite = art.addComponent(Sprite);
    this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    this.sprite.type = Sprite.Type.SIMPLE;

    parent.addChild(this.node);
    loadSpriteFrame(`textures/items/${tile.type}`, (sf) => {
      if (sf && this.node.isValid) this.sprite.spriteFrame = sf;
    });
    this.node.setPosition(this.toLocal(tile.x, tile.y, tile.w, tile.h), 0);
    this.node.setScale(this.baseScale, this.baseScale, 1);

    // 自然堆放的轻微旋转（围绕中心，不影响逻辑遮挡与命中）
    const seed = (tile.id.charCodeAt(1) || 0) * 37 + (tile.id.charCodeAt(2) || 0) * 11 + (tile.id.charCodeAt(3) || 0);
    this.node.angle = ((seed % 9) - 4) * 1.75 + 0.4;
    void Color;
  }

  /** 关卡坐标(左上原点) → 节点局部坐标(中心原点) */
  static localPos(tile: { x: number; y: number; w: number; h: number }): Vec3 {
    return new Vec3(tile.x + tile.w / 2 - 375, 667 - (tile.y + tile.h / 2), 0);
  }

  private toLocal(x: number, y: number, w: number, h: number): number {
    return x + w / 2 - 375;
  }

  get y(): number {
    return this.node.position.y;
  }

  setClickable(ok: boolean) {
    this.opacity.opacity = ok ? 255 : 110;
  }

  showFrozen(on: boolean) {
    if (on && !this.frozenNode) {
      this.frozenNode = createSprite('textures/ui/frost_overlay', { parent: this.node, w: TILE_SIZE, h: TILE_SIZE, name: 'frozen' });
    } else if (!on && this.frozenNode) {
      this.frozenNode.destroy();
      this.frozenNode = null;
    }
  }

  showLocked(on: boolean) {
    if (on && !this.lockedNode) {
      this.lockedNode = createSprite('textures/ui/lock_overlay', { parent: this.node, w: TILE_SIZE * 0.6, h: TILE_SIZE * 0.6, name: 'locked', x: 0, y: 0 });
    } else if (!on && this.lockedNode) {
      this.lockedNode.destroy();
      this.lockedNode = null;
    }
  }

  /** 点击反馈 */
  playTap() {
    tween(this.node)
      .to(0.05, { scale: new Vec3(this.baseScale * 0.88, this.baseScale * 0.88, 1) })
      .to(0.08, { scale: new Vec3(this.baseScale, this.baseScale, 1) })
      .start();
  }

  /** 进入槽位动画（弹性），完成后回调 */
  flyTo(dest: Vec3, dur: number, onDone: () => void) {
    tween(this.node)
      .to(dur, { position: dest }, { easing: 'backIn' })
      .call(onDone)
      .start();
  }

  /** 消除动画：缩放消失 */
  playMatchOut(onDone: () => void) {
    tween(this.node)
      .to(0.22, { scale: new Vec3(this.baseScale * 1.25, this.baseScale * 1.25, 1) })
      .to(0.16, { scale: new Vec3(0, 0, 1), opacity: 0 })
      .call(() => {
        this.node.destroy();
        onDone();
      })
      .start();
  }

  moveTo(pos: Vec3, dur: number, onDone?: () => void) {
    tween(this.node).to(dur, { position: pos }, { easing: 'sineInOut' }).call(() => onDone?.()).start();
  }

  destroy() {
    this.node.destroy();
  }
}
