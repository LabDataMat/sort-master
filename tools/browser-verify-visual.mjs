/**
 * 视觉重构专项验收（真实 Chrome，2x 像素密度）：
 * 1. 新素材全部接入（物品/托盘/槽位/按钮/道具图标）
 * 2. 堆叠视觉：旋转、接触阴影、遮挡亮度
 * 3. 动画帧：按下 → 抬起 → 飞入 → 消除爆发
 * 4. 输出细节截图（首页 / 第2关 / 堆叠特写 / 收纳槽特写 / 通关奖励）
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:8377/playable-preview/index.html';
const SHOT = 'docs/screenshots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? '  [' + e + ']' : ''}`);
  if (!c) fails++;
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-first-run', '--disable-gpu', '--user-data-dir=C:/Users/25370/AppData/Local/Temp/ep-visual'],
  defaultViewport: { width: 500, height: 900, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle2' });
await sleep(600);
await page.evaluate(() => localStorage.removeItem('sort_master_save_v1'));
await page.reload({ waitUntil: 'networkidle2' });
await sleep(800);

// ---------- 1. 素材接入检查 ----------
const assets = await page.evaluate(async () => {
  const list = [
    '../assets/resources/textures/items/car.png',
    '../assets/resources/textures/items/banana.png',
    '../assets/resources/textures/items/icecream.png',
    '../assets/resources/textures/items/book.png',
    '../assets/resources/textures/ui/tray.png',
    '../assets/resources/textures/ui/slot_cell.png',
    '../assets/resources/textures/ui/btn_primary.png',
    '../assets/resources/textures/ui/level_badge.png',
    '../assets/resources/textures/ui/icon_undo.png',
    '../assets/resources/textures/ui/table.png',
  ];
  const out = {};
  for (const p of list) {
    try {
      const r = await fetch(p);
      out[p.split('/').pop()] = r.status;
    } catch {
      out[p.split('/').pop()] = 0;
    }
  }
  return out;
});
check('新素材全部可加载（10 项）', Object.values(assets).every((s) => s === 200), JSON.stringify(assets));

await page.screenshot({ path: `${SHOT}/visual_home.png` });

// ---------- 2. 第 2 关堆叠视觉 ----------
await page.evaluate(() => {
  const strHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h >>> 0; };
  const base = {
    schemaVersion: 2, currentLevel: 2, maxUnlockedLevel: 2, completedLevels: [1], levelStars: { 1: 3 },
    coins: 500, boosters: { undo: 2, shuffle: 2, remove: 1, extra_slot: 1 }, playerLevel: 3, playerXp: 40,
    collection: {}, fragments: 30, seriesCompleted: [],
    dailyReward: { lastClaimDate: '', streak: 0 }, settings: { musicOn: true, sfxOn: true },
    dailyTasks: { date: '', progress: {}, claimed: [] }, claims: [],
    stats: { gamesPlayed: 1, wins: 1, coinsEarned: 200, coinsSpent: 0, maxCombo: 3,
      adStats: { ad_request_count: 0, ad_load_success_count: 0, ad_show_count: 0, ad_complete_count: 0, ad_reward_count: 0, ad_error_count: 0 } },
  };
  localStorage.setItem('sort_master_save_v1', JSON.stringify({ ...base, checksum: strHash(JSON.stringify(base)) }));
});
await page.reload({ waitUntil: 'networkidle2' });
await sleep(600);
await page.click('#start');
await sleep(1100);

const visual = await page.evaluate(() => {
  const boardRect = document.querySelector('.board').getBoundingClientRect();
  const tiles = Array.from(document.querySelectorAll('.tile'));
  const rots = tiles.map((t) => {
    const tr = getComputedStyle(t).transform;
    return tr;
  });
  const rotated = rots.filter((t) => t && t !== 'none' && !t.startsWith('matrix(1, 0, 0, 1')).length;
  const boardBg = getComputedStyle(document.querySelector('.board')).backgroundImage;
  const trayBg = getComputedStyle(document.querySelector('.tray')).backgroundImage;
  const slotBg = getComputedStyle(document.querySelector('.slot')).backgroundImage;
  const boosterSrc = document.querySelector('.booster img')?.getAttribute('src') ?? '';
  const tileFilter = getComputedStyle(tiles[0].querySelector('img')).filter;
  const dimmed = document.querySelectorAll('.tile.dim').length;
  // 堆集中度：所有物品的包围盒相对棋盘的比例
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const d of tiles) {
    const b = d.getBoundingClientRect();
    minX = Math.min(minX, b.left); maxX = Math.max(maxX, b.right);
    minY = Math.min(minY, b.top); maxY = Math.max(maxY, b.bottom);
  }
  const pileW = (maxX - minX) / boardRect.width;
  const pileH = (maxY - minY) / boardRect.height;
  const cx = ((minX + maxX) / 2 - (boardRect.left + boardRect.width / 2)) / boardRect.width;
  const cy = ((minY + maxY) / 2 - (boardRect.top + boardRect.height / 2)) / boardRect.height;
  return { tiles: tiles.length, rotated, boardBg, trayBg, slotBg, boosterSrc, tileFilter, dimmed, pileW, pileH, cx, cy, clickable: tiles.length - dimmed };
});
check('第 2 关 45 个物品渲染', visual.tiles === 45, `tiles=${visual.tiles}`);
check('物品带自然旋转（非统一矩阵）', visual.rotated >= visual.tiles - 3, `rotated=${visual.rotated}/${visual.tiles}`);
check('棋盘使用桌面场景贴图', visual.boardBg.includes('table.png'), visual.boardBg.slice(0, 60));
check('收纳托盘使用新 2.5D 素材', visual.trayBg.includes('tray.png'));
check('槽位使用凹槽素材', visual.slotBg.includes('slot_cell.png'));
check('道具按钮使用 3D 图标', visual.boosterSrc.includes('icon_undo'));
check('物品带接触投影', visual.tileFilter.includes('drop-shadow'), visual.tileFilter.slice(0, 60));
check('遮挡物品存在（真实堆叠）', visual.dimmed > 0, `dimmed=${visual.dimmed}`);
check('物品集中成堆（包围盒 ≤ 85% 棋盘宽）', visual.pileW <= 0.85 && visual.pileW >= 0.5, `pileW=${(visual.pileW * 100).toFixed(0)}%`);
check('堆有厚度（包围盒 ≥ 45% 棋盘高）', visual.pileH >= 0.45, `pileH=${(visual.pileH * 100).toFixed(0)}%`);
check('初始可点击占比低（需逐层清理）', visual.clickable / visual.tiles <= 0.35, `${visual.clickable}/${visual.tiles}`);
check('物品堆居中（偏移 ≤ 6%）', Math.abs(visual.cx) <= 0.06 && Math.abs(visual.cy) <= 0.06, `offset=${(visual.cx * 100).toFixed(1)}%,${(visual.cy * 100).toFixed(1)}%`);

// 细节截图：棋盘（堆叠特写）
const boardBox = await page.evaluate(() => {
  const b = document.querySelector('.board').getBoundingClientRect();
  return { x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(b.width, 500 - b.x), height: Math.min(b.height, 900 - b.y) };
});
await page.screenshot({ path: `${SHOT}/visual_stacking.png`, clip: boardBox });
await page.screenshot({ path: `${SHOT}/visual_level2.png` });

// ---------- 3. 动画帧（第 1 关，按解法点击） ----------
await page.evaluate(() => {
  const strHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h >>> 0; };
  const raw = JSON.parse(localStorage.getItem('sort_master_save_v1'));
  raw.currentLevel = 1;
  const { checksum, ...rest } = raw;
  raw.checksum = strHash(JSON.stringify(rest));
  localStorage.setItem('sort_master_save_v1', JSON.stringify(raw));
});
await page.reload({ waitUntil: 'networkidle2' });
await sleep(600);
await page.click('#start');
await sleep(900);
const solution = await page.evaluate(async () => {
  const res = await fetch('../assets/resources/data/levels/level_001.json');
  const lv = await res.json();
  return lv.solutionValidation.solution;
});

// 第一击：捕获按下/抬起帧
await page.click(`.tile[data-id="${solution[0]}"]`);
await sleep(60);
await page.screenshot({ path: `${SHOT}/visual_anim_press.png`, clip: boardBox });
await sleep(120);
await page.screenshot({ path: `${SHOT}/visual_anim_lift.png`, clip: boardBox });
await sleep(700);

// 连点至第三击（触发三连），捕获爆发帧
await page.click(`.tile[data-id="${solution[1]}"]`);
await sleep(600);
await page.click(`.tile[data-id="${solution[2]}"]`);
await sleep(520);
await page.screenshot({ path: `${SHOT}/visual_anim_match.png`, clip: { x: 0, y: 560, width: 500, height: 300 } });
await sleep(900);

// 收纳槽细节（此时槽内应有物品）
const trayBox = await page.evaluate(() => {
  const b = document.querySelector('.tray').getBoundingClientRect();
  return { x: b.x - 8, y: b.y - 10, width: b.width + 16, height: b.height + 30 };
});
await page.screenshot({ path: `${SHOT}/visual_tray.png`, clip: trayBox });

// ---------- 4. 通关 → 宝箱 → 奖励截图 ----------
const remaining = solution.slice(3);
for (const id of remaining) {
  await page.click(`.tile[data-id="${id}"]`);
  await sleep(430);
}
await sleep(900);
const chest = await page.evaluate(() => !!document.querySelector('.chest-overlay'));
check('通关出现宝箱界面', chest);
await page.click('#openChest');
await sleep(1600);
const reveal = await page.evaluate(() => ({
  name: document.querySelector('.reveal-name')?.textContent ?? '',
  rarity: document.querySelector('.rarity-chip')?.textContent ?? '',
  img: document.querySelector('.reveal-img')?.getAttribute('src') ?? '',
}));
check('开箱展示收藏品（含素材）', !!reveal.name && reveal.img.includes('/collect/'), `${reveal.name} / ${reveal.rarity}`);
await page.screenshot({ path: `${SHOT}/visual_reward.png` });

check('全程无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log(fails === 0 ? '\n视觉验收全部通过' : `\n${fails} 项失败`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
