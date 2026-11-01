using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;
using SortMaster.Gameplay;

namespace SortMaster.UI
{
    /// <summary>棋盘上单个物品的表现层：图片、点击、遮挡态显示。</summary>
    public sealed class ItemView : MonoBehaviour
    {
        public string TileId;
        public Image Image;
        public RectTransform Rect;
        public Button Button;

        public static ItemView Create(RectTransform parent, BoardTile tile, Sprite sprite, UnityAction onClick)
        {
            var rt = UIFactory.Node(parent, "Tile_" + tile.Id);
            UIFactory.TopLeft(rt, tile.X, tile.Y, tile.W, tile.H);

            // 确定性微旋转，制造自然堆叠感（同一物品每次进入角度一致）
            int hash = 17;
            for (int i = 0; i < tile.Id.Length; i++) hash = (hash * 31 + tile.Id[i]) & 0x7fffffff;
            float angle = ((hash % 9) - 4) * 1.4f;
            rt.localRotation = Quaternion.Euler(0f, 0f, angle);

            var img = rt.gameObject.AddComponent<Image>();
            img.sprite = sprite;
            img.color = Color.white;
            img.preserveAspect = true;
            img.raycastTarget = true;

            var view = rt.gameObject.AddComponent<ItemView>();
            view.TileId = tile.Id;
            view.Image = img;
            view.Rect = rt;
            view.Button = UIFactory.MakeButton(rt.gameObject, onClick);

            // 遮挡态由代码直接控制颜色，避免 disabledColor 二次压暗
            var colors = view.Button.colors;
            colors.disabledColor = Color.white;
            view.Button.colors = colors;

            return view;
        }

        public void SetBlocked(bool blocked)
        {
            if (Button != null) Button.interactable = !blocked;
            if (Image != null) Image.color = blocked ? GameConfig.BlockedTint : Color.white;
        }

        public void SetSprite(Sprite sprite)
        {
            if (Image != null) Image.sprite = sprite;
        }
    }
}
