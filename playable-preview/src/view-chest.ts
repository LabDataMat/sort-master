import { el, ASSET } from './dom';
import { collection, seriesMeta } from './app-state';
import { RARITIES } from '../../assets/scripts/collection/CollectionData';
import type { VictorySettle } from './app-state';

/**
 * 通关宝箱流程（分阶段动画）：
 * 1 宝箱出现 + 星级  → 2 点击开启（晃动 + 光效） → 3 收藏品弹出（按稀有度差异化） → 4 进度与下一关
 */
export function showChest(levelId: number, stars: number, maxCombo: number, settle: VictorySettle, onNext: () => void, onHome: () => void) {
  const app = document.getElementById('app')!;
  const result = settle.chest.result;
  const overlay = el(`
    <div class="overlay chest-overlay stage-1">
      <div class="chest-scene">
        <div class="rays"></div>
        <div class="confetti"></div>
        <h2 class="chest-title">通关成功！</h2>
        <div class="chest-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <div class="chest-wrap">
          <img class="chest-img" id="chestImg" src="${ASSET.ui('chest_closed')}">
          <div class="chest-hint">点击开启收藏宝箱</div>
        </div>
        <div class="chest-rewards">
          <span class="rw-chip"><img src="${ASSET.ui('coin')}">+${settle.coins}</span>
          ${settle.milestoneCoins ? `<span class="rw-chip"><img src="${ASSET.ui('coin')}">里程碑 +${settle.milestoneCoins}</span>` : ''}
          ${settle.milestoneFragments ? `<span class="rw-chip"><img src="${ASSET.ui('icon_fragment')}">+${settle.milestoneFragments}</span>` : ''}
          <span class="rw-chip">EXP +${settle.xpGained}</span>
        </div>
        <button class="btn primary" id="openChest">开启宝箱</button>
      </div>
    </div>`);
  app.appendChild(overlay);

  const openBtn = overlay.querySelector('#openChest') as HTMLElement;
  const chestImg = overlay.querySelector('#chestImg') as HTMLImageElement;

  openBtn.addEventListener('click', () => {
    openBtn.remove();
    overlay.classList.add('opening');
    // 阶段 2：晃动 + 光效
    setTimeout(() => {
      chestImg.src = ASSET.ui('chest_open');
      overlay.classList.remove('opening');
      overlay.classList.add('opened');
      if (result) revealItem(overlay, levelId, stars, maxCombo, settle, onNext, onHome);
      else revealNothing(overlay, levelId, onNext, onHome);
    }, 1000);
  });

  // 关闭遮罩不可跳过（保证奖励展示）
  overlay.addEventListener('click', (e) => e.stopPropagation());
}

function revealItem(
  overlay: HTMLElement,
  levelId: number,
  stars: number,
  maxCombo: number,
  settle: VictorySettle,
  onNext: () => void,
  onHome: () => void
) {
  const r = settle.chest.result!;
  const def = r.def;
  const rarity = RARITIES[def.rarity];
  const sp = collection.seriesProgress(def.series);
  const nextLevel = levelId + 1;
  const panel = el(`
    <div class="reveal-panel rarity-${def.rarity}">
      <div class="reveal-card">
        <div class="reveal-glow" style="--rc:${rarity.color}"></div>
        <div class="reveal-imgwrap">
          <img class="reveal-img" src="${ASSET.collect(def.id)}">
          <img class="reveal-frame" src="${ASSET.ui('frame_' + def.rarity)}">
          ${r.isNew ? '<span class="new-badge">NEW</span>' : ''}
        </div>
        <div class="rarity-chip" style="--rc:${rarity.color}">${rarity.label}</div>
        <h3 class="reveal-name">${def.name}</h3>
        <div class="reveal-series">${seriesMeta(def.series).name}</div>
        <p class="reveal-desc">${def.desc}</p>
        ${r.isNew ? '' : `<p class="dup-note">已拥有 · 转化为 <b>${r.fragmentsGained}</b> 收藏碎片</p>`}
        <div class="series-progress">
          <div class="sp-head"><span>${seriesMeta(def.series).name}</span><b>${sp.owned} / ${sp.total}</b></div>
          <div class="sp-bar"><i style="width:${sp.percent}%"></i></div>
          ${sp.complete ? `<div class="sp-done">系列集齐！解锁主题「${seriesMeta(def.series).themeName}」</div>` : ''}
        </div>
        <div class="next-info">下一关：第 ${nextLevel} 关 · ${nextLevel <= 5 ? '难度继续提升' : '更高难度挑战'}</div>
        <div class="reveal-actions">
          <button class="btn primary" id="nextLv">下一关</button>
          <button class="btn ghost" id="toCollection">查看收藏册</button>
          <button class="btn small" id="toHome">回首页</button>
        </div>
      </div>
    </div>`);
  overlay.querySelector('.chest-scene')!.appendChild(panel);

  // 稀有度差异化：史诗/传说额外光效与粒子
  if (def.rarity === 'epic' || def.rarity === 'legendary') {
    overlay.classList.add('high-rarity');
    spawnParticles(overlay, def.rarity === 'legendary' ? 18 : 12);
  }

  panel.querySelector('#nextLv')!.addEventListener('click', () => {
    overlay.remove();
    onNext();
  });
  panel.querySelector('#toCollection')!.addEventListener('click', async () => {
    overlay.remove();
    const { showCollection } = await import('./view-collection');
    const app = document.getElementById('app')!;
    showCollection(app, () => onHome());
  });
  panel.querySelector('#toHome')!.addEventListener('click', () => {
    overlay.remove();
    onHome();
  });
  void maxCombo;
}

function revealNothing(overlay: HTMLElement, levelId: number, onNext: () => void, onHome: () => void) {
  const panel = el(`
    <div class="reveal-panel">
      <div class="reveal-card">
        <h3 class="reveal-name">宝箱已领取</h3>
        <p class="reveal-desc">本关收藏奖励已发放，可在收藏册查看。</p>
        <div class="reveal-actions">
          <button class="btn primary" id="nextLv">下一关</button>
          <button class="btn small" id="toHome">回首页</button>
        </div>
      </div>
    </div>`);
  overlay.querySelector('.chest-scene')!.appendChild(panel);
  panel.querySelector('#nextLv')!.addEventListener('click', () => {
    overlay.remove();
    onNext();
  });
  panel.querySelector('#toHome')!.addEventListener('click', () => {
    overlay.remove();
    onHome();
  });
  void levelId;
}

function spawnParticles(overlay: HTMLElement, n: number) {
  const layer = overlay.querySelector('.confetti') as HTMLElement;
  for (let i = 0; i < n; i++) {
    const p = el(`<i class="confetti-piece" style="left:${40 + Math.random() * 20}%;animation-delay:${i * 0.05}s"></i>`);
    layer.appendChild(p);
  }
}

