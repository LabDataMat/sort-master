using System.Collections.Generic;
using UnityEngine;

namespace SortMaster.Items
{
    /// <summary>
    /// 物品图片库：运行时把 PNG 纹理转换为 Sprite 并缓存。
    /// 采用 Texture2D → Sprite.Create 的方式，避免依赖每张图的导入类型设置，
    /// 使工程在任意 Unity 版本打开都能正确显示。
    /// </summary>
    public sealed class ItemDatabase
    {
        private readonly Dictionary<string, Sprite> _items = new Dictionary<string, Sprite>();
        private readonly Dictionary<string, Sprite> _ui = new Dictionary<string, Sprite>();
        private readonly Dictionary<string, Sprite> _collect = new Dictionary<string, Sprite>();

        public Sprite GetItem(string itemId)
        {
            return Get(_items, GameConfig.ItemTextureDir + itemId);
        }

        public Sprite GetUi(string name)
        {
            return Get(_ui, GameConfig.UiTextureDir + name);
        }

        public Sprite GetCollect(string name)
        {
            return Get(_collect, GameConfig.CollectTextureDir + name);
        }

        public bool HasItem(string itemId)
        {
            return GetItem(itemId) != null;
        }

        private static Sprite Get(Dictionary<string, Sprite> cache, string path)
        {
            Sprite cached;
            if (cache.TryGetValue(path, out cached)) return cached;

            var tex = Resources.Load<Texture2D>(path);
            if (tex == null)
            {
                cache[path] = null;
                return null;
            }

            var sprite = Sprite.Create(
                tex,
                new Rect(0f, 0f, tex.width, tex.height),
                new Vector2(0.5f, 0.5f),
                100f);
            sprite.name = path;
            cache[path] = sprite;
            return sprite;
        }
    }
}
