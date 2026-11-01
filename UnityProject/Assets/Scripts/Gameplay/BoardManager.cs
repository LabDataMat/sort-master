using System.Collections.Generic;

namespace SortMaster.Gameplay
{
    /// <summary>棋盘上的一个物品实例（纯数据）。</summary>
    public sealed class BoardTile
    {
        public string Id;
        public string ItemId;
        public int Layer;
        public float X, Y, W, H;
        public int Frozen;
        public bool Locked;
        public int UnlockAfterMatches;
        public bool Removed;
        /// <summary>同层绘制顺序：索引越大越靠上。</summary>
        public int Index;

        public bool IsObstacle { get { return Frozen > 0 || Locked; } }
    }

    /// <summary>
    /// 棋盘模型：物品集合 + 遮挡关系 + 可点击判定（纯逻辑）。
    ///
    /// 遮挡规则（与关卡烘焙、校验工具完全一致）：
    /// 1. z 序：层号大者在上；同层时数组索引大者在上。
    /// 2. 仅当两物品矩形重叠达到阈值（宽/高各自 >= min 尺寸的 35%）才算遮挡。
    /// 3. 被任一未移除的上层物品遮挡 → 不可点击。
    /// </summary>
    public sealed class BoardManager
    {
        /// <summary>遮挡判定阈值（与关卡烘焙、校验工具一致）。</summary>
        private const float OcclusionRatio = 0.35f;

        private readonly List<BoardTile> _tiles = new List<BoardTile>();
        private readonly Dictionary<string, BoardTile> _byId = new Dictionary<string, BoardTile>();

        public IReadOnlyList<BoardTile> Tiles { get { return _tiles; } }
        public int TotalCount { get { return _tiles.Count; } }
        public int MatchesResolved { get; private set; }

        public int RemainingCount
        {
            get
            {
                int n = 0;
                for (int i = 0; i < _tiles.Count; i++)
                {
                    if (!_tiles[i].Removed) n++;
                }
                return n;
            }
        }

        public void Load(IEnumerable<BoardTile> tiles)
        {
            _tiles.Clear();
            _byId.Clear();
            MatchesResolved = 0;
            if (tiles == null) return;
            foreach (var t in tiles)
            {
                t.Index = _tiles.Count;
                t.Removed = false;
                _tiles.Add(t);
                _byId[t.Id] = t;
            }
        }

        public BoardTile Get(string id)
        {
            BoardTile t;
            return id != null && _byId.TryGetValue(id, out t) ? t : null;
        }

        private static bool IsAbove(BoardTile a, BoardTile b)
        {
            return a.Layer > b.Layer || (a.Layer == b.Layer && a.Index > b.Index);
        }

        private static bool OverlapsEnough(BoardTile a, BoardTile b)
        {
            float ox = System.Math.Min(a.X + a.W, b.X + b.W) - System.Math.Max(a.X, b.X);
            float oy = System.Math.Min(a.Y + a.H, b.Y + b.H) - System.Math.Max(a.Y, b.Y);
            if (ox <= 0f || oy <= 0f) return false;
            return ox >= System.Math.Min(a.W, b.W) * OcclusionRatio
                && oy >= System.Math.Min(a.H, b.H) * OcclusionRatio;
        }

        /// <summary>是否被上层物品遮挡（被遮挡则不可点击）。</summary>
        public bool IsBlocked(BoardTile tile)
        {
            if (tile == null || tile.Removed) return false;
            for (int i = 0; i < _tiles.Count; i++)
            {
                var other = _tiles[i];
                if (other == tile || other.Removed) continue;
                if (!IsAbove(other, tile)) continue;
                if (OverlapsEnough(other, tile)) return true;
            }
            return false;
        }

        /// <summary>综合可点击判定：未移除、无冰冻、未锁定、未被遮挡。</summary>
        public bool IsClickable(BoardTile tile)
        {
            if (tile == null || tile.Removed) return false;
            if (tile.Frozen > 0 || tile.Locked) return false;
            return !IsBlocked(tile);
        }

        public List<BoardTile> ClickableTiles()
        {
            var list = new List<BoardTile>();
            for (int i = 0; i < _tiles.Count; i++)
            {
                if (IsClickable(_tiles[i])) list.Add(_tiles[i]);
            }
            return list;
        }

        public bool Remove(string id)
        {
            var t = Get(id);
            if (t == null || t.Removed) return false;
            t.Removed = true;
            return true;
        }

        /// <summary>
        /// 每完成一次消除调用：全场冰冻 -1；累计消除达到阈值的锁定物品解锁。
        /// </summary>
        public void OnMatchResolved()
        {
            MatchesResolved++;
            for (int i = 0; i < _tiles.Count; i++)
            {
                var t = _tiles[i];
                if (t.Removed) continue;
                if (t.Frozen > 0) t.Frozen--;
                if (t.Locked && MatchesResolved >= t.UnlockAfterMatches) t.Locked = false;
            }
        }

        /// <summary>供撤回使用：完整状态快照。</summary>
        public List<TileState> Snapshot()
        {
            var list = new List<TileState>(_tiles.Count);
            for (int i = 0; i < _tiles.Count; i++)
            {
                var t = _tiles[i];
                list.Add(new TileState { Id = t.Id, Removed = t.Removed, Frozen = t.Frozen, Locked = t.Locked });
            }
            return list;
        }

        /// <summary>撤回时恢复累计消除次数（锁定解锁依赖该计数）。</summary>
        public void SetMatchesResolved(int value)
        {
            MatchesResolved = value < 0 ? 0 : value;
        }

        public void Restore(List<TileState> states)
        {
            if (states == null) return;
            for (int i = 0; i < states.Count; i++)
            {
                var s = states[i];
                var t = Get(s.Id);
                if (t == null) continue;
                t.Removed = s.Removed;
                t.Frozen = s.Frozen;
                t.Locked = s.Locked;
            }
        }
    }

    public struct TileState
    {
        public string Id;
        public bool Removed;
        public int Frozen;
        public bool Locked;
    }
}
