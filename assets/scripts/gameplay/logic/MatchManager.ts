/**
 * MatchManager —— 连续匹配核心算法（纯逻辑，独立模块）。
 *
 * 规则（与本游戏唯一合法消除规则一致）：
 * 收纳槽内物品按进入顺序排列；只有「三个完全相同的物品连续相邻」才允许消除。
 * - [A,A,A] => 消除
 * - [A,B,A] / [A,B,A,A] / [A,A,B,A] => 不消除
 * - [A,B,B,B,A] => 只消除中间三个 B
 * - [A,A,A,B,B,B] => 两组分别消除（级联）
 * - [A,A,B,B,B,A,A] => 只消除中间三个 B，剩余两个 A 不消除
 *
 * 算法（新物品入槽后）：
 * 1. 物品按进入顺序追加到槽位尾部（空位压缩后即尾部追加）。
 * 2. 扫描是否存在三个连续相同物品。
 * 3. 消除该组，剩余物品向左补位。
 * 4. 补位后重新扫描（级联检查），直到不存在连续匹配。
 * 5. 每一轮消除都会产生新事件（供 Combo / 连锁统计），且单组物品只会被消除一次
 *    （消除即从数据中移除，从机制上杜绝重复消除与数据错乱）。
 */

export type SlotItemState = 'idle' | 'entering' | 'matching' | 'removed';

export interface SlotItem {
  /** 物品唯一 ID（对应场上物品 tileId） */
  uniqueId: string;
  /** 物品类型 */
  itemType: string;
  /** 状态（视图层据此播放进入/消除动画；逻辑层维护生命周期） */
  state: SlotItemState;
}

export interface MatchGroup {
  /** 被消除的三个物品（按槽内顺序） */
  items: SlotItem[];
  /** 触发消除时该组在槽中的起始下标 */
  startIndex: number;
}

export class MatchManager {
  /**
   * 扫描一次：返回所有「三个连续相同」的组（不修改数据）。
   * 四连同类型（理论上玩家连拿四个相同）只消费前三个，剩余一个继续参与后续扫描。
   */
  static findConsecutiveTriples(items: SlotItem[]): MatchGroup[] {
    const groups: MatchGroup[] = [];
    let i = 0;
    while (i <= items.length - 3) {
      const a = items[i];
      const b = items[i + 1];
      const c = items[i + 2];
      if (a.itemType === b.itemType && b.itemType === c.itemType) {
        groups.push({ items: [a, b, c], startIndex: i });
        a.state = 'matching';
        b.state = 'matching';
        c.state = 'matching';
        i += 3; // 消费这三个，避免重叠计数
      } else {
        i++;
      }
    }
    return groups;
  }

  /**
   * 结算：单轮扫描消除全部「三个连续相同」组，剩余物品向左补位一次。
   * （按官方用例语义：[A,A,B,B,B,A,A] 只消除中间三个 B，两侧剩余 A 补位后不再触发消除；
   *   自然游玩中物品只从槽尾追加，任何新三连必然由最后一次拾取构成，单轮已完备。）
   * 消除即从数据中移除，从机制上杜绝重复消除与数据错乱。
   */
  static resolve(items: SlotItem[]): { groups: MatchGroup[]; remaining: SlotItem[] } {
    const groups = MatchManager.findConsecutiveTriples(items);
    if (groups.length === 0) {
      return { groups, remaining: items.slice() };
    }
    const removed = new Set<string>();
    for (const g of groups) {
      for (const it of g.items) {
        it.state = 'removed';
        removed.add(it.uniqueId);
      }
    }
    const remaining = items.filter((it) => !removed.has(it.uniqueId));
    return { groups, remaining };
  }

  /**
   * 判断追加一个 type 到槽尾是否会立即触发消除（供求解器/提示使用）。
   * 只有槽尾两个与 type 相同（追加后构成三连）才会触发。
   */
  static appendingCompletesTriple(items: SlotItem[], type: string): boolean {
    const n = items.length;
    return n >= 2 && items[n - 1].itemType === type && items[n - 2].itemType === type;
  }

  /** 槽尾物品类型（尾部配对启发式用） */
  static tailType(items: SlotItem[]): string | null {
    return items.length ? items[items.length - 1].itemType : null;
  }
}
