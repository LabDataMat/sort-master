using UnityEngine;
using UnityEngine.UI;

namespace SortMaster.UI
{
    /// <summary>主菜单：Logo、开始游戏、关卡选择、设置、金币与版本号。</summary>
    public sealed class MainMenuScreen : MonoBehaviour
    {
        public static MainMenuScreen Create(RectTransform parent)
        {
            var rt = UIFactory.Node(parent, "MainMenu");
            UIFactory.Stretch(rt);
            var screen = rt.gameObject.AddComponent<MainMenuScreen>();
            screen.Build(rt);
            return screen;
        }

        private void Build(RectTransform root)
        {
            var gm = GameManager.Instance;

            // 金币（右上角）
            var coinIcon = UIFactory.AddImage(root, "CoinIcon", UIFactory.Ui("coin"), Color.white);
            UIFactory.TopLeft(coinIcon.rectTransform, 566f, 34f, 44f, 44f);
            coinIcon.preserveAspect = true;

            var coinText = UIFactory.AddText(root, "CoinText", Texts.CoinsN(gm.Save.Data.coins), 30, GameConfig.Brown,
                TextAnchor.MiddleRight);
            UIFactory.TopLeft(coinText.rectTransform, 420f, 34f, 138f, 44f);

            // Logo
            var logo = UIFactory.AddImage(root, "Logo", UIFactory.Ui("logo"), Color.white);
            UIFactory.Center(logo.rectTransform, 0f, 350f, 430f, 215f);
            logo.preserveAspect = true;

            var title = UIFactory.AddText(root, "Title", Texts.GameTitle, 62, GameConfig.Brown);
            UIFactory.Center(title.rectTransform, 0f, 168f, 640f, 80f);

            var subtitle = UIFactory.AddText(root, "Subtitle", Texts.GameTitleEn, 26, GameConfig.BrownSoft);
            UIFactory.Center(subtitle.rectTransform, 0f, 106f, 640f, 40f);

            // 开始游戏
            var start = UIFactory.AddButton(root, "Start", Texts.StartGame, 40, Color.white,
                () => gm.StartLevel(Mathf.Clamp(gm.Save.Data.maxUnlockedLevel, 1, GameConfig.MaxLevel)));
            UIFactory.Center(start.GetComponent<RectTransform>(), 0f, -40f, 400f, 122f);

            // 关卡选择
            var levels = UIFactory.AddButton(root, "Levels", Texts.LevelSelect, 34, GameConfig.Brown,
                () => gm.ShowLevelSelect(), "btn_secondary");
            UIFactory.Center(levels.GetComponent<RectTransform>(), 0f, -186f, 400f, 108f);

            // 设置
            var settings = UIFactory.AddButton(root, "Settings", Texts.Settings, 30, GameConfig.Brown,
                () => gm.ShowSettings(), "btn_secondary");
            UIFactory.Center(settings.GetComponent<RectTransform>(), 0f, -318f, 320f, 96f);

            // 版本号
            var version = UIFactory.AddText(root, "Version", Texts.Version, 24, GameConfig.BrownSoft);
            UIFactory.Center(version.rectTransform, 0f, -600f, 240f, 40f);
        }
    }
}
