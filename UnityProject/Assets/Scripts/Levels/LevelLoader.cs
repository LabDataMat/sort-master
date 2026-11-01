using System.Collections.Generic;
using UnityEngine;

namespace SortMaster.Levels
{
    /// <summary>
    /// 关卡加载器：按编号从 Resources 读取 JSON。
    /// 采用按需加载（只在进入关卡时读取该关），避免启动时加载全部 100 关。
    /// </summary>
    public sealed class LevelLoader
    {
        private readonly Dictionary<int, LevelData> _cache = new Dictionary<int, LevelData>();

        public LevelData Load(int levelId)
        {
            LevelData cached;
            if (_cache.TryGetValue(levelId, out cached)) return cached;

            string path = GameConfig.LevelDir + levelId.ToString("000");
            var asset = Resources.Load<TextAsset>(path);
            if (asset == null)
            {
                Debug.LogError("[SortMaster] 关卡数据缺失：" + path);
                return null;
            }

            var data = JsonUtility.FromJson<LevelData>(asset.text);
            if (data == null)
            {
                Debug.LogError("[SortMaster] 关卡 JSON 解析失败：" + path);
                return null;
            }

            _cache[levelId] = data;
            return data;
        }

        public bool Exists(int levelId)
        {
            return Resources.Load<TextAsset>(GameConfig.LevelDir + levelId.ToString("000")) != null;
        }
    }
}
