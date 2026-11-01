import Phaser from 'phaser';
import { COLORS, FONT } from '../theme';
import { playSfx } from '../audio';

export interface ButtonOptions {
  width: number;
  height: number;
  label: string;
  fontSize?: number;
  fill?: number;
  textColor?: string;
  radius?: number;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * 圆角按钮（Graphics + Text）。
 * 使用矢量绘制而非拉伸位图，保证任意尺寸下边缘清晰、风格统一。
 */
export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: ButtonOptions,
): Phaser.GameObjects.Container {
  const w = opts.width;
  const h = opts.height;
  const r = opts.radius ?? Math.min(h / 2, 46);
  const fill = opts.fill ?? COLORS.orange;

  const container = scene.add.container(x, y);
  const g = scene.add.graphics();

  const draw = (pressed: boolean) => {
    g.clear();
    const dy = pressed ? 3 : 0;

    // 投影
    g.fillStyle(0x000000, 0.14);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 6, w, h, r);

    // 主体
    g.fillStyle(fill, opts.disabled ? 0.55 : 1);
    g.fillRoundedRect(-w / 2, -h / 2 + dy, w, h, r);

    // 顶部高光
    g.fillStyle(0xffffff, opts.disabled ? 0.06 : 0.2);
    g.fillRoundedRect(-w / 2 + 8, -h / 2 + 6 + dy, w - 16, h * 0.4, r * 0.65);

    // 底部内阴影
    g.fillStyle(0x000000, 0.08);
    g.fillRoundedRect(-w / 2 + 8, h / 2 - h * 0.22 + dy, w - 16, h * 0.16, r * 0.5);
  };

  draw(false);

  const text = scene.add
    .text(0, 0, opts.label, {
      fontFamily: FONT,
      fontSize: `${opts.fontSize ?? 34}px`,
      color: opts.textColor ?? '#ffffff',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  container.add([g, text]);
  container.setSize(w, h);

  if (opts.disabled) {
    return container;
  }

  container.setInteractive(
    new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
    Phaser.Geom.Rectangle.Contains,
  );

  container.on('pointerover', () => {
    scene.tweens.add({ targets: container, scale: 1.04, duration: 90, ease: 'Sine.easeOut' });
  });
  container.on('pointerout', () => {
    scene.tweens.add({ targets: container, scale: 1, duration: 90, ease: 'Sine.easeOut' });
    draw(false);
  });
  container.on('pointerdown', () => {
    draw(true);
    scene.tweens.add({ targets: container, scale: 0.96, duration: 70, ease: 'Sine.easeOut' });
  });
  container.on('pointerup', () => {
    draw(false);
    scene.tweens.add({ targets: container, scale: 1, duration: 90, ease: 'Sine.easeOut' });
    playSfx(scene, 'audio_click');
    opts.onClick();
  });

  return container;
}

/** 圆形图标按钮（用于暂停、设置等） */
export function createIconButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  iconKey: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();

  g.fillStyle(0x000000, 0.12);
  g.fillCircle(2, 4, size / 2);
  g.fillStyle(COLORS.panel, 1);
  g.fillCircle(0, 0, size / 2);
  g.lineStyle(2, COLORS.brown, 0.12);
  g.strokeCircle(0, 0, size / 2);

  const icon = scene.add.image(0, 0, iconKey).setDisplaySize(size * 0.56, size * 0.56);

  container.add([g, icon]);
  container.setSize(size, size);
  container.setInteractive(new Phaser.Geom.Circle(0, 0, size / 2), Phaser.Geom.Circle.Contains);

  container.on('pointerdown', () => scene.tweens.add({ targets: container, scale: 0.92, duration: 70 }));
  container.on('pointerup', () => {
    scene.tweens.add({ targets: container, scale: 1, duration: 90 });
    playSfx(scene, 'audio_click');
    onClick();
  });

  return container;
}
