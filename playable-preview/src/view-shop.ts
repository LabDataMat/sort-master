import { el, toast, modal, ASSET } from './dom';
import { buyBooster, inventory, ad, rewards, addFragments, persist, currency } from './app-state';
import type { BoosterType } from '../../assets/scripts/core/GameConfig';

const NAMES: Record<BoosterType, string> = { undo: '撤回', shuffle: '洗牌', remove: '移除', extra_slot: '额外槽位' };
const ICONS: Record<BoosterType, string> = { undo: 'book', shuffle: 'blocks', remove: 'eraser', extra_slot: 'penholder' };
const PRICES: Record<BoosterType, number> = { undo: 150, shuffle: 150, remove: 250, extra_slot: 200 };

/** 道具商店 */
export function showShop(_root: HTMLElement, onBack: () => void) {
  const render = () => {
    const m = modal(`
      <div class="popup shop-popup">
        <h3>道具商店</h3>
        <div class="shop-list">
          ${(['undo', 'shuffle', 'remove', 'extra_slot'] as BoosterType[])
            .map(
              (t) => `<div class="shop-row">
                <img src="${ASSET.item(ICONS[t])}">
                <div class="shop-info"><b>${NAMES[t]}</b><span>持有 ${inventory.get(t)}</span></div>
                <button class="btn small primary" data-buy="${t}">${PRICES[t]} 金币</button>
              </div>`
            )
            .join('')}
        </div>
        <button class="btn ghost" id="adFree">看广告（Mock）+1 撤回 +80 金币</button>
        <button class="btn small" id="close">关闭</button>
      </div>`);
    m.querySelector('#close')!.addEventListener('click', () => {
      m.remove();
      onBack();
    });
    m.querySelectorAll('[data-buy]').forEach((b) =>
      b.addEventListener('click', () => {
        const t = (b as HTMLElement).dataset.buy as BoosterType;
        if (buyBooster(t)) {
          toast('购买成功');
          m.remove();
          render();
        } else toast('金币不足');
      })
    );
    m.querySelector('#adFree')!.addEventListener('click', async () => {
      const rid = `shop_ad_${Date.now()}`;
      const r = await ad.showRewardedAd('booster', rid);
      if (r.completed && rewards.grant(rid)) {
        inventory.add('undo', 1);
        currency.add(80, 'ad');
        persist();
        toast('领取成功（Mock 广告）');
        m.remove();
        render();
      } else toast('广告未完成，未发放奖励');
    });
  };
  render();
  void addFragments;
}
