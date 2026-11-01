/**
 * 成长系统（纯逻辑）：玩家等级 / 每日任务 / 里程碑。
 * 任务进度只由真实游戏事件驱动（通关、使用道具、获得新收藏品、连击通关），
 * 未完成的任务不能领取奖励。
 */

export interface DailyTaskDef {
  id: string;
  name: string;
  target: number;
  coins: number;
  fragments: number;
  /** 驱动该任务的事件类型 */
  event: 'level_clear' | 'booster_used' | 'new_collectible' | 'combo_clear';
  icon: string;
}

export const DAILY_TASKS: DailyTaskDef[] = [
  { id: 'clear3', name: '完成 3 个关卡', target: 3, coins: 120, fragments: 10, event: 'level_clear', icon: 'icon_task_clear' },
  { id: 'booster2', name: '使用 2 次道具', target: 2, coins: 80, fragments: 5, event: 'booster_used', icon: 'icon_task_booster' },
  { id: 'newcollect1', name: '获得 1 件新收藏品', target: 1, coins: 150, fragments: 15, event: 'new_collectible', icon: 'icon_task_collect' },
  { id: 'combo1', name: '完成 1 次连击通关（Combo≥2）', target: 1, coins: 100, fragments: 10, event: 'combo_clear', icon: 'icon_task_combo' },
];

export interface DailyTaskState {
  /** YYYY-MM-DD */
  date: string;
  progress: Record<string, number>;
  claimed: string[];
}

export interface PlayerState {
  level: number;
  xp: number;
}

export interface ProgressHooks {
  onCoins?: (n: number, reason: string) => void;
  onFragments?: (n: number, reason: string) => void;
}

/** 升到下一级所需经验 */
export function xpToNext(level: number): number {
  return 100 + (level - 1) * 40;
}

export class ProgressManager {
  player: PlayerState;
  tasks: DailyTaskState;
  private hooks: ProgressHooks;

  constructor(player: PlayerState, tasks: DailyTaskState, hooks: ProgressHooks = {}) {
    this.player = player;
    this.tasks = tasks;
    this.hooks = hooks;
  }

  static emptyTasks(today: string): DailyTaskState {
    return { date: today, progress: {}, claimed: [] };
  }

  /** 跨天重置任务（保留已领取记录不跨天） */
  ensureToday(today: string): boolean {
    if (this.tasks.date === today) return false;
    this.tasks.date = today;
    this.tasks.progress = {};
    this.tasks.claimed = [];
    return true;
  }

  // ---------------- 等级 ----------------

  /** 增加经验，返回升了几级（每级奖励由调用方通过 hooks 发放） */
  addXp(amount: number): { levelsGained: number; coins: number; fragments: number } {
    if (!Number.isFinite(amount) || amount <= 0) return { levelsGained: 0, coins: 0, fragments: 0 };
    this.player.xp += Math.floor(amount);
    let gained = 0;
    while (this.player.xp >= xpToNext(this.player.level)) {
      this.player.xp -= xpToNext(this.player.level);
      this.player.level++;
      gained++;
    }
    const coins = gained * 100;
    const fragments = gained * 20;
    if (gained > 0) {
      if (coins) this.hooks.onCoins?.(coins, 'level_up');
      if (fragments) this.hooks.onFragments?.(fragments, 'level_up');
    }
    return { levelsGained: gained, coins, fragments };
  }

  get xpProgress(): number {
    return Math.min(1, this.player.xp / xpToNext(this.player.level));
  }

  // ---------------- 每日任务 ----------------

  recordEvent(event: DailyTaskDef['event'], amount = 1): void {
    for (const t of DAILY_TASKS) {
      if (t.event !== event) continue;
      const cur = this.tasks.progress[t.id] ?? 0;
      if (cur >= t.target) continue; // 完成后不再累加
      this.tasks.progress[t.id] = Math.min(t.target, cur + amount);
    }
  }

  taskProgress(id: string): number {
    return this.tasks.progress[id] ?? 0;
  }

  isTaskComplete(id: string): boolean {
    const t = DAILY_TASKS.find((x) => x.id === id);
    if (!t) return false;
    return this.taskProgress(id) >= t.target;
  }

  isTaskClaimed(id: string): boolean {
    return this.tasks.claimed.includes(id);
  }

  /** 领取任务奖励：未完成 / 已领取都会被拒绝（幂等） */
  claimTask(id: string): { ok: boolean; coins: number; fragments: number; reason?: string } {
    const t = DAILY_TASKS.find((x) => x.id === id);
    if (!t) return { ok: false, coins: 0, fragments: 0, reason: 'not_found' };
    if (!this.isTaskComplete(id)) return { ok: false, coins: 0, fragments: 0, reason: 'incomplete' };
    if (this.isTaskClaimed(id)) return { ok: false, coins: 0, fragments: 0, reason: 'claimed' };
    this.tasks.claimed.push(id);
    this.hooks.onCoins?.(t.coins, `task_${id}`);
    this.hooks.onFragments?.(t.fragments, `task_${id}`);
    return { ok: true, coins: t.coins, fragments: t.fragments };
  }

  get completedTaskCount(): number {
    return DAILY_TASKS.filter((t) => this.isTaskComplete(t.id)).length;
  }

  get claimedTaskCount(): number {
    return this.tasks.claimed.length;
  }

  get allTasksDone(): boolean {
    return DAILY_TASKS.every((t) => this.isTaskComplete(t.id));
  }

  // ---------------- 里程碑 ----------------

  /** 每 5 关的里程碑奖励（金币 + 碎片） */
  static milestoneFor(levelId: number): { coins: number; fragments: number } | null {
    if (levelId % 5 !== 0) return null;
    const tier = Math.floor(levelId / 5);
    return { coins: 100 + tier * 20, fragments: 5 + Math.floor(tier / 2) * 5 };
  }
}
