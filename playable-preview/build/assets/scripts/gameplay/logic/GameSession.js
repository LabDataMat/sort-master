import { EventHub } from '../../core/EventHub';
import { MAX_UNDO_HISTORY, EXTRA_SLOT_MOVES } from '../../core/GameConfig';
import { BoardLogic } from './BoardLogic';
import { SlotModel } from './SlotModel';
/**
 * 一局游戏的完整逻辑（纯逻辑）：
 * - 状态机管理（READY/PLAYING/MOVING/MATCHING/VICTORY/FAILED/PAUSED）
 * - 匹配逻辑与动画完全独立：逻辑立即结算，表现层监听事件做动画
 * - 撤回快照、洗牌、移除、额外槽位
 * - 胜负判定
 */
export class GameSession {
    constructor(level, opts = {}) {
        this.state = 'READY';
        this.combo = 0;
        this.maxCombo = 0;
        /** 表现层动画期间置 true，锁输入防止重复点击 */
        this.inputLocked = false;
        this.events = new EventHub();
        this.history = [];
        this.level = level;
        this.opts = {
            capacity: opts.capacity ?? 7,
            extraSlotMoves: opts.extraSlotMoves ?? EXTRA_SLOT_MOVES,
        };
        this.board = BoardLogic.fromLevel(level);
        this.slots = new SlotModel(this.opts.capacity);
    }
    start() {
        this.setState('PLAYING');
    }
    setState(s) {
        const from = this.state;
        this.state = s;
        this.events.emit('state:changed', { from, to: s });
    }
    // ---------------- 快照 / 撤回 ----------------
    snapshot() {
        this.history.push({
            tiles: this.board.allTiles().map((t) => ({
                id: t.id,
                status: t.status,
                frozen: t.frozen,
                locked: t.locked,
            })),
            slots: this.slots.items.map((it) => (it ? { ...it } : null)),
            capacity: this.slots.capacity,
            combo: this.combo,
            extraMovesLeft: this.slots.extraMovesLeft,
        });
        if (this.history.length > MAX_UNDO_HISTORY)
            this.history.shift();
    }
    /** 是否可撤回（至少存在一次有效操作，且槽位道具状态允许） */
    canUndo() {
        return this.state === 'PLAYING' && this.history.length > 0;
    }
    /** 撤回：恢复上一次有效操作前的状态 */
    undo() {
        if (!this.canUndo())
            return false;
        const snap = this.history.pop();
        for (const s of snap.tiles) {
            const t = this.board.getTile(s.id);
            if (t) {
                t.status = s.status;
                t.frozen = s.frozen;
                t.locked = s.locked;
            }
        }
        this.slots.restore(snap.slots, snap.capacity, snap.extraMovesLeft, this.opts.capacity);
        this.combo = snap.combo;
        this.board.occlusion.rebuild(this.board.allTiles());
        this.events.emit('board:changed', {});
        return true;
    }
    // ---------------- 核心拾取流程 ----------------
    /**
     * 纯逻辑可行性检查（不含表现层输入锁）。
     * inputLocked 是表现层闸门：视图层在触摸入口处自行检查并拦截。
     */
    canPick(tileId) {
        if (this.state !== 'PLAYING')
            return { ok: false, reason: `state=${this.state}` };
        const t = this.board.getTile(tileId);
        if (!t || t.status === 'removed')
            return { ok: false, reason: 'not_exists' };
        if (t.frozen > 0)
            return { ok: false, reason: 'frozen' };
        if (t.locked)
            return { ok: false, reason: 'locked' };
        if (!this.board.isTileClickable(tileId))
            return { ok: false, reason: 'occluded' };
        if (this.slots.isFull())
            return { ok: false, reason: 'slots_full' };
        return { ok: true };
    }
    /**
     * 玩家点击物品（逻辑立即结算；表现层监听事件做动画）。
     * 注意：防重复点击由视图层的 inputLocked 闸门保证（入口处检查），
     * 本方法不做输入锁检查，供视图层在置锁后安全调用。
     */
    pickTile(tileId) {
        const check = this.canPick(tileId);
        if (!check.ok) {
            this.events.emit('tile:rejected', { tileId, reason: check.reason ?? 'unknown' });
            return check;
        }
        const tile = this.board.getTile(tileId);
        // 快照在变更前
        this.snapshot();
        const res = this.slots.add(tileId, tile.type);
        if (!res.inserted)
            return { ok: false, reason: 'slots_full' };
        this.board.removeTile(tileId);
        this.events.emit('tile:picked', { tileId, type: tile.type, slotIndex: res.index });
        this.events.emit('board:changed', {});
        if (res.matched) {
            this.setState('MATCHING');
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.board.onMatchResolved();
            this.events.emit('match:cleared', { type: tile.type, slotItems: res.matched, combo: this.combo });
        }
        else {
            if (this.combo > 0) {
                this.combo = 0;
            }
            if (res.fullAfterInsert) {
                this.events.emit('slot:full', {});
            }
        }
        // 胜负判定（逻辑层即时判定；表现层可等动画结束再弹窗）
        this.evaluateEnd();
        // 三消逻辑即时完成，回到 PLAYING 供下一次操作（表现层动画由 inputLocked 控制）
        if (this.state === 'MATCHING')
            this.setState('PLAYING');
        return { ok: true, willMatch: !!res.matched };
    }
    evaluateEnd() {
        if (this.board.remainingCount === 0) {
            this.setState('VICTORY');
            this.events.emit('game:victory', { bonusCoins: 0 });
            return;
        }
        if (this.slots.isFull()) {
            // 槽满且刚插入的物品没有触发消除 => 失败
            this.setState('FAILED');
            this.events.emit('game:failed', {});
        }
    }
    // ---------------- 道具 ----------------
    useUndo() {
        const ok = this.undo();
        if (ok)
            this.events.emit('booster:used', { type: 'undo' });
        return ok;
    }
    useShuffle(rand = Math.random) {
        if (this.state !== 'PLAYING' || this.board.remainingCount === 0)
            return false;
        this.snapshot();
        this.board.shuffle(rand);
        this.events.emit('booster:used', { type: 'shuffle' });
        this.events.emit('board:changed', {});
        return true;
    }
    /** 移除道具：直接移除一个合法（可点击）物品，不进入槽位 */
    useRemove(tileId) {
        const t = this.board.getTile(tileId);
        if (this.state !== 'PLAYING' || !t || t.status === 'removed' || !this.board.isTileClickable(tileId)) {
            return false;
        }
        this.snapshot();
        this.board.removeTile(tileId);
        this.events.emit('booster:used', { type: 'remove' });
        this.events.emit('board:changed', {});
        this.evaluateEnd();
        return true;
    }
    useExtraSlot() {
        if (this.state !== 'PLAYING')
            return false;
        if (this.slots.hasExtraSlot)
            return false;
        this.slots.grantExtraSlot(this.opts.extraSlotMoves);
        this.events.emit('booster:used', { type: 'extra_slot' });
        this.events.emit('board:changed', {});
        return true;
    }
    /** 额外槽位剩余有效次数（显示用） */
    getExtraSlotMovesLeft() {
        return this.slots.hasExtraSlot ? this.slots.extraMovesLeft : 0;
    }
    // ---------------- 查询 ----------------
    get remainingCount() {
        return this.board.remainingCount;
    }
    getClickableTiles() {
        return this.board.getClickableTiles();
    }
    /** 暂停 / 恢复（弹窗、广告播放时使用） */
    pause() {
        if (this.state === 'PLAYING')
            this.setState('PAUSED');
    }
    resume() {
        if (this.state === 'PAUSED')
            this.setState('PLAYING');
    }
    /** 胜利时的收集奖励统计 */
    getBonusCollected() {
        const bonus = this.level.specialObjectives?.bonusTypes ?? [];
        return bonus.map((b) => ({ typeId: b.typeId, count: b.count }));
    }
}
