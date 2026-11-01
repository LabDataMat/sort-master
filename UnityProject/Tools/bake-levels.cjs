/**
 * 将旧项目的「关卡规格」烘焙为 Unity 可直接加载的完整关卡数据。
 *
 * 输入：F:\Game3.0\assets\resources\data\levels\level_XXX.json（规格）
 * 输出：F:\Game3.0-Unity\Assets\Resources\Data\levels\level_XXX.json（含 items + solution）
 *
 * 关键约束：
 * 1. 布局由旧项目运行时生成器产出（集中式物品堆），此处固定种子烘焙，保证可复现。
 * 2. 可解性按【新规则】验证：收纳槽内任意 3 个相同 ItemId 即消除（不要求相邻），
 *    容量 7，遮挡解锁真实模拟。旧生成器的解法是在更严格的「连续相邻」规则下求出的，
 *    新规则更宽松，因此回放必然仍然成立——但仍逐关实测，不靠推断。
 */
const fs = require('fs');
const path = require('path');

const OLD_ROOT = 'F:/Game3.0';
const OUT_DIR = path.join(__dirname, '..', 'Assets', 'Resources', 'Data', 'levels');
const { generateLevel } = require(path.join(OLD_ROOT, 'build/assets/scripts/level/LevelGenerator.js'));

const CAPACITY = 7;
const OCCLUSION_RATIO = 0.35;

function isAbove(a, ai, b, bi) {
  return a.layer > b.layer || (a.layer === b.layer && ai > bi);
}

function computeBlocked(tiles) {
  // 返回 blocked[i] = 遮挡 i 的未移除上层物品数量
  const n = tiles.length;
  const blocked = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const a = tiles[j];
      const b = tiles[i];
      if (!isAbove(a, j, b, i)) continue;
      if (a.removed || b.removed) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox >= Math.min(a.w, b.w) * OCCLUSION_RATIO && oy >= Math.min(a.h, b.h) * OCCLUSION_RATIO) {
        blocked[i]++;
      }
    }
  }
  return blocked;
}

/** 按新规则完整模拟一局；返回是否清空全部物品 */
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
    if (!t) return { ok: false, reason: 'missing:' + id };
    if (t.removed) return { ok: false, reason: 'dup:' + id };
    if (t.frozen > 0) return { ok: false, reason: 'frozen:' + id };
    if (t.locked) return { ok: false, reason: 'locked:' + id };

    const blocked = computeBlocked(tiles);
    if (blocked[t.idx] > 0) return { ok: false, reason: 'occluded:' + id };
    if (slot.length >= CAPACITY) return { ok: false, reason: 'overflow:' + id };

    t.removed = true;
    slot.push({ id: t.instanceId, type: t.itemId });

    // 计数式三消（不要求相邻）
    let cleared = false;
    for (;;) {
      const counts = new Map();
      for (const s of slot) counts.set(s.type, (counts.get(s.type) || 0) + 1);
      let hit = null;
      for (const [type, c] of counts) if (c >= 3) { hit = type; break; }
      if (!hit) break;
      let need = 3;
      const next = [];
      for (const s of slot) {
        if (s.type === hit && need > 0) { need--; continue; }
        next.push(s);
      }
      slot = next;
      matches++;
      cleared = true;
    }

    if (cleared) {
      // 每完成一次消除：全场冰冻 -1；累计消除达到阈值的锁定物品解锁
      for (const x of tiles) if (x.frozen > 0) x.frozen--;
      for (const x of tiles) {
        if (x.locked && matches >= (x.unlockAfterMatches || 0)) x.locked = false;
      }
    }
  }

  const left = tiles.filter((t) => !t.removed).length;
  return { ok: left === 0 && slot.length === 0, reason: left === 0 ? '' : 'left:' + left, matches };
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

    // 冰冻/锁定
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
    return { level, seed, matches: sim.matches };
  }
  throw new Error('L' + spec.levelId + ' 烘焙失败：' + lastErr);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const oldDir = path.join(OLD_ROOT, 'assets/resources/data/levels');
  const files = fs.readdirSync(oldDir).filter((f) => /^level_\d{3}\.json$/.test(f)).sort();

  const report = [];
  let totalItems = 0;
  let totalBytes = 0;

  for (const f of files) {
    const spec = JSON.parse(fs.readFileSync(path.join(oldDir, f), 'utf8'));
    const { level, seed, matches } = bakeOne(spec);
    const out = path.join(OUT_DIR, f);
    fs.writeFileSync(out, JSON.stringify(level));
    const bytes = fs.statSync(out).size;
    totalBytes += bytes;
    totalItems += level.itemCount;
    report.push({
      level: level.levelId,
      items: level.itemCount,
      types: level.itemTypes.length,
      layers: level.layerCount,
      seed,
      matches,
      kb: +(bytes / 1024).toFixed(1),
    });
  }

  const summary = {
    levels: report.length,
    totalItems,
    totalKB: +(totalBytes / 1024).toFixed(0),
    minItems: Math.min(...report.map((r) => r.items)),
    maxItems: Math.max(...report.map((r) => r.items)),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'bake-report.json'), JSON.stringify({ summary, report }, null, 2));
  console.log('烘焙完成：', JSON.stringify(summary));
  console.log('抽样：', report.slice(0, 3).map((r) => `L${r.level}:${r.items}件/${r.layers}层`).join('  '));
  console.log('末三关：', report.slice(-3).map((r) => `L${r.level}:${r.items}件/${r.layers}层`).join('  '));
}

main();
