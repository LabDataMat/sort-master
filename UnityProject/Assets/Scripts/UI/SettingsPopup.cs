using UnityEngine;
using UnityEngine.UI;

namespace SortMaster.UI
{
    /// <summary>设置弹窗：音乐、音效开关与音量调节。</summary>
    public sealed class SettingsPopup : MonoBehaviour
    {
        private Text _musicLabel;
        private Text _sfxLabel;

        public static SettingsPopup Create(RectTransform parent)
        {
            var rt = UIFactory.Node(parent, "SettingsPopup");
            UIFactory.Stretch(rt);

            var overlay = rt.gameObject.AddComponent<Image>();
            overlay.color = new Color(0f, 0f, 0f, 0.5f);
            overlay.raycastTarget = true;

            var popup = rt.gameObject.AddComponent<SettingsPopup>();
            popup.Build(rt);
            return popup;
        }

        private void Build(RectTransform root)
        {
            var gm = GameManager.Instance;

            var panel = UIFactory.AddImage(root, "Panel", UIFactory.Ui("panel"), Color.white);
            UIFactory.Center(panel.rectTransform, 0f, 20f, 620f, 660f);
            panel.raycastTarget = true;

            var title = UIFactory.AddText(panel.rectTransform, "Title", Texts.Settings, 46, GameConfig.Brown);
            UIFactory.Center(title.rectTransform, 0f, 240f, 420f, 70f);

            // 音乐
            var musicText = UIFactory.AddText(panel.rectTransform, "MusicLabel", Texts.Music, 34, GameConfig.Brown);
            UIFactory.Center(musicText.rectTransform, -130f, 140f, 240f, 60f);

            var musicBtn = UIFactory.AddButton(panel.rectTransform, "MusicToggle", "", 30, GameConfig.Brown,
                ToggleMusic, "btn_secondary");
            UIFactory.Center(musicBtn.GetComponent<RectTransform>(), 170f, 140f, 160f, 74f);
            _musicLabel = UIFactory.AddText(musicBtn.GetComponent<RectTransform>(), "State", "", 30, GameConfig.Brown);
            UIFactory.Stretch(_musicLabel.rectTransform);

            // 音效
            var sfxText = UIFactory.AddText(panel.rectTransform, "SfxLabel", Texts.Sfx, 34, GameConfig.Brown);
            UIFactory.Center(sfxText.rectTransform, -130f, 40f, 240f, 60f);

            var sfxBtn = UIFactory.AddButton(panel.rectTransform, "SfxToggle", "", 30, GameConfig.Brown,
                ToggleSfx, "btn_secondary");
            UIFactory.Center(sfxBtn.GetComponent<RectTransform>(), 170f, 40f, 160f, 74f);
            _sfxLabel = UIFactory.AddText(sfxBtn.GetComponent<RectTransform>(), "State", "", 30, GameConfig.Brown);
            UIFactory.Stretch(_sfxLabel.rectTransform);

            // 音量
            var volumeText = UIFactory.AddText(panel.rectTransform, "VolumeLabel", Texts.Volume, 34, GameConfig.Brown);
            UIFactory.Center(volumeText.rectTransform, 0f, -60f, 240f, 56f);

            var slider = BuildVolumeSlider(panel.rectTransform, gm.Save.Data.volume);
            slider.onValueChanged.AddListener(OnVolumeChanged);

            // 返回
            var back = UIFactory.AddButton(panel.rectTransform, "Back", Texts.Back, 32, Color.white,
                () => Destroy(root.gameObject));
            UIFactory.Center(back.GetComponent<RectTransform>(), 0f, -230f, 380f, 104f);

            RefreshLabels();
        }

        private Slider BuildVolumeSlider(RectTransform panel, float value)
        {
            var rt = UIFactory.Node(panel, "VolumeSlider");
            UIFactory.Center(rt, 0f, -140f, 460f, 44f);

            var slider = rt.gameObject.AddComponent<Slider>();

            var bg = UIFactory.AddImage(rt, "Background", null, new Color(0.85f, 0.80f, 0.74f, 1f));
            var bgRt = bg.rectTransform;
            bgRt.anchorMin = new Vector2(0f, 0.5f);
            bgRt.anchorMax = new Vector2(1f, 0.5f);
            bgRt.sizeDelta = new Vector2(0f, 14f);
            bgRt.anchoredPosition = Vector2.zero;
            bg.raycastTarget = true;

            var fillArea = UIFactory.Node(rt, "Fill Area");
            fillArea.anchorMin = new Vector2(0f, 0.5f);
            fillArea.anchorMax = new Vector2(1f, 0.5f);
            fillArea.sizeDelta = new Vector2(-26f, 14f);
            fillArea.anchoredPosition = Vector2.zero;

            var fill = UIFactory.AddImage(fillArea, "Fill", null, GameConfig.Orange);
            var fillRt = fill.rectTransform;
            fillRt.anchorMin = Vector2.zero;
            fillRt.anchorMax = Vector2.one;
            fillRt.sizeDelta = Vector2.zero;
            fillRt.anchoredPosition = Vector2.zero;

            var handleArea = UIFactory.Node(rt, "Handle Slide Area");
            handleArea.anchorMin = new Vector2(0f, 0f);
            handleArea.anchorMax = new Vector2(1f, 1f);
            handleArea.sizeDelta = new Vector2(-26f, 0f);
            handleArea.anchoredPosition = Vector2.zero;

            var handle = UIFactory.AddImage(handleArea, "Handle", null, Color.white);
            handle.rectTransform.sizeDelta = new Vector2(34f, 34f);

            slider.fillRect = fillRt;
            slider.handleRect = handle.rectTransform;
            slider.targetGraphic = handle;
            slider.direction = Slider.Direction.LeftToRight;
            slider.minValue = 0f;
            slider.maxValue = 1f;
            slider.value = Mathf.Clamp01(value);
            return slider;
        }

        private void ToggleMusic()
        {
            var gm = GameManager.Instance;
            gm.Save.Data.musicOn = !gm.Save.Data.musicOn;
            gm.Save.Save();
            gm.Audio.Apply(gm.Save.Data.musicOn, gm.Save.Data.sfxOn, gm.Save.Data.volume);
            if (gm.Save.Data.musicOn) gm.Audio.PlayBgm("bgm_home");
            RefreshLabels();
        }

        private void ToggleSfx()
        {
            var gm = GameManager.Instance;
            gm.Save.Data.sfxOn = !gm.Save.Data.sfxOn;
            gm.Save.Save();
            gm.Audio.Apply(gm.Save.Data.musicOn, gm.Save.Data.sfxOn, gm.Save.Data.volume);
            if (gm.Save.Data.sfxOn) gm.Audio.PlaySfx("click");
            RefreshLabels();
        }

        private void OnVolumeChanged(float v)
        {
            var gm = GameManager.Instance;
            gm.Save.Data.volume = v;
            gm.Save.Save();
            gm.Audio.Apply(gm.Save.Data.musicOn, gm.Save.Data.sfxOn, v);
        }

        private void RefreshLabels()
        {
            var data = GameManager.Instance.Save.Data;
            if (_musicLabel != null) _musicLabel.text = data.musicOn ? Texts.On : Texts.Off;
            if (_sfxLabel != null) _sfxLabel.text = data.sfxOn ? Texts.On : Texts.Off;
        }
    }
}
