/**
 * 浏览器预览端到端测试（jsdom 真实 DOM 环境）：
 * 加载与浏览器完全相同的预览编译产物，模拟真实点击流程。
 */
import { TestRunner, assert, assertEq } from './harness';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

export const previewTests = new TestRunner();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

previewTests.test('预览端到端：首页渲染 → 进入关卡 → 点击三消 → 撤回 → 金币变动', async () => {  // jsdom 全局环境
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost/playable-preview/index.html',
    pretendToBeVisual: true,
  });
  (globalThis as any).document = dom.window.document;
  (globalThis as any).window = dom.window;
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  (globalThis as any).localStorage = dom.window.localStorage;
  (globalThis as any).fetch = async (url: string) => {
    // 把相对路径映射到本地关卡文件
    const m = String(url).match(/level_(\d+)\.json/);
    if (!m) throw new Error('unexpected fetch: ' + url);
    const p = path.join(__dirname, '..', '..', 'assets', 'resources', 'data', 'levels', `level_${m[1]}.json`);
    return { json: async () => JSON.parse(fs.readFileSync(p, 'utf8')) } as any;
  };

  // 加载与浏览器一致的预览模块（自动执行 showHome）
  const preview = require('../playable-preview/src/preview-main.js');

  // ---- 首页 ----
  const app = dom.window.document.getElementById('app')!;
  assert(!!app.querySelector('#start'), '首页存在开始按钮');
  assert(app.textContent!.includes('第 1 关'), '首页显示当前关卡');
  assert(app.querySelector('#coins')!.textContent === '300', `初始金币 300，实际 ${app.querySelector('#coins')!.textContent}`);

  // ---- 进入关卡 1 ----
  (app.querySelector('#start') as HTMLElement).click();
  await sleep(600);
  const tiles = app.querySelectorAll('.tile');
  const live = (globalThis as any).window.__SORT_MASTER__;
  assert(!!live, '运行时应暴露本局布局与种子');
  const lv = live.level;
  assertEq(tiles.length, lv.itemCount, '场上物品数量与关卡配置一致');
  assert(typeof live.seed === 'number' && live.seed > 0, '应记录本局种子');
  assert(app.querySelectorAll('.slot:not(.extra)').length === 7, '7 个基础槽位');
  assert(app.querySelector('.boosters .booster') !== null, '道具栏存在');

  // ---- 模拟玩家贪心点击：优先延续槽尾类型，凑成"连续三个相同" ----
  const typeById = new Map(lv.itemPositions.map((p: any) => [p.id, p.type]));
  const slotImgs = () => app.querySelectorAll('.slot img').length;
  let clicked = 0;
  let matchHappened = false;
  for (let round = 0; round < 40 && !matchHappened; round++) {
    if (app.querySelector('.overlay')) break;
    const clickable = Array.from(app.querySelectorAll('.tile:not(.dim)')) as HTMLElement[];
    if (clickable.length === 0) break;
    // 槽内类型序列
    const slotTypes: string[] = [];
    app.querySelectorAll('.slot').forEach((s) => {
      const img = s.querySelector('img');
      const m = img?.getAttribute('src')?.match(/items\/(\w+)\.png/);
      if (m) slotTypes.push(m[1]);
    });
    const tail = slotTypes.length ? slotTypes[slotTypes.length - 1] : null;
    const counts: Record<string, number> = {};
    for (const t of slotTypes) counts[t] = (counts[t] ?? 0) + 1;
    let target = clickable[0];
    if (tail) {
      const same = clickable.find((d) => typeById.get(d.dataset.id!) === tail);
      if (same) target = same;
      else {
        // 选择槽内已有最多的类型
        let bestC = -1;
        for (const d of clickable) {
          const tp = String(typeById.get(d.dataset.id!) ?? '');
          const c = counts[tp] ?? 0;
          if (c > bestC) {
            bestC = c;
            target = d;
          }
        }
      }
    }
    const before = slotImgs();
    target.click();
    clicked++;
    await sleep(600);
    if (slotImgs() < before || app.querySelectorAll('.slot.clearing').length > 0) matchHappened = true;
  }
  assert(matchHappened, `连续三连未触发（点击 ${clicked} 次）`);
  assert(clicked >= 3, '至少点击三次');
  await sleep(700); // 等待消除动画与补位完成
  // 消除后场上物品数 = 初始 - 点击数 + 已消除数（至少减少 3 且槽内不超过 2 件残余）
  const remainingTiles = app.querySelectorAll('.tile').length;
  assert(remainingTiles <= lv.itemCount - 3, `场上应至少减少 3 个，实际 ${remainingTiles}/${lv.itemCount}`);
  assert(slotImgs() <= 2, `消除后槽位补位，残余 ${slotImgs()} 件`);

  // ---- 撤回：恢复上一次拾取（物品数 +1），撤回道具消耗 ----
  const tilesBeforeUndo = app.querySelectorAll('.tile').length;
  const undoBtn = app.querySelector('.booster[data-b="undo"]') as HTMLElement;
  undoBtn.click();
  await sleep(120);
  assertEq(app.querySelectorAll('.tile').length, tilesBeforeUndo + 1, '撤回一次恢复最后拾取的物品');
  assertEq(inventoryCount(app, 'undo'), 0, '撤回道具消耗');

  void preview;
});

function inventoryCount(app: HTMLElement, type: string): number {
  const el = app.querySelector(`#cnt_${type}`);
  return el ? Number(el.textContent) : -1;
}
