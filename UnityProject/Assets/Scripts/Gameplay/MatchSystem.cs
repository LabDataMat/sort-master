using System;
using System.Collections.Generic;

namespace SortMaster.Gameplay
{
    public enum SlotItemState
    {
        Idle,
        Entering,
        Matching,
        Removed,
    }

    /// <summary>收纳槽内的一个物品实例。</summary>
    public sealed class SlotItem
    {
        public string InstanceId;
        public string ItemId;
        public SlotItemState State;

        public SlotItem(string instanceId, string itemId)
        {
            InstanceId = instanceId;
            ItemId = itemId;
            State = SlotItemState.Idle;
        }

        public SlotItem Clone()
        {
            return new SlotItem(InstanceId, ItemId) { State = State };
        }
    }

    /// <summary>一组被消除的三个物品（记录消除时在槽中的位置，便于表现层定位）。</summary>
    public sealed class MatchGroup
    {
        public readonly string ItemId;
        public readonly List<SlotItem> Items;

        public MatchGroup(string itemId, List<SlotItem> items)
        {
            ItemId = itemId;
            Items = items;
        }
    }

    public sealed class MatchResult
    {
        public readonly List<MatchGroup> Groups = new List<MatchGroup>();
        public readonly List<SlotItem> Remaining = new List<SlotItem>();
        public bool HasMatch { get { return Groups.Count > 0; } }
    }

    /// <summary>
    /// 核心消除规则（纯逻辑，不依赖 UnityEngine，便于 EditMode 单测）。
    ///
    /// 规则：收纳槽中「任意三个相同 ItemId」即消除，**不要求相邻**。
    /// - 匹配以 ItemId 计数为准，与图片名、对象名、数组相邻关系无关。
    /// - 消除后其余物品保持原有相对顺序。
    /// - 级联：四个相同消除三个、六个相同消除两组、多类型同时满足时逐组处理。
    /// - 物品一旦从结果中移除即不再参与匹配，从机制上杜绝重复消除。
    /// </summary>
    public static class MatchSystem
    {
        public const int MatchSize = 3;

        /// <summary>
        /// 结算当前槽内所有可消除组合。
        /// 返回被消除的组（按发现顺序）与剩余物品（保持原相对顺序）。
        /// </summary>
        public static MatchResult Resolve(IReadOnlyList<SlotItem> items)
        {
            var remaining = new List<SlotItem>();
            if (items != null)
            {
                for (int i = 0; i < items.Count; i++) remaining.Add(items[i]);
            }

            var groups = new List<MatchGroup>();

            // 每轮找出一个数量 >= 3 的类型，移除其中最先出现的 3 个，然后重新统计。
            // 重新统计可保证「六个相同 → 两组」以及顺序稳定。
            while (true)
            {
                string hitId = null;
                var order = new List<string>();
                var buckets = new Dictionary<string, List<SlotItem>>();

                for (int i = 0; i < remaining.Count; i++)
                {
                    var it = remaining[i];
                    List<SlotItem> list;
                    if (!buckets.TryGetValue(it.ItemId, out list))
                    {
                        list = new List<SlotItem>();
                        buckets[it.ItemId] = list;
                        order.Add(it.ItemId);
                    }
                    list.Add(it);
                }

                for (int i = 0; i < order.Count; i++)
                {
                    if (buckets[order[i]].Count >= MatchSize)
                    {
                        hitId = order[i];
                        break;
                    }
                }

                if (hitId == null) break;

                var bucket = buckets[hitId];
                var trio = new List<SlotItem>(MatchSize);
                for (int i = 0; i < MatchSize; i++)
                {
                    trio.Add(bucket[i]);
                    bucket[i].State = SlotItemState.Removed;
                }
                groups.Add(new MatchGroup(hitId, trio));

                var removeSet = new HashSet<SlotItem>(trio);
                var next = new List<SlotItem>(remaining.Count - MatchSize);
                for (int i = 0; i < remaining.Count; i++)
                {
                    if (!removeSet.Contains(remaining[i])) next.Add(remaining[i]);
                }
                remaining = next;
            }

            var result = new MatchResult();
            result.Groups.AddRange(groups);
            result.Remaining.AddRange(remaining);
            return result;
        }

        /// <summary>判断追加一个类型后是否会立即触发消除（供提示/求解器使用）。</summary>
        public static bool AppendingCompletesTriple(IReadOnlyList<SlotItem> items, string itemId)
        {
            if (items == null) return false;
            int count = 0;
            for (int i = 0; i < items.Count; i++)
            {
                if (items[i].ItemId == itemId) count++;
            }
            return count >= MatchSize - 1;
        }
    }
}
