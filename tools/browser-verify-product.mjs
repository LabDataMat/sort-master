/**
 * 产品级浏览器验收（真实 Chrome）：
 * 首页 → 第 1 关通关（使用关卡内置解法序列）→ 宝箱开启 → 收藏品入册
 * → 收藏册 → 每日任务进度 → 刷新后数据持久化。并输出四张验收截图。
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:8377/playable-preview/index.html';
const SHOT = 'docs/screenshots';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);
  if (!cond) fails++;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-first-run', '--disable-gpu', '--user-data-dir=C:/Users/25370/AppData/Local/Temp/ep-product'],
  defaultViewport: { width: 500, height: 900 },
});
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle2' });
await sleep(700);
await page.evaluate(() => localStorage.removeItem('sort_master_save_v1'));
await page.reload({ waitUntil: 'networkidle2' });
await sleep(800);

// ---------- 1. 首页 ----------
const home = await page.evaluate(() => ({
  start: !!document.querySelector('#start'),
  collection: !!document.querySelector('#collectionEntry'),
  tasks: !!document.querySelector('#qTasks'),
  level: document.querySelector('.lc-num')?.textContent ?? '',
  player: document.querySelector('.avatar')?.textContent ?? '',
  percent: document.querySelector('.cc-pct')?.textContent ?? '',
}));
check('首页渲染：开始挑战 / 收藏册 / 每日任务入口', home.start && home.collection && home.tasks);
check('首页显示当前关卡与玩家等级', home.level.includes('第 1 关') && home.player.includes('Lv.'), `${home.level} ${home.player}`);
check('首页显示收藏进度', home.percent === '0%', home.percent);
await page.screenshot({ path: `${SHOT}/product_home.png` });

// ---------- 2. 第 1 关通关（按关卡解法序列点击） ----------
await page.click('#start');
await sleep(900);
const solution = await page.evaluate(async () => {
  const res = await fetch('../assets/resources/data/levels/level_001.json');
  const lv = await res.json();
  return lv.solutionValidation.solution;
});
check('第 1 关加载解法序列', Array.isArray(solution) && solution.length === 12, `len=${solution?.length}`);

for (const id of solution) {
  await page.click(`.tile[data-id="${id}"]`);
  await sleep(430);
}
await sleep(900);
const chestVisible = await page.evaluate(() => !!document.querySelector('.chest-overlay'));
check('通关后出现收藏宝箱', chestVisible);
await page.screenshot({ path: `${SHOT}/product_chest.png` });

// ---------- 3. 开箱 ----------
await page.click('#openChest');
await sleep(1500);
const reveal = await page.evaluate(() => ({
  name: document.querySelector('.reveal-name')?.textContent ?? '',
  rarity: document.querySelector('.rarity-chip')?.textContent ?? '',
  isNew: !!document.querySelector('.new-badge'),
  desc: document.querySelector('.reveal-desc')?.textContent ?? '',
  progress: document.querySelector('.sp-head b')?.textContent ?? '',
  next: document.querySelector('.next-info')?.textContent ?? '',
}));
check('开箱后展示收藏品名称/稀有度/描述', !!reveal.name && !!reveal.rarity && reveal.desc.length > 6, `${reveal.name} / ${reveal.rarity}`);
check('首次通关标记 NEW', reveal.isNew);
check('展示系列收集进度', /\d+ \/ 12/.test(reveal.progress), reveal.progress);
check('展示下一关解锁信息', reveal.next.includes('第 2 关'), reveal.next);
await page.screenshot({ path: `${SHOT}/product_reward.png` });

// ---------- 4. 收藏册 ----------
await page.click('#toCollection');
await sleep(800);
const col = await page.evaluate(() => ({
  cards: document.querySelectorAll('.cc-card').length,
  owned: document.querySelectorAll('.cc-card.owned').length,
  locked: document.querySelectorAll('.cc-card.locked').length,
  tabs: document.querySelectorAll('.series-tab').length,
  total: document.querySelector('.cs-row b')?.textContent ?? '',
}));
check('收藏册：4 个系列 tab', col.tabs === 4, `tabs=${col.tabs}`);
check('收藏册：当前系列 12 件（已收集 1 件 + 剪影）', col.cards === 12 && col.owned === 1 && col.locked === 11, JSON.stringify(col));
check('收藏册总进度已更新', col.total.startsWith('1 / 48'), col.total);

// 查看详情
await page.click('.cc-card.owned');
await sleep(400);
const detail = await page.evaluate(() => ({
  name: document.querySelector('.detail-popup h3')?.textContent ?? '',
  obtained: document.querySelector('.detail-obtained')?.textContent ?? '',
}));
check('收藏品详情显示获得时间', detail.name.length > 0 && detail.obtained.includes('获得时间'), detail.name);
await page.screenshot({ path: `${SHOT}/product_collection.png` });
await page.click('#closeDetail');
await sleep(300);
await page.click('#back');
await sleep(700);

// ---------- 5. 每日任务 ----------
await page.click('#qTasks');
await sleep(600);
const tasks = await page.evaluate(() => ({
  count: document.querySelectorAll('.task-card').length,
  firstProgress: document.querySelector('.task-meta span')?.textContent ?? '',
  badge: !!document.querySelector('.task-card.done') || !!document.querySelector('.task-bar i'),
}));
check('每日任务：4 个任务', tasks.count === 4, `count=${tasks.count}`);
check('通关事件驱动任务进度', tasks.firstProgress.includes('1 / 3'), tasks.firstProgress);
await page.click('#back');
await sleep(600);

// ---------- 6. 刷新后持久化 ----------
await page.reload({ waitUntil: 'networkidle2' });
await sleep(800);
const afterReload = await page.evaluate(() => ({
  level: document.querySelector('.lc-num')?.textContent ?? '',
  percent: document.querySelector('.cc-pct')?.textContent ?? '',
  coins: document.querySelector('.wallet .pill b')?.textContent ?? '',
}));
check('刷新后关卡推进到第 2 关', afterReload.level.includes('第 2 关'), afterReload.level);
check('刷新后收藏进度保留', afterReload.percent !== '0%', afterReload.percent);

// ---------- 7. 第 2 关难度截图 ----------
await page.click('#start');
await sleep(1000);
const lv2 = await page.evaluate(() => ({
  tiles: document.querySelectorAll('.tile').length,
  clickable: document.querySelectorAll('.tile:not(.dim)').length,
}));
check('第 2 关物品数 45、可点占比明显降低', lv2.tiles === 45 && lv2.clickable < 45, JSON.stringify(lv2));
await page.screenshot({ path: `${SHOT}/product_level2.png` });

check('全程无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log(fails === 0 ? '\n产品级验收全部通过' : `\n${fails} 项失败`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
