import { Node, UITransform, Vec3, tween } from 'cc';
import { createMask, createSprite, createLabel, makeButton, loadSpriteFrame } from './UIFactory';
import { PALETTE } from '../core/GameConfig';

/** 弹窗基类：遮罩 + 面板 + 标题 + 弹入动画。所有弹窗统一规范。 */
export class BasePopup {
  root: Node;
  panel: Node;
  protected closed = false;
  private onCloseCb?: () => void;

  constructor(parent: Node, title: string, panelW = 620, panelH = 640) {
    this.root = new Node(`popup_${title}`);
    const rt = this.root.addComponent(UITransform);
    rt.setContentSize(750, 1334);
    parent.addChild(this.root);
    this.root.setSiblingIndex(parent.children.length - 1);

    createMask(this.root);
    // 阻断点击穿透
    const blocker = new Node('blocker');
    const but = blocker.addComponent(UITransform);
    but.setContentSize(750, 1334);
    blocker.addComponent('cc.BlockInputEvents');
    this.root.addChild(blocker);

    this.panel = createSprite('textures/ui/panel', { parent: this.root, w: panelW, h: panelH, name: 'panel' });
    createLabel(title, { parent: this.panel, y: panelH / 2 - 74, size: 40, color: PALETTE.primaryDark, bold: true });

    this.panel.setScale(0.3, 0.3, 1);
    tween(this.panel).to(0.22, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
  }

  /** 面板按钮：secondary=false 主色 / true 绿色 */
  addButton(text: string, y: number, cb: () => void, secondary = false, w = 400, h = 92) {
    const btn = createSprite(secondary ? 'textures/ui/btn_secondary' : 'textures/ui/btn_primary', {
      parent: this.panel, w, h, x: 0, y, name: `btn_${text}`,
    });
    createLabel(text, { parent: btn, y: 4, size: 32, color: '#FFFFFF' });
    makeButton(btn, cb);
    return btn;
  }

  iconButton(tex: string, x: number, y: number, size: number, cb?: () => void) {
    const btn = createSprite(tex, { parent: this.panel, w: size, h: size, x, y });
    if (cb) makeButton(btn, cb);
    return btn;
  }

  onClose(cb: () => void) {
    this.onCloseCb = cb;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    tween(this.root)
      .to(0.16, { scale: new Vec3(1, 1, 1) })
      .call(() => {
        this.root.destroy();
        this.onCloseCb?.();
      })
      .start();
  }
}
