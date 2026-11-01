import { el, toast, modal, ASSET } from './dom';
import { save, persist, playerInfo, collection } from './app-state';

/** 设置：音乐/音效开关 + 统计信息 */
export function showSettings(_root: HTMLElement, onBack: () => void) {
  const info = playerInfo();
  const st = save.data.stats;
  const m = modal(`
    <div class="popup settings-popup">
      <h3>设置</h3>
      <div class="setting-row">
        <span>背景音乐</span>
        <button class="btn small ${save.data.settings.musicOn ? 'primary' : 'ghost'}" id="music">${save.data.settings.musicOn ? '开' : '关'}</button>
      </div>
      <div class="setting-row">
        <span>游戏音效</span>
        <button class="btn small ${save.data.settings.sfxOn ? 'primary' : 'ghost'}" id="sfx">${save.data.settings.sfxOn ? '开' : '关'}</button>
      </div>
      <div class="stats-card">
        <div><b>Lv.${info.level}</b><span>玩家等级</span></div>
        <div><b>${info.owned}</b><span>收藏品</span></div>
        <div><b>${collection.fragments}</b><span>碎片</span></div>
        <div><b>${st.wins}</b><span>通关次数</span></div>
      </div>
      <div class="settings-note">存档 schemaVersion ${save.data.schemaVersion} · 数据仅保存在本机</div>
      <button class="btn small" id="close">关闭</button>
    </div>`);
  const toggle = (key: 'musicOn' | 'sfxOn') => {
    save.data.settings[key] = !save.data.settings[key];
    persist();
    toast(save.data.settings[key] ? '已开启' : '已关闭');
    m.remove();
    showSettings(_root, onBack);
  };
  m.querySelector('#music')!.addEventListener('click', () => toggle('musicOn'));
  m.querySelector('#sfx')!.addEventListener('click', () => toggle('sfxOn'));
  m.querySelector('#close')!.addEventListener('click', () => {
    m.remove();
    onBack();
  });
  void el;
  void ASSET;
}
