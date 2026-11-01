using UnityEngine;
using UnityEngine.UI;

namespace SortMaster.UI
{
    /// <summary>
    /// 关卡选择：100 关网格，支持滚动、解锁状态、通关标记与当前关卡高亮。
    /// </summary>
    public sealed class LevelSelectScreen : MonoBehaviour
    {
        private const int Columns = 4;
        private const float Cell = 155f;
        private const float Spacing = 16f;

        public static LevelSelectScreen Create(RectTransform parent)
        {
            var rt = UIFactory.Node(parent, "LevelSelect");
            UIFactory.Stretch(rt);
            var screen = rt.gameObject.AddComponent<LevelSelectScreen>();
            screen.Build(rt);
            return screen;
        }

        private void Build(RectTransform root)
        {
            var gm = GameManager.Instance;

            // 顶部栏
            var back = UIFactory.AddButton(root, "Back", Texts.Back, 28, Color.white,
                () => gm.ShowMainMenu());
            UIFactory.TopLeft(back.GetComponent<RectTransform>(), 24f, 30f, 140f, 72f);

            var title = UIFactory.AddText(root, "Title", Texts.LevelSelect, 40, GameConfig.Brown);
            UIFactory.TopLeft(title.rectTransform, 250f, 34f, 250f, 64f);

            var coinIcon = UIFactory.AddImage(root, "CoinIcon", UIFactory.Ui("coin"), Color.white);
            UIFactory.TopLeft(coinIcon.rectTransform, 566f, 40f, 40f, 40f);
            coinIcon.preserveAspect = true;

            var coinText = UIFactory.AddText(root, "CoinText", Texts.CoinsN(gm.Save.Data.coins), 26, GameConfig.Brown,
                TextAnchor.MiddleRight);
            UIFactory.TopLeft(coinText.rectTransform, 430f, 40f, 128f, 40f);

            // 滚动区
            var scrollRt = UIFactory.Node(root, "Scroll");
            UIFactory.TopLeft(scrollRt, 20f, 140f, 710f, 1100f);

            var scroll = scrollRt.gameObject.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.vertical = true;
            scroll.movementType = ScrollRect.MovementType.Elastic;
            scroll.elasticity = 0.1f;
            scroll.scrollSensitivity = 30f;
            scroll.inertia = true;

            var viewport = UIFactory.Node(scrollRt, "Viewport");
            UIFactory.Stretch(viewport);
            viewport.gameObject.AddComponent<RectMask2D>();
            scroll.viewport = viewport;

            var content = UIFactory.Node(viewport, "Content");
            content.anchorMin = new Vector2(0f, 1f);
            content.anchorMax = new Vector2(1f, 1f);
            content.pivot = new Vector2(0.5f, 1f);
            content.anchoredPosition = Vector2.zero;

            var grid = content.gameObject.AddComponent<GridLayoutGroup>();
            grid.cellSize = new Vector2(Cell, Cell);
            grid.spacing = new Vector2(Spacing, Spacing);
            grid.padding = new RectOffset(20, 20, 18, 18);
            grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            grid.constraintCount = Columns;
            grid.childAlignment = TextAnchor.UpperCenter;

            var fitter = content.gameObject.AddComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            scroll.content = content;

            // 生成 100 个关卡格子
            for (int id = 1; id <= GameConfig.MaxLevel; id++)
            {
                CreateCell(content, id);
            }

            // 滚动到当前关卡附近
            Canvas.ForceUpdateCanvases();
            int current = Mathf.Clamp(gm.Save.Data.maxUnlockedLevel, 1, GameConfig.MaxLevel);
            int row = (current - 1) / Columns;
            float y = row * (Cell + Spacing);
            float maxScroll = Mathf.Max(0f, content.rect.height - viewport.rect.height);
            scroll.verticalNormalizedPosition = maxScroll <= 0f ? 1f : Mathf.Clamp01(1f - y / maxScroll);
        }

        private void CreateCell(RectTransform content, int levelId)
        {
            var gm = GameManager.Instance;
            bool unlocked = gm.Save.IsUnlocked(levelId);
            bool completed = gm.Save.IsCompleted(levelId);
            bool isCurrent = levelId == gm.Save.Data.maxUnlockedLevel && !completed;

            var rt = UIFactory.Node(content, "Level_" + levelId);

            var bg = rt.gameObject.AddComponent<Image>();
            bg.sprite = UIFactory.Ui(unlocked ? "card_bg" : "card_locked");
            bg.color = Color.white;
            bg.preserveAspect = false;
            bg.raycastTarget = true;

            if (isCurrent)
            {
                var ring = UIFactory.AddImage(rt, "Ring", UIFactory.Ui("frame_rare"), Color.white);
                UIFactory.Stretch(ring.rectTransform);
            }

            var num = UIFactory.AddText(rt, "Num", levelId.ToString(), 44,
                unlocked ? GameConfig.Brown : new Color(0.55f, 0.52f, 0.50f, 1f));
            UIFactory.Stretch(num.rectTransform);

            if (completed)
            {
                var star = UIFactory.AddImage(rt, "Star", UIFactory.Ui("icon_star"), Color.white);
                UIFactory.TopLeft(star.rectTransform, Cell - 46f, 8f, 36f, 36f);
                star.preserveAspect = true;
            }

            if (!unlocked)
            {
                var lockIcon = UIFactory.AddImage(rt, "Lock", UIFactory.Ui("lock_overlay"), new Color(1f, 1f, 1f, 0.85f));
                UIFactory.Center(lockIcon.rectTransform, 0f, -18f, 54f, 54f);
                lockIcon.preserveAspect = true;

                var btn = UIFactory.MakeButton(rt.gameObject, null);
                btn.interactable = false;
                return;
            }

            UIFactory.MakeButton(rt.gameObject, () => gm.StartLevel(levelId));
        }
    }
}
