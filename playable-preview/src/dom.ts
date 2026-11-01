/** DOM 工具 */
export function el<T extends HTMLElement = HTMLElement>(html: string): T {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild as T;
}

export function toast(msg: string, root: HTMLElement = document.body) {
  const t = el(`<div class="toast">${msg}</div>`);
  root.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

export function fmt(n: number): string {
  return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/** 通用弹窗容器 */
export function modal(html: string): HTMLElement {
  const m = el(`<div class="overlay">${html}</div>`);
  document.getElementById('app')!.appendChild(m);
  return m;
}

export function closeModal(m: HTMLElement) {
  m.remove();
}

export const ASSET = {
  collect: (id: string) => `../assets/resources/textures/collect/${id}.png`,
  item: (id: string) => `../assets/resources/textures/items/${id}.png`,
  ui: (id: string) => `../assets/resources/textures/ui/${id}.png`,
};
