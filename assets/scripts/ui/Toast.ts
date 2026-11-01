import { Node, UITransform, Label, UIOpacity, Vec3, tween, Color } from 'cc';
import { createLabel } from './UIFactory';
import { PALETTE } from '../core/GameConfig';

/** 轻提示 Toast（自动消失，复用单一实例） */
export class Toast {
  private static node: Node | null = null;
  private static label: Label | null = null;

  static show(parent: Node, msg: string, dur = 1.6) {
    if (!Toast.node || !Toast.node.isValid) {
      const n = new Node('toast');
      n.addComponent(UITransform).setContentSize(500, 72);
      const op = n.addComponent(UIOpacity);
      n.addComponent('cc.Graphics') as any;
      const g = n.getComponent('cc.Graphics') as any;
      g.fillColor = new Color(40, 32, 22, 210);
      g.roundRect(-250, -36, 500, 72, 24);
      g.fill();
      n.setPosition(0, -300, 0);
      parent.addChild(n);
      n.setSiblingIndex(9999);
      Toast.node = n;
      Toast.label = createLabel('', { parent: n, size: 26, color: '#FFFFFF', width: 480, overflow: 'shrink' });
      Toast.label.node.getComponent(UIOpacity) || n.addComponent(UIOpacity);
      void op;
    }
    const n = Toast.node!;
    Toast.label!.string = msg;
    n.setPosition(0, -300, 0);
    const op = n.getComponent(UIOpacity)!;
    op.opacity = 255;
    n.setScale(1, 1, 1);
    tween(n)
      .to(0.12, { position: new Vec3(0, -240, 0) })
      .delay(dur)
      .to(0.25, { position: new Vec3(0, -220, 0) })
      .start();
    tween(op).delay(dur + 0.1).to(0.2, { opacity: 0 }).start();
  }
}
