/**
 * 关卡规格生成器：只输出"关卡参数"（物品数、种类数、层数、障碍、堆叠参数），
 * 具体布局在运行时由 assets/scripts/level/LevelGenerator.ts 按种子实时生成。
 *
 * 这样每次进入关卡都会得到不同的物品堆，同时物品数量/种类/难度参数保持不变。
 */
const fs = require('fs');
const path = require('path');

function tierParams(id) {
  if (id === 1) return { label: '新手教学', difficulty: 1, types: 3, total: 12, layers: 2, frozen: 0, locked: 0, boosterLimit: 0, radius: 150, minDist: 58, spill: 0.06 };
  if (id === 2) return { label: '交错物品堆', difficulty: 2, types: 6, total: 45, layers: 4, frozen: 0, locked: 0, boosterLimit: 0, radius: 236, minDist: 46, spill: 0.1 };
  if (id === 3) return { label: '深层堆叠', difficulty: 3, types: 7, total: 54, layers: 5, frozen: 0, locked: 0, boosterLimit: 0, radius: 240, minDist: 44, spill: 0.1 };
  if (id === 4) return { label: '密集交错', difficulty: 3, types: 8, total: 66, layers: 5, frozen: 0, locked: 0, boosterLimit: 0, radius: 244, minDist: 42, spill: 0.1 };
  if (id === 5) return { label: '障碍堆', difficulty: 4, types: 9, total: 75, layers: 5, frozen: 2, locked: 0, boosterLimit: 3, radius: 248, minDist: 40, spill: 0.1 };
  if (id <= 10)
    return {
      label: '高压堆叠',
      difficulty: 4,
      types: Math.min(9 + Math.floor((id - 6) / 2), 10),
      total: 78 + (id - 6) * 3,
      layers: id % 2 === 0 ? 6 : 5,
      frozen: 2 + ((id - 6) % 3),
      locked: id >= 8 ? 1 : 0,
      boosterLimit: 3,
      radius: 250,
      minDist: 38,
      spill: 0.1,
    };
  if (id <= 20)
    return {
      label: '复杂堆叠',
      difficulty: 4,
      types: Math.min(10 + Math.floor((id - 11) / 4), 12),
      total: 90 + (id - 11) * 2,
      layers: 6,
      frozen: 3 + ((id - 11) % 4),
      locked: 1 + (id % 2),
      boosterLimit: 3,
      radius: 254,
      minDist: 36,
      spill: 0.09,
    };
  const k = id - 21;
  return {
    label: '高难关卡',
    difficulty: 5,
    types: Math.min(10 + Math.floor(k / 20), 12),
    total: Math.min(108 + k, 150),
    layers: k % 3 === 0 ? 7 : 6,
    frozen: 4 + (k % 4),
    locked: 2 + (k % 3),
    boosterLimit: 2,
    radius: 258,
    minDist: 34,
    spill: 0.08,
  };
}

const OUT_DIR = path.join(__dirname, '..', 'assets', 'resources', 'data', 'levels');
fs.mkdirSync(OUT_DIR, { recursive: true });

const specs = [];
for (let id = 1; id <= 100; id++) {
  const P = tierParams(id);
  const spec = {
    levelId: id,
    name: `第 ${id} 关`,
    difficulty: P.difficulty,
    difficultyLabel: P.label,
    itemCount: Math.round(P.total / 3) * 3,
    typeCount: P.types,
    layerCount: P.layers,
    frozenCount: P.frozen,
    lockedCount: P.locked,
    boosterLimit: P.boosterLimit,
    gen: { radius: P.radius, minDist: P.minDist, spill: P.spill },
  };
  specs.push(spec);
  fs.writeFileSync(path.join(OUT_DIR, `level_${String(id).padStart(3, '0')}.json`), JSON.stringify(spec, null, 1));
}

fs.writeFileSync(
  path.join(OUT_DIR, 'manifest.json'),
  JSON.stringify(
    {
      totalLevels: 100,
      mode: 'runtime_generated',
      matchRule: 'consecutive_triple',
      note: '关卡文件仅保存参数；布局在进入关卡时按种子实时生成，并做构造式可解性回放验证',
      generatedAt: new Date().toISOString(),
      tiers: specs.map((s) => ({
        levelId: s.levelId,
        itemCount: s.itemCount,
        typeCount: s.typeCount,
        layerCount: s.layerCount,
        frozenCount: s.frozenCount,
        lockedCount: s.lockedCount,
        boosterLimit: s.boosterLimit,
      })),
    },
    null,
    2
  )
);
console.log('DONE: 100 level specs written (runtime-generated layouts).');
