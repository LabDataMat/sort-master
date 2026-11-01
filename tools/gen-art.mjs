/**
 * 美术资源生成器：30 种统一风格物品 SVG → PNG（透明背景）+ UI 素材。
 * 统一规范：200x200 视口、左上光源、柔和阴影、圆角轮廓、统一描边与饱和度。
 */
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ITEMS_DIR = path.join(__dirname, '..', 'assets', 'resources', 'textures', 'items');
const UI_DIR = path.join(__dirname, '..', 'assets', 'resources', 'textures', 'ui');
fs.mkdirSync(ITEMS_DIR, { recursive: true });
fs.mkdirSync(UI_DIR, { recursive: true });

const OUTLINE = '#5A4A3A';

function svgWrap(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400">
  <defs>
    <linearGradient id="hl" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/>
      <stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="100" cy="180" rx="52" ry="9" fill="#3A2E20" opacity="0.14"/>
  ${body}
  </svg>`;
}

function render(name, svg, dir) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 200 } });
  fs.writeFileSync(path.join(dir, `${name}.png`), resvg.render().asPng());
  console.log('  item:', name);
}

const items = {
  apple: `
    <path d="M100 62 C130 40 168 58 168 100 C168 142 138 172 100 172 C62 172 32 142 32 100 C32 58 70 40 100 62 Z" fill="#E8584A" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M100 62 C100 46 106 36 118 30" fill="none" stroke="#7C5A3A" stroke-width="7" stroke-linecap="round"/>
    <path d="M104 52 C118 34 142 34 150 46 C140 58 114 60 104 52 Z" fill="#7FA86A" stroke="${OUTLINE}" stroke-width="3"/>
    <ellipse cx="72" cy="92" rx="14" ry="20" fill="url(#hl)" transform="rotate(-18 72 92)"/>`,
  banana: `
    <path d="M46 56 C40 110 70 160 138 164 C156 165 168 156 166 146 C120 146 84 118 74 60 C72 46 50 44 46 56 Z" fill="#F5C542" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M46 56 C58 108 88 142 138 152" fill="none" stroke="#C98F2A" stroke-width="3" opacity="0.6"/>
    <path d="M160 142 C168 142 172 150 166 152 C158 154 154 144 160 142 Z" fill="#8A6A3A" stroke="${OUTLINE}" stroke-width="2"/>`,
  strawberry: `
    <path d="M100 170 C64 150 44 118 44 92 C44 66 68 52 100 52 C132 52 156 66 156 92 C156 118 136 150 100 170 Z" fill="#E8584A" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M72 52 C84 40 116 40 128 52 C116 62 84 62 72 52 Z" fill="#7FA86A" stroke="${OUTLINE}" stroke-width="3"/>
    <path d="M100 52 L100 40 M100 44 C108 34 122 32 128 38" fill="none" stroke="#5A7A4A" stroke-width="4" stroke-linecap="round"/>
    <g fill="#F7DE8C"><circle cx="76" cy="96" r="4"/><circle cx="100" cy="88" r="4"/><circle cx="124" cy="96" r="4"/><circle cx="88" cy="120" r="4"/><circle cx="112" cy="120" r="4"/><circle cx="100" cy="146" r="4"/></g>`,
  grape: `
    <g stroke="${OUTLINE}" stroke-width="3.5">
      <circle cx="78" cy="92" r="20" fill="#9A6BC4"/><circle cx="122" cy="92" r="20" fill="#9A6BC4"/>
      <circle cx="60" cy="118" r="20" fill="#8A55B4"/><circle cx="100" cy="118" r="20" fill="#8A55B4"/><circle cx="140" cy="118" r="20" fill="#8A55B4"/>
      <circle cx="80" cy="144" r="20" fill="#7A48A4"/><circle cx="120" cy="144" r="20" fill="#7A48A4"/>
      <circle cx="100" cy="168" r="19" fill="#6A3C94"/>
    </g>
    <path d="M100 60 C100 46 106 38 116 32" fill="none" stroke="#7C5A3A" stroke-width="6" stroke-linecap="round"/>
    <path d="M104 48 C116 30 142 30 150 42 C140 54 114 56 104 48 Z" fill="#7FA86A" stroke="${OUTLINE}" stroke-width="3"/>`,
  orange: `
    <circle cx="100" cy="112" r="62" fill="#F59E42" stroke="${OUTLINE}" stroke-width="4"/>
    <circle cx="100" cy="112" r="62" fill="url(#sheen)"/>
    <g fill="#D97F26"><circle cx="80" cy="100" r="2.5"/><circle cx="110" cy="92" r="2.5"/><circle cx="126" cy="112" r="2.5"/><circle cx="92" cy="126" r="2.5"/><circle cx="118" cy="134" r="2.5"/><circle cx="72" cy="120" r="2.5"/></g>
    <path d="M100 52 C100 42 106 34 116 30" fill="none" stroke="#7C5A3A" stroke-width="6" stroke-linecap="round"/>
    <path d="M104 44 C114 28 138 28 146 40 C136 50 112 52 104 44 Z" fill="#7FA86A" stroke="${OUTLINE}" stroke-width="3"/>`,
  cherry: `
    <path d="M78 96 C74 66 88 46 110 36 M124 100 C126 72 118 52 110 36" fill="none" stroke="#7C5A3A" stroke-width="5" stroke-linecap="round"/>
    <path d="M104 40 C116 24 140 24 148 36 C138 46 112 48 104 40 Z" fill="#7FA86A" stroke="${OUTLINE}" stroke-width="3"/>
    <circle cx="72" cy="126" r="30" fill="#E8584A" stroke="${OUTLINE}" stroke-width="4"/>
    <circle cx="130" cy="130" r="30" fill="#D64838" stroke="${OUTLINE}" stroke-width="4"/>
    <ellipse cx="62" cy="116" rx="8" ry="12" fill="url(#hl)"/><ellipse cx="120" cy="120" rx="8" ry="12" fill="url(#hl)"/>`,
  cake: `
    <rect x="40" y="104" width="120" height="58" rx="10" fill="#F4C2C2" stroke="${OUTLINE}" stroke-width="4"/>
    <rect x="40" y="96" width="120" height="22" rx="11" fill="#FDF6EC" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M44 118 q10 14 20 0 q10 14 20 0 q10 14 20 0 q10 14 20 0 q10 14 20 0" fill="none" stroke="${OUTLINE}" stroke-width="0"/>
    <rect x="46" y="128" width="14" height="30" rx="4" fill="#F59E42" stroke="${OUTLINE}" stroke-width="3"/>
    <rect x="94" y="128" width="14" height="30" rx="4" fill="#F59E42" stroke="${OUTLINE}" stroke-width="3"/>
    <rect x="140" y="128" width="14" height="30" rx="4" fill="#F59E42" stroke="${OUTLINE}" stroke-width="3"/>
    <circle cx="100" cy="84" r="16" fill="#E8584A" stroke="${OUTLINE}" stroke-width="3.5"/>
    <path d="M100 68 C100 58 104 52 110 48" fill="none" stroke="#7C5A3A" stroke-width="4" stroke-linecap="round"/>`,
  donut: `
    <circle cx="100" cy="110" r="62" fill="#E8A85C" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M42 104 C60 84 84 82 100 96 C116 82 142 84 158 104 C166 122 150 132 138 126 C128 140 112 144 100 134 C86 146 66 140 60 126 C50 132 36 122 42 104 Z" fill="#F4A0B4" stroke="${OUTLINE}" stroke-width="4"/>
    <circle cx="100" cy="112" r="17" fill="#FDF6EC" stroke="${OUTLINE}" stroke-width="4"/>
    <g stroke-linecap="round" stroke-width="5"><path d="M70 96 l8 6" stroke="#8FC7E8"/><path d="M118 92 l10 4" stroke="#F7DE8C"/><path d="M64 124 l9 5" stroke="#FDF6EC"/><path d="M136 118 l9 5" stroke="#8FC7E8"/><path d="M96 130 l9 4" stroke="#FDF6EC"/></g>`,
  cookie: `
    <circle cx="100" cy="110" r="60" fill="#E0A860" stroke="${OUTLINE}" stroke-width="4"/>
    <circle cx="100" cy="110" r="60" fill="url(#sheen)"/>
    <g fill="#7C4A2A" stroke="${OUTLINE}" stroke-width="2.5">
      <circle cx="78" cy="92" r="9"/><circle cx="120" cy="88" r="8"/><circle cx="140" cy="118" r="8"/>
      <circle cx="86" cy="130" r="9"/><circle cx="112" cy="126" r="7"/><circle cx="66" cy="112" r="6"/>
    </g>`,
  icecream: `
    <path d="M68 108 L100 180 L132 108 Z" fill="#E8B878" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M76 122 L124 122 M82 138 L118 138" stroke="#C08A48" stroke-width="3"/>
    <circle cx="76" cy="96" r="26" fill="#F4C2C2" stroke="${OUTLINE}" stroke-width="4"/>
    <circle cx="124" cy="96" r="26" fill="#FDF6EC" stroke="${OUTLINE}" stroke-width="4"/>
    <circle cx="100" cy="72" r="27" fill="#8FC7E8" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M100 46 C100 36 104 30 110 26" fill="none" stroke="#7C5A3A" stroke-width="4" stroke-linecap="round"/>
    <circle cx="112" cy="24" r="6" fill="#E8584A" stroke="${OUTLINE}" stroke-width="2.5"/>`,
  macaron: `
    <path d="M40 92 C40 70 66 58 100 58 C134 58 160 70 160 92 C160 102 148 108 100 108 C52 108 40 102 40 92 Z" fill="#F4A0B4" stroke="${OUTLINE}" stroke-width="4"/>
    <rect x="46" y="106" width="108" height="20" rx="10" fill="#F7E8C8" stroke="${OUTLINE}" stroke-width="3.5"/>
    <path d="M40 138 C40 160 66 172 100 172 C134 172 160 160 160 138 C160 128 148 122 100 122 C52 122 40 128 40 138 Z" fill="#9CB98F" stroke="${OUTLINE}" stroke-width="4"/>`,
  pudding: `
    <path d="M52 108 C52 148 70 168 100 168 C130 168 148 148 148 108 Z" fill="#F7DE8C" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M52 108 C52 96 72 88 100 88 C128 88 148 96 148 108 C148 118 128 124 100 124 C72 124 52 118 52 108 Z" fill="#C8783A" stroke="${OUTLINE}" stroke-width="3.5"/>
    <path d="M70 88 C70 74 82 66 100 66 C118 66 130 74 130 88" fill="#FDF6EC" stroke="${OUTLINE}" stroke-width="3.5"/>
    <circle cx="100" cy="58" r="10" fill="#E8584A" stroke="${OUTLINE}" stroke-width="3"/>
    <ellipse cx="76" cy="140" rx="10" ry="16" fill="url(#hl)"/>`,
  bear: `
    <circle cx="58" cy="66" r="22" fill="#C89B6A" stroke="${OUTLINE}" stroke-width="4"/>
    <circle cx="142" cy="66" r="22" fill="#C89B6A" stroke="${OUTLINE}" stroke-width="4"/>
    <circle cx="58" cy="66" r="10" fill="#E8C79A"/><circle cx="142" cy="66" r="10" fill="#E8C79A"/>
    <circle cx="100" cy="104" r="56" fill="#C89B6A" stroke="${OUTLINE}" stroke-width="4"/>
    <ellipse cx="100" cy="124" rx="24" ry="18" fill="#E8C79A" stroke="${OUTLINE}" stroke-width="3"/>
    <circle cx="100" cy="116" r="7" fill="#4A382A"/>
    <path d="M92 130 q8 8 16 0" fill="none" stroke="#4A382A" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="80" cy="92" r="6" fill="#4A382A"/><circle cx="120" cy="92" r="6" fill="#4A382A"/>
    <circle cx="70" cy="108" r="7" fill="#F4A0B4" opacity="0.7"/><circle cx="130" cy="108" r="7" fill="#F4A0B4" opacity="0.7"/>`,
  blocks: `
    <rect x="46" y="96" width="66" height="66" rx="10" fill="#8FC7E8" stroke="${OUTLINE}" stroke-width="4"/>
    <rect x="88" y="96" width="66" height="66" rx="10" fill="#F59E42" stroke="${OUTLINE}" stroke-width="4"/>
    <rect x="67" y="42" width="66" height="66" rx="10" fill="#9CB98F" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M100 58 l6 12 13 2 -9 9 2 13 -12 -6 -12 6 2 -13 -9 -9 13 -2 Z" fill="#FDF6EC" stroke="${OUTLINE}" stroke-width="2.5"/>
    <circle cx="79" cy="129" r="9" fill="#FDF6EC" opacity="0.85" stroke="${OUTLINE}" stroke-width="2.5"/>
    <rect x="108" y="116" width="26" height="26" rx="6" fill="#FDF6EC" opacity="0.85" stroke="${OUTLINE}" stroke-width="2.5"/>`,
  duck: `
    <path d="M56 118 C50 156 82 174 112 170 C144 166 162 144 156 120 C150 100 128 96 112 104 C104 108 96 110 90 108 C80 104 78 98 82 92 C76 100 62 106 56 118 Z" fill="#F7DE5C" stroke="${OUTLINE}" stroke-width="4"/>
    <circle cx="80" cy="76" r="30" fill="#F7DE5C" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M52 70 C38 68 34 78 44 84 C50 87 58 86 62 82" fill="#F59E42" stroke="${OUTLINE}" stroke-width="3.5"/>
    <circle cx="70" cy="68" r="5" fill="#3A3020"/>
    <path d="M104 156 C122 150 138 138 142 124" fill="none" stroke="#D8B830" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M60 130 q14 8 28 4" fill="none" stroke="#D8B830" stroke-width="3.5" stroke-linecap="round"/>`,
  car: `
    <path d="M34 122 C34 108 44 100 58 100 L74 100 C82 82 96 74 116 74 C140 74 154 86 160 100 L164 100 C176 100 182 110 180 122 C180 130 174 134 166 134 L48 134 C38 134 34 130 34 122 Z" fill="#E8584A" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M82 98 C88 86 98 80 112 80 L112 98 Z" fill="#BFE3F2" stroke="${OUTLINE}" stroke-width="3"/>
    <path d="M120 80 C134 80 146 88 152 98 L120 98 Z" fill="#BFE3F2" stroke="${OUTLINE}" stroke-width="3"/>
    <circle cx="70" cy="136" r="17" fill="#4A4036" stroke="${OUTLINE}" stroke-width="3.5"/><circle cx="70" cy="136" r="7" fill="#C8C2B8"/>
    <circle cx="146" cy="136" r="17" fill="#4A4036" stroke="${OUTLINE}" stroke-width="3.5"/><circle cx="146" cy="136" r="7" fill="#C8C2B8"/>
    <circle cx="176" cy="112" r="5" fill="#F7DE8C" stroke="${OUTLINE}" stroke-width="2.5"/>`,
  ball: `
    <circle cx="100" cy="110" r="60" fill="#FDF6EC" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M100 50 C120 76 120 144 100 170" fill="none" stroke="#E8584A" stroke-width="14"/>
    <path d="M44 84 C70 96 130 96 156 84" fill="none" stroke="#8FC7E8" stroke-width="14"/>
    <path d="M44 136 C70 124 130 124 156 136" fill="none" stroke="#F7DE8C" stroke-width="14"/>
    <circle cx="100" cy="110" r="60" fill="url(#sheen)" stroke="${OUTLINE}" stroke-width="4"/>`,
  robot: `
    <rect x="62" y="96" width="76" height="62" rx="12" fill="#9FB8C8" stroke="${OUTLINE}" stroke-width="4"/>
    <rect x="54" y="40" width="92" height="60" rx="16" fill="#B8D0DE" stroke="${OUTLINE}" stroke-width="4"/>
    <circle cx="78" cy="68" r="9" fill="#4A4036"/><circle cx="122" cy="68" r="9" fill="#4A4036"/>
    <path d="M86 84 q14 8 28 0" fill="none" stroke="#4A4036" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M100 40 L100 26" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="100" cy="20" r="8" fill="#E8584A" stroke="${OUTLINE}" stroke-width="3"/>
    <rect x="76" y="112" width="48" height="18" rx="6" fill="#6A8898" stroke="${OUTLINE}" stroke-width="3"/>
    <circle cx="88" cy="121" r="4" fill="#F7DE8C"/><circle cx="100" cy="121" r="4" fill="#8FC7E8"/><circle cx="112" cy="121" r="4" fill="#F4A0B4"/>
    <rect x="44" y="106" width="12" height="30" rx="6" fill="#9FB8C8" stroke="${OUTLINE}" stroke-width="3.5"/>
    <rect x="144" y="106" width="12" height="30" rx="6" fill="#9FB8C8" stroke="${OUTLINE}" stroke-width="3.5"/>`,
  cup: `
    <path d="M62 62 L74 168 C75 176 82 180 90 180 L110 180 C118 180 125 176 126 168 L138 62 Z" fill="#DFF0F8" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M67 96 L126 96 L124 120 L69 120 Z" fill="#8FC7E8" opacity="0.75"/>
    <ellipse cx="100" cy="62" rx="38" ry="9" fill="#FDF6EC" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M120 84 q16 -4 14 10 q-2 12 -16 10" fill="none" stroke="#FDF6EC" stroke-width="6" opacity="0.7"/>
    <ellipse cx="86" cy="76" rx="6" ry="8" fill="#FFFFFF" opacity="0.8"/>`,
  clock: `
    <circle cx="70" cy="56" r="16" fill="#F59E42" stroke="${OUTLINE}" stroke-width="4"/>
    <circle cx="130" cy="56" r="16" fill="#F59E42" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M60 44 L48 30 M140 44 L152 30" stroke="${OUTLINE}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="100" cy="116" r="60" fill="#F7E8C8" stroke="${OUTLINE}" stroke-width="4.5"/>
    <circle cx="100" cy="116" r="46" fill="#FDF6EC" stroke="${OUTLINE}" stroke-width="3"/>
    <path d="M100 116 L100 84 M100 116 L126 128" stroke="#4A4036" stroke-width="5" stroke-linecap="round"/>
    <circle cx="100" cy="116" r="5" fill="#E8584A"/>
    <path d="M66 172 L84 158 M134 172 L116 158" stroke="${OUTLINE}" stroke-width="5" stroke-linecap="round"/>`,
  headphones: `
    <path d="M52 128 C48 78 70 46 100 46 C130 46 152 78 148 128" fill="none" stroke="#4A4036" stroke-width="12" stroke-linecap="round"/>
    <rect x="34" y="112" width="34" height="52" rx="15" fill="#F59E42" stroke="${OUTLINE}" stroke-width="4"/>
    <rect x="132" y="112" width="34" height="52" rx="15" fill="#F59E42" stroke="${OUTLINE}" stroke-width="4"/>
    <rect x="42" y="122" width="18" height="32" rx="9" fill="#F7DE8C"/>
    <rect x="140" y="122" width="18" height="32" rx="9" fill="#F7DE8C"/>`,
  toothbrush: `
    <rect x="40" y="108" width="112" height="22" rx="11" transform="rotate(-24 96 119)" fill="#8FC7E8" stroke="${OUTLINE}" stroke-width="4"/>
    <rect x="136" y="58" width="34" height="26" rx="6" transform="rotate(-24 153 71)" fill="#FDF6EC" stroke="${OUTLINE}" stroke-width="3.5"/>
    <g stroke="#4A90B8" stroke-width="3" stroke-linecap="round">
      <path d="M146 62 l6 -12"/><path d="M154 66 l6 -12"/><path d="M162 70 l6 -12"/>
    </g>
    <rect x="52" y="112" width="24" height="14" rx="6" transform="rotate(-24 64 119)" fill="#F4A0B4"/>`,
  soap: `
    <rect x="36" y="86" width="128" height="66" rx="30" fill="#9CD8C8" stroke="${OUTLINE}" stroke-width="4"/>
    <rect x="36" y="86" width="128" height="30" rx="15" fill="#C0E8DC" opacity="0.8"/>
    <circle cx="140" cy="64" r="10" fill="#FFFFFF" opacity="0.85" stroke="#BFE3F2" stroke-width="2.5"/>
    <circle cx="158" cy="48" r="6" fill="#FFFFFF" opacity="0.85" stroke="#BFE3F2" stroke-width="2"/>
    <circle cx="126" cy="44" r="4" fill="#FFFFFF" opacity="0.85"/>
    <text x="100" y="128" font-size="26" text-anchor="middle" fill="#4A8070" font-family="sans-serif" font-weight="bold">SOAP</text>`,
  key: `
    <circle cx="70" cy="80" r="30" fill="none" stroke="#F5C542" stroke-width="14"/>
    <path d="M92 102 L150 160" stroke="#F5C542" stroke-width="14" stroke-linecap="round"/>
    <path d="M138 148 L152 134 M124 158 L138 144" stroke="#F5C542" stroke-width="12" stroke-linecap="round"/>
    <circle cx="70" cy="80" r="10" fill="#FDF6EC" stroke="#C89B2A" stroke-width="4"/>`,
  pencil: `
    <g transform="rotate(45 100 100)">
      <rect x="86" y="30" width="28" height="110" fill="#F5C542" stroke="${OUTLINE}" stroke-width="4"/>
      <path d="M86 140 L100 172 L114 140 Z" fill="#E8C79A" stroke="${OUTLINE}" stroke-width="4"/>
      <path d="M94 158 L100 172 L106 158 Z" fill="#4A4036"/>
      <rect x="86" y="22" width="28" height="14" rx="4" fill="#F4A0B4" stroke="${OUTLINE}" stroke-width="3.5"/>
      <path d="M93 40 h14 M93 150 h14" stroke="#D8A828" stroke-width="2.5"/>
    </g>`,
  book: `
    <path d="M48 58 C48 50 54 46 62 46 L152 46 L152 154 L62 154 C54 154 48 150 48 142 Z" fill="#8FC7E8" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M48 58 C48 66 52 70 62 70 L152 70" fill="none" stroke="${OUTLINE}" stroke-width="3"/>
    <rect x="66" y="86" width="70" height="10" rx="5" fill="#FDF6EC"/>
    <rect x="66" y="106" width="52" height="10" rx="5" fill="#FDF6EC"/>
    <rect x="140" y="46" width="12" height="108" fill="#5A8CB0" stroke="${OUTLINE}" stroke-width="3.5"/>`,
  eraser: `
    <rect x="42" y="88" width="116" height="56" rx="14" transform="rotate(-12 100 116)" fill="#F4A0B4" stroke="${OUTLINE}" stroke-width="4"/>
    <rect x="118" y="80" width="42" height="56" rx="14" transform="rotate(-12 139 108)" fill="#FDF6EC" stroke="${OUTLINE}" stroke-width="3.5"/>
    <path d="M52 108 l40 -8 M52 122 l30 -6" stroke="#D8788C" stroke-width="3" stroke-linecap="round"/>`,
  scissors: `
    <path d="M64 40 L124 128 M136 40 L76 128" stroke="#B8C4CC" stroke-width="12" stroke-linecap="round"/>
    <circle cx="128" cy="146" r="20" fill="none" stroke="#E8584A" stroke-width="10"/>
    <circle cx="72" cy="146" r="20" fill="none" stroke="#8FC7E8" stroke-width="10"/>
    <circle cx="100" cy="86" r="7" fill="#4A4036"/>`,
  ruler: `
    <g transform="rotate(-18 100 110)">
      <rect x="34" y="86" width="132" height="44" rx="8" fill="#F7DE8C" stroke="${OUTLINE}" stroke-width="4"/>
      <g stroke="#C8982A" stroke-width="3.5" stroke-linecap="round">
        <path d="M54 86 v18"/><path d="M74 86 v12"/><path d="M94 86 v18"/><path d="M114 86 v12"/><path d="M134 86 v18"/><path d="M154 86 v12"/>
      </g>
    </g>`,
  penholder: `
    <path d="M58 96 L70 172 C71 179 78 182 86 182 L114 182 C122 182 129 179 130 172 L142 96 Z" fill="#8FC7E8" stroke="${OUTLINE}" stroke-width="4"/>
    <ellipse cx="100" cy="96" rx="42" ry="10" fill="#6AA8CC" stroke="${OUTLINE}" stroke-width="3.5"/>
    <g transform="rotate(-10 80 60)"><rect x="72" y="42" width="12" height="56" fill="#F59E42" stroke="${OUTLINE}" stroke-width="3"/><path d="M72 42 L78 30 L84 42 Z" fill="#E8C79A" stroke="${OUTLINE}" stroke-width="2.5"/></g>
    <g transform="rotate(6 112 62)"><rect x="106" y="46" width="12" height="52" fill="#9CB98F" stroke="${OUTLINE}" stroke-width="3"/><path d="M106 46 L112 34 L118 46 Z" fill="#E8C79A" stroke="${OUTLINE}" stroke-width="2.5"/></g>
    <path d="M94 56 C94 44 100 38 106 36" fill="none" stroke="#7C5A3A" stroke-width="4" stroke-linecap="round"/>
    <circle cx="106" cy="34" r="7" fill="#F4A0B4" stroke="${OUTLINE}" stroke-width="2.5"/>`,
};

console.log('Rendering 30 items...');
for (const [id, body] of Object.entries(items)) {
  render(id, svgWrap(body), ITEMS_DIR);
}

// ---------------- UI 素材 ----------------
function uiSvg(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}">${body}</svg>`;
}

function renderUi(name, svg) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: svg.match(/width="(\d+)"/)[1] / 2 } });
  fs.writeFileSync(path.join(UI_DIR, `${name}.png`), resvg.render().asPng());
  console.log('  ui:', name);
}

const UI = {
  btn_primary: uiSvg(340, 110, `
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB968"/><stop offset="1" stop-color="#E07B2A"/></linearGradient></defs>
    <rect x="4" y="10" width="332" height="96" rx="48" fill="#B85E1A" opacity="0.5"/>
    <rect x="4" y="4" width="332" height="96" rx="48" fill="url(#g)" stroke="#B85E1A" stroke-width="4"/>
    <rect x="26" y="14" width="288" height="30" rx="15" fill="#FFFFFF" opacity="0.35"/>`),
  btn_secondary: uiSvg(340, 110, `
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B4D0A6"/><stop offset="1" stop-color="#7C9B70"/></linearGradient></defs>
    <rect x="4" y="10" width="332" height="96" rx="48" fill="#5A7A50" opacity="0.5"/>
    <rect x="4" y="4" width="332" height="96" rx="48" fill="url(#g)" stroke="#5A7A50" stroke-width="4"/>
    <rect x="26" y="14" width="288" height="30" rx="15" fill="#FFFFFF" opacity="0.35"/>`),
  panel: uiSvg(640, 800, `
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFDF8"/><stop offset="1" stop-color="#FBF3E4"/></linearGradient></defs>
    <rect x="8" y="16" width="624" height="776" rx="40" fill="#3A2E20" opacity="0.18"/>
    <rect x="4" y="4" width="632" height="776" rx="40" fill="url(#g)" stroke="#E8D9BE" stroke-width="5"/>
    <rect x="24" y="24" width="592" height="736" rx="28" fill="none" stroke="#F5EAD4" stroke-width="3"/>`),
  slot_cell: uiSvg(96, 96, `
    <rect x="4" y="4" width="88" height="88" rx="18" fill="#EFE3CC" stroke="#D8C8A8" stroke-width="3.5"/>
    <rect x="10" y="8" width="76" height="34" rx="12" fill="#FFFFFF" opacity="0.5"/>`),
  coin: uiSvg(96, 96, `
    <circle cx="48" cy="52" r="40" fill="#B8860B" opacity="0.4"/>
    <circle cx="48" cy="46" r="40" fill="#F5C542" stroke="#C8982A" stroke-width="4"/>
    <circle cx="48" cy="46" r="28" fill="#F7DE8C" stroke="#C8982A" stroke-width="3"/>
    <path d="M48 30 l5.4 11 12.1 1.7 -8.8 8.6 2.1 12 -10.8 -5.7 -10.8 5.7 2.1 -12 -8.8 -8.6 12.1 -1.7 Z" fill="#E8A820"/>`),
  icon_undo: uiSvg(96, 96, `
    <path d="M30 44 L54 20 M30 44 L54 68 M30 44 L78 44 C88 44 94 52 94 62 L94 72" fill="none" stroke="#6A5A48" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`),
  icon_shuffle: uiSvg(96, 96, `
    <path d="M14 30 L34 30 C54 30 58 66 78 66 L88 66 M78 66 l-10 -10 M78 66 l-10 10 M14 66 L34 66 C44 66 50 56 56 46 M88 30 L78 30 C72 30 68 34 64 40 M88 30 l-10 -10 M88 30 l-10 10" fill="none" stroke="#6A5A48" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`),
  icon_remove: uiSvg(96, 96, `
    <path d="M30 30 L66 66 M66 30 L30 66" stroke="#E8584A" stroke-width="12" stroke-linecap="round"/>
    <circle cx="48" cy="48" r="40" fill="none" stroke="#E8584A" stroke-width="6" opacity="0.4"/>`),
  icon_slot: uiSvg(96, 96, `
    <rect x="16" y="16" width="64" height="64" rx="14" fill="none" stroke="#6A5A48" stroke-width="8"/>
    <path d="M48 32 v26 M48 32 l-10 10 M48 32 l10 10 M32 70 h32" fill="none" stroke="#6A5A48" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`),
  icon_settings: uiSvg(96, 96, `
    <circle cx="48" cy="48" r="16" fill="none" stroke="#6A5A48" stroke-width="9"/>
    <g stroke="#6A5A48" stroke-width="9" stroke-linecap="round">
      <path d="M48 12 v10 M48 74 v10 M12 48 h10 M74 48 h10 M23 23 l7 7 M66 66 l7 7 M73 23 l-7 7 M30 66 l-7 7"/>
    </g>`),
  icon_daily: uiSvg(96, 96, `
    <rect x="18" y="34" width="60" height="46" rx="8" fill="#E8584A" stroke="#B84034" stroke-width="4"/>
    <path d="M18 44 L48 62 L78 44" fill="none" stroke="#FDF6EC" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="30" y="22" width="36" height="18" rx="4" fill="#F4A0B4" stroke="#B84034" stroke-width="3.5"/>`),
  particle_star: uiSvg(48, 48, `
    <path d="M24 6 l4.6 10.6 11.5 1.3 -8.6 7.9 2.3 11.3 -9.8 -5.7 -9.8 5.7 2.3 -11.3 -8.6 -7.9 11.5 -1.3 Z" fill="#F7DE8C" stroke="#E8A820" stroke-width="2"/>`),
  particle_circle: uiSvg(48, 48, `
    <circle cx="24" cy="24" r="16" fill="#F4A0B4" opacity="0.9"/>
    <circle cx="19" cy="19" r="6" fill="#FFFFFF" opacity="0.6"/>`),
  frost_overlay: uiSvg(96, 96, `
    <rect x="4" y="4" width="88" height="88" rx="18" fill="#BFE8F5" opacity="0.75"/>
    <g stroke="#7EC4DC" stroke-width="3" stroke-linecap="round">
      <path d="M48 20 v56 M24 32 l48 32 M72 32 l-48 32 M30 26 l6 8 M66 26 l-6 8 M30 70 l6 -8 M66 70 l-6 -8"/>
    </g>`),
  lock_overlay: uiSvg(96, 96, `
    <rect x="26" y="44" width="44" height="36" rx="8" fill="#8A7A62" stroke="#5A4A38" stroke-width="4"/>
    <path d="M34 44 v-8 a14 14 0 0 1 28 0 v8" fill="none" stroke="#5A4A38" stroke-width="7"/>
    <circle cx="48" cy="60" r="6" fill="#FDF6EC"/>`),
  logo: uiSvg(560, 220, `
    <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC97E"/><stop offset="1" stop-color="#E07B2A"/></linearGradient></defs>
    <text x="280" y="86" font-size="72" text-anchor="middle" font-family="'Microsoft YaHei',sans-serif" font-weight="bold" fill="url(#lg)" stroke="#7A4210" stroke-width="3">收纳大作战</text>
    <text x="280" y="150" font-size="40" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" fill="#9CB98F" letter-spacing="8">SORT MASTER</text>
    <path d="M92 176 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1 Z" fill="#F5C542"/>
    <path d="M468 176 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1 Z" fill="#F5C542"/>`),
  bg_home: uiSvg(750, 1334, `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFF7EA"/><stop offset="0.6" stop-color="#FBEED8"/><stop offset="1" stop-color="#F7E3C8"/>
      </linearGradient>
      <radialGradient id="blob" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#F7DE8C" stop-opacity="0.5"/><stop offset="1" stop-color="#F7DE8C" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="750" height="1334" fill="url(#bg)"/>
    <circle cx="120" cy="240" r="180" fill="url(#blob)"/>
    <circle cx="640" cy="500" r="220" fill="url(#blob)"/>
    <circle cx="200" cy="1050" r="240" fill="url(#blob)"/>
    <g opacity="0.5" fill="#F0DDBE">
      <circle cx="90" cy="120" r="7"/><circle cx="660" cy="180" r="9"/><circle cx="360" cy="90" r="6"/>
      <circle cx="700" cy="820" r="8"/><circle cx="60" cy="620" r="8"/><circle cx="620" cy="1180" r="9"/>
    </g>
    <path d="M0 1214 C180 1174 320 1254 480 1214 C600 1184 700 1214 750 1204 L750 1334 L0 1334 Z" fill="#EAD9B8" opacity="0.6"/>
    <path d="M0 1264 C200 1234 400 1284 750 1254 L750 1334 L0 1334 Z" fill="#9CB98F" opacity="0.35"/>`),
  bg_game: uiSvg(750, 1334, `
    <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FDF6EC"/><stop offset="1" stop-color="#F6E7CF"/></linearGradient></defs>
    <rect width="750" height="1334" fill="url(#bg)"/>
    <g opacity="0.35" fill="#F0DDBE"><circle cx="80" cy="160" r="6"/><circle cx="680" cy="220" r="8"/><circle cx="400" cy="120" r="5"/><circle cx="120" cy="760" r="7"/><circle cx="660" cy="880" r="7"/></g>
    <rect x="0" y="1108" width="750" height="226" fill="#F3E6CC"/>
    <rect x="0" y="1108" width="750" height="8" fill="#E8D5B0"/>`),
  tray: uiSvg(710, 132, `
    <rect x="5" y="10" width="700" height="116" rx="26" fill="#3A2E20" opacity="0.15"/>
    <rect x="0" y="4" width="700" height="116" rx="26" fill="#EADFC8" stroke="#D8C8A8" stroke-width="4"/>
    <rect x="12" y="14" width="676" height="42" rx="18" fill="#FFFFFF" opacity="0.35"/>`),
};

console.log('Rendering UI textures...');
for (const [id, svg] of Object.entries(UI)) renderUi(id, svg);
console.log('ALL ART DONE');
