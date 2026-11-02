import Phaser from 'phaser';
import { COLORS, FONT, H, W } from '../theme';
import { save } from '../services';
import { REWARD, skinById } from '../core/RewardConfig';
import { createButton } from '../ui/Button';
import { showToast } from '../ui/Helpers';
import { playSfx } from '../audio';

const BOOSTERS: { kind: 'undo' | 'hint' | 'shuffle'; name: string; icon: string }[] = [
  { kind: 'undo', name: '撤回', icon: 'ui_icon_undo' },
  { kind: 'hint', name: '提示', icon: 'ui_icon_star' },
  { kind: 'shuffle', name: '洗牌', icon: 'ui_icon_shuffle' },
];

/** 商店：金币购买道具与桌面皮肤。 */
export class ShopScene extends Phaser.Scene {
  private layer!: Phaser.GameObjects.Container;
  private coinText!: Phaser.GameObjects.Text;

  constructor() {
    super('Shop');
  }

  create(): void {
    this.add.image(W / 2, H / 2, 'ui_bg_home').setDisplaySize(W, H);

    createButton(this, 96, 76, {
      width: 140,
      height: 72,
      label: '返回',
      fontSize: 26,
      fill: COLORS.panel,
      textColor: '#523625',
      onClick: () => this.scene.start('Menu'),
    });

    this.add
      .text(W / 2, 76, '商店', { fontFamily: FONT, fontSize: '38px', color: '#523625', fontStyle: 'bold' })
      .setOrigin(0.5);

    this.add.image(660, 76, 'ui_coin').setDisplaySize(36, 36);
    this.coinText = this.add
      .text(636, 76, String(save.data.coins), { fontFamily: FONT, fontSize: '26px', color: '#523625' })
      .setOrigin(1, 0.5);

    this.add
      .text(60, 150, '道具', { fontFamily: FONT, fontSize: '28px', color: '#523625', fontStyle: 'bold' })
      .setOrigin(0, 0.5);

    this.add
      .text(60, 540, '桌面皮肤', { fontFamily: FONT, fontSize: '28px', color: '#523625', fontStyle: 'bold' })
      .setOrigin(0, 0.5);

    this.layer = this.add.container(0, 0);
    this.refresh();
  }

  private refresh(): void {
    this.coinText.setText(String(save.data.coins));
    this.layer.removeAll(true);

    // 道具卡片
    BOOSTERS.forEach((b, i) => {
      const x = 140 + i * 235;
      const y = 330;
      const price = REWARD.shop.boosters[b.kind];
      const card = this.makeCard(x, y, 210, 220);
      this.layer.add(card);

      const icon = this.add.image(x, y - 52, b.icon).setDisplaySize(64, 64);
      const name = this.add
        .text(x, y + 8, b.name, { fontFamily: FONT, fontSize: '28px', color: '#523625' })
        .setOrigin(0.5);
      const owned = this.add
        .text(x, y + 46, `持有 ${save.boosterCount(b.kind)}`, {
          fontFamily: FONT,
          fontSize: '20px',
          color: '#7b6050',
        })
        .setOrigin(0.5);
      const buy = createButton(this, x, y + 92, {
        width: 170,
        height: 58,
        label: `${price} 金币`,
        fontSize: 22,
        onClick: () => this.buyBooster(b.kind, price),
      });

      this.layer.add([icon, name, owned, buy]);
    });

    // 皮肤卡片
    REWARD.shop.skins.forEach((skin, i) => {
      const x = 140 + i * 235;
      const y = 730;
      const owned = save.ownsSkin(skin.id);
      const equipped = save.data.skin === skin.id;

      const card = this.makeCard(x, y, 210, 300);
      this.layer.add(card);

      // 预览：用皮肤色块模拟桌面
      const preview = this.add.graphics();
      preview.fillStyle(skin.tint, 1);
      preview.fillRoundedRect(x - 80, y - 110, 160, 90, 16);
      preview.lineStyle(2, 0xc9b89f, 1);
      preview.strokeRoundedRect(x - 80, y - 110, 160, 90, 16);

      const name = this.add
        .text(x, y + 2, skin.name, { fontFamily: FONT, fontSize: '26px', color: '#523625' })
        .setOrigin(0.5);
      const desc = this.add
        .text(x, y + 38, skin.desc, {
          fontFamily: FONT,
          fontSize: '18px',
          color: '#7b6050',
          align: 'center',
          wordWrap: { width: 180 },
        })
        .setOrigin(0.5, 0);

      let label = `${skin.price} 金币`;
      if (equipped) label = '使用中';
      else if (owned) label = '使用';

      const btn = createButton(this, x, y + 112, {
        width: 170,
        height: 58,
        label,
        fontSize: 22,
        fill: equipped ? COLORS.green : COLORS.orange,
        onClick: () => this.onSkin(skin.id, skin.price),
      });

      this.layer.add([preview, name, desc, btn]);
    });
  }

  private makeCard(x: number, y: number, w: number, h: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 6, w, h, 24);
    g.fillStyle(0xfffaf2, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 24);
    g.lineStyle(2, 0xe3d7c6, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 24);
    return g;
  }

  private buyBooster(kind: 'undo' | 'hint' | 'shuffle', price: number): void {
    if (!save.spendCoins(price)) {
      showToast(this, '金币不足');
      return;
    }
    save.addBooster(kind, 1);
    playSfx(this, 'audio_coin');
    showToast(this, `已购买 1 个${kind === 'undo' ? '撤回' : kind === 'hint' ? '提示' : '洗牌'}`);
    this.refresh();
  }

  private onSkin(id: string, price: number): void {
    if (save.ownsSkin(id)) {
      save.equipSkin(id);
      playSfx(this, 'audio_click');
      showToast(this, `已装备 ${skinById(id).name}`);
      this.refresh();
      return;
    }

    if (!save.buySkin(id, price)) {
      showToast(this, '金币不足');
      return;
    }
    save.equipSkin(id);
    playSfx(this, 'audio_coin');
    showToast(this, `已解锁并装备 ${skinById(id).name}`);
    this.refresh();
  }
}
