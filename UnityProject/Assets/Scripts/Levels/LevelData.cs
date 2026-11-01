using System;

namespace SortMaster.Levels
{
    /// <summary>关卡内单个物品（与 Unity JSON 字段一一对应）。</summary>
    [Serializable]
    public class LevelItemData
    {
        public string instanceId;
        public string itemId;
        public int layer;
        public float x;
        public float y;
        public float w;
        public float h;
        public int frozen;
        public bool locked;
        public int unlockAfterMatches;
    }

    /// <summary>
    /// 关卡数据（数据驱动，与逻辑分离）。
    /// 由旧项目生成器烘焙而来，solution 为已验证的通关拾取序列，用于运行时可解性复核。
    /// </summary>
    [Serializable]
    public class LevelData
    {
        public int levelId;
        public int slotCapacity;
        public int difficulty;
        public string difficultyLabel;
        public int itemCount;
        public int layerCount;
        public string[] itemTypes;
        public int boosterLimit;
        public LevelItemData[] items;
        public string[] solution;
    }
}
