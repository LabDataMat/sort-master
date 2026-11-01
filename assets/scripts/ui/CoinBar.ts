import { Node, Label } from 'cc';
import { createSprite, createLabel } from './UIFactory';
import { PALETTE } from '../core/GameConfig';
import type { GameManager } from '../GameManager';

/** 金币栏：金币图标 + 余额（自动响应变化 + 飞入动画钩子） */
export class CoinBar {
  node: Node;
  private label: Label;

  constructor(parent: Node, gm: GameManager, x = 0, y = 0) {
    this.node = new Node('coin_bar');
    parent.addChild(this.node);
    this.node.setPosition(x, y, 0);
    createSprite('textures/ui/coin', { parent: this.node, x: -54, w: 52, h: 52 });
    this.label = createLabel(String(gm.currency.balance), { parent: this.node, x: 30, size: 30, color: PALETTE.text, bold: true });
    gm.bus.on('coins:changed', ({ coins }) => {
      if (this.label && this.label.isValid) this.label.string = String(coins);
    });
  }

  get worldPos(): Node {
    return this.node;
  }
}
