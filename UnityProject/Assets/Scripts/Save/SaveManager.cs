using System;
using System.Collections.Generic;
using UnityEngine;

namespace SortMaster.Save
{
    [Serializable]
    public class SaveData
    {
        public int maxUnlockedLevel = 1;
        public List<int> completed = new List<int>();
        public bool musicOn = true;
        public bool sfxOn = true;
        public float volume = 1f;
        public int coins = 0;
        public int boosterUndo = 3;
        public int boosterHint = 3;
        public int boosterShuffle = 3;
    }

    /// <summary>
    /// 存档：PlayerPrefs + JSON。
    /// WebGL 下 PlayerPrefs 写入 IndexedDB，刷新/关闭页面后仍然保留。
    /// </summary>
    public sealed class SaveManager
    {
        private const string Key = "sortmaster.save.v1";
        public SaveData Data { get; private set; }

        public SaveManager()
        {
            Load();
        }

        public void Load()
        {
            var raw = PlayerPrefs.GetString(Key, "");
            if (string.IsNullOrEmpty(raw))
            {
                Data = new SaveData();
                return;
            }
            try
            {
                var parsed = JsonUtility.FromJson<SaveData>(raw);
                Data = parsed ?? new SaveData();
                if (Data.completed == null) Data.completed = new List<int>();
            }
            catch (Exception e)
            {
                Debug.LogWarning("[SortMaster] 存档损坏，已重置：" + e.Message);
                Data = new SaveData();
            }
        }

        public void Save()
        {
            PlayerPrefs.SetString(Key, JsonUtility.ToJson(Data));
            PlayerPrefs.Save();
        }

        public bool IsCompleted(int levelId)
        {
            return Data.completed.Contains(levelId);
        }

        public bool IsUnlocked(int levelId)
        {
            return levelId <= Data.maxUnlockedLevel;
        }

        /// <summary>标记通关：解锁下一关、发放金币、保存。</summary>
        public void CompleteLevel(int levelId, int coins)
        {
            if (!Data.completed.Contains(levelId)) Data.completed.Add(levelId);
            if (levelId + 1 > Data.maxUnlockedLevel && levelId < GameConfig.MaxLevel)
            {
                Data.maxUnlockedLevel = levelId + 1;
            }
            Data.coins += coins;
            Save();
        }

        public void AddCoins(int amount)
        {
            Data.coins += amount;
            Save();
        }

        public bool SpendBooster(string type)
        {
            switch (type)
            {
                case "undo":
                    if (Data.boosterUndo <= 0) return false;
                    Data.boosterUndo--;
                    break;
                case "hint":
                    if (Data.boosterHint <= 0) return false;
                    Data.boosterHint--;
                    break;
                case "shuffle":
                    if (Data.boosterShuffle <= 0) return false;
                    Data.boosterShuffle--;
                    break;
                default:
                    return false;
            }
            Save();
            return true;
        }

        public int BoosterCount(string type)
        {
            switch (type)
            {
                case "undo": return Data.boosterUndo;
                case "hint": return Data.boosterHint;
                case "shuffle": return Data.boosterShuffle;
                default: return 0;
            }
        }
    }
}
