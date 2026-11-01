/**
 * 真实浏览器端到端验证（puppeteer-core + 系统 Edge 无头模式）。
 * 捕获控制台错误、验证页面渲染、模拟真实点击流程、输出截图。
 * 运行：node tools/browser-verify.mjs
 */
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const EDGE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:8377/playable-preview/index.html';
const SHOT_DIR = 'docs/screenshots';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
  if (!cond) failures++;
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: [
    '--no-first-run',
    '--disable-gpu',
    '--disable-features=msEdgePrintAndPrintPreview',
    `--user-data-dir=C:/Users/25370/AppData/Local/Temp/edge-pptr-${Date.now()}`,
    '--window-size=500,950',
  ],
  defaultViewport: { width: 500, height: 900 },
});

const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
await sleep(800);

// 1. 首页渲染
const hasStart = await page.$('#start');
const coins = await page.$eval('.wallet .pill b', (e) => e.textContent).catch(() => null);
check('首页开始按钮渲染', !!hasStart);
check('首页金币显示', coins === '300', `coins=${coins}`);
check('模块无控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));
await page.screenshot({ path: `${SHOT_DIR}/browser_home.png` });

// 2. 进入关卡（物品数从关卡 JSON 动态读取）
await page.click('#start');
await sleep(900);
const levelInfo = await page.evaluate(async () => {
  const res = await fetch('../assets/resources/data/levels/level_001.json');
  const lv = await res.json();
  return { itemCount: lv.itemCount, types: lv.itemTypes.length, difficulty: lv.difficulty };
});
const tileCount = await page.$$eval('.tile', (els) => els.length);
const slotCount = await page.$$eval('.slot:not(.extra)', (els) => els.length);
check('进入关卡：物品数与关卡配置一致', tileCount === levelInfo.itemCount, `tiles=${tileCount}/${levelInfo.itemCount}`);
check('第 1 关为教学关（≤12 物品、≤3 类型、难度 1）', levelInfo.itemCount <= 12 && levelInfo.types <= 3 && levelInfo.difficulty === 1, JSON.stringify(levelInfo));
check('7 个收纳槽', slotCount === 7, `slots=${slotCount}`);
await page.screenshot({ path: `${SHOT_DIR}/browser_game.png` });

// 3. 真实点击凑"连续三个相同"（模拟玩家贪心：优先延续槽尾类型）
let matchHappened = false;
let clickedTiles = 0;
for (let round = 0; round < 40 && !matchHappened; round++) {
  if (await page.$('.overlay')) break; // 胜利/失败弹窗
  const pick = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('.tile:not(.dim)'));
    const typeOf = {};
    document.querySelectorAll('.tile').forEach((d) => {
      const img = d.querySelector('img');
      typeOf[d.dataset.id] = img ? img.src.match(/items\/(\w+)\.png/)?.[1] : '';
    });
    const hittable = tiles.filter((d) => {
      const r = d.getBoundingClientRect();
      const hitEl = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return hitEl && hitEl.closest('.tile') === d;
    });
    if (!hittable.length) return null;
    const slotTypes = Array.from(document.querySelectorAll('.slot'))
      .map((s) => (s.querySelector('img')?.src.match(/items\/(\w+)\.png/)?.[1] ?? null))
      .filter(Boolean);
    const tail = slotTypes.length ? slotTypes[slotTypes.length - 1] : null;
    const counts = {};
    for (const t of slotTypes) counts[t] = (counts[t] ?? 0) + 1;
    // 优先延续槽尾类型（凑连续），其次选槽内已有 1 个的类型
    let target = null;
    if (tail && hittable.some((d) => typeOf[d.dataset.id] === tail)) target = tail;
    else {
      let best = null;
      let bestC = -1;
      for (const d of hittable) {
        const t = typeOf[d.dataset.id];
        const c = counts[t] ?? 0;
        if (c > bestC) {
          bestC = c;
          best = t;
        }
      }
      target = best;
    }
    const candidates = hittable.filter((d) => typeOf[d.dataset.id] === target);
    const chosen = candidates[0] ?? hittable[0];
    return { id: chosen.dataset.id, slotsNow: slotTypes.length };
  });
  if (!pick) break;
  const slotsBefore = pick.slotsNow;
  await page.click(`.tile[data-id="${pick.id}"]`);
  clickedTiles++;
  await sleep(560);
  // 检测是否发生了消除：槽内物品数不增反减，或场上有三连组消除动画后槽位空出
  const state = await page.evaluate(() => ({
    slotImgs: document.querySelectorAll('.slot img').length,
    clearing: document.querySelectorAll('.slot.clearing').length,
  }));
  if (state.slotImgs < slotsBefore || (state.clearing > 0 && state.slotImgs <= slotsBefore)) {
    matchHappened = true;
  }
}
check('真实点击凑成连续三连并触发消除', matchHappened, `clicked=${clickedTiles}`);

// 4. 撤回（恢复上一次拾取，物品数 +1）
const tilesBeforeUndo = await page.$$eval('.tile', (els) => els.length);
const canUndo = !(await page.$('.overlay'));
if (canUndo && clickedTiles > 0) {
  await page.click('.booster[data-b="undo"]');
  await sleep(300);
  const tilesAfterUndo = await page.$$eval('.tile', (els) => els.length);
  check('撤回恢复上一次拾取', tilesAfterUndo === tilesBeforeUndo + 1, `tiles=${tilesBeforeUndo}→${tilesAfterUndo}`);
} else {
  check('撤回测试跳过（弹窗已出现）', true);
}

// 5. 刷新后存档恢复
await page.reload({ waitUntil: 'networkidle2' });
await sleep(800);
const levelText = await page.evaluate(() => document.body.innerText.includes('第 1 关'));
check('刷新后首页正常（存档可读）', levelText);

check('全程无控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

console.log(failures === 0 ? '\n浏览器 E2E 全部通过' : `\n${failures} 项失败`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
