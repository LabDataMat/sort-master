import {
  Node, Sprite, SpriteFrame, Label, Color, UITransform, Widget, resources,
  UIOpacity, ImageAsset, Texture2D, SpriteAtlas, Vec3, tween, Texture,
} from 'cc';
import { PALETTE } from '../core/GameConfig';

/**
 * UI 工厂：以代码方式构建界面节点，保证三个场景的统一设计规范。
 * 所有纹理从 resources 动态加载。
 */

const frameCache = new Map<string, SpriteFrame>();

export function loadSpriteFrame(path: string, cb: (sf: SpriteFrame | null) => void) {
  const cached = frameCache.get(path);
  if (cached) {
    cb(cached);
    return;
  }
  resources.load(`${path}/spriteFrame`, SpriteFrame, (err, sf) => {
    if (err || !sf) {
      // 兜底：加载 ImageAsset 自行构造
      resources.load(`${path}/texture`, ImageAsset, (err2, img) => {
        if (err2 || !img) {
          console.warn('[UIFactory] texture missing:', path);
          cb(null);
          return;
        }
        const texture = new Texture2D();
        texture.image = img;
        const frame = new SpriteFrame();
        frame.texture = texture;
        frameCache.set(path, frame);
        cb(frame);
      });
      return;
    }
    frameCache.set(path, sf);
    cb(sf);
  });
}

export interface SpriteOpts {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  parent?: Node;
  name?: string;
  color?: Color;
}

export function createSprite(texPath: string, opts: SpriteOpts = {}): Node {
  const node = new Node(opts.name ?? texPath);
  const ut = node.addComponent(UITransform);
  ut.setContentSize(opts.w ?? 100, opts.h ?? 100);
  const sp = node.addComponent(Sprite);
  sp.sizeMode = Sprite.SizeMode.CUSTOM;
  sp.type = Sprite.Type.SIMPLE;
  if (opts.color) sp.color = opts.color;
  if (opts.parent) opts.parent.addChild(node);
  node.setPosition(opts.x ?? 0, opts.y ?? 0, 0);
  loadSpriteFrame(texPath, (sf) => {
    if (sf && node.isValid) sp.spriteFrame = sf;
  });
  return node;
}

export interface LabelOpts {
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  bold?: boolean;
  parent?: Node;
  name?: string;
  overflow?: 'none' | 'clamp' | 'shrink';
  width?: number;
}

export function createLabel(text: string, opts: LabelOpts = {}): Label {
  const node = new Node(opts.name ?? `label_${text}`);
  const ut = node.addComponent(UITransform);
  if (opts.width) ut.setContentSize(opts.width, opts.size ?? 32);
  const lb = node.addComponent(Label);
  lb.string = text;
  lb.fontSize = opts.size ?? 32;
  lb.lineHeight = (opts.size ?? 32) + 6;
  lb.color = new Color().fromHEX(opts.color ?? PALETTE.text);
  lb.isBold = opts.bold ?? true;
  if (opts.overflow) {
    lb.overflow = opts.overflow === 'clamp' ? Label.Overflow.CLAMP : opts.overflow === 'shrink' ? Label.Overflow.SHRINK : Label.Overflow.NONE;
  }
  if (opts.parent) opts.parent.addChild(node);
  node.setPosition(opts.x ?? 0, opts.y ?? 0, 0);
  return lb;
}

/** 触摸按钮：按下缩放反馈 + 回调（防连点间隔） */
export function makeButton(node: Node, onClick: () => void, cooldownMs = 350) {
  let last = 0;
  node.on(Node.TouchEventType.TOUCH_START, () => {
    tween(node).to(0.05, { scale: new Vec3(0.92, 0.92, 1) }).start();
  });
  node.on(Node.TouchEventType.TOUCH_END, () => {
    tween(node).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
    const now = Date.now();
    if (now - last < cooldownMs) return;
    last = now;
    onClick();
  });
  node.on(Node.TouchEventType.TOUCH_CANCEL, () => {
    tween(node).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
  });
}

/** 全屏背景 */
export function createBackground(parent: Node, tex: string): Node {
  const node = createSprite(tex, { parent, w: 750, h: 1334, name: 'background' });
  const ut = node.getComponent(UITransform)!;
  ut.setContentSize(750, 1334);
  const widget = node.addComponent(Widget);
  widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
  widget.top = widget.bottom = widget.left = widget.right = 0;
  return node;
}

/** 半透明遮罩层（Graphics 纯色绘制，不依赖 spriteFrame） */
export function createMask(parent: Node, alpha = 150): Node {
  const node = new Node('mask');
  const ut = node.addComponent(UITransform);
  ut.setContentSize(750, 1334);
  const g = node.addComponent('cc.Graphics') as any;
  g.fillColor = new Color(30, 22, 12, alpha);
  g.rect(-375, -667, 750, 1334);
  g.fill();
  parent.addChild(node);
  const widget = node.addComponent(Widget);
  widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
  widget.top = widget.bottom = widget.left = widget.right = 0;
  return node;
}

/** 阻断触摸的空层 */
export function createBlocker(parent: Node): Node {
  const node = new Node('blocker');
  const ut = node.addComponent(UITransform);
  ut.setContentSize(750, 1334);
  node.addComponent('cc.BlockInputEvents');
  parent.addChild(node);
  node.setSiblingIndex(parent.children.length - 2);
  return node;
}
