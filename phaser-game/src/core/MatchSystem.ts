import type { MatchGroup, SlotItem } from './types';

/** 消除所需数量 */
export const MATCH_SIZE = 3;

export interface ResolveResult {
  groups: MatchGroup[];
  remaining: SlotItem[];
}

/**
 * 核心消除规则（纯函数，不依赖 Phaser / DOM）。
 *
 * 规则：收纳槽中**任意三个相同 itemId** 即消除，不要求相邻、不要求连续点击。
 * - 按 itemId 计数，与图片名、对象名、数组相邻关系无关；
 * - 四个相同 → 消除三个，剩余一个；
 * - 六个相同 → 两组消除；
 * - 消除后其余物品保持原有相对顺序；
 * - 物品一旦移除即不再参与匹配，机制上杜绝重复消除。
 */
export function resolveMatches(items: readonly SlotItem[]): ResolveResult {
  let remaining = items.slice();
  const groups: MatchGroup[] = [];

  for (;;) {
    // 按槽内顺序建立分桶，同时保留首次出现顺序，保证结果稳定
    const order: string[] = [];
    const buckets = new Map<string, SlotItem[]>();
    for (const it of remaining) {
      let list = buckets.get(it.itemId);
      if (!list) {
        list = [];
        buckets.set(it.itemId, list);
        order.push(it.itemId);
      }
      list.push(it);
    }

    let hit: string | null = null;
    for (const id of order) {
      if ((buckets.get(id) as SlotItem[]).length >= MATCH_SIZE) {
        hit = id;
        break;
      }
    }
    if (hit === null) break;

    const trio = (buckets.get(hit) as SlotItem[]).slice(0, MATCH_SIZE);
    groups.push({ itemId: hit, items: trio });

    const remove = new Set(trio);
    remaining = remaining.filter((x) => !remove.has(x));
  }

  return { groups, remaining };
}

/** 判断再放入一个该类型是否会立即触发消除（供提示使用） */
export function appendingCompletesTriple(items: readonly SlotItem[], itemId: string): boolean {
  let count = 0;
  for (const it of items) if (it.itemId === itemId) count++;
  return count >= MATCH_SIZE - 1;
}
