import { Node, UITransform, Vec3, tween, UIOpacity, Label, Color } from 'cc';
import { createSprite, createLabel, loadSpriteFrame } from '../../ui/UIFactory';
import { PALETTE } from '../../core/GameConfig';

/**
 * 特效层：粒子消散（对象池）、金币飞入、Combo 弹出。
 * 粒子使用对象池，避免动画期间无限创建对象。
 */
export class FXLayer {
  node: Node;
  private pool: Node[] = [];
  private active = new Set<Node>();
  private comboLabel: Label | null = null;

  constructor(parent: Node) {
    this.node = new Node('fx_layer');
    this.node.addComponent(UITransform).setContentSize(750, 1334);
    parent.addChild(this.node);
    this.node.setSiblingIndex(999);
    // 预热 20 个粒子
    for (let i = 0; i < 20; i++) this.pool.push(this.createParticle());
  }

  private createParticle(): Node {
    const n = new Node('fx_particle');
    n.addComponent(UITransform).setContentSize(28, 28);
    n.addComponent(UIOpacity);
    const sp = n.addComponent('cc.Sprite') as any;
    sp.sizeMode = 'CUSTOM';
    sp.type = 0;
    n.active = false;
    this.node.addChild(n);
    return n;
  }

  private obtain(tex: string, cb: (n: Node) => void) {
    let n = this.pool.pop();
    if (!n) {
      if (this.active.size > 60) return; // 上限保护
      n = this.createParticle();
    }
    n.active = true;
    const sp = n.getComponent('cc.Sprite') as any;
    loadSpriteFrame(tex, (sf) => {
      if (sf && n!.isValid) {
        sp.spriteFrame = sf;
        cb(n!);
      }
    });
  }

  /** 在 (x,y) 产生消散粒子 */
  burst(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) {
      this.obtain(i % 2 === 0 ? 'textures/ui/particle_star' : 'textures/ui/particle_circle', (n) => {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const dist = 60 + Math.random() * 70;
        n.setPosition(x, y, 0);
        n.setScale(1, 1, 1);
        n.getComponent(UIOpacity)!.opacity = 255;
        this.active.add(n);
        const dest = new Vec3(x + Math.cos(ang) * dist, y + Math.sin(ang) * dist, 0);
        tween(n)
          .parallel(
            tween(n).to(0.45, { position: dest }, { easing: 'sineOut' }),
            tween(n).to(0.45, { scale: new Vec3(0.2, 0.2, 1) }),
            tween(n.getComponent(UIOpacity)!).to(0.45, { opacity: 0 })
          )
          .call(() => {
            n.active = false;
            this.active.delete(n);
            if (this.pool.length < 30) this.pool.push(n);
            else n.destroy();
          })
          .start();
      });
    }
  }

  /** 金币飞入目标节点 */
  coinFly(from: Vec3, toNode: Node, count = 6, onDone?: () => void) {
    let done = 0;
    for (let i = 0; i < count; i++) {
      const n = createSprite('textures/ui/coin', { parent: this.node, w: 36, h: 36, name: 'coin_fly' });
      n.setPosition(from.x + (Math.random() - 0.5) * 80, from.y + (Math.random() - 0.5) * 60, 0);
      n.setScale(0.6, 0.6, 1);
      const target = new Vec3(toNode.worldPosition.x, toNode.worldPosition.y, 0);
      const dest = toNode.getParent()!.getComponent(UITransform)!.convertToNodeSpaceAR(target);
      tween(n)
        .delay(i * 0.07)
        .to(0.5, { position: dest }, { easing: 'sineIn' })
        .to(0.1, { scale: new Vec3(0.3, 0.3, 1) })
        .call(() => {
          n.destroy();
          if (++done >= count) onDone?.();
        })
        .start();
    }
  }

  /** Combo 弹出 */
  showCombo(combo: number) {
    if (combo < 2) return;
    if (!this.comboLabel) {
      const lb = createLabel('', { parent: this.node, x: 0, y: 200, size: 64, color: PALETTE.primaryDark, bold: true, name: 'combo' });
      this.comboLabel = lb;
      this.comboLabel.node.addComponent(UIOpacity);
    }
    const lb = this.comboLabel;
    lb.string = `COMBO x${combo}!`;
    lb.node.setScale(0.4, 0.4, 1);
    lb.node.getComponent(UIOpacity)!.opacity = 255;
    tween(lb.node)
      .to(0.15, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'backOut' })
      .delay(0.5)
      .to(0.25, { scale: new Vec3(1, 1, 1) })
      .start();
    tween(lb.node.getComponent(UIOpacity)!).delay(0.7).to(0.3, { opacity: 0 }).start();
  }

  /** 庆祝彩带 */
  celebrate() {
    for (let i = 0; i < 14; i++) {
      this.obtain(i % 2 === 0 ? 'textures/ui/particle_star' : 'textures/ui/particle_circle', (n) => {
        n.setPosition(-300 + Math.random() * 600, 700, 0);
        n.setScale(0.8 + Math.random() * 0.8, 0.8 + Math.random() * 0.8, 1);
        n.getComponent(UIOpacity)!.opacity = 255;
        this.active.add(n);
        tween(n)
          .to(1.2 + Math.random() * 0.6, { position: new Vec3(n.position.x - 200 + Math.random() * 400, -700, 0) }, { easing: 'sineIn' })
          .call(() => {
            n.active = false;
            this.active.delete(n);
            if (this.pool.length < 30) this.pool.push(n);
            else n.destroy();
          })
          .start();
      });
    }
  }
}
