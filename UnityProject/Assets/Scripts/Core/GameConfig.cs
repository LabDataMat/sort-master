using UnityEngine;

namespace SortMaster
{
    /// <summary>全局常量：设计分辨率、布局分区、配色、资源路径。</summary>
    public static class GameConfig
    {
        // 设计基准（与旧版 Web 一致，便于复用关卡坐标）
        public const float DesignWidth = 750f;
        public const float DesignHeight = 1334f;

        // 布局分区（以左上角为原点，y 向下）
        public const float HeaderHeight = 120f;
        public const float BoardTop = 132f;
        public const float BoardWidth = 750f;
        public const float BoardHeight = 896f;
        public const float TrayTop = 1042f;
        public const float TrayHeight = 136f;
        public const float BoosterTop = 1196f;

        public const int MaxLevel = 100;
        public const int DefaultSlotCapacity = 7;

        // 资源路径
        public const string FontPath = "Fonts/NotoSansSC-Regular";
        public const string ItemTextureDir = "Textures/items/";
        public const string UiTextureDir = "Textures/ui/";
        public const string CollectTextureDir = "Textures/collect/";
        public const string LevelDir = "Data/levels/level_";
        public const string SfxDir = "Audio/sfx/";
        public const string BgmDir = "Audio/bgm/";

        // 配色（柔和、有层次的暖色系）
        public static readonly Color Cream = new Color(0.988f, 0.961f, 0.918f, 1f);
        public static readonly Color Panel = new Color(1f, 0.988f, 0.965f, 0.97f);
        public static readonly Color Brown = new Color(0.322f, 0.212f, 0.149f, 1f);
        public static readonly Color BrownSoft = new Color(0.482f, 0.376f, 0.310f, 1f);
        public static readonly Color Orange = new Color(0.957f, 0.612f, 0.247f, 1f);
        public static readonly Color OrangeDeep = new Color(0.878f, 0.482f, 0.157f, 1f);
        public static readonly Color Green = new Color(0.361f, 0.706f, 0.451f, 1f);
        public static readonly Color Red = new Color(0.890f, 0.353f, 0.322f, 1f);
        public static readonly Color Gold = new Color(0.980f, 0.780f, 0.290f, 1f);
        public static readonly Color White = Color.white;
        public static readonly Color Shadow = new Color(0.24f, 0.16f, 0.11f, 0.16f);
        public static readonly Color BlockedTint = new Color(0.72f, 0.70f, 0.70f, 0.90f);

        // 遮挡判定：重叠比例阈值（与烘焙/校验工具保持一致）
        public const float OcclusionRatio = 0.35f;
    }
}
