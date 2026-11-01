import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateLevel } from '../src/core/LevelValidator';
import type { LevelData } from '../src/core/types';

const dir = fileURLToPath(new URL('../public/levels/', import.meta.url));
const files = readdirSync(dir)
  .filter((f) => /^level_\d{3}\.json$/.test(f))
  .sort();

const load = (f: string): LevelData => JSON.parse(readFileSync(dir + f, 'utf8')) as LevelData;

describe('关卡数据', () => {
  it('至少提供 100 个可加载关卡', () => {
    expect(files.length).toBeGreaterThanOrEqual(100);
  });

  it('每关结构合法且真实可解', () => {
    const bad: string[] = [];
    for (const f of files) {
      const r = validateLevel(load(f));
      if (!r.ok) bad.push(`${f}: ${r.errors.join('; ')}`);
    }
    expect(bad).toEqual([]);
  });

  it('槽容量统一为 7', () => {
    for (const f of files) expect(load(f).slotCapacity).toBe(7);
  });

  it('物品数量为 3 的倍数', () => {
    for (const f of files) expect(load(f).items.length % 3).toBe(0);
  });

  it('关卡布局不重复（不出现大量相同布局）', () => {
    const sigs = new Set(
      files.map((f) => {
        const lv = load(f);
        return lv.items.map((i) => `${i.layer}:${i.x},${i.y},${i.itemId}`).join('|');
      }),
    );
    expect(sigs.size).toBeGreaterThanOrEqual(95);
  });

  it('难度递增：末关物品数明显多于首关', () => {
    const first = load(files[0]);
    const last = load(files[files.length - 1]);
    expect(last.items.length).toBeGreaterThan(first.items.length);
    expect(last.layerCount).toBeGreaterThanOrEqual(first.layerCount);
  });

  it('所有物品类型都有对应图片资源', () => {
    const itemDir = fileURLToPath(new URL('../public/assets/items/', import.meta.url));
    const pngs = new Set(readdirSync(itemDir).map((f) => f.replace(/\.png$/, '')));
    const missing = new Set<string>();
    for (const f of files) {
      for (const it of load(f).items) if (!pngs.has(it.itemId)) missing.add(it.itemId);
    }
    expect([...missing]).toEqual([]);
  });
});
