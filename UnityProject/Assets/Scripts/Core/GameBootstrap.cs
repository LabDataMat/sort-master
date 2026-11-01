using UnityEngine;

namespace SortMaster
{
    /// <summary>
    /// 运行时入口：不依赖任何场景内容，进入 Play 或 WebGL 加载完成后自动构建游戏。
    /// 这样工程无需手工搭建场景，避免预制体/GUID 丢失导致无法运行。
    /// </summary>
    public static class GameBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Boot()
        {
            if (Object.FindObjectOfType<GameManager>() != null) return;

            var go = new GameObject("SortMaster");
            Object.DontDestroyOnLoad(go);
            go.AddComponent<GameManager>();
        }
    }
}
