/**
 * 运行时生成器验证：对每个关卡用多个种子生成布局，并用 GameSession 真实规则回放验证。
 * 输出 docs/levelgen-report.json + 控制台摘要。
 */
const fs = require('fs');
const path = require('path');
const { generateLevel } = require('../build/assets/scripts/level/LevelGenerator.js');
const { GameSession } = require('../build/assets/scripts/gameplay/logic/GameSession.js');
const { LevelValidator } = require('../build/assets/scripts/level/LevelValidator.js');
const { ALL_TYPE_IDS } = require('../build/assets/scripts/items/ItemCatalog.js');

const LEVEL_DIR = path.join(__dirname, '..', 'assets', 'resources', 'data', 'levels');
const knownTypes = new Set(ALL_TYPE_IDS);
const SEEDS_PER_LEVEL = 2;

function loadSpec(id) {
  return JSON.parse(fs.readFileSync(path.join(LEVEL_DIR, `level_${String(id).padStart(3, '0')}.json`), 'utf8'));
}

function replayWithSession(level) {
  const s = new GameSession(level);
  s.start();
  for (const id of level.solutionValidation.solution) {
    const r = s.pickTile(id);
    if (!r.ok) return { ok: false, reason: `${id}:${r.reason}`, state: s.state };
  }
  return { ok: s.state === 'VICTORY', reason: s.state === 'VICTORY' ? '' : `state=${s.state}` };
}

const report = { generatedAt: new Date().toISOString(), seedsPerLevel: SEEDS_PER_LEVEL, levels: [] };
let totalGen = 0;
let totalOk = 0;
const failures = [];

for (let id = 1; id <= 100; id++) {
  const spec = loadSpec(id);
  const entry = { levelId: id, spec: { itemCount: spec.itemCount, typeCount: spec.typeCount, layerCount: spec.layerCount }, runs: [] };
  for (let k = 0; k < SEEDS_PER_LEVEL; k++) {
    const seed = (20260000 + id * 137 + k * 1009) >>> 0;
    let gen;
    try {
      gen = generateLevel(spec, seed);
    } catch (e) {
      failures.push({ levelId: id, seed, reason: 'generate_failed:' + e.message });
      continue;
    }
    totalGen++;
    const v = LevelValidator.validate(gen.level, knownTypes);
    const rep = replayWithSession(gen.level);
    const ok = v.valid && rep.ok;
    if (ok) totalOk++;
    else failures.push({ levelId: id, seed, issues: v.issues.map((i) => i.code).slice(0, 4), replay: rep.reason });
    entry.runs.push({
      seed,
      ok,
      items: gen.level.itemCount,
      types: gen.level.itemTypes.length,
      layers: gen.level.layerCount,
      edges: gen.level.occlusion.edgeCount,
      pile: `${gen.metrics.pileW}x${gen.metrics.pileH}`,
      avgVisible: +(gen.metrics.avgVisible * 100).toFixed(0),
      hiddenRatio: +(gen.metrics.hiddenRatio * 100).toFixed(0),
      attempts: gen.attempts,
      firstMoves: gen.level.solutionValidation.solution.slice(0, 6),
    });
  }
  report.levels.push(entry);
  if (id % 10 === 0) console.log(`... ${id} levels, ${totalOk}/${totalGen} runs verified`);
}

// 同一关卡不同种子的布局差异（用于证明"每次布局不同"）
const spec2 = loadSpec(2);
const variants = [];
for (const seed of [111, 222, 333]) {
  const g = generateLevel(spec2, seed);
  variants.push({
    seed,
    verified: g.level.solutionValidation.verified,
    positionsHash: require('crypto')
      .createHash('sha1')
      .update(JSON.stringify(g.level.itemPositions))
      .digest('hex')
      .slice(0, 12),
    edges: g.level.occlusion.edgeCount,
    layers: g.level.layerCount,
    first: g.level.itemPositions.slice(0, 3).map((p) => [p.type, p.x, p.y, p.layer]),
  });
}
report.l2Variants = variants;

report.summary = { totalRuns: totalGen, verified: totalOk, failed: failures.length };
fs.mkdirSync(path.join(__dirname, '..', 'docs'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'levelgen-report.json'), JSON.stringify(report, null, 2));

console.log('\n=== 生成器验证 ===');
console.log(`运行 ${totalGen} 次（100 关 × ${SEEDS_PER_LEVEL} 种子），通过 ${totalOk} 次，失败 ${failures.length} 次`);
console.log('L2 三种子布局哈希:', variants.map((v) => `${v.seed}:${v.positionsHash}/${v.edges}边`).join('  '));
const distinct = new Set(variants.map((v) => v.positionsHash)).size;
console.log('L2 布局是否互不相同:', distinct === variants.length ? '是' : '否');
if (failures.length) {
  console.log('失败样例:', JSON.stringify(failures.slice(0, 5)));
  process.exitCode = 1;
}
