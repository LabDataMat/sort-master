import { Node } from 'cc';
import { BasePopup } from './BasePopup';
import { createLabel, createSprite, makeButton } from './UIFactory';
import { PALETTE } from '../core/GameConfig';
import type { BoosterType } from '../core/GameConfig';
import type { GameManager } from '../GameManager';
import { AD_COIN_REWARD } from '../GameManager';

const BOOSTER_META: Record<BoosterType, { name: string; icon: string; desc: string }> = {
  undo: { name: '撤回', icon: 'textures/ui/icon_undo', desc: '撤销上一步操作' },
  shuffle: { name: '洗牌', icon: 'textures/ui/icon_shuffle', desc: '重新排列场上物品' },
  remove: { name: '移除', icon: 'textures/ui/icon_remove', desc: '移除一个可点击物品' },
  extra_slot: { name: '额外槽位', icon: 'textures/ui/icon_slot', desc: '临时增加 1 个槽位' },
};

/** 道具入口弹窗：购买（金币）/ 看广告免费领取 */
export class BoosterShopUI extends BasePopup {
  constructor(parent: Node, gm: GameManager, onChanged: () => void, toast: (msg: string) => void) {
    super(parent, '道具商店', 660, 780);

    const types: BoosterType[] = ['undo', 'shuffle', 'remove', 'extra_slot'];
    types.forEach((t, i) => {
      const y = 160 - i * 112;
      const meta = BOOSTER_META[t];
      createSprite(meta.icon, { parent: this.panel, x: -230, y, w: 72, h: 72 });
      createLabel(meta.name, { parent: this.panel, x: -130, y: y + 16, size: 28, color: PALETTE.text });
      createLabel(meta.desc, { parent: this.panel, x: -130, y: y - 18, size: 20, color: PALETTE.textLight, bold: false });
      createLabel(`持有 ${gm.inventory.get(t)}`, { parent: this.panel, x: 60, y, size: 24, color: PALETTE.text });

      const price = gm.balance.boosterPrices[t];
      const buy = createSprite('textures/ui/btn_primary', { parent: this.panel, x: 190, y, w: 180, h: 66 });
      createLabel(`${price} 金币`, { parent: buy, y: 3, size: 22, color: '#FFFFFF' });
      makeButton(buy, () => {
        if (gm.buyBooster(t)) {
          gm.audio.play('coin');
          toast('购买成功');
          onChanged();
          this.close();
        } else {
          toast('金币不足');
        }
      });
    });

    // 广告免费领取入口（booster 广告位）
    const adBtn = createSprite('textures/ui/btn_secondary', { parent: this.panel, x: 0, y: -270, w: 420, h: 84 });
    createLabel(`看视频 免费领道具 +${AD_COIN_REWARD} 金币`, { parent: adBtn, y: 3, size: 22, color: '#FFFFFF' });
    makeButton(adBtn, () => {
      const rid = `ad_shop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      gm.claimBoosterViaAd('undo', rid, (ok, err) => {
        if (ok) {
          gm.claimCoinsViaAd(`coins_${rid}`, () => {});
          toast('领取成功');
          onChanged();
          this.close();
        } else {
          toast(err === 'duplicate' ? '请勿重复领取' : '广告未完成，未发放奖励');
        }
      });
    });

    this.addButton('关闭', -370, () => this.close(), true, 220, 70);
  }
}
