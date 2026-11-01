using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using SortMaster.Gameplay;
using SortMaster.Levels;

namespace SortMaster.UI
{
    /// <summary>
    /// 游戏主界面：顶部信息、棋盘、收纳槽、道具、暂停与结算。
    ///
    /// 设计原则：
    /// - 逻辑先行：点击后立刻在 LevelSession 内完成结算，动画只做表现，不参与判定。
    /// - 输入闸门：动画期间 _inputLocked 拦截重复点击，避免同一物品重复入槽。
    /// </summary>
    public sealed class GameScreen : MonoBehaviour
    {
        private int _levelId;
        private LevelData _data;
        private LevelSession _session;

        private RectTransform _root;
        private RectTransform _boardRt;
        private SlotView _slotView;
        private Text _remainingText;
        private Text _comboText;
        private Text _undoLabel;
        private Text _hintLabel;
        private Text _shuffleLabel;

        private readonly Dictionary<string, ItemView> _views = new Dictionary<string, ItemView>();
        private bool _inputLocked;
        private bool _ended;
        private readonly System.Random _rng = new System.Random();

        public static GameScreen Create(RectTransform parent, int levelId, LevelData data)
        {
            var rt = UIFactory.Node(parent, "Game");
            UIFactory.Stretch(rt);
            var screen = rt.gameObject.AddComponent<GameScreen>();
            screen._root = rt;
            screen._levelId = levelId;
            screen._data = data;
            screen.Build();
            return screen;
        }

        private void Build()
        {
            _session = new LevelSession(_data);

            BuildHeader();
            BuildBoard();
            _slotView = SlotView.Create(_root, _session.Slots.Capacity);
            BuildBoosters();

            RebuildBoard();
            RefreshBlocked();
            _slotView.Refresh(_session.Slots.Items);
            UpdateHud();
            UpdateBoosterLabels();
        }

        // ---------------- 构建 ----------------

        private void BuildHeader()
        {
            var levelText = UIFactory.AddText(_root, "LevelText", Texts.LevelN(_levelId), 34,
                GameConfig.Brown, TextAnchor.MiddleLeft);
            UIFactory.TopLeft(levelText.rectTransform, 28f, 34f, 260f, 52f);

            _remainingText = UIFactory.AddText(_root, "Remaining", "", 30, GameConfig.BrownSoft);
            UIFactory.TopLeft(_remainingText.rectTransform, 262f, 36f, 240f, 48f);

            _comboText = UIFactory.AddText(_root, "Combo", "", 26, GameConfig.OrangeDeep);
            UIFactory.TopLeft(_comboText.rectTransform, 262f, 84f, 240f, 36f);

            var pause = UIFactory.AddButton(_root, "Pause", Texts.Pause, 26, GameConfig.Brown,
                OnPause, "btn_secondary");
            UIFactory.TopLeft(pause.GetComponent<RectTransform>(), 606f, 30f, 116f, 64f);
        }

        private void BuildBoard()
        {
            _boardRt = UIFactory.Node(_root, "Board");
            UIFactory.TopLeft(_boardRt, 0f, GameConfig.BoardTop, GameConfig.BoardWidth, GameConfig.BoardHeight);

            var table = UIFactory.AddImage(_boardRt, "Table", UIFactory.Ui("table"), Color.white);
            UIFactory.Stretch(table.rectTransform);
            table.preserveAspect = false;
            table.raycastTarget = false;
        }

        private void BuildBoosters()
        {
            _undoLabel = CreateBooster("Undo", "icon_undo", OnUndo, -240f);
            _hintLabel = CreateBooster("Hint", "icon_star", OnHint, 0f);
            _shuffleLabel = CreateBooster("Shuffle", "icon_shuffle", OnShuffle, 240f);
        }

        private Text CreateBooster(string name, string icon, UnityEngine.Events.UnityAction onClick, float x)
        {
            var btn = UIFactory.AddButton(_root, name, "", 24, GameConfig.Brown, onClick, "btn_secondary");
            var rt = btn.GetComponent<RectTransform>();
            UIFactory.Center(rt, x, -579f, 214f, 100f);

            var iconImage = UIFactory.AddImage(rt, "Icon", UIFactory.Ui(icon), Color.white);
            UIFactory.Center(iconImage.rectTransform, -58f, 0f, 52f, 52f);
            iconImage.preserveAspect = true;

            var label = UIFactory.AddText(rt, "Count", "", 26, GameConfig.Brown);
            UIFactory.Center(label.rectTransform, 26f, 0f, 108f, 56f);
            return label;
        }

        // ---------------- 棋盘视图 ----------------

        private void RebuildBoard()
        {
            for (int i = _boardRt.childCount - 1; i >= 0; i--)
            {
                var child = _boardRt.GetChild(i).gameObject;
                if (child.name == "Table") continue;
                child.SetActive(false);
                Destroy(child);
            }
            _views.Clear();

            var tiles = _session.Board.Tiles;
            for (int i = 0; i < tiles.Count; i++)
            {
                var tile = tiles[i];
                if (tile.Removed) continue;

                var sprite = GameManager.Instance.Items.GetItem(tile.ItemId);
                var view = ItemView.Create(_boardRt, tile, sprite, () => OnTileClicked(tile.Id));
                _views[tile.Id] = view;
            }
        }

        private void RefreshBlocked()
        {
            foreach (var kv in _views)
            {
                var tile = _session.Board.Get(kv.Key);
                bool blocked = tile == null || !_session.Board.IsClickable(tile);
                kv.Value.SetBlocked(blocked);
            }
        }

        private void UpdateHud()
        {
            _remainingText.text = Texts.RemainingN(_session.Board.RemainingCount);
            _comboText.text = _session.Combo >= 2 ? "连击 x" + _session.Combo : "";
        }

        private void UpdateBoosterLabels()
        {
            var save = GameManager.Instance.Save;
            _undoLabel.text = "x" + save.Data.boosterUndo;
            _hintLabel.text = "x" + save.Data.boosterHint;
            _shuffleLabel.text = "x" + save.Data.boosterShuffle;
        }

        // ---------------- 交互 ----------------

        private void OnTileClicked(string tileId)
        {
            if (_inputLocked || _ended) return;

            // 快照「拾取前」的槽内顺序，用于计算消除动画的起始格子
            var before = _session.Slots.Snapshot();
            var outcome = _session.Pick(tileId);

            if (!outcome.Ok)
            {
                HandleReject(outcome.Reason);
                return;
            }

            StartCoroutine(PickRoutine(tileId, outcome, before));
        }

        private void HandleReject(string reason)
        {
            switch (reason)
            {
                case "slots_full":
                    GameManager.Instance.Toast(Texts.SlotFull);
                    _slotView.Shake();
                    break;
                case "frozen":
                    GameManager.Instance.Toast(Texts.FrozenTile);
                    break;
                case "locked":
                    GameManager.Instance.Toast(Texts.LockedTile);
                    break;
                default:
                    break;
            }
        }

        private IEnumerator PickRoutine(string tileId, PickOutcome outcome, List<SlotItem> before)
        {
            _inputLocked = true;
            GameManager.Instance.Audio.PlaySfx("move");

            ItemView view = null;
            _views.TryGetValue(tileId, out view);

            int targetIndex = Mathf.Clamp(outcome.InsertIndex, 0, _session.Slots.Capacity - 1);
            Vector3 target = _slotView.CellWorldPosition(targetIndex);

            if (view != null)
            {
                view.Button.interactable = false;
                view.transform.SetParent(_root, true);

                Vector3 from = view.transform.position;
                Vector3 fromScale = view.transform.localScale;
                float t = 0f;
                while (t < 0.16f)
                {
                    t += Time.deltaTime;
                    float k = Mathf.Clamp01(t / 0.16f);
                    view.transform.position = Vector3.Lerp(from, target, k);
                    view.transform.localScale = Vector3.Lerp(fromScale, Vector3.one * 0.72f, k);
                    yield return null;
                }

                _views.Remove(tileId);
                Destroy(view.gameObject);
            }

            _slotView.Refresh(_session.Slots.Items);

            if (outcome.Groups.Count > 0)
            {
                GameManager.Instance.Audio.PlaySfx(outcome.Groups.Count > 1 ? "combo" : "match");

                for (int g = 0; g < outcome.Groups.Count; g++)
                {
                    var group = outcome.Groups[g];
                    for (int i = 0; i < group.Items.Count; i++)
                    {
                        int index = IndexOf(before, group.Items[i].InstanceId);
                        Vector3 pos = _slotView.CellWorldPosition(index < 0 ? targetIndex : index);
                        SpawnGhost(group.Items[i].ItemId, pos);
                    }
                }
            }

            UpdateHud();
            RefreshBlocked();
            _inputLocked = false;

            if (_session.State != SessionState.Playing)
            {
                _ended = true;
                yield return new WaitForSeconds(0.5f);
                ShowResult();
            }
        }

        private static int IndexOf(List<SlotItem> list, string instanceId)
        {
            for (int i = 0; i < list.Count; i++)
            {
                if (list[i].InstanceId == instanceId) return i;
            }
            return -1;
        }

        private void SpawnGhost(string itemId, Vector3 worldPos)
        {
            var img = UIFactory.AddImage(_root, "Ghost", GameManager.Instance.Items.GetItem(itemId), Color.white);
            img.preserveAspect = true;
            var rt = img.rectTransform;
            rt.sizeDelta = new Vector2(84f, 84f);
            rt.position = worldPos;
            rt.SetAsLastSibling();
            StartCoroutine(GhostRoutine(rt, img));
        }

        private IEnumerator GhostRoutine(RectTransform rt, Image img)
        {
            float t = 0f;
            Vector3 startScale = rt.localScale;
            Color c0 = img.color;
            Vector3 p0 = rt.position;

            while (t < 0.3f)
            {
                t += Time.deltaTime;
                float k = Mathf.Clamp01(t / 0.3f);
                rt.localScale = Vector3.Lerp(startScale, startScale * 1.5f, k);
                rt.position = p0 + new Vector3(0f, k * 34f, 0f);
                img.color = new Color(c0.r, c0.g, c0.b, 1f - k);
                yield return null;
            }
            Destroy(rt.gameObject);
        }

        // ---------------- 道具 ----------------

        private void OnUndo()
        {
            if (_inputLocked || _ended) return;
            if (!_session.CanUndo)
            {
                GameManager.Instance.Toast(Texts.CannotUndo);
                return;
            }
            if (!GameManager.Instance.Save.SpendBooster("undo"))
            {
                GameManager.Instance.Toast(Texts.BoosterEmpty);
                return;
            }

            _session.Undo();
            RebuildBoard();
            _slotView.Refresh(_session.Slots.Items);
            RefreshBlocked();
            UpdateHud();
            UpdateBoosterLabels();
            GameManager.Instance.Audio.PlaySfx("click");
        }

        private void OnHint()
        {
            if (_inputLocked || _ended) return;
            if (!GameManager.Instance.Save.SpendBooster("hint"))
            {
                GameManager.Instance.Toast(Texts.BoosterEmpty);
                return;
            }

            UpdateBoosterLabels();
            var id = _session.Hint();
            if (id == null) return;

            ItemView view;
            if (_views.TryGetValue(id, out view))
            {
                StartCoroutine(PulseRoutine(view.Rect));
                GameManager.Instance.Toast(Texts.HintToast);
            }
        }

        private IEnumerator PulseRoutine(RectTransform rt)
        {
            Vector3 baseScale = Vector3.one;
            float t = 0f;
            while (t < 0.9f)
            {
                t += Time.deltaTime;
                float k = Mathf.Sin(t / 0.9f * Mathf.PI * 3f) * 0.16f;
                rt.localScale = baseScale * (1f + Mathf.Abs(k));
                yield return null;
            }
            rt.localScale = baseScale;
        }

        private void OnShuffle()
        {
            if (_inputLocked || _ended) return;
            if (!GameManager.Instance.Save.SpendBooster("shuffle"))
            {
                GameManager.Instance.Toast(Texts.BoosterEmpty);
                return;
            }

            if (!_session.Shuffle(_rng))
            {
                GameManager.Instance.Toast(Texts.CannotShuffle);
                return;
            }

            UpdateBoosterLabels();
            foreach (var kv in _views)
            {
                var tile = _session.Board.Get(kv.Key);
                if (tile != null) kv.Value.SetSprite(GameManager.Instance.Items.GetItem(tile.ItemId));
            }
            RefreshBlocked();
            GameManager.Instance.Toast(Texts.Shuffled);
            GameManager.Instance.Audio.PlaySfx("booster");
        }

        // ---------------- 流程 ----------------

        private void OnPause()
        {
            if (_ended) return;
            PausePopup.Create(_root, _levelId);
        }

        private void ShowResult()
        {
            if (_session.State == SessionState.Victory)
            {
                int stars = _session.GetStars();
                int coins = 20 + stars * 10;
                GameManager.Instance.Save.CompleteLevel(_levelId, coins);
                GameManager.Instance.Audio.PlaySfx("win");
                ResultPopup.Create(_root, true, _levelId, stars, coins, 0);
            }
            else
            {
                GameManager.Instance.Audio.PlaySfx("lose");
                ResultPopup.Create(_root, false, _levelId, 0, 0, _session.Board.RemainingCount);
            }
        }
    }
}
