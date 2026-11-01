import { el, toast, ASSET, fmt } from './dom';
import {
  playerInfo, collection, currentLevel, save, canClaimDaily, claimDaily, persist,
  SERIES_LIST, seriesMeta, activeTheme, progress,
} from './app-state';
import { showCollection } from './view-collection';
import { showTasks } from './view-tasks';
import { showShop } from './view-shop';
import { showSettings } from './view-settings';
import { startLevel } from './game';

/** 首页：突出「开始挑战」与「收藏册」 */
export function renderHome(root: HTMLElement) {
  const info = playerInfo();
  const lv = currentLevel();
  const theme = activeTheme();
  const levelStars = save.data.levelStars?.[String(lv)] ?? 0;
  const diffLabel = save.data.completedLevels.includes(lv) ? '已通关，可再挑战' : lv <= 5 ? '快速上手' : lv <= 20 ? '多层堆叠' : '高难挑战';
  const dailyReady = canClaimDaily();
  const tasksDone = progress.completedTaskCount;
  const tasksClaimable = progress.tasks.claimed.length;
  const seriesMini = SERIES_LIST.map((s) => {
    const p = collection.seriesProgress(s);
    return `<div class="mini-series" title="${seriesMeta(s).name}">
      <div class="mini-ring" style="--p:${p.percent};--c:${seriesMeta(s).accent}"><span>${p.owned}</span></div>
      <span class="mini-name">${seriesMeta(s).name.replace('系列', '')}</span>
    </div>`;
  }).join('');

  root.innerHTML = '';
  const page = el(`
    <div class="page home ${theme ? 'theme-' + theme : ''}">
      <div class="home-top">
        <div class="player-card">
          <div class="avatar">Lv.${info.level}</div>
          <div class="xp-wrap">
            <div class="xp-bar"><i style="width:${info.xpPercent}%"></i></div>
            <span class="xp-text">${info.xp} / ${100 + (info.level - 1) * 40} EXP</span>
          </div>
        </div>
        <div class="wallet">
          <div class="pill"><img src="${ASSET.ui('coin')}"><b id="coins">${fmt(info.coins)}</b></div>
          <div class="pill"><img src="${ASSET.ui('icon_fragment')}"><b id="frags">${info.fragments}</b></div>
        </div>
      </div>

      <div class="logo-wrap">
        <img class="logo" src="${ASSET.ui('logo')}">
        <div class="logo-sub">SORT MASTER</div>
      </div>

      <div class="level-card">
        <div class="lc-glow"></div>
        <div class="lc-left">
          <div class="lc-label">当前挑战</div>
          <div class="lc-num">第 ${lv} 关</div>
          <div class="lc-sub">${diffLabel} · <span class="stars">${'★'.repeat(levelStars)}${'☆'.repeat(3 - levelStars)}</span></div>
        </div>
        <button class="btn primary start-btn" id="start">开始挑战</button>
      </div>

      <div class="collection-card" id="collectionEntry">
        <div class="cc-head">
          <img class="cc-icon" src="${ASSET.ui('icon_book')}">
          <div class="cc-title"><b>收藏册</b><span>${info.owned} / ${info.total} 件收藏品</span></div>
          <b class="cc-pct">${info.percent}%</b>
        </div>
        <div class="cc-bar"><i style="width:${info.percent}%"></i></div>
        <div class="cc-series">${seriesMini}</div>
      </div>

      <div class="quick-grid">
        <button class="quick" id="qTasks">
          <span class="q-icon"><img src="${ASSET.ui('icon_task_clear')}"></span>
          <span class="q-label">每日任务</span>
          ${tasksClaimable > 0 ? `<i class="badge">${tasksClaimable}</i>` : tasksDone > 0 ? `<i class="badge dot"></i>` : ''}
        </button>
        <button class="quick" id="qDaily">
          <span class="q-icon"><img src="${ASSET.ui('icon_daily')}"></span>
          <span class="q-label">每日签到</span>
          ${dailyReady ? '<i class="badge dot"></i>' : ''}
        </button>
        <button class="quick" id="qShop">
          <span class="q-icon"><img src="${ASSET.ui('icon_slot')}"></span>
          <span class="q-label">道具商店</span>
        </button>
        <button class="quick" id="qSettings">
          <span class="q-icon"><img src="${ASSET.ui('icon_settings')}"></span>
          <span class="q-label">设置</span>
        </button>
      </div>

      <div class="deco">
        <img src="${ASSET.item('apple')}"><img src="${ASSET.item('donut')}"><img src="${ASSET.item('duck')}">
        <img src="${ASSET.item('pencil')}"><img src="${ASSET.item('bear')}">
      </div>
      <div class="ad-mode">${platformIsMock() ? 'Mock 广告模式（非真实广告）' : '微信广告模式'}</div>
    </div>`);
  root.appendChild(page);

  page.querySelector('#start')!.addEventListener('click', () => startLevel(root, currentLevel()));
  page.querySelector('#collectionEntry')!.addEventListener('click', () => showCollection(root, () => renderHome(root)));
  page.querySelector('#qTasks')!.addEventListener('click', () => showTasks(root, () => renderHome(root)));
  page.querySelector('#qShop')!.addEventListener('click', () => showShop(root, () => renderHome(root)));
  page.querySelector('#qSettings')!.addEventListener('click', () => showSettings(root, () => renderHome(root)));
  page.querySelector('#qDaily')!.addEventListener('click', () => {
    if (!canClaimDaily()) {
      toast('今日已签到，明天再来');
      return;
    }
    const r = claimDaily();
    if (r.ok) {
      toast(`签到成功 +${r.amount} 金币`);
      renderHome(root);
    }
  });
}

function platformIsMock(): boolean {
  // 由 app-state 的平台实例决定（浏览器恒为 Mock）
  return (globalThis as any).__SORT_MASTER_MOCK__ !== false;
}

export { persist };
