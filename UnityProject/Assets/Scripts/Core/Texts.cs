namespace SortMaster
{
    /// <summary>
    /// 全部界面文案集中管理。
    /// 说明：字体子集化脚本会扫描本文件（及全部 .cs）中的中文字符生成字体子集，
    /// 因此新增文案必须写在这里或其它 .cs 的字符串字面量中，避免运行时缺字。
    /// </summary>
    public static class Texts
    {
        public const string GameTitle = "收纳大作战";
        public const string GameTitleEn = "SORT MASTER";
        public const string Version = "v1.0.0";

        // 主菜单
        public const string StartGame = "开始游戏";
        public const string LevelSelect = "关卡选择";
        public const string Settings = "设置";
        public const string Back = "返回";

        // 关卡选择
        public const string LevelProgress = "关卡进度";
        public const string Completed = "已通关";
        public const string Locked = "未解锁";
        public const string Current = "当前";

        // 游戏内
        public const string Remaining = "剩余";
        public const string Pause = "暂停";
        public const string Undo = "撤回";
        public const string Hint = "提示";
        public const string Shuffle = "洗牌";
        public const string Coins = "金币";
        public const string SlotFull = "收纳槽已满";
        public const string ContinueGame = "继续";
        public const string HintToast = "点击可拾取的物品";
        public const string BoosterEmpty = "道具已用完";
        public const string CannotUndo = "无法撤回";
        public const string Shuffled = "已洗牌";
        public const string LevelUnlocked = "已解锁新关卡";
        public const string FrozenTile = "该物品被冰冻，先完成消除";
        public const string LockedTile = "该物品已锁定，先完成消除";
        public const string CannotShuffle = "无法洗牌";

        // 结算
        public const string Victory = "恭喜通关！";
        public const string Defeat = "挑战失败";
        public const string GainCoins = "获得金币";
        public const string NextLevel = "下一关";
        public const string Retry = "重新挑战";
        public const string BackToSelect = "返回关卡选择";
        public const string BackToMenu = "返回主菜单";
        public const string Stars = "星级评价";
        public const string DefeatHint = "收纳槽满了，再试一次吧";

        // 设置
        public const string Music = "音乐";
        public const string Sfx = "音效";
        public const string Volume = "音量";
        public const string On = "开";
        public const string Off = "关";

        // 通用
        public const string Loading = "加载中…";
        public const string LevelMissing = "关卡数据缺失";
        public const string TapToContinue = "点击任意处继续";
        public const string Collection = "收藏品";
        public const string NewCollect = "新收藏";

        public static string LevelN(int id) => "第 " + id + " 关";
        public static string RemainingN(int n) => Remaining + " " + n;
        public static string CoinsN(int n) => Coins + " " + n;
        public static string GainCoinsN(int n) => GainCoins + " " + n;
    }
}
