using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using SortMaster.Gameplay;

namespace SortMaster.UI
{
    /// <summary>收纳槽表现层：槽位格子、物品落位、消除弹跳。</summary>
    public sealed class SlotView : MonoBehaviour
    {
        private const float CellSize = 88f;
        private const float CellGap = 6f;

        private RectTransform _root;
        private readonly List<RectTransform> _cells = new List<RectTransform>();
        private readonly List<Image> _items = new List<Image>();
        private int _capacity;

        public static SlotView Create(RectTransform parent, int capacity)
        {
            var rt = UIFactory.Node(parent, "Tray");
            UIFactory.TopLeft(rt, 0f, GameConfig.TrayTop, GameConfig.DesignWidth, GameConfig.TrayHeight);

            var tray = UIFactory.AddImage(rt, "TrayBg", UIFactory.Ui("tray"), Color.white);
            UIFactory.Stretch(tray.rectTransform);
            tray.preserveAspect = false;

            var view = rt.gameObject.AddComponent<SlotView>();
            view._root = rt;
            view._capacity = capacity;
            view.BuildCells();
            return view;
        }

        private void BuildCells()
        {
            float total = _capacity * CellSize + (_capacity - 1) * CellGap;
            float startX = -total * 0.5f + CellSize * 0.5f;

            for (int i = 0; i < _capacity; i++)
            {
                var cell = UIFactory.Node(_root, "Cell_" + i);
                UIFactory.Center(cell, startX + i * (CellSize + CellGap), 0f, CellSize, CellSize);

                var bg = cell.gameObject.AddComponent<Image>();
                bg.sprite = UIFactory.Ui("slot_cell");
                bg.color = Color.white;
                bg.preserveAspect = false;
                bg.raycastTarget = false;

                var item = UIFactory.AddImage(cell, "Item", null, Color.white);
                UIFactory.Center(item.rectTransform, 0f, 0f, CellSize - 10f, CellSize - 10f);
                item.preserveAspect = true;
                item.enabled = false;

                _cells.Add(cell);
                _items.Add(item);
            }
        }

        public Vector3 CellWorldPosition(int index)
        {
            if (index < 0) index = 0;
            if (index >= _cells.Count) index = _cells.Count - 1;
            return _cells[index].position;
        }

        /// <summary>按逻辑状态刷新槽内显示（顺序与槽内一致）。</summary>
        public void Refresh(IReadOnlyList<SlotItem> items)
        {
            for (int i = 0; i < _items.Count; i++)
            {
                bool has = items != null && i < items.Count;
                if (!has)
                {
                    _items[i].enabled = false;
                    continue;
                }

                var sprite = GameManager.Instance.Items.GetItem(items[i].ItemId);
                _items[i].sprite = sprite;
                _items[i].enabled = sprite != null;
                _items[i].color = Color.white;
                _items[i].rectTransform.localScale = Vector3.one;
            }
        }

        public void PlayPop(int index)
        {
            if (index < 0 || index >= _items.Count) return;
            StartCoroutine(PopRoutine(_items[index].rectTransform));
        }

        private IEnumerator PopRoutine(RectTransform rt)
        {
            float t = 0f;
            while (t < 0.12f)
            {
                t += Time.deltaTime;
                float k = Mathf.Clamp01(t / 0.12f);
                rt.localScale = Vector3.one * Mathf.Lerp(0.72f, 1f, k);
                yield return null;
            }
            rt.localScale = Vector3.one;
        }

        /// <summary>槽位告警：整体轻微抖动。</summary>
        public void Shake()
        {
            StartCoroutine(ShakeRoutine());
        }

        private IEnumerator ShakeRoutine()
        {
            var rt = _root;
            Vector2 origin = rt.anchoredPosition;
            float t = 0f;
            while (t < 0.3f)
            {
                t += Time.deltaTime;
                float amp = 8f * (1f - t / 0.3f);
                rt.anchoredPosition = origin + new Vector2(Mathf.Sin(t * 60f) * amp, 0f);
                yield return null;
            }
            rt.anchoredPosition = origin;
        }
    }
}
