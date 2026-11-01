import { TestRunner, assert, assertEq } from './harness';
import { GameSession } from '../assets/scripts/gameplay/logic/GameSession';
import { generateLevel, LevelSpec } from '../assets/scripts/level/LevelGenerator';
import { LevelValidator } from '../assets/scripts/level/LevelValidator';
import { ALL_TYPE_IDS } from '../assets/scripts/items/ItemCatalog';

const fs = require('fs');
const path = require('path');

export const levelTests = new TestRunner();
const LEVEL_DIR = path.join(__dirname, '..', '..', 'assets', 'resources', 'data', 'levels');
const TEXTURE_DIR = path.join(__dirname, '..', '..', 'assets', 'resources', 'textures', 'items');
const knownTypes = new Set(ALL_TYPE_IDS);

function loadSpec(id: number): LevelSpec {
  const p = path.join(LEVEL_DIR, `level_${String(id).padStart(3, '0')}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function replay(level: any): { ok: boolean; state: string } {
  const s = new GameSession(level);
  s.start();
  for (const id of level.solutionValidation.solution!) {
    const r = s.pickTile(id);
    if (!r.ok) return { ok: false, state: `${r.reason}@${id}` };
  }
  return { ok: s.state === 'VICTORY', state: s.state };
}

levelTests.test('全部 100 个关卡规格文件存在且结构合法', () => {
  for (let id = 1; id <= 100; id++) {
    const spec = loadSpec(id);
    assertEq(spec.levelId, id);
    assert(spec.itemCount % 3 === 0, `L${id} 物品数不是 3 的倍数`);
    assert(spec.typeCount >= 2 && spec.typeCount <= 12, `L${id} 类型数越界`);
    assert(spec.layerCount >= 2 && spec.layerCount <= 7, `L${id} 层数越界`);
    assert(spec.gen.radius > 0 && spec.gen.minDist > 0, `L${id} 堆叠参数缺失`);
  }
});

levelTests.test('难度曲线符合设计（L1~L5 明确规格）', () => {
  const l1 = loadSpec(1);
  const l2 = loadSpec(2);
  const l3 = loadSpec(3);
  const l4 = loadSpec(4);
  const l5 = loadSpec(5);
  assertEq(l1.itemCount, 12, 'L1 12 件');
  assertEq(l1.typeCount, 3, 'L1 3 类');
  assertEq(l2.itemCount, 45, 'L2 45 件');
  assertEq(l2.typeCount, 6, 'L2 6 类');
  assertEq(l3.itemCount, 54, 'L3 54 件');
  assertEq(l3.typeCount, 7, 'L3 7 类');
  assertEq(l4.itemCount, 66, 'L4 66 件');
  assertEq(l4.typeCount, 8, 'L4 8 类');
  assertEq(l5.itemCount, 75, 'L5 75 件');
  assertEq(l5.typeCount, 9, 'L5 9 类');
  assert(l5.frozenCount > 0, 'L5 起出现障碍');
  assertEq(loadSpec(100).itemCount, 150, 'L100 150 件');
  let prev = 0;
  for (let id = 1; id <= 100; id++) {
    const c = loadSpec(id).itemCount;
    assert(c >= prev, `L${id} 物品数应不下降`);
    prev = c;
  }
});

levelTests.test('教学段（1-4）无冰冻/锁定，第 5 关起出现障碍', () => {
  for (let id = 1; id <= 4; id++) {
    const spec = loadSpec(id);
    assertEq(spec.frozenCount, 0, `L${id}`);
    assertEq(spec.lockedCount, 0, `L${id}`);
  }
  assert(loadSpec(5).frozenCount > 0);
});

levelTests.test('100 关运行时生成 + GameSession 真实规则回放全部通关', () => {
  const failures: string[] = [];
  for (let id = 1; id <= 100; id++) {
    const spec = loadSpec(id);
    try {
      const gen = generateLevel(spec, 900000 + id * 131);
      const v = LevelValidator.validate(gen.level, knownTypes);
      if (!v.valid) {
        failures.push(`L${id} 校验失败:${v.issues.map((i) => i.code).slice(0, 2).join(',')}`);
        continue;
      }
      const r = replay(gen.level);
      if (!r.ok) failures.push(`L${id} 回放失败:${r.state}`);
      if (gen.level.itemCount !== spec.itemCount) failures.push(`L${id} 数量不符 ${gen.level.itemCount}/${spec.itemCount}`);
      if (gen.level.itemTypes.length !== spec.typeCount) failures.push(`L${id} 类型数不符 ${gen.level.itemTypes.length}/${spec.typeCount}`);
    } catch (e: any) {
      failures.push(`L${id} 生成异常:${e.message}`);
    }
  }
  assertEq(failures.length, 0, failures.slice(0, 4).join(' | '));
});

levelTests.test('生成关卡使用的物品类型都有图片资源', () => {
  const used = new Set<string>();
  for (const id of [1, 2, 5, 10, 25, 50, 100]) {
    const gen = generateLevel(loadSpec(id), 7000 + id);
    gen.level.itemPositions.forEach((p) => used.add(p.type));
  }
  const missing = [...used].filter((t) => !fs.existsSync(path.join(TEXTURE_DIR, `${t}.png`)));
  assertEq(missing.length, 0, missing.join(','));
});

levelTests.test('manifest 标记为运行时生成模式', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(LEVEL_DIR, 'manifest.json'), 'utf8'));
  assertEq(manifest.totalLevels, 100);
  assertEq(manifest.mode, 'runtime_generated');
  assertEq(manifest.matchRule, 'consecutive_triple');
});
