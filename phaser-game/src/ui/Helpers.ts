import Phaser from 'phaser';

/** 按最大宽高等比缩放添加图片（不拉伸变形） */
export function addFittedImage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: string,
  maxW: number,
  maxH: number,
): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, key);
  const s = Math.min(maxW / img.width, maxH / img.height);
  img.setScale(s);
  return img;
}

/** 轻提示 */
export function showToast(scene: Phaser.Scene, message: string, y = 980): void {
  const container = scene.add.container(375, y).setDepth(3000);
  const text = scene.add
    .text(0, 0, message, {
      fontFamily: '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif',
      fontSize: '28px',
      color: '#ffffff',
    })
    .setOrigin(0.5);

  const w = Math.max(240, text.width + 64);
  const g = scene.add.graphics();
  g.fillStyle(0x2a1c13, 0.9);
  g.fillRoundedRect(-w / 2, -32, w, 64, 32);

  container.add([g, text]);
  container.setAlpha(0);

  scene.tweens.add({ targets: container, alpha: 1, y: y - 12, duration: 150, ease: 'Sine.easeOut' });
  scene.time.delayedCall(1050, () => {
    scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 260,
      onComplete: () => container.destroy(),
    });
  });
}
