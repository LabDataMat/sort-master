using System.Collections.Generic;
using NUnit.Framework;
using SortMaster.Gameplay;
using SortMaster.Levels;

namespace SortMaster.Tests
{
    /// <summary>单局流程与关卡数据测试。</summary>
    public class LevelSessionTests
    {
        private static LevelData MakeSimpleLevel()
        {
            var types = new[] { "A", "A", "A", "B", "B", "B" };
            var items = new List<LevelItemData>();
            for (int i = 0; i < types.Length; i++)
            {
                items.Add(new LevelItemData
                {
                    instanceId = "t" + i,
                    itemId = types[i],
                    layer = 0,
                    x = i * 110f,
                    y = 0f,
                    w = 100f,
                    h = 100f,
                    frozen = 0,
                    locked = false,
                    unlockAfterMatches = 0,
                });
            }

            return new LevelData
            {
                levelId = 1,
                slotCapacity = 7,
                difficulty = 1,
                itemCount = types.Length,
                layerCount = 1,
                itemTypes = new[] { "A", "B" },
                items = items.ToArray(),
                solution = new[] { "t0", "t1", "t2", "t3", "t4", "t5" },
            };
        }

        [Test]
        public void DuplicatePick_IsRejected()
        {
            var session = new LevelSession(MakeSimpleLevel());
            Assert.IsTrue(session.Pick("t0").Ok);
            var second = session.Pick("t0");
            Assert.IsFalse(second.Ok, "同一物品不能被重复加入收纳槽");
        }

        [Test]
        public void FullPlaythrough_EndsInVictory()
        {
            var session = new LevelSession(MakeSimpleLevel());
            foreach (var id in MakeSimpleLevel().solution)
            {
                Assert.IsTrue(session.Pick(id).Ok, "拾取失败：" + id);
            }
            Assert.AreEqual(SessionState.Victory, session.State, "清空全部物品应胜利");
            Assert.AreEqual(0, session.Board.RemainingCount);
        }

        [Test]
        public void OccludedTile_IsRejected()
        {
            var data = new LevelData
            {
                levelId = 1,
                slotCapacity = 7,
                itemCount = 2,
                layerCount = 2,
                itemTypes = new[] { "A" },
                items = new[]
                {
                    new LevelItemData { instanceId = "lower", itemId = "A", layer = 0, x = 100f, y = 100f, w = 100f, h = 100f },
                    new LevelItemData { instanceId = "upper", itemId = "A", layer = 1, x = 120f, y = 120f, w = 100f, h = 100f },
                },
                solution = new[] { "upper", "lower" },
            };

            var session = new LevelSession(data);
            var blocked = session.Pick("lower");
            Assert.IsFalse(blocked.Ok, "被上层遮挡的物品不可点击");
            Assert.AreEqual("occluded", blocked.Reason);

            Assert.IsTrue(session.Pick("upper").Ok, "上层物品应可点击");
            Assert.IsTrue(session.Pick("lower").Ok, "上层移除后下层应解锁");
        }

        [Test]
        public void Undo_RestoresBoardAndSlot()
        {
            var session = new LevelSession(MakeSimpleLevel());
            int before = session.Board.RemainingCount;

            Assert.IsTrue(session.Pick("t0").Ok);
            Assert.AreEqual(before - 1, session.Board.RemainingCount);
            Assert.AreEqual(1, session.Slots.Count);

            Assert.IsTrue(session.Undo());
            Assert.AreEqual(before, session.Board.RemainingCount, "撤回后棋盘应恢复");
            Assert.AreEqual(0, session.Slots.Count, "撤回后收纳槽应恢复");
        }
    }

    /// <summary>真实关卡数据校验（读取 + 可解性回放）。</summary>
    public class LevelDataTests
    {
        [Test]
        public void AllHundredLevels_Load()
        {
            var loader = new LevelLoader();
            for (int id = 1; id <= GameConfig.MaxLevel; id++)
            {
                var data = loader.Load(id);
                Assert.IsNotNull(data, "关卡 " + id + " 加载失败");
                Assert.IsNotNull(data.items, "关卡 " + id + " 缺少物品");
                Assert.Greater(data.items.Length, 0, "关卡 " + id + " 物品为空");
                Assert.AreEqual(7, data.slotCapacity, "关卡 " + id + " 槽容量应为 7");
            }
        }

        [TestCase(1)]
        [TestCase(2)]
        [TestCase(3)]
        [TestCase(50)]
        [TestCase(100)]
        public void SampleLevels_PassSolvabilityReplay(int levelId)
        {
            var loader = new LevelLoader();
            var data = loader.Load(levelId);
            Assert.IsNotNull(data, "关卡加载失败：" + levelId);

            var result = LevelValidator.Validate(data);
            Assert.IsTrue(result.Ok, "关卡 " + levelId + " 校验失败：" + string.Join("; ", result.Errors));
        }
    }
}
