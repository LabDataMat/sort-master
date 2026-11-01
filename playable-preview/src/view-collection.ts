import { el, toast, ASSET, modal } from './dom';
import {
  collection, seriesMeta, exchangeCollectible, persist, SERIES_LIST, isThemeUnlocked, addFragments,
} from './app-state';
import { RARITIES, collectiblesOfSeries, SeriesId, CollectibleDef } from '../../assets/scripts/collection/CollectionData';

let lastTab: SeriesId = 'dessert';

/** 收藏册页面：4 系列 × 12 件，已收集显示图片，未收集显示剪影 */
export function showCollection(root: HTMLElement, onBack: () => void) {
  const render = () => {
    const total = collection.ownedCount;
    const all = collection.totalCount;
    const tabs = SERIES_LIST.map((s) => {
      const p = collection.seriesProgress(s);
      return `<button class="series-tab ${s === lastTab ? 'active' : ''}" data-tab="${s}" style="--ac:${seriesMeta(s).accent}">
        <span class="tab-name">${seriesMeta(s).name}</span>
        <span class="tab-count">${p.owned}/${p.total}</span>
        ${p.complete ? '<i class="tab-done">✓</i>' : ''}
      </button>`;
    }).join('');

    const sp = collection.seriesProgress(lastTab);
    const list = collectiblesOfSeries(lastTab);
    const cards = list
      .map((c) => {
        const owned = collection.has(c.id);
        const rarity = RARITIES[c.rarity];
        return `<div class="cc-card ${owned ? 'owned' : 'locked'} rarity-${c.rarity}" data-id="${c.id}">
          <div class="cc-imgwrap">
            <img class="cc-img" src="${ASSET.collect(c.id)}">
            ${owned ? `<img class="cc-frame" src="${ASSET.ui('frame_' + c.rarity)}">` : '<div class="cc-q">?</div>'}
          </div>
          <div class="cc-name">${owned ? c.name : '未解锁'}</div>
          <div class="cc-rarity" style="color:${rarity.color}">${rarity.label}</div>
        </div>`;
      })
      .join('');

    const themes = SERIES_LIST.filter((s) => isThemeUnlocked(s))
      .map((s) => `<span class="theme-chip">${seriesMeta(s).themeName}</span>`)
      .join('');

    root.innerHTML = '';
    const page = el(`
      <div class="page collection">
        <div class="col-header">
          <button class="btn small ghost" id="back">‹ 返回</button>
          <h2>收藏册</h2>
          <div class="pill"><img src="${ASSET.ui('icon_fragment')}"><b>${collection.fragments}</b></div>
        </div>
        <div class="col-summary">
          <div class="cs-row"><span>总收集进度</span><b>${total} / ${all}</b></div>
          <div class="col-bar"><i style="width:${collection.overallPercent}%"></i></div>
          <div class="theme-row">${themes ? '已解锁主题：' + themes : '集齐一个系列可解锁专属主题'}</div>
        </div>
        <div class="series-tabs">${tabs}</div>
        <div class="series-panel">
          <div class="series-banner" style="--ac:${seriesMeta(lastTab).accent}">
            <div class="sb-text"><b>${seriesMeta(lastTab).name}</b><span>${seriesMeta(lastTab).subtitle}</span></div>
            <div class="sb-progress"><b>${sp.owned}</b> / ${sp.total}</div>
          </div>
          ${sp.complete ? `<div class="series-complete">🎉 系列集齐！已解锁「${seriesMeta(lastTab).themeName}」</div>` : ''}
          <div class="collect-grid">${cards}</div>
        </div>
      </div>`);
    root.appendChild(page);

    page.querySelector('#back')!.addEventListener('click', onBack);
    page.querySelectorAll('.series-tab').forEach((b) =>
      b.addEventListener('click', () => {
        lastTab = (b as HTMLElement).dataset.tab as SeriesId;
        render();
      })
    );
    page.querySelectorAll('.cc-card').forEach((card) =>
      card.addEventListener('click', () => openDetail(root, (card as HTMLElement).dataset.id!, render))
    );

    if (sp.complete) celebrate(root);
  };
  render();
}

function openDetail(root: HTMLElement, id: string, refresh: () => void) {
  const def = collection.getDef(id) as CollectibleDef;
  const owned = collection.has(id);
  const rarity = RARITIES[def.rarity];
  const obtained = collection.obtainedAt[id];
  const check = collection.canExchange(id);
  const m = modal(`
    <div class="popup detail-popup rarity-${def.rarity}">
      <div class="detail-imgwrap">
        <img class="detail-img" src="${ASSET.collect(def.id)}">
        ${owned ? `<img class="cc-frame" src="${ASSET.ui('frame_' + def.rarity)}">` : ''}
      </div>
      <div class="rarity-chip" style="--rc:${rarity.color}">${rarity.label}</div>
      <h3>${def.name}</h3>
      <div class="detail-series">${seriesMeta(def.series).name}</div>
      <p class="detail-desc">${def.desc}</p>
      ${owned
        ? `<div class="detail-obtained">获得时间：${new Date(obtained).toLocaleString('zh-CN')}</div>`
        : `<div class="detail-obtained">尚未获得</div>
           <button class="btn primary" id="exchange" ${check.ok ? '' : 'disabled'}>
             ${check.ok ? `用 ${check.cost} 碎片兑换` : check.reason === 'insufficient' ? `碎片不足（需 ${check.cost}）` : '已拥有'}
           </button>`}
      <button class="btn small ghost" id="closeDetail">关闭</button>
    </div>`);
  m.querySelector('#closeDetail')!.addEventListener('click', () => m.remove());
  const ex = m.querySelector('#exchange');
  ex?.addEventListener('click', () => {
    const r = exchangeCollectible(id);
    if (r) {
      toast(`获得收藏品：${r.def.name}`);
      m.remove();
      refresh();
    } else toast('碎片不足');
  });
  void root;
}

function celebrate(root: HTMLElement) {
  const layer = el(`<div class="celebrate-layer"></div>`);
  for (let i = 0; i < 24; i++) {
    layer.appendChild(el(`<i style="left:${Math.random() * 100}%;animation-delay:${Math.random() * 0.6}s;background:${['#F5C542', '#F4A0B4', '#8FC7E8', '#9CB98F'][i % 4]}"></i>`));
  }
  root.querySelector('.page.collection')?.appendChild(layer);
  setTimeout(() => layer.remove(), 2600);
}

export { addFragments, persist };
