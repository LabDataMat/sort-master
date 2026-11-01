using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

namespace SortMaster.UI
{
    /// <summary>
    /// 代码构建 UI 的工具集。
    /// 全部界面由脚本生成，工程不需要任何手工制作的 Prefab 或场景连线，
    /// 从而保证「打开工程即可运行」。
    /// </summary>
    public static class UIFactory
    {
        private static Font _font;
        private static readonly System.Collections.Generic.Dictionary<string, Sprite> _uiSprites
            = new System.Collections.Generic.Dictionary<string, Sprite>();

        public static Font Font
        {
            get
            {
                if (_font == null) _font = LoadFont();
                return _font;
            }
        }

        private static Font LoadFont()
        {
            var f = Resources.Load<Font>(GameConfig.FontPath);
            if (f != null) return f;

            // 兜底：Unity 2022+ 内置字体
            try { f = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); } catch { }
            if (f == null)
            {
                try { f = Resources.GetBuiltinResource<Font>("Arial.ttf"); } catch { }
            }
            return f;
        }

        public static Sprite Ui(string name)
        {
            Sprite s;
            if (_uiSprites.TryGetValue(name, out s)) return s;

            var tex = Resources.Load<Texture2D>(GameConfig.UiTextureDir + name);
            if (tex == null)
            {
                _uiSprites[name] = null;
                return null;
            }
            s = Sprite.Create(tex, new Rect(0f, 0f, tex.width, tex.height), new Vector2(0.5f, 0.5f), 100f);
            s.name = name;
            _uiSprites[name] = s;
            return s;
        }

        // ---------------- 基础节点 ----------------

        public static RectTransform Node(Transform parent, string name)
        {
            var go = new GameObject(name, typeof(RectTransform));
            var rt = go.GetComponent<RectTransform>();
            rt.SetParent(parent, false);
            rt.localScale = Vector3.one;
            return rt;
        }

        /// <summary>以左上角为锚点定位（y 向下为正，符合设计稿习惯）。</summary>
        public static RectTransform TopLeft(RectTransform rt, float x, float y, float w, float h)
        {
            rt.anchorMin = new Vector2(0f, 1f);
            rt.anchorMax = new Vector2(0f, 1f);
            rt.pivot = new Vector2(0f, 1f);
            rt.anchoredPosition = new Vector2(x, -y);
            rt.sizeDelta = new Vector2(w, h);
            return rt;
        }

        /// <summary>以中心为锚点定位（y 向上为正）。</summary>
        public static RectTransform Center(RectTransform rt, float x, float y, float w, float h)
        {
            rt.anchorMin = new Vector2(0.5f, 0.5f);
            rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = new Vector2(x, y);
            rt.sizeDelta = new Vector2(w, h);
            return rt;
        }

        /// <summary>四边拉伸铺满父节点。</summary>
        public static RectTransform Stretch(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
            return rt;
        }

        // ---------------- 常用控件 ----------------

        public static Image AddImage(Transform parent, string name, Sprite sprite, Color color)
        {
            var rt = Node(parent, name);
            var img = rt.gameObject.AddComponent<Image>();
            img.sprite = sprite;
            img.color = color;
            img.preserveAspect = false;
            img.raycastTarget = false;
            return img;
        }

        public static Image AddPanel(Transform parent, string name, Color color)
        {
            var img = AddImage(parent, name, null, color);
            img.raycastTarget = true;
            return img;
        }

        public static Text AddText(Transform parent, string name, string content, int size, Color color,
            TextAnchor anchor = TextAnchor.MiddleCenter)
        {
            var rt = Node(parent, name);
            var text = rt.gameObject.AddComponent<Text>();
            text.font = Font;
            text.text = content;
            text.fontSize = size;
            text.color = color;
            text.alignment = anchor;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.raycastTarget = false;
            text.supportRichText = true;
            return text;
        }

        public static Button AddButton(Transform parent, string name, string label, int fontSize,
            Color textColor, UnityAction onClick, string spriteName = "btn_primary")
        {
            var rt = Node(parent, name);
            var img = rt.gameObject.AddComponent<Image>();
            img.sprite = Ui(spriteName);
            img.color = Color.white;
            img.raycastTarget = true;

            var btn = rt.gameObject.AddComponent<Button>();
            btn.targetGraphic = img;
            btn.transition = Selectable.Transition.ColorTint;

            var colors = btn.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(0.97f, 0.97f, 0.97f, 1f);
            colors.pressedColor = new Color(0.86f, 0.86f, 0.86f, 1f);
            colors.selectedColor = Color.white;
            colors.disabledColor = new Color(0.75f, 0.75f, 0.75f, 0.5f);
            colors.fadeDuration = 0.08f;
            btn.colors = colors;

            var text = AddText(rt, "Label", label, fontSize, textColor);
            Stretch(text.rectTransform);

            if (onClick != null) btn.onClick.AddListener(onClick);
            return btn;
        }

        /// <summary>给已有图片节点加按钮能力（用于关卡格子等自定义外观）。</summary>
        public static Button MakeButton(GameObject go, UnityAction onClick)
        {
            var img = go.GetComponent<Image>();
            if (img != null) img.raycastTarget = true;

            var btn = go.GetComponent<Button>();
            if (btn == null) btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            btn.transition = Selectable.Transition.ColorTint;

            var colors = btn.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(0.97f, 0.97f, 0.97f, 1f);
            colors.pressedColor = new Color(0.86f, 0.86f, 0.86f, 1f);
            colors.disabledColor = new Color(0.75f, 0.75f, 0.75f, 0.5f);
            colors.fadeDuration = 0.08f;
            btn.colors = colors;

            if (onClick != null) btn.onClick.AddListener(onClick);
            return btn;
        }
    }
}
