/**
 * 回归测试：三消后继续放入收纳槽的物品必须可见（曾因 .gather 动画类残留导致消失）。
 * 验证点：
 * 1. 一组三消后，放入原槽位的物品可见（opacity≈1、无残留动画类）
 * 2. 连续两次三消后仍正常
 * 3. 槽位物品数量与 DOM 一致，无透明残留
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:8377/playable-preview/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (n, c, e = '') => {
  console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? '  [' + e + ']' : ''}`);
  if (!c) fails++;
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-first-run', '--disable-gpu', '--user-data-dir=C:/Users/25370/AppData/Local/Temp/ep-slotbug'],
  defaultViewport: { width: 500, height: 900 },
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
await page.click('#start');
await sleep(900);

const solution = await page.evaluate(async () => {
  const res = await fetch('../assets/resources/data/levels/level_001.json');
  const lv = await res.json();
  return lv.solutionValidation.solution;
});

const slotState = () =>
  page.evaluate(() => {
    const slots = Array.from(document.querySelectorAll('.slot'));
    return slots
      .map((s, i) => {
        const img = s.querySelector('img');
        if (!img) return null;
        const cs = getComputedStyle(img);
        return {
          idx: i,
          opacity: Number(cs.opacity),
          animation: cs.animationName,
          cls: s.className,
          src: (img.getAttribute('src') || '').split('/').pop(),
        };
      })
      .filter(Boolean);
  });

// ---- 全程逐步校验：每次拾取后，所有槽位物品必须可见 ----
let matches = 0;
let prevCount = 0;
let invisible = 0;
const invisibleSamples = [];
for (let i = 0; i < solution.length; i++) {
  await page.click(`.tile[data-id="${solution[i]}"]`);
  await sleep(620);
  const st = await slotState();
  // 统计发生消除次数（槽内数量回落）
  if (st.length < prevCount) matches++;
  prevCount = st.length;
  const bad = st.filter((x) => x.opacity < 0.9 || x.cls.includes('gather'));
  if (bad.length) {
    invisible += bad.length;
    invisibleSamples.push({ step: i, bad });
  }
}
await sleep(900);
check('通关前至少发生 3 次消除', matches >= 3, `matches=${matches}`);
check('每一步槽位物品均可见（无消失 bug）', invisible === 0, invisible ? JSON.stringify(invisibleSamples.slice(0, 2)) : '');
check('结算后槽位为空', (await slotState()).length === 0, JSON.stringify(await slotState()));
const chest = await page.evaluate(() => !!document.querySelector('.chest-overlay'));
check('完整通关并出现宝箱', chest);
check('全程无控制台错误', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log(fails === 0 ? '\n收纳槽回归测试全部通过' : `\n${fails} 项失败`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
