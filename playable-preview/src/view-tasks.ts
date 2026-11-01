import { el, toast, ASSET } from './dom';
import { progress, claimTask, canClaimDaily, claimDaily, collection, currency, save } from './app-state';
import { DAILY_TASKS } from '../../assets/scripts/systems/progress/ProgressManager';

/** 每日任务页面：进度由真实游戏事件驱动，未完成不能领取 */
export function showTasks(root: HTMLElement, onBack: () => void) {
  const render = () => {
    const cards = DAILY_TASKS.map((t) => {
      const cur = progress.taskProgress(t.id);
      const pct = Math.min(100, Math.round((cur / t.target) * 100));
      const done = progress.isTaskComplete(t.id);
      const claimed = progress.isTaskClaimed(t.id);
      return `<div class="task-card ${claimed ? 'claimed' : done ? 'done' : ''}">
        <div class="task-icon"><img src="${ASSET.ui(t.icon)}"></div>
        <div class="task-main">
          <div class="task-name">${t.name}</div>
          <div class="task-bar"><i style="width:${pct}%"></i></div>
          <div class="task-meta">
            <span>${cur} / ${t.target}</span>
            <span class="task-rw"><img src="${ASSET.ui('coin')}">${t.coins}<img src="${ASSET.ui('icon_fragment')}">${t.fragments}</span>
          </div>
        </div>
        <button class="btn small ${claimed ? 'ghost' : 'primary'}" data-task="${t.id}" ${done && !claimed ? '' : 'disabled'}>
          ${claimed ? '已领取' : done ? '领取' : '进行中'}
        </button>
      </div>`;
    }).join('');

    const dailyReady = canClaimDaily();
    const streak = save.data.dailyReward.streak;

    root.innerHTML = '';
    const page = el(`
      <div class="page tasks-page">
        <div class="col-header">
          <button class="btn small ghost" id="back">‹ 返回</button>
          <h2>每日任务</h2>
          <div class="pill"><img src="${ASSET.ui('icon_fragment')}"><b>${collection.fragments}</b></div>
        </div>
        <div class="tasks-hint">任务每天 0 点重置 · 进度由真实对局行为记录</div>
        <div class="tasks-list">${cards}</div>
        <div class="signin-card">
          <div class="si-left">
            <b>每日签到</b>
            <span>连续签到 ${streak} 天 · 奖励随天数提升</span>
          </div>
          <button class="btn small ${dailyReady ? 'primary' : 'ghost'}" id="signin" ${dailyReady ? '' : 'disabled'}>
            ${dailyReady ? '签到领取' : '今日已签'}
          </button>
        </div>
      </div>`);
    root.appendChild(page);

    page.querySelector('#back')!.addEventListener('click', onBack);
    page.querySelectorAll('[data-task]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = (b as HTMLElement).dataset.task!;
        const r = claimTask(id);
        if (r.ok) {
          toast(`领取成功 +${r.coins} 金币 +${r.fragments} 碎片`);
          render();
        } else toast(r.reason === 'claimed' ? '已领取' : '任务未完成');
      })
    );
    page.querySelector('#signin')!.addEventListener('click', () => {
      const r = claimDaily();
      if (r.ok) {
        toast(`签到成功 +${r.amount} 金币`);
        render();
      } else toast('今日已签到');
    });
    void currency;
  };
  render();
}
