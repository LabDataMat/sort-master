using System.Collections.Generic;

namespace SortMaster.Gameplay
{
    public sealed class SlotAddResult
    {
        public bool Inserted;
        public string Reason;
        public readonly List<MatchGroup> Groups = new List<MatchGroup>();
        public bool FullAfterInsert;
    }

    /// <summary>
    /// 收纳槽模型（纯逻辑）。
    /// 职责仅限「容量管理 + 顺序维护 + 调用 MatchSystem」，
    /// 不参与消除规则判断，保证 MatchSystem 可独立替换与测试。
    /// </summary>
    public sealed class SlotManager
    {
        public int Capacity { get; private set; }
        private readonly List<SlotItem> _items = new List<SlotItem>();

        public IReadOnlyList<SlotItem> Items { get { return _items; } }
        public int Count { get { return _items.Count; } }
        public bool IsFull { get { return _items.Count >= Capacity; } }
        public int FreeSlots { get { return Capacity - _items.Count; } }

        public SlotManager(int capacity)
        {
            Capacity = capacity < 1 ? 1 : capacity;
        }

        public void SetCapacity(int capacity)
        {
            Capacity = capacity < 1 ? 1 : capacity;
        }

        /// <summary>
        /// 追加物品到槽尾并立即结算消除。
        /// 槽满时拒绝插入（不会出现「满了还接受物品」）。
        /// </summary>
        public SlotAddResult Add(string instanceId, string itemId)
        {
            var result = new SlotAddResult();

            if (IsFull)
            {
                result.Inserted = false;
                result.Reason = "full";
                return result;
            }

            _items.Add(new SlotItem(instanceId, itemId));

            var resolved = MatchSystem.Resolve(_items);
            if (resolved.HasMatch)
            {
                _items.Clear();
                _items.AddRange(resolved.Remaining);
                result.Groups.AddRange(resolved.Groups);
            }

            result.Inserted = true;
            result.FullAfterInsert = IsFull;
            return result;
        }

        public void Clear()
        {
            _items.Clear();
        }

        /// <summary>深拷贝当前槽内物品（供撤回快照使用）。</summary>
        public List<SlotItem> Snapshot()
        {
            var copy = new List<SlotItem>(_items.Count);
            for (int i = 0; i < _items.Count; i++) copy.Add(_items[i].Clone());
            return copy;
        }

        public void Restore(IEnumerable<SlotItem> items)
        {
            _items.Clear();
            if (items == null) return;
            foreach (var it in items) _items.Add(it.Clone());
        }

        /// <summary>槽内某类型的数量（供提示与 UI 使用）。</summary>
        public int CountOf(string itemId)
        {
            int n = 0;
            for (int i = 0; i < _items.Count; i++)
            {
                if (_items[i].ItemId == itemId) n++;
            }
            return n;
        }
    }
}
