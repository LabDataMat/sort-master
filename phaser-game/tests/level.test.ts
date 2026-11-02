import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { computeDifficulty, validateAll, validateLevel } from '../src/core/LevelValidator';
import type { LevelData } from '../src/core/types';

const dir = fileURLToPath(new URL('../public/levels/', import.meta.url));
const files = readdirSync(dir)
  .filter((f) => /^level_\d{3}\.json$/.test(f))
  .sort();

const load = (f: string): LevelData => JSON.parse(readFileSync(dir + f, 'utf8')) as LevelData;
const all = files.map(load);

describe('关卡数据', () => {
  it('至少提供 100 个可加载关卡', () => {
    expect(files.length).toBeGreaterThanOrEqual(100);
  });

  it('每关结构合法且真实可解', () => {
    const report = validateAll(all);
    expect(report.failed).toEqual([]);
    expect(report.passed).toBe(all.length);
  });

  it('不存在重复布局', () => {
    const report = validateAll(all);
    expect(report.duplicates).toEqual([]);
  });

  it('槽容量在 5~7 之间（特殊关卡可减容）', () => {
    for (const lv of all) {
      expect(lv.slotCapacity).toBeGreaterThanOrEqual(5);
      expect(lv.slotCapacity).toBeLessThanOrEqual(7);
    }
  });

  it('物品数量为 3 的倍数', () => {
    for (const lv of all) expect(lv.items.length % 3).toBe(0);
  });

  it('所有物品类型都有对应图片资源', () => {
    const itemDir = fileURLToPath(new URL('../public/assets/items/', import.meta.url));
    const pngs = new Set(readdirSync(itemDir).map((f) => f.replace(/\.png$/, '')));
    const missing = new Set<string>();
    for (const lv of all) {
      for (const it of lv.items) if (!pngs.has(it.itemId)) missing.add(it.itemId);
    }
    expect([...missing]).toEqual([]);
  });
});

describe('难度断层', () => {
  const l1 = all.find((x) => x.levelId === 1) as LevelData;
  const l2 = all.find((x) => x.levelId === 2) as LevelData;

  it('第 1 关：极简教学（9 件 / 3 类 / 1 层 / 无遮挡 / 全部可点）', () => {
    const r = validateLevel(l1);
    expect(r.metrics).toBeDefined();
    expect(r.metrics?.items).toBe(9);
    expect(r.metrics?.types).toBe(3);
    expect(r.metrics?.layers).toBe(1);
    expect(r.metrics?.edges).toBe(0);
    expect(r.metrics?.clickable).toBe(9);
    expect(r.metrics?.difficulty).toBe(1);
  });

  it('第 2 关：高难（≥80 件 / ≥5 层 / 大量遮挡 / 可点击稀少）', () => {
    const r = validateLevel(l2);
    expect(r.metrics).toBeDefined();
    expect(r.metrics!.items).toBeGreaterThanOrEqual(80);
    expect(r.metrics!.layers).toBeGreaterThanOrEqual(5);
    expect(r.metrics!.edges).toBeGreaterThanOrEqual(300);
    expect(r.metrics!.clickable / r.metrics!.items).toBeLessThanOrEqual(0.2);
  });

  it('第 2 关难度评分 ≥ 8.5，且比第 1 关高至少 7 分', () => {
    const s1 = computeDifficulty(l1);
    const s2 = computeDifficulty(l2);
    expect(s2).toBeGreaterThanOrEqual(8.5);
    expect(s2 - s1).toBeGreaterThanOrEqual(7);
  });

  it('难度整体递增：后期关卡平均难度高于前期', () => {
    const early = all.slice(0, 20).map(computeDifficulty);
    const late = all.slice(80).map(computeDifficulty);
    const avg = (arr: number[]): number => arr.reduce((a, b) => a + b, 0) / arr.length;
    expect(avg(late)).toBeGreaterThan(avg(early));
  });

  it('第 6~20 关包含特殊机制（隐藏/减容/冰冻/锁链）', () => {
    const mid = all.filter((lv) => lv.levelId >= 6 && lv.levelId <= 20);
    expect(mid.some((lv) => lv.items.some((t) => t.hidden))).toBe(true);
    expect(mid.some((lv) => lv.slotCapacity < 7)).toBe(true);
    expect(mid.some((lv) => lv.items.some((t) => t.frozen > 0))).toBe(true);
    expect(mid.some((lv) => lv.items.some((t) => t.locked))).toBe(true);
  });
});
