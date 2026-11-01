import { el, toast, ASSET, fmt } from './dom';
import { GameSession } from '../../assets/scripts/gameplay/logic/GameSession';
import { BASE_SLOT_CAPACITY } from '../../assets/scripts/core/GameConfig';
import type { BoosterType } from '../../assets/scripts/core/GameConfig';
import type { LevelData } from '../../assets/scripts/level/LevelTypes';
import { generateLevel, LevelSpec } from '../../assets/scripts/level/LevelGenerator';
import { mulberry32 } from '../../assets/scripts/utils/Rand';
import {
  currency, inventory, ad, rewards, settleVictory, persist, save, collection, progress, addFragments,
} from './app-state';
import { showChest } from './view-chest';
import { renderHome } from './home';

let session: GameSession | null = null;
let tileEls = new Map<string, HTMLElement>();
let settled = false;
let removeMode = false;
let runId = '';
let levelId = 1;
/** 本局布局种子（可复现） */
let runSeed = 0;
/** 已渲染到槽位的物品（用于落位弹跳动画） */
const renderedSlotIds = new Set<string>();
const specCache = new Map<number, LevelSpec>();

/** 读取关卡规格（只含参数；布局由运行时生成） */
async function loadSpec(id: number): Promise<LevelSpec | null> {
  if (specCache.has(id)) return specCache.get(id)!;
  try {
    const res = await fetch(`./assets/resources/data/levels/level_${String(id).padStart(3, '0')}.json`);
    const spec = (await res.json()) as LevelSpec;
    specCache.set(id, spec);
    return spec;
  } catch {
    return null;
  }
}

/** 本局种子：URL ?seed= 可复现；否则每次进入随机 */
function pickSeed(level: number): number {
  // 浏览器用 URL 参数复现；非浏览器环境（如 jsdom 测试）安全降级
  const search = (globalThis as any)?.location?.search ?? '';
  const q = new URLSearchParams(search).get('seed');
  if (q !== null && q !== '' && Number.isFinite(Number(q))) return Number(q) >>> 0;
  return ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
}

export async function startLevel(root: HTMLElement, id: number) {
  const spec = await loadSpec(id);
  if (!spec) {
    toast(`关卡 ${id} 加载失败`);
    return;
  }
  // 每次进入关卡都重新生成布局；同 spec + 同 seed 可完全复现
  runSeed = pickSeed(id);
  const gen = generateLevel(spec, runSeed);
  const lv: LevelData = gen.level;
  levelId = id;
  runId = `run_${Date.now()}_${Math.floor(Math.random() * 1e5)}`;
  console.log(
    `[SortMaster] 关卡 ${id} 布局生成 seed=${gen.seed} 尝试=${gen.attempts} 物品=${lv.itemCount} 类型=${lv.itemTypes.length} 层=${lv.layerCount} 遮挡边=${lv.occlusion?.edgeCount}`
  );
  // 调试/自动化钩子（只读，用于复现与验收）
  (window as any).__SORT_MASTER__ = {
    levelId: id,
    seed: gen.seed,
    level: lv,
    getSession: () => session,
  };
  settled = false;
  removeMode = false;
  session = new GameSession(lv, { capacity: BASE_SLOT_CAPACITY, extraSlotMoves: 15 });
  tileEls = new Map();
  renderedSlotIds.clear();
  ad.startRun(runId);

  root.innerHTML = '';
  const page = el(`
    <div class="page game">
      <div class="topbar">
        <button class="btn small ghost" id="home">‹ 首页</button>
        <div class="game-level">第 ${id} 关<span>${lv.difficultyLabel ?? ''}</span></div>
        <div class="top-wallet">
          <div class="pill"><img src="${ASSET.ui('coin')}"><b id="coins">${fmt(currency.balance)}</b></div>
          <div class="pill"><img src="${ASSET.ui('icon_fragment')}"><b>${collection.fragments}</b></div>
        </div>
      </div>
      <div class="board" id="board"></div>
      <div class="combo" id="combo"></div>
      <div class="boosters" id="boosters"></div>
      <div class="tray" id="tray"></div>
      <div class="tray-label">收纳槽 · 连续三个相同才能消除</div>
    </div>`);
  root.appendChild(page);

  const board = page.querySelector('#board')!;
  for (const t of lv.itemPositions) {
    const d = el(`<div class="tile" data-id="${t.id}"><img src="${ASSET.item(t.type)}"></div>`);
    d.style.left = `${t.x}px`;
    d.style.top = `${t.y}px`;
    // 自然堆放的轻微旋转（确定性，不影响命中判定：围绕中心旋转）
    const seed = (t.id.charCodeAt(1) || 0) * 37 + (t.id.charCodeAt(2) || 0) * 11 + (t.id.charCodeAt(3) || 0);
    d.style.setProperty('--rot', `${((seed % 9) - 4) * 1.75 + 0.4}deg`);
    board.appendChild(d);
    tileEls.set(t.id, d);
    d.addEventListener('click', () => onTile(t.id));
  }

  const tray = page.querySelector('#tray') as HTMLElement;
  for (let i = 0; i < BASE_SLOT_CAPACITY + 1; i++) {
    const c = el(`<div class="slot" data-idx="${i}"></div>`);
    if (i >= BASE_SLOT_CAPACITY) c.classList.add('extra', 'hidden');
    tray.appendChild(c);
  }

  buildBoosters(page);

  session.events.on('tile:picked', ({ tileId, slotIndex }: any) => {
    const d = tileEls.get(tileId);
    const slot = tray.querySelector(`.slot[data-idx="${Math.min(slotIndex, BASE_SLOT_CAPACITY)}"]`) as HTMLElement;
    if (slot) slot.classList.remove('gather', 'clearing');
    if (d && slot) {
      // 点击反馈：按下 -> 抬起 -> 飞入（弹性）
      d.classList.add('pressed');
      setTimeout(() => {
        d.classList.remove('pressed');
        d.classList.add('lifted');
      }, 70);
      setTimeout(() => {
        d.classList.add('flying');
        const boardRect = board.getBoundingClientRect();
        const r = slot.getBoundingClientRect();
        d.style.left = `${r.left - boardRect.left}px`;
        d.style.top = `${r.top - boardRect.top}px`;
      }, 150);
      setTimeout(() => {
        d.remove();
        rebuildSlots();
      }, 400);
    }
  });
  session.events.on('match:cleared', ({ slotItems, combo }: any) => {
    setTimeout(() => {
      const matchedSlots: HTMLElement[] = [];
      for (const it of slotItems) {
        const slot = tray.querySelector(`.slot[data-tile="${it.tileId}"]`) as HTMLElement;
        if (slot) {
          slot.classList.add('gather');
          matchedSlots.push(slot);
        }
      }
      // 聚合点：被消除槽位的中心
      if (matchedSlots.length) {
        const trayRect = tray.getBoundingClientRect();
        const r = matchedSlots[Math.floor(matchedSlots.length / 2)].getBoundingClientRect();
        const cx = r.left - trayRect.left + r.width / 2;
        const cy = r.top - trayRect.top + r.height / 2;
        spawnSparks(tray, cx, cy, 12);
        spawnRing(tray, cx, cy, 64);
        tray.classList.add('flash');
        setTimeout(() => tray.classList.remove('flash'), 450);
      }
      if (combo >= 2) {
        const c = page.querySelector('#combo') as HTMLElement;
        c.textContent = `COMBO x${combo}!`;
        c.classList.add('show');
        setTimeout(() => c.classList.remove('show'), 900);
      }
      setTimeout(() => {
        document.querySelectorAll('.slot.gather, .slot.clearing').forEach((el) => el.classList.remove('gather', 'clearing'));
        rebuildSlots();
      }, 320);
    }, 300);
  });
  session.events.on('board:changed', () => {
    rebuildMissingTiles();
    refresh();
  });
  session.events.on('slot:full', () => {
    tray.classList.add('shake', 'tight');
    setTimeout(() => tray.classList.remove('shake'), 500);
    setTimeout(() => tray.classList.remove('tight'), 1500);
  });
  session.events.on('slot:tight', ({ occupied, capacity }: any) => {
    tray.classList.add('tight');
    if (occupied === capacity - 1) toast('槽位只剩 1 格！');
    else toast(`槽位紧张（${occupied}/${capacity}）`);
    setTimeout(() => tray.classList.remove('tight'), 900);
  });

  page.querySelector('#home')!.addEventListener('click', () => {
    persist();
    renderHome(root);
  });

  if ((lv.difficulty ?? 1) >= 4) {
    toast(`⚠ 高难度：${lv.difficultyLabel}${lv.boosterLimit ? ` · 道具限用 ${lv.boosterLimit} 次` : ''}`);
  }

  session.start();
  refresh();
  rebuildSlots();

  function rebuildSlots() {
    if (!session) return;
    document.querySelectorAll('.slot').forEach((s) => {
      const se = s as HTMLElement;
      // 关键：清除三消/消除的临时动画类。
      // 这些动画是 forwards 结尾（opacity:0），若残留会让之后放入该槽位的物品直接不可见。
      se.classList.remove('gather', 'clearing');
      se.innerHTML = '';
      se.dataset.tile = '';
    });
    const nowIds = new Set<string>();
    session.slots.items.forEach((it, i) => {
      const slot = tray.querySelector(`.slot[data-idx="${i}"]`) as HTMLElement;
      if (slot) {
        const isNew = !renderedSlotIds.has(it.uniqueId);
        slot.innerHTML = `<img class="${isNew ? 'landed' : ''}" src="${ASSET.item(it.itemType)}">`;
        slot.dataset.tile = it.uniqueId;
        nowIds.add(it.uniqueId);
      }
    });
    renderedSlotIds.clear();
    nowIds.forEach((id) => renderedSlotIds.add(id));
    const extra = tray.querySelector('.slot.extra') as HTMLElement;
    extra?.classList.toggle('hidden', !session.slots.hasExtraSlot);
  }

  function spawnSparks(host: HTMLElement, cx: number, cy: number, n: number) {
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const dist = 34 + Math.random() * 46;
      const sp = el(`<i class="spark" style="left:${cx}px;top:${cy}px;--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist}px"></i>`);
      host.appendChild(sp);
      setTimeout(() => sp.remove(), 700);
    }
  }

  function spawnRing(host: HTMLElement, cx: number, cy: number, size: number) {
    const ring = el(`<i class="ring" style="left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px"></i>`);
    host.appendChild(ring);
    setTimeout(() => ring.remove(), 560);
  }

  function rebuildMissingTiles() {
    if (!session) return;
    for (const t of session.board.liveTiles()) {
      let d = tileEls.get(t.id);
      if (!d || !document.body.contains(d)) {
        d = el(`<div class="tile" data-id="${t.id}"><img src="${ASSET.item(t.type)}"></div>`);
        d.style.left = `${t.x}px`;
        d.style.top = `${t.y}px`;
        board.appendChild(d);
        tileEls.set(t.id, d);
        const tid = t.id;
        d.addEventListener('click', () => onTile(tid));
      }
    }
  }

  function refresh() {
    if (!session) return;
    const clickable = new Set(session.getClickableTiles().map((t) => t.id));
    for (const t of session.board.liveTiles()) {
      const d = tileEls.get(t.id);
      if (!d) continue;
      d.classList.toggle('dim', !clickable.has(t.id));
      d.classList.toggle('frozen', t.frozen > 0);
      d.classList.toggle('locked', t.locked);
    }
  }

  function onTile(tileId: string) {
    if (!session || session.inputLocked) return;
    if (removeMode) {
      if (session.useRemove(tileId)) {
        removeMode = false;
        inventory.consume('remove');
        persist();
        const d = tileEls.get(tileId);
        d?.classList.add('clearing');
        setTimeout(() => d?.remove(), 300);
        refreshBoosters();
        checkEnd();
      } else toast('该物品当前不可移除');
      return;
    }
    const check = session.canPick(tileId);
    if (!check.ok) {
      if (check.reason === 'occluded') toast('物品被上层遮挡');
      else if (check.reason === 'frozen') toast('物品被冰冻，先完成一次消除');
      else if (check.reason === 'locked') toast('物品被锁定');
      return;
    }
    session.inputLocked = true;
    session.pickTile(tileId);
    setTimeout(() => {
      if (session) session.inputLocked = false;
      checkEnd();
    }, 430);
  }

  function buildBoosters(p: HTMLElement) {
    const box = p.querySelector('#boosters')!;
    const defs: { t: BoosterType; name: string; icon: string }[] = [
      { t: 'undo', name: '撤回', icon: 'icon_undo' },
      { t: 'shuffle', name: '洗牌', icon: 'icon_shuffle' },
      { t: 'remove', name: '移除', icon: 'icon_remove' },
      { t: 'extra_slot', name: '加槽', icon: 'icon_slot' },
    ];
    box.innerHTML = defs
      .map(
        (d) =>
          `<button class="booster" data-b="${d.t}"><img src="${ASSET.ui(d.icon)}"><span class="cnt" id="cnt_${d.t}">${inventory.get(d.t)}</span><span class="lbl">${d.name}</span></button>`
      )
      .join('');
    box.querySelectorAll('.booster').forEach((b) =>
      b.addEventListener('click', () => useBooster((b as HTMLElement).dataset.b as BoosterType))
    );
  }

  function refreshBoosters() {
    (['undo', 'shuffle', 'remove', 'extra_slot'] as BoosterType[]).forEach((t) => {
      const c = document.getElementById(`cnt_${t}`);
      if (c) c.textContent = String(inventory.get(t));
      const btn = document.querySelector(`.booster[data-b="${t}"]`);
      btn?.classList.toggle('empty', inventory.get(t) <= 0);
    });
  }

  function useBooster(t: BoosterType) {
    if (!session) return;
    if (!session.canUseBooster()) {
      toast(`本关道具使用已达上限（${session.boosterLimit} 次）`);
      return;
    }
    if (inventory.get(t) <= 0) {
      toast('道具不足，可在商店购买');
      return;
    }
    if (t === 'undo') {
      if (session.useUndo()) {
        inventory.consume('undo');
        progress.recordEvent('booster_used', 1);
        rebuildSlots();
        rebuildMissingTiles();
        refresh();
      } else toast('没有可撤回的操作');
    } else if (t === 'shuffle') {
      if (session.useShuffle(mulberry32(Date.now() & 0xffffffff))) {
        inventory.consume('shuffle');
        progress.recordEvent('booster_used', 1);
        for (const tile of session.board.liveTiles()) {
          const d = tileEls.get(tile.id);
          if (d) {
            d.style.left = `${tile.x}px`;
            d.style.top = `${tile.y}px`;
          }
        }
      }
    } else if (t === 'remove') {
      removeMode = true;
      toast('点击一个可点击的物品移除');
    } else if (t === 'extra_slot') {
      if (session.useExtraSlot()) {
        inventory.consume('extra_slot');
        progress.recordEvent('booster_used', 1);
        rebuildSlots();
      } else toast('额外槽位生效中');
    }
    const btn = document.querySelector(`.booster[data-b="${t}"]`);
    btn?.classList.add('used');
    setTimeout(() => btn?.classList.remove('used'), 520);
    refreshBoosters();
    refresh();
    persist();
  }

  function checkEnd() {
    if (!session || settled) return;
    if (session.state === 'VICTORY') {
      settled = true;
      onVictory();
    } else if (session.state === 'FAILED') {
      settled = true;
      onFail();
    }
  }

  function onVictory() {
    const stars = session ? session.getStars() : 1;
    const maxCombo = session ? session.maxCombo : 0;
    const settle = settleVictory(runId, levelId, maxCombo, stars);
    if (!settle) {
      renderHome(root);
      return;
    }
    setTimeout(() => {
      showChest(levelId, stars, maxCombo, settle, () => startLevel(root, levelId + 1), () => renderHome(root));
    }, 500);
  }

  function onFail() {
    const m = el(`
      <div class="overlay"><div class="popup">
        <h3>槽位已满</h3>
        <p>收纳槽被占满了，再试一次？</p>
        <button class="btn ghost" id="adRevive">看广告（Mock）复活</button>
        <button class="btn primary" id="coinRevive">花 200 金币复活</button>
        <button class="btn small" id="restart">重新开始</button>
        <button class="btn small" id="toHome">回首页</button>
      </div></div>`);
    root.appendChild(m);
    const revive = () => {
      if (session && session.undo()) {
        if (!session.slots.hasExtraSlot) session.useExtraSlot();
        rebuildSlots();
        rebuildMissingTiles();
        refresh();
        settled = false;
        m.remove();
        toast('复活成功');
      }
    };
    m.querySelector('#adRevive')!.addEventListener('click', async () => {
      const rid = `revive_${runId}`;
      const r = await ad.showRewardedAd('revive', rid);
      if (r.completed && rewards.grant(`g_${rid}`)) {
        ad.reportRewarded(rid);
        revive();
      } else toast('广告未完成，未复活');
    });
    m.querySelector('#coinRevive')!.addEventListener('click', () => {
      if (currency.spend(200, 'revive')) {
        persist();
        revive();
      } else toast('金币不足');
    });
    m.querySelector('#restart')!.addEventListener('click', () => {
      m.remove();
      startLevel(root, levelId);
    });
    m.querySelector('#toHome')!.addEventListener('click', () => {
      m.remove();
      renderHome(root);
    });
  }
}

export { addFragments, save };
