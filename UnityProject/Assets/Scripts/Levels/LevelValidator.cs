using System.Collections.Generic;
using SortMaster.Gameplay;

namespace SortMaster.Levels
{
    public sealed class ValidationResult
    {
        public readonly List<string> Errors = new List<string>();
        public readonly List<string> Warnings = new List<string>();
        public bool Ok { get { return Errors.Count == 0; } }

        public void AddError(string msg) { Errors.Add(msg); }
        public void AddWarning(string msg) { Warnings.Add(msg); }
    }

    /// <summary>
    /// 关卡校验器：结构合法性 + 真实可解性回放。
    /// 回放使用与游戏完全相同的 BoardManager / SlotManager / MatchSystem，
    /// 因此校验通过即代表「按该序列操作确实可以清空棋盘」。
    /// </summary>
    public static class LevelValidator
    {
        public static ValidationResult Validate(LevelData data)
        {
            var result = new ValidationResult();
            if (data == null)
            {
                result.AddError("关卡数据为空");
                return result;
            }

            if (data.items == null || data.items.Length == 0)
            {
                result.AddError("没有物品");
                return result;
            }

            if (data.slotCapacity < 1)
            {
                result.AddError("收纳槽容量非法：" + data.slotCapacity);
            }

            if (data.itemCount != data.items.Length)
            {
                result.AddWarning("itemCount(" + data.itemCount + ") 与实际物品数(" + data.items.Length + ") 不一致");
            }

            // 类型数量必须是 3 的倍数，否则永远无法清空
            var counts = new Dictionary<string, int>();
            var ids = new HashSet<string>();
            for (int i = 0; i < data.items.Length; i++)
            {
                var it = data.items[i];
                if (it == null)
                {
                    result.AddError("第 " + i + " 个物品为空");
                    continue;
                }
                if (!ids.Add(it.instanceId))
                {
                    result.AddError("重复的 instanceId：" + it.instanceId);
                }
                int c;
                counts.TryGetValue(it.itemId, out c);
                counts[it.itemId] = c + 1;
            }

            foreach (var kv in counts)
            {
                if (kv.Value % MatchSystem.MatchSize != 0)
                {
                    result.AddError("类型 " + kv.Key + " 数量为 " + kv.Value + "，不是 3 的倍数");
                }
            }

            if (data.solution == null || data.solution.Length == 0)
            {
                result.AddError("缺少可解性回放序列");
            }

            if (result.Errors.Count > 0) return result;

            // 真实回放
            var session = new LevelSession(data);
            for (int i = 0; i < data.solution.Length; i++)
            {
                var outcome = session.Pick(data.solution[i]);
                if (!outcome.Ok)
                {
                    result.AddError("回放第 " + i + " 步失败（" + data.solution[i] + "）：" + outcome.Reason);
                    return result;
                }
            }

            if (session.State != SessionState.Victory)
            {
                result.AddError("回放结束未通关，剩余物品 " + session.Board.RemainingCount);
            }

            return result;
        }
    }
}
