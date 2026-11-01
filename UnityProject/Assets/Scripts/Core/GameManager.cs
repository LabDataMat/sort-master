using System.Collections;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using SortMaster.Audio;
using SortMaster.Items;
using SortMaster.Levels;
using SortMaster.Save;
using SortMaster.UI;

namespace SortMaster
{
    /// <summary>
    /// 应用主控：负责服务初始化、画布构建与界面导航。
    /// 保持职责克制——具体玩法在 LevelSession，具体界面在各 Screen 中。
    /// </summary>
    public sealed class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public SaveManager Save { get; private set; }
        public AudioManager Audio { get; private set; }
        public ItemDatabase Items { get; private set; }
        public LevelLoader Levels { get; private set; }

        public RectTransform Root { get; private set; }
        public Image Background { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;

            Save = new SaveManager();
            Items = new ItemDatabase();
            Levels = new LevelLoader();
            Audio = new AudioManager(gameObject);
            Audio.Apply(Save.Data.musicOn, Save.Data.sfxOn, Save.Data.volume);

            EnsureCamera();
            BuildCanvas();
            ShowMainMenu();
        }

        // ---------------- 初始化 ----------------

        private void EnsureCamera()
        {
            if (Camera.main != null) return;

            var camGo = new GameObject("MainCamera");
            camGo.tag = "MainCamera";
            camGo.transform.SetParent(transform, false);
            camGo.transform.position = new Vector3(0f, 0f, -10f);

            var cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = GameConfig.Cream;
            cam.orthographic = true;
            cam.orthographicSize = 5f;
        }

        private void BuildCanvas()
        {
            var canvasGo = new GameObject("Canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvasGo.transform.SetParent(transform, false);

            var canvas = canvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.pixelPerfect = false;

            var scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(GameConfig.DesignWidth, GameConfig.DesignHeight);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;

            if (Object.FindObjectOfType<EventSystem>() == null)
            {
                var es = new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
                es.transform.SetParent(transform, false);
            }

            Background = UIFactory.AddImage(canvasGo.transform, "Background", null, GameConfig.Cream);
            UIFactory.Stretch(Background.rectTransform);
            Background.raycastTarget = false;

            Root = UIFactory.Node(canvasGo.transform, "Root");
            UIFactory.Stretch(Root);
        }

        // ---------------- 导航 ----------------

        private void ClearRoot()
        {
            for (int i = Root.childCount - 1; i >= 0; i--)
            {
                var child = Root.GetChild(i).gameObject;
                child.SetActive(false);
                Destroy(child);
            }
        }

        public void ShowMainMenu()
        {
            ClearRoot();
            Background.sprite = UIFactory.Ui("bg_home");
            Background.color = Color.white;
            Audio.PlayBgm("bgm_home");
            MainMenuScreen.Create(Root);
        }

        public void ShowLevelSelect()
        {
            ClearRoot();
            Background.sprite = UIFactory.Ui("bg_home");
            Background.color = Color.white;
            Audio.PlayBgm("bgm_home");
            LevelSelectScreen.Create(Root);
        }

        public void StartLevel(int levelId)
        {
            var data = Levels.Load(levelId);
            if (data == null)
            {
                Toast(Texts.LevelMissing);
                return;
            }

            ClearRoot();
            Background.sprite = UIFactory.Ui("bg_game");
            Background.color = Color.white;
            Audio.PlayBgm("bgm_game");
            GameScreen.Create(Root, levelId, data);
        }

        public void ShowSettings()
        {
            SettingsPopup.Create(Root);
        }

        // ---------------- 提示 ----------------

        public void Toast(string message)
        {
            var panel = UIFactory.Node(Root, "Toast");
            UIFactory.Center(panel, 0f, -420f, 580f, 76f);

            var bg = UIFactory.AddImage(panel, "bg", UIFactory.Ui("panel"), new Color(0.25f, 0.17f, 0.12f, 0.9f));
            UIFactory.Stretch(bg.rectTransform);

            var text = UIFactory.AddText(panel, "txt", message, 30, Color.white);
            UIFactory.Stretch(text.rectTransform);

            StartCoroutine(ToastRoutine(panel.gameObject));
        }

        private IEnumerator ToastRoutine(GameObject go)
        {
            var cg = go.AddComponent<CanvasGroup>();
            yield return new WaitForSeconds(0.9f);

            float t = 0f;
            while (t < 0.35f)
            {
                t += Time.deltaTime;
                cg.alpha = 1f - t / 0.35f;
                yield return null;
            }
            Destroy(go);
        }
    }
}
