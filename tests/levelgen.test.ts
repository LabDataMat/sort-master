import { TestRunner, assert, assertEq } from './harness';
import { generateLevel, LevelSpec } from '../assets/scripts/level/LevelGenerator';
import { GameSession } from '../assets/scripts/gameplay/logic/GameSession';

const fs = require('fs');
const path = require('path');

export const levelgenTests = new TestRunner();
const LEVEL_DIR = path.join(__dirname, '..', '..', 'assets', 'resources', 'data', 'levels');

function spec(id: number): LevelSpec {
  return JSON.parse(fs.readFileSync(path.join(LEVEL_DIR, `level_${String(id).padStart(3, '0')}.json`), 'utf8'));
}

function signature(level: any): string {
  return JSON.stringify(level.itemPositions.map((p: any) => [p.id, p.type, p.layer, p.x, p.y]));
}

levelgenTests.test('确定性：同 spec + 同 seed 生成完全相同的布局', () => {
  const s = spec(2);
  const a = generateLevel(s, 424242);
  const b = generateLevel(s, 424242);
  assertEq(signature(a.level), signature(b.level), '布局应完全一致');
  assertEq(a.level.occlusion!.edgeCount, b.level.occlusion!.edgeCount);
  assertEq(a.seed, b.seed);
});

levelgenTests.test('随机性：同关卡不同种子生成不同布局（位置/遮挡均变化）', () => {
  const s = spec(2);
  const variants = [111, 222, 333].map((seed) => generateLevel(s, seed));
  const sigs = new Set(variants.map((v) => signature(v.level)));
  assertEq(sigs.size, 3, '三种子布局应互不相同');
  const edgeCounts = new Set(variants.map((v) => v.level.occlusion!.edgeCount));
  assert(edgeCounts.size >= 2, '遮挡关系也应随种子变化');
  // 首件物品位置必须不同（避免"只换类型不换位置"）
  const firsts = new Set(variants.map((v) => `${v.level.itemPositions[0].x},${v.level.itemPositions[0].y}`));
  assertEq(firsts.size, 3, '首件物品坐标应不同');
});

levelgenTests.test('数量与种类受控：随机布局不改变关卡规格', () => {
  for (const id of [1, 2, 5, 12, 40, 100]) {
    const s = spec(id);
    for (const seed of [1, 99, 123456]) {
      const g = generateLevel(s, seed);
      assertEq(g.level.itemCount, s.itemCount, `L${id} 物品数`);
      assertEq(g.level.itemTypes.length, s.typeCount, `L${id} 类型数`);
      assert(g.level.layerCount >= 2 && g.level.layerCount <= s.layerCount, `L${id} 层数`);
      assertEq(g.level.obstacles.frozenTileIds.length, Math.min(s.frozenCount, g.level.itemCount), `L${id} 冰冻数`);
      // 每种类型数量必须是 3 的倍数
      const counts = new Map<string, number>();
      g.level.itemPositions.forEach((p) => counts.set(p.type, (counts.get(p.type) ?? 0) + 1));
      for (const [, c] of counts) assertEq(c % 3, 0, `L${id} 类型数量非 3 倍数`);
    }
  }
});

levelgenTests.test('可解性：多关卡多种子均能用真实规则回放通关', () => {
  const failures: string[] = [];
  for (const id of [1, 2, 3, 5, 12, 25, 50, 75, 100]) {
    const s = spec(id);
    for (const seed of [2026, 777, 31337]) {
      try {
        const g = generateLevel(s, seed);
        if (!g.level.solutionValidation.verified) {
          failures.push(`L${id}/${seed} 未标记验证`);
          continue;
        }
        const session = new GameSession(g.level);
        session.start();
        let bad = '';
        for (const tileId of g.level.solutionValidation.solution!) {
          const r = session.pickTile(tileId);
          if (!r.ok) {
            bad = `${r.reason}@${tileId}`;
            break;
          }
        }
        if (bad || session.state !== 'VICTORY') failures.push(`L${id}/${seed} 回放失败:${bad || session.state}`);
      } catch (e: any) {
        failures.push(`L${id}/${seed} 异常:${e.message}`);
      }
    }
  }
  assertEq(failures.length, 0, failures.slice(0, 3).join(' | '));
});

levelgenTests.test('布局指标：集中成堆、居中、不过度埋没', () => {
  for (const id of [2, 5, 25, 100]) {
    const s = spec(id);
    const g = generateLevel(s, 555);
    // 包围盒中心接近棋盘中心 (375,470)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of g.level.itemPositions) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + p.w);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y + p.h);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    assert(Math.abs(cx - 375) <= 12, `L${id} 水平居中偏差 ${cx}`);
    assert(Math.abs(cy - 470) <= 12, `L${id} 垂直居中偏差 ${cy}`);
    assert(maxX <= 734 && maxY <= 940, `L${id} 越出棋盘`);
    assert(g.metrics.pileW <= 640, `L${id} 堆过宽 ${g.metrics.pileW}`);
    assert(g.metrics.hiddenRatio <= 0.6, `L${id} 埋没过多 ${g.metrics.hiddenRatio}`);
  }
});

levelgenTests.test('稳定性：本局生成后布局不被后续操作改变', () => {
  const g = generateLevel(spec(2), 8888);
  const before = signature(g.level);
  const session = new GameSession(g.level);
  session.start();
  const moves = g.level.solutionValidation.solution!;
  session.pickTile(moves[0]);
  session.pickTile(moves[1]);
  session.undo();
  assertEq(signature(g.level), before, '逻辑操作不应改动关卡几何');
  assertEq(g.level.itemPositions.length, spec(2).itemCount);
});
