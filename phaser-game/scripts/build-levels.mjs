/**
 * 关卡体系重制：按难度断层生成 100 关，并用求解器验证可通关。
 *
 * L1 极简教学 / L2 高难挑战 / L3-5 策略变化 / L6-20 特殊机制 / L21-100 混合难度
 *
 * 性能策略：
 *   - 普通关卡（容量 7、无隐藏）直接复用旧生成器已验证的解法，
 *     因为「不相邻三消」比「连续三消」更宽松，原解法必然仍然成立；
 *   - 仅对减容 / 隐藏关卡启用求解器，并复用遮挡图、限制重试次数。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/levels');
const OLD_ROOT = process.env.OLD_ROOT || 'F:/Game3.0';
const GENERATOR = path.join(OLD_ROOT, 'build/assets/scripts/level/LevelGenerator.js');

const RATIO = 0.35;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const DBG_PATH = 'C:/Users/25370/AppData/Local/Temp/build-progress.log';
function DBG(msg) {
  try {
    fs.appendFileSync(DBG_PATH, msg + '\n');
  } catch {
    /* ignore */
  }
}
DBG('--- start ---');

let generateLevel;
try {
  ({ generateLevel } = require(GENERATOR));
} catch (e) {
  console.error('未找到旧项目生成器，请先在 F:\\Game3.0 执行构建');
  console.error(e.message);
  process.exit(1);
}

// ---------------- 关卡参数表 ----------------

function specFor(id) {
  if (id === 1) {
    return { tutorial: true, itemCount: 9, typeCount: 3, layerCount: 1, frozenCount: 0, lockedCount: 0, slot: 7, boosters: 3, difficulty: 1, label: '新手教学' };
  }
  if (id === 2) {
    return { itemCount: 90, typeCount: 11, layerCount: 6, frozenCount: 0, lockedCount: 0, slot: 7, boosters: 1, difficulty: 9, label: '高难挑战', minDist: 22, radius: 252 };
  }
  if (id <= 5) {
    const k = id - 3;
    return { itemCount: 84 + k * 6, typeCount: 10, layerCount: 5 + (k % 2), frozenCount: 1 + k, lockedCount: 0, slot: 7, boosters: 3, difficulty: 8, label: '策略变化' };
  }
  if (id <= 20) {
    const k = id - 6;
    const special = id === 12 || id === 18;
    return {
      itemCount: 90 + k * 2,
      typeCount: Math.min(11, 10 + Math.floor(k / 6)),
      layerCount: 5 + (k % 2),
      frozenCount: 2 + (k % 3),
      lockedCount: 1 + (k % 2),
      slot: special ? 6 : 7,
      boosters: 2,
      hiddenRatio: 0.08,
      difficulty: 9,
      label: special ? '限容挑战' : '特殊机制',
      special,
    };
  }
  const k = id - 21;
  const special = id % 13 === 0;
  return {
    itemCount: Math.min(150, 108 + k),
    typeCount: Math.min(12, 11 + Math.floor(k / 30)),
    layerCount: k % 3 === 0 ? 7 : 6,
    frozenCount: 3 + (k % 4),
    lockedCount: 1 + (k % 3),
    slot: special ? 6 : 7,
    boosters: 2,
    hiddenRatio: special ? 0.1 : 0.06,
    difficulty: special ? 9 : 8,
    label: special ? '收藏挑战' : '混合难度',
    special,
  };
}

// ---------------- 遮挡图 ----------------

function buildGraph(items) {
  const n = items.length;
  const occludes = Array.from({ length: n }, () => []);
  const blocked = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const a = items[i];
      const b = items[j];
      const above = a.layer > b.layer || (a.layer === b.layer && i > j);
      if (!above) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox >= Math.min(a.w, b.w) * RATIO && oy >= Math.min(a.h, b.h) * RATIO) {
        occludes[i].push(j);
        blocked[j]++;
      }
    }
  }
  return { occludes, blocked };
}

// ---------------- 回放验证 ----------------

function verify(items, order, capacity, graph) {
  const n = items.length;
  const index = new Map(items.map((t, i) => [t.instanceId, i]));
  const removed = new Array(n).fill(false);
  const blocked = graph.blocked.slice();
  const frozen = items.map((t) => t.frozen || 0);
  const locked = items.map((t) => !!t.locked);
  let matches = 0;
  let slot = [];

  for (const id of order) {
    const i = index.get(id);
    if (i === undefined || removed[i]) return false;
    if (frozen[i] > 0 || locked[i]) return false;
    if (blocked[i] > 0) return false;
    if (items[i].hidden && matches < (items[i].revealAfterMatches || 0)) return false;
    if (slot.length >= capacity) return false;

    removed[i] = true;
    for (const j of graph.occludes[i]) blocked[j]--;
    slot.push({ type: items[i].itemId });

    let cleared = false;
    for (;;) {
      const cnt = {};
      for (const s of slot) cnt[s.type] = (cnt[s.type] || 0) + 1;
      let hit = null;
      for (const k in cnt) {
        if (cnt[k] >= 3) {
          hit = k;
          break;
        }
      }
      if (!hit) break;
      let need = 3;
      const before = slot.length;
      slot = slot.filter((s) => {
        if (s.type === hit && need > 0) {
          need--;
          return false;
        }
        return true;
      });
      if (slot.length === before) break; // 防御：未能移除则退出，避免死循环
      matches++;
      cleared = true;
    }

    if (cleared) {
      for (let k = 0; k < n; k++) {
        if (removed[k]) continue;
        if (frozen[k] > 0) frozen[k]--;
        if (locked[k] && matches >= (items[k].unlockAfterMatches || 0)) locked[k] = false;
      }
    }
  }

  return slot.length === 0 && removed.every(Boolean);
}

// ---------------- 求解器（仅用于减容/隐藏关卡） ----------------

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function attemptSolve(items, capacity, graph, rng) {
  const n = items.length;
  const removed = new Array(n).fill(false);
  const blocked = graph.blocked.slice();
  const frozen = items.map((t) => t.frozen || 0);
  const locked = items.map((t) => !!t.locked);
  let matches = 0;
  let slot = [];
  const order = [];

  for (let step = 0; step < n; step++) {
    let best = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < n; i++) {
      if (removed[i] || frozen[i] > 0 || locked[i] || blocked[i] > 0) continue;
      if (items[i].hidden && matches < (items[i].revealAfterMatches || 0)) continue;

      let c = 0;
      for (const s of slot) if (s.type === items[i].itemId) c++;

      let sc = c >= 2 ? 100 : c === 1 ? 42 : 8;
      sc += Math.min(18, graph.occludes[i].length * 2);
      if (slot.length >= capacity - 1 && c === 0) sc -= 70;
      if (slot.length >= capacity - 2 && c <= 1) sc -= 20;
      sc += rng() * 6;

      if (sc > bestScore) {
        bestScore = sc;
        best = i;
      }
    }

    if (best < 0) return null;

    const i = best;
    removed[i] = true;
    order.push(items[i].instanceId);
    for (const j of graph.occludes[i]) blocked[j]--;
    slot.push({ type: items[i].itemId });

    let cleared = false;
    for (;;) {
      const cnt = {};
      for (const s of slot) cnt[s.type] = (cnt[s.type] || 0) + 1;
      let hit = null;
      for (const k in cnt) {
        if (cnt[k] >= 3) {
          hit = k;
          break;
        }
      }
      if (!hit) break;
      let need = 3;
      const before = slot.length;
      slot = slot.filter((s) => {
        if (s.type === hit && need > 0) {
          need--;
          return false;
        }
        return true;
      });
      if (slot.length === before) break; // 防御：未能移除则退出，避免死循环
      matches++;
      cleared = true;
    }

    if (cleared) {
      for (let k = 0; k < n; k++) {
        if (removed[k]) continue;
        if (frozen[k] > 0) frozen[k]--;
        if (locked[k] && matches >= (items[k].unlockAfterMatches || 0)) locked[k] = false;
      }
    }

    if (slot.length >= capacity) return null;
  }

  return slot.length === 0 ? order : null;
}

function solve(items, capacity, graph, attempts = 24) {
  for (let a = 0; a < attempts; a++) {
    const order = attemptSolve(items, capacity, graph, makeRng(7919 * (a + 1) + items.length));
    if (order) return order;
  }
  return null;
}

// ---------------- 难度评分 ----------------

const SCORE_SCALE = 0.8;

function scoreLevel(items, capacity, boosters, graph) {
  const n = items.length;
  const edges = graph.occludes.reduce((a, b) => a + b.length, 0);
  const clickable = items.filter((t, i) => !t.hidden && graph.blocked[i] === 0).length;
  const layers = Math.max(...items.map((t) => t.layer)) + 1;
  const types = new Set(items.map((t) => t.type)).size;
  const hidden = items.filter((t) => t.hidden).length;

  const itemsN = clamp((n - 9) / 111, 0, 1);
  const typesN = clamp((types - 3) / 7, 0, 1);
  const layersN = clamp((layers - 1) / 5, 0, 1);
  const occN = clamp(edges / n / 5, 0, 1);
  const scarceN = clamp(1 - clickable / n, 0, 1);
  const slotN = clamp((7 - capacity) / 2, 0, 1);
  const boosterN = clamp((3 - boosters) / 3, 0, 1);
  const hiddenN = clamp((hidden / n) * 4, 0, 1);

  const raw =
    itemsN * 0.15 +
    typesN * 0.1 +
    layersN * 0.12 +
    occN * 0.25 +
    scarceN * 0.23 +
    slotN * 0.05 +
    boosterN * 0.04 +
    hiddenN * 0.06;

  return Math.round(clamp(1 + (9 * raw) / SCORE_SCALE, 1, 10) * 10) / 10;
}

// ---------------- 生成 ----------------

function tutorialLevel() {
  const types = ['apple', 'donut', 'duck'];
  const items = [];
  for (let i = 0; i < 9; i++) {
    items.push({
      instanceId: `t${i}`,
      itemId: types[Math.floor(i / 3)],
      layer: 0,
      x: 215 + (i % 3) * 160,
      y: 250 + Math.floor(i / 3) * 160,
      w: 100,
      h: 100,
      frozen: 0,
      locked: false,
      unlockAfterMatches: 0,
      hidden: false,
      revealAfterMatches: 0,
    });
  }
  return { items, solution: items.map((t) => t.instanceId) };
}

function generateRaw(id, spec, seed) {
  if (spec.tutorial) return tutorialLevel();

  const result = generateLevel(
    {
      levelId: id,
      name: `第 ${id} 关`,
      difficulty: spec.difficulty,
      difficultyLabel: spec.label,
      itemCount: Math.round(spec.itemCount / 3) * 3,
      typeCount: spec.typeCount,
      layerCount: spec.layerCount,
      frozenCount: spec.frozenCount,
      lockedCount: spec.lockedCount,
      boosterLimit: spec.boosters,
      gen: { radius: spec.radius || 250, minDist: spec.minDist || 24, spill: 0.06 },
    },
    seed >>> 0,
  );

  const lv = result.level;
  const frozen = new Set(lv.obstacles?.frozenTileIds || []);
  const locked = new Set(lv.obstacles?.lockedTileIds || []);
  const unlockAfter = lv.obstacles?.lockedUnlockAfterMatches || 2;

  const items = lv.itemPositions.map((t) => ({
    instanceId: t.id,
    itemId: t.type,
    layer: t.layer,
    x: t.x,
    y: t.y,
    w: t.w,
    h: t.h,
    frozen: frozen.has(t.id) ? 1 : 0,
    locked: locked.has(t.id),
    unlockAfterMatches: locked.has(t.id) ? unlockAfter : 0,
    hidden: false,
    revealAfterMatches: 0,
  }));

  return { items, solution: lv.solutionValidation.solution.slice() };
}

function buildLevel(id) {
  const spec = specFor(id);
  let lastErr = '';

  for (let attempt = 0; attempt < 5; attempt++) {
    const seed = id * 7919 + 13 + attempt * 104729;
    let raw;
    try {
      raw = generateRaw(id, spec, seed);
    } catch (e) {
      lastErr = e.message;
      continue;
    }

    const { items } = raw;
    DBG(`L${id} raw=${items.length}`);
    const graph = buildGraph(items);
    DBG(`L${id} graph done`);

    // 隐藏物品：选解法中后段才被拾取的物品，确保回放时已解锁
    if (spec.hiddenRatio) {
      const target = Math.max(1, Math.round(items.length * spec.hiddenRatio));
      const byId = new Map(items.map((t) => [t.instanceId, t]));
      const start = Math.floor(raw.solution.length * 0.45);
      let marked = 0;
      for (let i = start; i < raw.solution.length && marked < target; i += 5) {
        const t = byId.get(raw.solution[i]);
        if (!t) continue;
        t.hidden = true;
        t.revealAfterMatches = 2;
        marked++;
      }
    }

    // 优先回放旧解法
    const replayOk = verify(items, raw.solution, spec.slot, graph);
    DBG(`L${id} replay=${replayOk}`);
    if (replayOk) {
      return finalize(id, spec, items, raw.solution, graph);
    }

    // 减容/隐藏导致原解法失效时，使用求解器
    const solved = solve(items, spec.slot, graph, 24);
    if (solved && verify(items, solved, spec.slot, graph)) {
      return finalize(id, spec, items, solved, graph);
    }

    // 仍失败：去掉隐藏再试
    if (spec.hiddenRatio) {
      items.forEach((t) => {
        t.hidden = false;
        t.revealAfterMatches = 0;
      });
      const solved2 = solve(items, spec.slot, graph, 24);
      if (solved2 && verify(items, solved2, spec.slot, graph)) {
        return finalize(id, spec, items, solved2, graph);
      }
    }

    lastErr = 'no verified solution';
  }

  throw new Error(`L${id} 生成失败：${lastErr}`);
}

function finalize(id, spec, items, order, graph) {
  DBG(`L${id} finalize start`);
  const score = scoreLevel(items, spec.slot, spec.boosters, graph);
  // 档位由设计归属决定：教学 / 特殊挑战 / 高难
  const tier = id === 1 ? 'tutorial' : spec.special ? 'challenge' : 'hard';

  return {
    levelId: id,
    slotCapacity: spec.slot,
    difficulty: spec.difficulty,
    difficultyScore: score,
    difficultyLabel: spec.label,
    tier,
    itemCount: items.length,
    layerCount: Math.max(...items.map((t) => t.layer)) + 1,
    itemTypes: [...new Set(items.map((t) => t.itemId))],
    boosterLimit: spec.boosters,
    items,
    solution: order,
  };
}

// ---------------- 主流程 ----------------

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = [];
  let failed = 0;
  const limit = Number(process.env.LIMIT || 100);
  const t0 = Date.now();

  for (let id = 1; id <= limit; id++) {
    const started = Date.now();
    DBG(`L${id} begin`);
    let level;
    try {
      level = buildLevel(id);
    } catch (e) {
      failed++;
      DBG(`L${id} fail ${e.message}`);
      console.error(`L${id} 失败：${e.message}`);
      continue;
    }
    const cost = Date.now() - started;
    DBG(`L${id} done ${cost}ms`);
    if (id <= 3 || id % 10 === 0 || cost > 3000) {
      console.log(`L${id} 完成 ${cost}ms items=${level.itemCount} score=${level.difficultyScore}`);
    }

    fs.writeFileSync(path.join(OUT_DIR, `level_${String(id).padStart(3, '0')}.json`), JSON.stringify(level));

    const graph = buildGraph(level.items);
    const edges = graph.occludes.reduce((a, b) => a + b.length, 0);
    const clickable = level.items.filter((t, i) => !t.hidden && graph.blocked[i] === 0).length;

    report.push({
      id,
      tier: level.tier,
      score: level.difficultyScore,
      items: level.itemCount,
      types: level.itemTypes.length,
      layers: level.layerCount,
      slot: level.slotCapacity,
      frozen: level.items.filter((t) => t.frozen > 0).length,
      locked: level.items.filter((t) => t.locked).length,
      hidden: level.items.filter((t) => t.hidden).length,
      boosters: level.boosterLimit,
      edges,
      clickable,
      solutionLength: level.solution.length,
    });
  }

  const summary = {
    levels: report.length,
    failed,
    l1: report.find((r) => r.id === 1),
    l2: report.find((r) => r.id === 2),
    minScore: Math.min(...report.map((r) => r.score)),
    maxScore: Math.max(...report.map((r) => r.score)),
    avgScore: Math.round((report.reduce((a, r) => a + r.score, 0) / report.length) * 10) / 10,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'build-report.json'), JSON.stringify({ summary, report }, null, 2));

  // 轻量索引：供关卡选择页展示难度标识，避免加载 100 个完整关卡
  const index = report.map((r) => ({
    id: r.id,
    tier: r.tier,
    score: r.score,
    items: r.items,
    slot: r.slot,
    special: r.slot < 7 || r.hidden > 0,
  }));
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index));

  console.log('生成完成：', JSON.stringify(summary));
  console.log('L1:', JSON.stringify(summary.l1));
  console.log('L2:', JSON.stringify(summary.l2));
}

main();
