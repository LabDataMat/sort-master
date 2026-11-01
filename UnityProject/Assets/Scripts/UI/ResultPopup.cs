using UnityEngine;
using UnityEngine.UI;

namespace SortMaster.UI
{
    /// <summary>胜利 / 失败结算弹窗。</summary>
    public sealed class ResultPopup : MonoBehaviour
    {
        public static ResultPopup Create(RectTransform parent, bool victory, int levelId, int stars, int coins, int remaining)
        {
            var rt = UIFactory.Node(parent, "ResultPopup");
            UIFactory.Stretch(rt);

            var overlay = rt.gameObject.AddComponent<Image>();
            overlay.color = new Color(0f, 0f, 0f, 0.55f);
            overlay.raycastTarget = true;

            var popup = rt.gameObject.AddComponent<ResultPopup>();
            popup.Build(rt, victory, levelId, stars, coins, remaining);
            return popup;
        }

        private void Build(RectTransform root, bool victory, int levelId, int stars, int coins, int remaining)
        {
            var gm = GameManager.Instance;

            var panel = UIFactory.AddImage(root, "Panel", UIFactory.Ui("panel"), Color.white);
            UIFactory.Center(panel.rectTransform, 0f, 10f, 620f, 720f);
            panel.raycastTarget = true;

            var title = UIFactory.AddText(panel.rectTransform, "Title",
                victory ? Texts.Victory : Texts.Defeat, 52,
                victory ? GameConfig.Brown : GameConfig.Red);
            UIFactory.Center(title.rectTransform, 0f, 280f, 560f, 80f);

            if (victory)
            {
                BuildStars(panel.rectTransform, stars);

                var coinIcon = UIFactory.AddImage(panel.rectTransform, "Coin", UIFactory.Ui("coin"), Color.white);
                UIFactory.Center(coinIcon.rectTransform, -70f, 60f, 44f, 44f);
                coinIcon.preserveAspect = true;

                var coinText = UIFactory.AddText(panel.rectTransform, "Coins", Texts.GainCoinsN(coins), 32,
                    GameConfig.Brown);
                UIFactory.Center(coinText.rectTransform, 40f, 60f, 300f, 50f);

                var next = UIFactory.AddButton(panel.rectTransform, "Next",
                    levelId >= GameConfig.MaxLevel ? Texts.BackToSelect : Texts.NextLevel,
                    34, Color.white,
                    () =>
                    {
                        if (levelId >= GameConfig.MaxLevel) gm.ShowLevelSelect();
                        else gm.StartLevel(levelId + 1);
                    });
                UIFactory.Center(next.GetComponent<RectTransform>(), 0f, -70f, 400f, 112f);

                var retry = UIFactory.AddButton(panel.rectTransform, "Retry", Texts.Retry, 30, GameConfig.Brown,
                    () => gm.StartLevel(levelId), "btn_secondary");
                UIFactory.Center(retry.GetComponent<RectTransform>(), 0f, -186f, 400f, 96f);

                var back = UIFactory.AddButton(panel.rectTransform, "Back", Texts.BackToSelect, 28, GameConfig.Brown,
                    () => gm.ShowLevelSelect(), "btn_secondary");
                UIFactory.Center(back.GetComponent<RectTransform>(), 0f, -292f, 400f, 88f);
            }
            else
            {
                var hint = UIFactory.AddText(panel.rectTransform, "Hint", Texts.DefeatHint, 28,
                    GameConfig.BrownSoft);
                UIFactory.Center(hint.rectTransform, 0f, 120f, 520f, 60f);

                var left = UIFactory.AddText(panel.rectTransform, "Left", Texts.RemainingN(remaining), 26,
                    GameConfig.BrownSoft);
                UIFactory.Center(left.rectTransform, 0f, 50f, 520f, 44f);

                var retry = UIFactory.AddButton(panel.rectTransform, "Retry", Texts.Retry, 34, Color.white,
                    () => gm.StartLevel(levelId));
                UIFactory.Center(retry.GetComponent<RectTransform>(), 0f, -80f, 400f, 112f);

                var menu = UIFactory.AddButton(panel.rectTransform, "Menu", Texts.BackToMenu, 28, GameConfig.Brown,
                    () => gm.ShowMainMenu(), "btn_secondary");
                UIFactory.Center(menu.GetComponent<RectTransform>(), 0f, -210f, 400f, 96f);
            }
        }

        private void BuildStars(RectTransform panel, int stars)
        {
            for (int i = 0; i < 3; i++)
            {
                float x = (i - 1) * 130f;
                var icon = UIFactory.AddImage(panel, "Star" + i, UIFactory.Ui("icon_star"),
                    i < stars ? GameConfig.Gold : new Color(0.80f, 0.78f, 0.74f, 1f));
                UIFactory.Center(icon.rectTransform, x, 165f, 100f, 100f);
                icon.preserveAspect = true;
            }
        }
    }
}
