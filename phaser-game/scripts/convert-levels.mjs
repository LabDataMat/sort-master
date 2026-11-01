/**
 * 关卡转换脚本：旧项目「关卡规格」→ 本项目的完整关卡数据。
 *
 * 背景：
 *   旧项目 F:\Game3.0 的 level_XXX.json 只包含参数（物品数、类型数、层数、半径…），
 *   具体坐标由旧项目运行时生成器产出。因此不能直接复制，必须转换。
 *
 * 流程：
 *   1. 读取旧项目规格 JSON
 *   2. 调用旧项目生成器（已编译的 LevelGenerator.js）按固定种子生成布局
 *   3. 用【本项目的消除规则】（任意三个相同即消除）完整模拟，验证可解
 *   4. 写出 public/levels/level_XXX.json
 *
 * 用法：
 *   node scripts/convert-levels.mjs
 *   OLD_ROOT=F:/Game3.0 node scripts/convert-levels.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const OLD_ROOT = process.env.OLD_ROOT || 'F:/Game3.0';
const SRC_DIR = path.join(OLD_ROOT, 'assets/resources/data/levels');
const GENERATOR = path.join(OLD_ROOT, 'build/assets/scripts/level/LevelGenerator.js');
const OUT_DIR = path.join(PROJECT_ROOT, 'public/levels');

const CAPACITY = 7;
const RATIO = 0.35;

/** 旧项目生成器（在 main 中加载） */
let generateLevel;

function isAbove(a, ai, b, bi) {
  return a.layer > b.layer || (a.layer === b.layer && ai > bi);
}

function blockedCount(tiles, i) {
  let c = 0;
  for (let j = 0; j < tiles.length; j++) {
    if (i === j || tiles[j].removed || tiles[i].removed) continue;
    const a = tiles[j];
    const b = tiles[i];
    if (!isAbove(a, j, b, i)) continue;
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox >= Math.min(a.w, b.w) * RATIO && oy >= Math.min(a.h, b.h) * RATIO) c++;
  }
  return c;
}

/** 按本项目规则完整模拟一局，返回是否清空 */
function simulate(level, order) {
  const tiles = level.items.map((t, i) => ({
    ...t,
    idx: i,
    removed: false,
    frozen: t.frozen || 0,
    locked: !!t.locked,
  }));
  const byId = new Map(tiles.map((t) => [t.instanceId, t]));
  let slot = [];
  let matches = 0;

  for (const id of order) {
    const t = byId.get(id);
    if (!t || t.removed) return { ok: false, reason: 'missing' };
    if (t.frozen > 0) return { ok: false, reason: 'frozen' };
    if (t.locked) return { ok: false, reason: 'locked' };
    if (blockedCount(tiles, t.idx) > 0) return { ok: false, reason: 'occluded' };
    if (slot.length >= CAPACITY) return { ok: false, reason: 'overflow' };

    t.removed = true;
    slot.push({ id: t.instanceId, type: t.itemId });

    let cleared = false;
    for (;;) {
      const counts = new Map();
      for (const s of slot) counts.set(s.type, (counts.get(s.type) || 0) + 1);
      let hit = null;
      for (const [type, c] of counts) {
        if (c >= 3) {
          hit = type;
          break;
        }
      }
      if (!hit) break;
      let need = 3;
      slot = slot.filter((s) => {
        if (s.type === hit && need > 0) {
          need--;
          return false;
        }
        return true;
      });
      matches++;
      cleared = true;
    }

    if (cleared) {
      for (const x of tiles) if (x.frozen > 0) x.frozen--;
      for (const x of tiles) if (x.locked && matches >= (x.unlockAfterMatches || 0)) x.locked = false;
    }
  }

  return { ok: tiles.every((t) => t.removed) && slot.length === 0, reason: 'left', matches };
}

function bakeOne(spec) {
  const seeds = [spec.levelId * 7919 + 13, spec.levelId * 104729 + 7, spec.levelId * 31 + 5, spec.levelId * 9973 + 101];
  let lastErr = '';

  for (const seed of seeds) {
    let gen;
    try {
      gen = generateLevel(spec, seed >>> 0);
    } catch (e) {
      lastErr = e.message;
      continue;
    }

    const lv = gen.level;
    const level = {
      levelId: spec.levelId,
      slotCapacity: CAPACITY,
      difficulty: spec.difficulty,
      difficultyLabel: spec.difficultyLabel,
      itemCount: lv.itemPositions.length,
      layerCount: lv.layerCount,
      itemTypes: lv.itemTypes,
      boosterLimit: lv.boosterLimit || 0,
      items: lv.itemPositions.map((t) => ({
        instanceId: t.id,
        itemId: t.type,
        layer: t.layer,
        x: t.x,
        y: t.y,
        w: t.w,
        h: t.h,
        frozen: 0,
        locked: false,
        unlockAfterMatches: 0,
      })),
      solution: lv.solutionValidation.solution.slice(),
    };

    const frozen = new Set(lv.obstacles?.frozenTileIds || []);
    const locked = new Set(lv.obstacles?.lockedTileIds || []);
    const unlockAfter = lv.obstacles?.lockedUnlockAfterMatches || 2;
    for (const it of level.items) {
      if (frozen.has(it.instanceId)) it.frozen = 1;
      if (locked.has(it.instanceId)) {
        it.locked = true;
        it.unlockAfterMatches = unlockAfter;
      }
    }

    const sim = simulate(level, level.solution);
    if (!sim.ok) {
      lastErr = 'replay failed: ' + sim.reason;
      continue;
    }
    return { level, seed };
  }

  throw new Error(`L${spec.levelId} 转换失败：${lastErr}`);
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('未找到旧项目关卡目录：' + SRC_DIR);
    process.exit(1);
  }

  try {
    ({ generateLevel } = require(GENERATOR));
  } catch (e) {
    console.error('未找到旧项目生成器（需先在旧项目执行 npm run build）：' + GENERATOR);
    console.error(e.message);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => /^level_\d{3}\.json$/.test(f))
    .sort();

  let total = 0;
  let items = 0;
  const rows = [];

  for (const f of files) {
    const spec = JSON.parse(fs.readFileSync(path.join(SRC_DIR, f), 'utf8'));
    const { level, seed } = bakeOne(spec);
    fs.writeFileSync(path.join(OUT_DIR, f), JSON.stringify(level));
    total++;
    items += level.itemCount;
    rows.push({ id: level.levelId, items: level.itemCount, layers: level.layerCount, seed });
  }

  console.log(`转换完成：${total} 关，共 ${items} 件物品`);
  console.log('抽样：', rows.slice(0, 3).map((r) => `L${r.id}:${r.items}件/${r.layers}层`).join('  '));
  console.log('末三关：', rows.slice(-3).map((r) => `L${r.id}:${r.items}件/${r.layers}层`).join('  '));
}

main();
