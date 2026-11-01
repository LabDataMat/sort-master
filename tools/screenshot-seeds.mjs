/**
 * 同关卡连续生成三次截图（证明每次布局不同且均通过可解性验证）。
 * 固定第 2 关，使用三个不同 ?seed 参数；每次进入关卡都重新生成布局。
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:8377/playable-preview/index.html';
const SHOT = 'docs/screenshots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const seeds = [111, 222, 333];
const labels = ['a', 'b', 'c'];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-first-run', '--disable-gpu', '--user-data-dir=C:/Users/25370/AppData/Local/Temp/ep-seeds'],
  defaultViewport: { width: 500, height: 900, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

// 初始清档并进入第 2 关
await page.goto(URL, { waitUntil: 'networkidle2' });
await sleep(400);
await page.evaluate(() => localStorage.removeItem('sort_master_save_v1'));
await page.reload({ waitUntil: 'networkidle2' });
await sleep(500);

const reports = [];

for (let i = 0; i < seeds.length; i++) {
  const seed = seeds[i];
  const label = labels[i];

  // 写入第 2 关存档
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

  // 用 ?seed= 强制本局布局种子（复现）；每次不同 → 不同堆叠
  await page.goto(`${URL}?seed=${seed}`, { waitUntil: 'networkidle2' });
  await sleep(500);
  await page.waitForSelector('#start', { timeout: 5000 });
  await page.click('#start');
  // 等待本局布局真正渲染（出现 .tile）
  await page.waitForSelector('.tile', { timeout: 8000 });
  await sleep(900);

  // 读取运行时生成的本局信息
  const info = await page.evaluate(() => {
    const m = (window).__SORT_MASTER__;
    if (!m) return null;
    const lv = m.level;
    const tiles = Array.from(document.querySelectorAll('.tile'));
    const board = document.querySelector('.board');
    if (!board) return null;
    const boardRect = board.getBoundingClientRect();
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const d of tiles) {
      const b = d.getBoundingClientRect();
      minX = Math.min(minX, b.left); maxX = Math.max(maxX, b.right);
      minY = Math.min(minY, b.top); maxY = Math.max(maxY, b.bottom);
    }
    return {
      seed: m.seed,
      levelId: m.levelId,
      verified: lv.solutionValidation?.verified,
      itemCount: lv.itemCount,
      typeCount: lv.itemTypes.length,
      layers: lv.layerCount,
      edges: lv.occlusion?.edgeCount,
      tiles: tiles.length,
      clickable: tiles.length - document.querySelectorAll('.tile.dim').length,
      pileW: +(((maxX - minX) / boardRect.width) * 100).toFixed(0),
      pileH: +(((maxY - minY) / boardRect.height) * 100).toFixed(0),
    };
  });
  reports.push({ label, requestedSeed: seed, info });

  await page.screenshot({ path: `${SHOT}/gen_l2_${label}.png` });
  const boardBox = await page.evaluate(() => {
    const b = document.querySelector('.board').getBoundingClientRect();
    return { x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(b.width, 500 - b.x), height: Math.min(b.height, 900 - b.y) };
  });
  await page.screenshot({ path: `${SHOT}/gen_l2_${label}_stack.png`, clip: boardBox });
}

// 一致性断言
const seedsUsed = reports.map((r) => r.info.seed).filter((v) => v !== undefined);
const uniqueSeeds = new Set(seedsUsed);
const allVerified = reports.every((r) => r.info && r.info.verified === true);
const allCounts = reports.every((r) => r.info && r.info.itemCount === reports[0].info.itemCount && r.info.typeCount === reports[0].info.typeCount);
const layoutHashes = reports.map((r) => `${r.info.pileW}x${r.info.pileH}/${r.info.edges}/${r.info.clickable}`);

console.log('=== 同一关卡（第 2 关）连续三次生成 ===');
for (const r of reports) {
  const i = r.info;
  console.log(`  [${r.label}] 请求seed=${r.requestedSeed} 实际seed=${i.seed} 物品=${i.itemCount} 类型=${i.typeCount} 层=${i.layers} 遮挡边=${i.edges} 可点击=${i.clickable} 堆=${i.pileW}%x${i.pileH}% 可解=${i.verified}`);
}
console.log('种子各不相同：', uniqueSeeds.size === 3 ? '是' : '否 ' + [...uniqueSeeds]);
console.log('布局互不相同：', new Set(layoutHashes).size === 3 ? '是' : '否 ' + layoutHashes);
console.log('三次均通过可解性验证：', allVerified ? '是' : '否');
console.log('物品总数/种类数恒定（不偷降难度）：', allCounts ? '是' : '否');

await browser.close();
