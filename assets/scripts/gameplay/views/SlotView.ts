import { Node, Sprite, UITransform, Vec3, tween } from 'cc';
import { createSprite, loadSpriteFrame } from '../../ui/UIFactory';

/** 收纳槽格子视图：空格底 + 当前物品精灵 */
export class SlotView {
  node: Node;
  itemNode: Node | null = null;
  tileId: string | null = null;

  constructor(parent: Node, x: number, y: number, size = 84) {
    this.node = new Node('slot');
    const ut = this.node.addComponent(UITransform);
    ut.setContentSize(size, size);
    const bg = this.node.addComponent(Sprite);
    bg.sizeMode = Sprite.SizeMode.CUSTOM;
    parent.addChild(this.node);
    this.node.setPosition(x, y, 0);
    loadSpriteFrame('textures/ui/slot_cell', (sf) => {
      if (sf && this.node.isValid) bg.spriteFrame = sf;
    });
  }

  /** 放入物品（带弹入动画） */
  setItem(type: string, tileId: string) {
    this.clearItemImmediate();
    this.tileId = tileId;
    const node = createSprite(`textures/items/${type}`, { parent: this.node, w: 78, h: 78, name: `slot_${type}` });
    node.setScale(0.2, 0.2, 1);
    this.itemNode = node;
    tween(node).to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
  }

  /** 三消出场动画 */
  playMatchOut(onDone: () => void) {
    const node = this.itemNode;
    this.itemNode = null;
    this.tileId = null;
    if (!node) {
      onDone();
      return;
    }
    tween(node)
      .to(0.12, { scale: new Vec3(1.35, 1.35, 1) })
      .to(0.14, { scale: new Vec3(0, 0, 1) })
      .call(() => {
        node.destroy();
        onDone();
      })
      .start();
  }

  clearItemImmediate() {
    if (this.itemNode) {
      this.itemNode.destroy();
      this.itemNode = null;
    }
    this.tileId = null;
  }

  /** 失败震动 */
  playShake() {
    const p = this.node.position.clone();
    tween(this.node)
      .to(0.05, { position: new Vec3(p.x + 6, p.y, 0) })
      .to(0.05, { position: new Vec3(p.x - 6, p.y, 0) })
      .to(0.05, { position: new Vec3(p.x, p.y, 0) })
      .start();
  }
}
