using System;
using System.Collections.Generic;
using SortMaster.Levels;

namespace SortMaster.Gameplay
{
    public enum SessionState
    {
        Playing,
        Victory,
        Lose,
    }

    public sealed class PickOutcome
    {
        public bool Ok;
        public string Reason = "";
        public bool WillMatch;
        public int InsertIndex;
        public readonly List<MatchGroup> Groups = new List<MatchGroup>();

        public static PickOutcome Fail(string reason)
        {
            return new PickOutcome { Ok = false, Reason = reason };
        }
    }

    /// <summary>
    /// 单局游戏会话：编排棋盘、收纳槽与消除规则。
    /// 核心状态（拾取/消除/胜负）在逻辑层即时结算，表现层只消费事件做动画，
    /// 因此动画未完成不会影响数据正确性。
    /// </summary>
    public sealed class LevelSession
    {
        public readonly LevelData Data;
        public readonly BoardManager Board;
        public readonly SlotManager Slots;

        public SessionState State { get; private set; }
        public int Moves { get; private set; }
        public int Combo { get; private set; }
        public int MaxCombo { get; private set; }
        public int BoostersUsed { get; private set; }

        private Snapshot _undo;

        public event Action<string, string, int> TilePicked;     // tileId, itemId, insertIndex
        public event Action<MatchGroup, int> MatchCleared;       // group, combo
        public event Action<int, int> SlotChanged;               // count, capacity
        public event Action<SessionState> StateChanged;
        public event Action<string> Rejected;
        public event Action UndoPerformed;

        public LevelSession(LevelData data)
        {
            Data = data;
            Board = new BoardManager();
            Slots = new SlotManager(data != null && data.slotCapacity > 0
                ? data.slotCapacity
                : GameConfig.DefaultSlotCapacity);

            var tiles = new List<BoardTile>();
            if (data != null && data.items != null)
            {
                for (int i = 0; i < data.items.Length; i++)
                {
                    var it = data.items[i];
                    tiles.Add(new BoardTile
                    {
                        Id = it.instanceId,
                        ItemId = it.itemId,
                        Layer = it.layer,
                        X = it.x,
                        Y = it.y,
                        W = it.w,
                        H = it.h,
                        Frozen = it.frozen,
                        Locked = it.locked,
                        UnlockAfterMatches = it.unlockAfterMatches,
                    });
                }
            }
            Board.Load(tiles);
            State = SessionState.Playing;
        }

        public bool CanUndo { get { return _undo != null; } }

        /// <summary>
        /// 拾取一个物品：校验 → 快照 → 入槽 → 结算消除 → 判定胜负。
        /// </summary>
        public PickOutcome Pick(string tileId)
        {
            if (State != SessionState.Playing) return Reject("state");

            var tile = Board.Get(tileId);
            if (tile == null || tile.Removed) return Reject("missing");
            if (tile.Frozen > 0) return Reject("frozen");
            if (tile.Locked) return Reject("locked");
            if (Board.IsBlocked(tile)) return Reject("occluded");
            if (Slots.IsFull) return Reject("slots_full");

            var snapshot = Capture();

            int insertIndex = Slots.Count;
            var add = Slots.Add(tile.Id, tile.ItemId);
            if (!add.Inserted)
            {
                return Reject(add.Reason);
            }

            _undo = snapshot;
            Board.Remove(tile.Id);
            Moves++;

            var outcome = new PickOutcome
            {
                Ok = true,
                InsertIndex = insertIndex,
                WillMatch = add.Groups.Count > 0,
            };
            outcome.Groups.AddRange(add.Groups);

            if (TilePicked != null) TilePicked(tile.Id, tile.ItemId, insertIndex);
            if (SlotChanged != null) SlotChanged(Slots.Count, Slots.Capacity);

            if (add.Groups.Count > 0)
            {
                Combo++;
                if (Combo > MaxCombo) MaxCombo = Combo;
                for (int i = 0; i < add.Groups.Count; i++)
                {
                    // 每组消除都推进全场冰冻/锁定解锁
                    Board.OnMatchResolved();
                    if (MatchCleared != null) MatchCleared(add.Groups[i], Combo);
                }
            }
            else
            {
                Combo = 0;
                if (add.FullAfterInsert)
                {
                    SetState(SessionState.Lose);
                    return outcome;
                }
            }

            if (Board.RemainingCount == 0)
            {
                SetState(SessionState.Victory);
            }

            return outcome;
        }

        private PickOutcome Reject(string reason)
        {
            if (Rejected != null) Rejected(reason);
            return PickOutcome.Fail(reason);
        }

        private void SetState(SessionState next)
        {
            if (State == next) return;
            State = next;
            if (StateChanged != null) StateChanged(next);
        }

        // ---------------- 道具 ----------------

        /// <summary>撤回最近一次有效操作（含其触发的全部消除）。</summary>
        public bool Undo()
        {
            if (_undo == null) return false;
            Board.Restore(_undo.Tiles);
            Board.SetMatchesResolved(_undo.MatchesResolved);
            Slots.Restore(_undo.Slot);
            Moves = _undo.Moves;
            Combo = 0;
            _undo = null;
            State = SessionState.Playing;
            BoostersUsed++;

            if (SlotChanged != null) SlotChanged(Slots.Count, Slots.Capacity);
            if (StateChanged != null) StateChanged(State);
            if (UndoPerformed != null) UndoPerformed();
            return true;
        }

        /// <summary>提示：返回一个当前可点击物品的 ID；没有则返回 null。</summary>
        public string Hint()
        {
            var list = Board.ClickableTiles();
            if (list.Count == 0) return null;
            // 优先推荐「能让槽内同类型凑够 3 个」的物品，其次任意可点击物品
            for (int i = 0; i < list.Count; i++)
            {
                if (Slots.CountOf(list[i].ItemId) >= MatchSystem.MatchSize - 1) return list[i].Id;
            }
            return list[0].Id;
        }

        /// <summary>
        /// 洗牌：仅在「当前可点击」的物品之间交换类型。
        /// 不改变位置、层级与遮挡结构，因此不会破坏关卡合法性。
        /// </summary>
        public bool Shuffle(Random rng)
        {
            var list = Board.ClickableTiles();
            if (list.Count < 2) return false;

            var ids = new List<string>(list.Count);
            for (int i = 0; i < list.Count; i++) ids.Add(list[i].ItemId);

            if (rng == null) rng = new Random();
            for (int i = ids.Count - 1; i > 0; i--)
            {
                int j = rng.Next(i + 1);
                var tmp = ids[i];
                ids[i] = ids[j];
                ids[j] = tmp;
            }

            for (int i = 0; i < list.Count; i++) list[i].ItemId = ids[i];
            BoostersUsed++;
            return true;
        }

        /// <summary>星级：1 基础 + 连击≥2 + 未用道具。</summary>
        public int GetStars()
        {
            int stars = 1;
            if (MaxCombo >= 2) stars++;
            if (BoostersUsed == 0) stars++;
            return stars < 3 ? stars : 3;
        }

        // ---------------- 快照 ----------------

        private sealed class Snapshot
        {
            public List<TileState> Tiles;
            public List<SlotItem> Slot;
            public int MatchesResolved;
            public int Moves;
        }

        private Snapshot Capture()
        {
            return new Snapshot
            {
                Tiles = Board.Snapshot(),
                Slot = Slots.Snapshot(),
                MatchesResolved = Board.MatchesResolved,
                Moves = Moves,
            };
        }
    }
}
