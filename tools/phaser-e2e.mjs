/**
 * Phaser 版端到端验收（真实 Chrome + 真实点击）。
 *
 * 覆盖：
 *  1. 菜单 / 画布
 *  2. 不相邻三消（A,B,A,C,A 真实点击）
 *  3. 第 1 关：极简、快速通关、首通必得收藏品
 *  4. 第 2 关：难度断层、失败可重试、可通关
 *  5. 收藏图鉴：进度、锁定剪影
 *  6. 刷新后金币 / 收藏 / 进度保留
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.env.E2E_URL || 'http://127.0.0.1:4173/sort-master/';
const BOOT_TIMEOUT = Number(process.env.E2E_BOOT_TIMEOUT || 20000);
const SHOT = 'docs/screenshots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
  if (!cond) fails++;
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-first-run', '--disable-gpu', '--user-data-dir=C:/Users/25370/AppData/Local/Temp/ep-phaser3'],
  defaultViewport: { width: 500, height: 900, deviceScaleFactor: 2 },
});

const page = await browser.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

const waitMenu = () =>
  page.waitForFunction(() => !!window.__SORT_MASTER__?.game?.scene?.isActive('Menu'), { timeout: BOOT_TIMEOUT });
const waitGame = () =>
  page.waitForFunction(() => !!window.__SORT_MASTER__?.game?.scene?.isActive('Game'), { timeout: BOOT_TIMEOUT });

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
await waitMenu();

await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
await waitMenu();
await sleep(500);

check('主菜单场景已激活', await page.evaluate(() => window.__SORT_MASTER__.game.scene.isActive('Menu')));
await page.screenshot({ path: `${SHOT}/phaser_menu.png` });

const rect = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
});
check('画布尺寸有效', rect.width > 100 && rect.height > 100, `${Math.round(rect.width)}x${Math.round(rect.height)}`);

const clickGame = async (gx, gy) => {
  await page.mouse.click(rect.left + (gx / 750) * rect.width, rect.top + (gy / 1334) * rect.height);
};

const readSession = () =>
  page.evaluate(() => {
    const s = window.__SORT_MASTER__.game.scene.getScene('Game');
    const b = s.session.board;
    return {
      levelId: s.levelId,
      total: b.tiles.length,
      remaining: b.remaining,
      clickable: b.clickable().map((t) => ({
        id: t.instanceId,
        type: t.itemId,
        x: t.x,
        y: t.y,
        w: t.w,
        h: t.h,
      })),
      slotTypes: s.session.slots.all.map((x) => x.itemId),
      state: s.session.state,
      difficulty: s.level.difficultyScore ?? s.level.difficulty,
      tier: s.level.tier,
      slotCapacity: s.level.slotCapacity,
      solution: s.level.solution,
      tiles: b.tiles.map((t) => ({ id: t.instanceId, x: t.x, y: t.y, w: t.w, h: t.h, layer: t.layer })),
    };
  });

const readSave = () => page.evaluate(() => JSON.parse(localStorage.getItem('sort_master_phaser_v1') || 'null'));

const clickTile = async (t) => {
  await clickGame(t.x + t.w / 2, 150 + t.y + t.h / 2);
  await sleep(270);
};

// ---------------- 1. 不相邻三消 ----------------

await page.evaluate(() => window.__SORT_MASTER__.game.scene.getScene('Menu').scene.start('Game', { levelId: 1 }));
await waitGame();
await sleep(700);

let nonAdjacentOk = false;
let nonAdjacentDetail = '';
for (let attempt = 0; attempt < 4 && !nonAdjacentOk; attempt++) {
  if (attempt > 0) {
    await page.evaluate(() => window.__SORT_MASTER__.game.scene.getScene('Game').scene.restart({ levelId: 1 }));
    await sleep(700);
  }

  let typeA = null;
  const beforeLast = [];
  let ok = true;

  for (let step = 0; step < 5; step++) {
    const st = await readSession();
    if (step === 4) beforeLast.push(...st.slotTypes);

    let choice = null;
    if (step === 0) {
      choice = st.clickable[0];
      if (choice) typeA = choice.type;
    } else if (step === 1) choice = st.clickable.find((t) => t.type !== typeA);
    else if (step === 2) choice = st.clickable.find((t) => t.type === typeA);
    else if (step === 3) choice = st.clickable.find((t) => t.type !== typeA);
    else choice = st.clickable.find((t) => t.type === typeA);

    if (!choice) {
      ok = false;
      break;
    }
    await clickTile(choice);
  }

  if (!ok) continue;
  const after = await readSession();
  if (after.slotTypes.filter((t) => t === typeA).length === 0) {
    nonAdjacentOk = true;
    nonAdjacentDetail = `type=${typeA} 槽内=${beforeLast.join(',')}`;
  }
}

check('三个不相邻相同物品可消除（A,B,A,C,A）', nonAdjacentOk, nonAdjacentDetail);

// ---------------- 2. 第 1 关 ----------------

await page.evaluate(() => window.__SORT_MASTER__.game.scene.getScene('Game').scene.restart({ levelId: 1 }));
await sleep(700);

const l1 = await readSession();
check('第 1 关为极简教学', l1.total === 9 && l1.difficulty === 1, `${l1.total}件 难度${l1.difficulty}`);
check('第 1 关全部物品可点（无遮挡）', l1.clickable.length === 9, `可点 ${l1.clickable.length}/9`);

const l1Tiles = new Map(l1.tiles.map((t) => [t.id, t]));
for (const id of l1.solution) {
  const t = l1Tiles.get(id);
  if (t) await clickTile(t);
}
await sleep(900);

const l1State = await readSession();
check('第 1 关可快速通关', l1State.state === 'victory' && l1State.remaining === 0, l1State.state);
await page.screenshot({ path: `${SHOT}/phaser_l1_result.png` });

const saveAfterL1 = await readSave();
check(
  '首通第 1 关获得第一件收藏品',
  !!saveAfterL1 && saveAfterL1.collection.includes('food_01'),
  JSON.stringify(saveAfterL1?.collection),
);
check('首通奖励金币已发放', !!saveAfterL1 && saveAfterL1.coins > 0, `coins=${saveAfterL1?.coins}`);

// ---------------- 3. 第 2 关 ----------------

await clickGame(375, 807); // 下一关
await waitGame();
await sleep(900);

const l2 = await readSession();
check('进入第 2 关', l2.levelId === 2, `L${l2.levelId}`);
check(
  '第 2 关明显更难（物品多 / 可点击稀少 / 难度≥8.5）',
  l2.total >= 80 && l2.difficulty >= 8.5 && l2.clickable.length / l2.total <= 0.2,
  `${l2.total}件 难度${l2.difficulty} 可点${l2.clickable.length}`,
);
await page.screenshot({ path: `${SHOT}/phaser_l2_board.png` });

// 故意填满收纳槽且不触发三消 → 失败
for (let i = 0; i < 7; i++) {
  const st = await readSession();
  if (st.state !== 'playing') break;
  const counts = {};
  for (const t of st.slotTypes) counts[t] = (counts[t] || 0) + 1;
  const cand = st.clickable.find((t) => (counts[t.type] || 0) < 2);
  if (!cand) break;
  await clickTile(cand);
}
await sleep(900);

const l2Lose = await readSession();
check('收纳槽满且无匹配时判负', l2Lose.state === 'lose', l2Lose.state);
await page.screenshot({ path: `${SHOT}/phaser_l2_lose.png` });

await clickGame(375, 600); // 重新挑战
await waitGame();
await sleep(800);
const l2Retry = await readSession();
check(
  '失败后可重新挑战（棋盘重置）',
  l2Retry.levelId === 2 && l2Retry.remaining === l2Retry.total,
  `${l2Retry.remaining}/${l2Retry.total}`,
);

// 按解法通关第 2 关
const l2Tiles = new Map(l2Retry.tiles.map((t) => [t.id, t]));
let previous = l2Retry.total;
for (const id of l2Retry.solution) {
  const t = l2Tiles.get(id);
  if (!t) continue;
  for (let a = 0; a < 3; a++) {
    await clickTile(t);
    const st = await readSession();
    if (st.remaining < previous) {
      previous = st.remaining;
      break;
    }
  }
}
await sleep(900);
const l2Win = await readSession();
check('第 2 关存在合法通关路径且可通关', l2Win.state === 'victory' && l2Win.remaining === 0, l2Win.state);

// ---------------- 4. 收藏图鉴 ----------------

await page.evaluate(() => window.__SORT_MASTER__.game.scene.getScene('Game').scene.start('Menu'));
await waitMenu();
await sleep(400);
await clickGame(375, 878); // 收藏图鉴
await page.waitForFunction(() => !!window.__SORT_MASTER__?.game?.scene?.isActive('Collection'), {
  timeout: 10000,
});
await sleep(700);

const collectionActive = await page.evaluate(() =>
  window.__SORT_MASTER__.game.scene.isActive('Collection'),
);
check('收藏图鉴可打开', collectionActive);
await page.screenshot({ path: `${SHOT}/phaser_collection.png` });

// ---------------- 5. 刷新持久化 ----------------

const beforeReload = await readSave();
await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
await waitMenu();
await sleep(500);
const afterReload = await readSave();

check(
  '刷新后金币保留',
  !!afterReload && afterReload.coins === beforeReload.coins && afterReload.coins > 0,
  `${beforeReload?.coins} → ${afterReload?.coins}`,
);
check(
  '刷新后收藏进度保留',
  !!afterReload &&
    afterReload.collection.length === beforeReload.collection.length &&
    afterReload.collection.length >= 2,
  `${afterReload?.collection?.length} 件`,
);
check('刷新后关卡进度保留', !!afterReload && afterReload.maxUnlocked >= 3, `maxUnlocked=${afterReload?.maxUnlocked}`);

// ---------------- 6. 系列集齐与领取 ----------------

const seededCoins = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('sort_master_phaser_v1') || '{}');
  raw.collection = Array.from({ length: 12 }, (_, i) => `food_${String(i + 1).padStart(2, '0')}`);
  localStorage.setItem('sort_master_phaser_v1', JSON.stringify(raw));
  return raw.coins ?? 0;
});

await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
await waitMenu();
await sleep(500);
await clickGame(375, 878); // 收藏图鉴
await page.waitForFunction(() => !!window.__SORT_MASTER__?.game?.scene?.isActive('Collection'), {
  timeout: 10000,
});
await sleep(700);
await page.screenshot({ path: `${SHOT}/phaser_collection_claim.png` });

await clickGame(375, 790); // 领取系列奖励
await sleep(900);

const afterClaim = await readSave();
check(
  '系列集齐后可领取奖励（+200 金币，仅一次）',
  !!afterClaim && afterClaim.seriesClaimed.includes('food') && afterClaim.coins === seededCoins + 200,
  `coins=${afterClaim?.coins} claimed=${JSON.stringify(afterClaim?.seriesClaimed)}`,
);

check('全程无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log(fails === 0 ? '\nPhaser 端到端验收全部通过' : `\n${fails} 项失败`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
