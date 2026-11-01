/**
 * Phaser 版端到端验收（真实 Chrome + 真实点击）。
 *
 * 1. 菜单渲染与画布尺寸
 * 2. 专项：构造 A,B,A,C,A 的点击序列，验证「三个不相邻相同物品」消除
 * 3. 完整通关：按关卡解法逐击，验证遮挡、消除、胜利、存档
 * 4. 刷新后进度保留
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://127.0.0.1:4173/sort-master/';
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
  args: ['--no-first-run', '--disable-gpu', '--user-data-dir=C:/Users/25370/AppData/Local/Temp/ep-phaser2'],
  defaultViewport: { width: 500, height: 900, deviceScaleFactor: 2 },
});

const page = await browser.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

const waitMenu = () =>
  page.waitForFunction(() => !!window.__SORT_MASTER__?.game?.scene?.isActive('Menu'), { timeout: 20000 });
const waitGame = () =>
  page.waitForFunction(() => !!window.__SORT_MASTER__?.game?.scene?.isActive('Game'), { timeout: 15000 });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await waitMenu();
await sleep(400);

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

// ---------------- 专项：不相邻三消 ----------------

async function readState() {
  return page.evaluate(() => {
    const s = window.__SORT_MASTER__.game.scene.getScene('Game').session;
    return {
      slotTypes: s.slots.all.map((x) => x.itemId),
      remaining: s.board.remaining,
      clickable: s.board.clickable().map((t) => ({
        id: t.instanceId,
        type: t.itemId,
        x: t.x,
        y: t.y,
        w: t.w,
        h: t.h,
      })),
    };
  });
}

async function tryNonAdjacent() {
  // 用调试钩子直接进入第 1 关（之后全部通过真实点击操作）
  await page.evaluate(() => {
    const menu = window.__SORT_MASTER__.game.scene.getScene('Menu');
    menu.scene.start('Game', { levelId: 1 });
  });
  await waitGame();
  await sleep(700);

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await page.evaluate(() => window.__SORT_MASTER__.game.scene.getScene('Game').scene.restart({ levelId: 1 }));
      await sleep(700);
    }

    let typeA = null;
    let patternOk = true;
    const slotBeforeLast = [];

    // 目标序列：A, B, A, C, A → A 的三个位置为 0,2,4（不相邻）
    for (let step = 0; step < 5; step++) {
      const st = await readState();
      if (step === 4) slotBeforeLast.push(...st.slotTypes);

      let choice = null;
      if (step === 0) {
        choice = st.clickable[0];
        if (choice) typeA = choice.type;
      } else if (step === 1) {
        choice = st.clickable.find((t) => t.type !== typeA);
      } else if (step === 2) {
        choice = st.clickable.find((t) => t.type === typeA);
      } else if (step === 3) {
        choice = st.clickable.find((t) => t.type !== typeA);
      } else {
        choice = st.clickable.find((t) => t.type === typeA);
      }

      if (!choice) {
        patternOk = false;
        break;
      }

      await clickGame(choice.x + choice.w / 2, 150 + choice.y + choice.h / 2);
      await sleep(300);
    }

    if (!patternOk) continue;

    const after = await readState();
    const remainingA = after.slotTypes.filter((t) => t === typeA).length;

    // 构造序列中 A 位于 0,2,4，若已消除则剩余 A 必为 0
    if (remainingA === 0) {
      return { ok: true, typeA, slotBeforeLast, after: after.slotTypes };
    }
  }

  return { ok: false };
}

const na = await tryNonAdjacent();
check('三个不相邻相同物品可消除（真实点击 A,B,A,C,A）', na.ok, na.ok ? `type=${na.typeA} 槽内序列=${na.slotBeforeLast.join(',')}` : '未构造成功');

// ---------------- 完整通关 ----------------

await page.reload({ waitUntil: 'domcontentloaded' });
await waitMenu();
await sleep(400);

await clickGame(375, 748);
await waitGame();
await sleep(800);

const info = await page.evaluate(() => {
  const s = window.__SORT_MASTER__.game.scene.getScene('Game');
  return {
    levelId: s.levelId,
    total: s.session.board.tiles.length,
    clickable: s.session.board.clickable().length,
    solution: s.level.solution,
    tiles: s.session.board.tiles.map((t) => ({
      id: t.instanceId,
      itemId: t.itemId,
      x: t.x,
      y: t.y,
      w: t.w,
      h: t.h,
    })),
  };
});

check('进入游戏并加载关卡', info.levelId >= 1 && info.total > 0, `L${info.levelId} ${info.total}件`);
check('存在被遮挡物品（真实遮挡）', info.clickable < info.total, `可点 ${info.clickable}/${info.total}`);
await page.screenshot({ path: `${SHOT}/phaser_game.png` });

const tileById = new Map(info.tiles.map((t) => [t.id, t]));
let clears = 0;
let picked = 0;
let previousRemaining = info.total;

for (const id of info.solution) {
  const t = tileById.get(id);
  if (!t) continue;

  const before = await page.evaluate(() =>
    window.__SORT_MASTER__.game.scene.getScene('Game').session.slots.all.map((x) => x.itemId),
  );

  for (let attempt = 0; attempt < 3; attempt++) {
    await clickGame(t.x + t.w / 2, 150 + t.y + t.h / 2);
    await sleep(280);

    const after = await page.evaluate(() => {
      const s = window.__SORT_MASTER__.game.scene.getScene('Game').session;
      return { remaining: s.board.remaining, types: s.slots.all.map((x) => x.itemId) };
    });

    if (after.remaining < previousRemaining) {
      previousRemaining = after.remaining;
      if (before.length + 1 - after.types.length >= 3) clears++;
      picked++;
      if (picked === 5) await page.screenshot({ path: `${SHOT}/phaser_tray.png` });
      break;
    }
  }
}

const final = await page.evaluate(() => {
  const s = window.__SORT_MASTER__.game.scene.getScene('Game').session;
  return { state: s.state, remaining: s.board.remaining, stars: s.stars() };
});

check('按解法点击可清空棋盘并通关', final.state === 'victory' && final.remaining === 0, JSON.stringify(final));
check('过程中发生多次消除', clears >= 2, `clears=${clears}`);

await sleep(900);
await page.screenshot({ path: `${SHOT}/phaser_result.png` });

const saveRaw = await page.evaluate(() => localStorage.getItem('sort_master_phaser_v1'));
const saved = saveRaw ? JSON.parse(saveRaw) : null;
check(
  '通关后写入存档',
  !!saved && Array.isArray(saved.completed) && saved.completed.includes(info.levelId),
  saveRaw ? saveRaw.slice(0, 80) : 'null',
);

// ---------------- 刷新后保留 ----------------

await page.reload({ waitUntil: 'domcontentloaded' });
await waitMenu();
await sleep(400);
const persisted = await page.evaluate(() => {
  const raw = localStorage.getItem('sort_master_phaser_v1');
  return raw ? JSON.parse(raw) : null;
});
check(
  '刷新后进度保留',
  !!persisted && persisted.completed.includes(info.levelId) && persisted.maxUnlocked >= info.levelId + 1,
  persisted ? `maxUnlocked=${persisted.maxUnlocked}` : 'null',
);

check('全程无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log(fails === 0 ? '\nPhaser 端到端验收全部通过' : `\n${fails} 项失败`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
