using System.Collections.Generic;
using NUnit.Framework;
using SortMaster.Gameplay;

namespace SortMaster.Tests
{
    /// <summary>
    /// 核心消除规则测试（对应需求文档第三部分的 10 个必测用例）。
    /// 运行方式：Unity → Window → General → Test Runner → EditMode → Run All。
    /// </summary>
    public class MatchSystemTests
    {
        private static List<SlotItem> Items(params string[] itemIds)
        {
            var list = new List<SlotItem>(itemIds.Length);
            for (int i = 0; i < itemIds.Length; i++)
            {
                list.Add(new SlotItem("i" + i, itemIds[i]));
            }
            return list;
        }

        private static string[] Ids(List<SlotItem> items)
        {
            var arr = new string[items.Count];
            for (int i = 0; i < items.Count; i++) arr[i] = items[i].ItemId;
            return arr;
        }

        // 1. 三个相同且相邻 → 消除
        [Test]
        public void Case01_AdjacentTriple_Clears()
        {
            var result = MatchSystem.Resolve(Items("A", "A", "A"));
            Assert.AreEqual(1, result.Groups.Count, "相邻三个相同应消除");
            Assert.AreEqual(0, result.Remaining.Count, "消除后槽内应为空");
        }

        // 2. 三个相同但不相邻 → 消除
        [Test]
        public void Case02_NonAdjacentTriple_Clears()
        {
            var result = MatchSystem.Resolve(Items("A", "B", "A", "C", "A"));
            Assert.AreEqual(1, result.Groups.Count, "不相邻的三个相同也必须消除");
            Assert.AreEqual("A", result.Groups[0].ItemId);
            CollectionAssert.AreEqual(new[] { "B", "C" }, Ids(result.Remaining));
        }

        // 3. 两个相同 → 不消除
        [Test]
        public void Case03_TwoSame_NoClear()
        {
            var result = MatchSystem.Resolve(Items("A", "B", "A"));
            Assert.AreEqual(0, result.Groups.Count);
            Assert.AreEqual(3, result.Remaining.Count);
        }

        // 4. 四个相同 → 消除三个，剩余一个
        [Test]
        public void Case04_FourSame_ClearsThree_LeavesOne()
        {
            var result = MatchSystem.Resolve(Items("A", "A", "A", "A"));
            Assert.AreEqual(1, result.Groups.Count);
            Assert.AreEqual(1, result.Remaining.Count);
            Assert.AreEqual("A", result.Remaining[0].ItemId);
        }

        // 5. 六个相同 → 两组三消
        [Test]
        public void Case05_SixSame_ClearsTwoGroups()
        {
            var result = MatchSystem.Resolve(Items("A", "A", "A", "A", "A", "A"));
            Assert.AreEqual(2, result.Groups.Count, "六个相同应形成两组消除");
            Assert.AreEqual(0, result.Remaining.Count);
        }

        // 6. 三种不同物品 → 不消除
        [Test]
        public void Case06_ThreeDifferent_NoClear()
        {
            var result = MatchSystem.Resolve(Items("A", "B", "C"));
            Assert.AreEqual(0, result.Groups.Count);
            Assert.AreEqual(3, result.Remaining.Count);
        }

        // 7. 消除后其他物品顺序保持
        [Test]
        public void Case07_OrderPreservedAfterClear()
        {
            var result = MatchSystem.Resolve(Items("B", "A", "C", "A", "D", "A", "E"));
            Assert.AreEqual(1, result.Groups.Count);
            CollectionAssert.AreEqual(new[] { "B", "C", "D", "E" }, Ids(result.Remaining));
        }

        // 8. 收纳槽满且无匹配 → 拒绝插入（判负条件）
        [Test]
        public void Case08_SlotFullNoMatch_Rejects()
        {
            var slot = new SlotManager(7);
            slot.Add("1", "A");
            slot.Add("2", "A");
            slot.Add("3", "B");
            slot.Add("4", "B");
            slot.Add("5", "C");
            slot.Add("6", "C");
            slot.Add("7", "D");

            Assert.IsTrue(slot.IsFull, "7 格应已满");
            var res = slot.Add("8", "E");
            Assert.IsFalse(res.Inserted, "满槽且无匹配时不应接受新物品");
        }

        // 9. 收纳槽满但刚好可消除 → 不应判负
        [Test]
        public void Case09_SlotFullButMatch_DoesNotLose()
        {
            var slot = new SlotManager(7);
            slot.Add("1", "A");
            slot.Add("2", "A");
            slot.Add("3", "B");
            slot.Add("4", "B");
            slot.Add("5", "C");
            slot.Add("6", "C");

            var res = slot.Add("7", "A"); // 第 7 个补齐 A 的三消
            Assert.IsTrue(res.Inserted);
            Assert.AreEqual(1, res.Groups.Count, "应触发消除");
            Assert.IsFalse(res.FullAfterInsert, "消除后不应仍为满槽");
            Assert.AreEqual(4, slot.Count);
        }

        // 10. 消除后正确释放槽位
        [Test]
        public void Case10_SlotsReleasedAfterClear()
        {
            var slot = new SlotManager(7);
            slot.Add("1", "A");
            slot.Add("2", "B");
            slot.Add("3", "A");
            slot.Add("4", "C");
            slot.Add("5", "A");

            Assert.AreEqual(2, slot.Count, "消除三个 A 后应剩 B、C");
            Assert.AreEqual(5, slot.FreeSlots, "应释放 3 个槽位");
        }

        // 附加：多类型同时满足时逐组处理
        [Test]
        public void Extra_TwoTypesBothTriple_ClearsBoth()
        {
            var result = MatchSystem.Resolve(Items("A", "A", "A", "B", "B", "B"));
            Assert.AreEqual(2, result.Groups.Count);
            Assert.AreEqual(0, result.Remaining.Count);
        }

        // 附加：消除不应重复处理同一物品
        [Test]
        public void Extra_NoDuplicateRemoval()
        {
            var items = Items("A", "A", "A", "A", "A", "A", "A");
            var result = MatchSystem.Resolve(items);
            var seen = new HashSet<string>();
            foreach (var g in result.Groups)
            {
                foreach (var it in g.Items)
                {
                    Assert.IsTrue(seen.Add(it.InstanceId), "同一物品被重复消除：" + it.InstanceId);
                }
            }
        }
    }
}
