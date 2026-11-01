using UnityEngine;
using UnityEngine.UI;

namespace SortMaster.UI
{
    /// <summary>暂停弹窗：继续 / 重新开始 / 返回主菜单。</summary>
    public sealed class PausePopup : MonoBehaviour
    {
        public static PausePopup Create(RectTransform parent, int levelId)
        {
            var rt = UIFactory.Node(parent, "PausePopup");
            UIFactory.Stretch(rt);

            var overlay = rt.gameObject.AddComponent<Image>();
            overlay.color = new Color(0f, 0f, 0f, 0.5f);
            overlay.raycastTarget = true;

            var popup = rt.gameObject.AddComponent<PausePopup>();
            popup.Build(rt, levelId);
            return popup;
        }

        private void Build(RectTransform root, int levelId)
        {
            var gm = GameManager.Instance;

            var panel = UIFactory.AddImage(root, "Panel", UIFactory.Ui("panel"), Color.white);
            UIFactory.Center(panel.rectTransform, 0f, 20f, 540f, 560f);
            panel.raycastTarget = true;

            var title = UIFactory.AddText(panel.rectTransform, "Title", Texts.Pause, 46, GameConfig.Brown);
            UIFactory.Center(title.rectTransform, 0f, 190f, 420f, 70f);

            var resume = UIFactory.AddButton(panel.rectTransform, "Resume", Texts.ContinueGame, 32, Color.white,
                () => Destroy(root.gameObject));
            UIFactory.Center(resume.GetComponent<RectTransform>(), 0f, 60f, 380f, 104f);

            var restart = UIFactory.AddButton(panel.rectTransform, "Restart", Texts.Retry, 28, GameConfig.Brown,
                () => gm.StartLevel(levelId), "btn_secondary");
            UIFactory.Center(restart.GetComponent<RectTransform>(), 0f, -60f, 380f, 92f);

            var menu = UIFactory.AddButton(panel.rectTransform, "Menu", Texts.BackToMenu, 28, GameConfig.Brown,
                () => gm.ShowMainMenu(), "btn_secondary");
            UIFactory.Center(menu.GetComponent<RectTransform>(), 0f, -170f, 380f, 88f);
        }
    }
}
