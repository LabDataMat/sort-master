/**
 * 2.5D 玩具插画素材生成器（第二轮视觉重构）。
 *
 * 统一美术规范：
 * - 视点：3/4 俯视（顶部可见椭圆面，ry ≈ 0.32~0.4 rx）
 * - 光照：左上方主光（约 315°），右下方为暗部
 * - 结构：接触阴影 → 体积渐变主体 → 核心暗部 → 轮廓光（左上）→ 高光 → 材质纹理 → 描边
 * - 描边：#4A3B2E，3.2px，圆角
 * 所有物品共用同一套光照/描边/阴影参数，保证堆叠时视觉统一。
 */
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ITEM_DIR = path.join(__dirname, '..', 'assets', 'resources', 'textures', 'items');
const UI_DIR = path.join(__dirname, '..', 'assets', 'resources', 'textures', 'ui');
fs.mkdirSync(ITEM_DIR, { recursive: true });
fs.mkdirSync(UI_DIR, { recursive: true });

const OUT = '#4A3B2E';
const SW = 3.2;

/** 生成通用 defs：柔光、接触阴影、颗粒 */
function defs(ns, extra = '') {
  return `<defs>
    <filter id="${ns}-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="${ns}-tiny" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.6"/></filter>
    <filter id="${ns}-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0" result="g"/>
      <feComponentTransfer in="g" result="t"><feFuncA type="linear" slope="0.16"/></feComponentTransfer>
      <feComposite in="t" in2="SourceGraphic" operator="in"/>
    </filter>
    <linearGradient id="${ns}-top" x1="0.2" y1="0" x2="0.55" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="${ns}-dark" cx="0.72" cy="0.82" r="0.75">
      <stop offset="0" stop-color="#2A1E12" stop-opacity="0.32"/>
      <stop offset="0.6" stop-color="#2A1E12" stop-opacity="0.1"/>
      <stop offset="1" stop-color="#2A1E12" stop-opacity="0"/>
    </radialGradient>
    ${extra}
  </defs>`;
}

/** 地面接触阴影（压扁 + 模糊，紧贴物体底部） */
function contact(cx, cy, rx, ry, op = 0.28, ns) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#2A1A0C" opacity="${op}" filter="url(#${ns}-soft)"/>`;
}

/** 环境投影（更大更淡，营造落地感） */
function ambient(cx, cy, rx, ry, ns) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#2A1A0C" opacity="0.12" filter="url(#${ns}-soft)"/>`;
}

/** 主体：渐变填充 + 描边 */
function body(d, c1, c2, c3, ns, sw = SW, fillId = 'g') {
  return `<path d="${d}" fill="url(#${ns}-${fillId})" stroke="${OUT}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

/** 暗部覆盖（同形状，径向暗角） */
function shade(d, ns) {
  return `<path d="${d}" fill="url(#${ns}-dark)" opacity="0.9"/>`;
}

/** 左上轮廓光 */
function rim(d, color = '#FFF6E4', op = 0.55, w = 3, ns = '') {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
}

/** 高光（椭圆/柔光） */
function spec(cx, cy, rx, ry, rot = -20, op = 0.6, ns = '') {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#FFFFFF" opacity="${op}" transform="rotate(${rot} ${cx} ${cy})" filter="url(#${ns}-tiny)"/>`;
}

/** 线性渐变定义 */
function lin(ns, id, stops, x1 = 0.15, y1 = 0, x2 = 0.85, y2 = 1) {
  return `<linearGradient id="${ns}-${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('')}</linearGradient>`;
}

function svg(ns, bodyHtml, extraDefs = '', size = 240) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">
  ${defs(ns, extraDefs)}
  ${bodyHtml}
  </svg>`;
}

// =====================================================================
// 物品定义（每件含体积/材质/高光/接触阴影）
// =====================================================================

const items = {};

// ---------- 水果 ----------
items.apple = svg('apple', `
  ${ambient(100, 176, 58, 12, 'apple')}
  ${contact(100, 172, 44, 10, 0.34, 'apple')}
  ${body('M100 66 C128 44 166 60 166 104 C166 146 136 174 100 174 C64 174 34 146 34 104 C34 60 72 44 100 66 Z', '#F06A55', '#D9483C', '#A32E28', 'apple')}
  <path d="M100 66 C128 44 166 60 166 104 C166 146 136 174 100 174 C64 174 34 146 34 104 C34 60 72 44 100 66 Z" fill="url(#apple-top)"/>
  ${shade('M100 66 C128 44 166 60 166 104 C166 146 136 174 100 174 C64 174 34 146 34 104 C34 60 72 44 100 66 Z', 'apple')}
  <path d="M46 96 C52 72 74 58 96 56" fill="none" stroke="#FFD9CC" stroke-width="7" opacity="0.5" stroke-linecap="round"/>
  ${spec(74, 92, 12, 18, -22, 0.55, 'apple')}
  <path d="M100 66 C100 50 106 40 118 34" fill="none" stroke="#6B4A2E" stroke-width="7" stroke-linecap="round"/>
  <path d="M104 56 C118 38 142 38 150 50 C140 62 114 64 104 56 Z" fill="#7FA86A" stroke="${OUT}" stroke-width="3"/>
  <path d="M108 54 C120 44 136 44 144 50" fill="none" stroke="#C8E8B0" stroke-width="2.6" opacity="0.8" stroke-linecap="round"/>
`, lin('apple', 'g', [[0, '#FF8A70'], [0.45, '#E85A48'], [1, '#B83A30']]));

items.banana = svg('banana', `
  ${ambient(100, 172, 54, 11, 'banana')}
  ${contact(100, 168, 42, 9, 0.3, 'banana')}
  ${body('M44 56 C36 112 68 164 138 168 C158 169 170 158 166 146 C118 146 82 118 72 58 C70 44 46 44 44 56 Z', '#FFD75E', '#F2B93B', '#C98A22', 'banana')}
  <path d="M44 56 C36 112 68 164 138 168 C158 169 170 158 166 146 C118 146 82 118 72 58 C70 44 46 44 44 56 Z" fill="url(#banana-top)"/>
  ${shade('M44 56 C36 112 68 164 138 168 C158 169 170 158 166 146 C118 146 82 118 72 58 C70 44 46 44 44 56 Z', 'banana')}
  <path d="M52 62 C60 112 88 144 136 154" fill="none" stroke="#B87A18" stroke-width="3" opacity="0.55"/>
  <path d="M56 66 C64 110 90 138 130 148" fill="none" stroke="#FFF0B8" stroke-width="5" opacity="0.45" stroke-linecap="round"/>
  <path d="M120 66 C132 86 146 104 160 116" fill="none" stroke="#B87A18" stroke-width="2.6" opacity="0.35"/>
  <path d="M160 142 C170 142 174 152 166 154 C156 156 152 144 160 142 Z" fill="#7C5A2E" stroke="${OUT}" stroke-width="2.4"/>
`, lin('banana', 'g', [[0, '#FFE98A'], [0.5, '#F5C542'], [1, '#C9902A']]));

items.strawberry = svg('strawberry', `
  ${ambient(100, 174, 52, 11, 'strawberry')}
  ${contact(100, 170, 40, 9, 0.3, 'strawberry')}
  ${body('M100 172 C64 152 44 120 44 94 C44 68 68 54 100 54 C132 54 156 68 156 94 C156 120 136 152 100 172 Z', '#F0645A', '#D8433C', '#A32A2A', 'strawberry')}
  <path d="M100 172 C64 152 44 120 44 94 C44 68 68 54 100 54 C132 54 156 68 156 94 C156 120 136 152 100 172 Z" fill="url(#strawberry-top)"/>
  ${shade('M100 172 C64 152 44 120 44 94 C44 68 68 54 100 54 C132 54 156 68 156 94 C156 120 136 152 100 172 Z', 'strawberry')}
  <g fill="#FFE9A8" opacity="0.95">
    <ellipse cx="76" cy="98" rx="3.2" ry="4.6" transform="rotate(-16 76 98)"/>
    <ellipse cx="100" cy="90" rx="3.2" ry="4.6"/>
    <ellipse cx="124" cy="98" rx="3.2" ry="4.6" transform="rotate(16 124 98)"/>
    <ellipse cx="88" cy="122" rx="3.2" ry="4.6" transform="rotate(-10 88 122)"/>
    <ellipse cx="112" cy="122" rx="3.2" ry="4.6" transform="rotate(10 112 122)"/>
    <ellipse cx="100" cy="148" rx="3.2" ry="4.6"/>
  </g>
  ${spec(72, 86, 10, 16, -24, 0.4, 'strawberry')}
  <path d="M72 54 C84 42 116 42 128 54 C116 64 84 64 72 54 Z" fill="#7FA86A" stroke="${OUT}" stroke-width="3"/>
  <path d="M100 54 L100 40 M100 44 C108 34 122 32 128 38" fill="none" stroke="#5A7A4A" stroke-width="4" stroke-linecap="round"/>
`, lin('strawberry', 'g', [[0, '#FF8A7A'], [0.45, '#E8514A'], [1, '#A82A2A']]));

items.grape = svg('grape', `
  ${ambient(100, 174, 52, 11, 'grape')}
  ${contact(100, 170, 42, 9, 0.3, 'grape')}
  ${body('M100 62 C100 46 106 38 116 32', 'none', '', '', 'grape', 0)}
  <path d="M100 62 C100 46 106 38 116 32" fill="none" stroke="#6B4A2E" stroke-width="6" stroke-linecap="round"/>
  <path d="M104 50 C116 32 142 32 150 44 C140 56 114 58 104 50 Z" fill="#7FA86A" stroke="${OUT}" stroke-width="3"/>
  <g stroke="${OUT}" stroke-width="3">
    <circle cx="78" cy="96" r="20" fill="url(#grape-g1)"/>
    <circle cx="122" cy="96" r="20" fill="url(#grape-g1)"/>
    <circle cx="60" cy="122" r="20" fill="url(#grape-g2)"/>
    <circle cx="100" cy="122" r="20" fill="url(#grape-g2)"/>
    <circle cx="140" cy="122" r="20" fill="url(#grape-g2)"/>
    <circle cx="80" cy="148" r="20" fill="url(#grape-g3)"/>
    <circle cx="120" cy="148" r="20" fill="url(#grape-g3)"/>
    <circle cx="100" cy="170" r="19" fill="url(#grape-g3)"/>
  </g>
  <g fill="#FFFFFF" opacity="0.5">
    <circle cx="71" cy="88" r="5"/><circle cx="115" cy="88" r="5"/><circle cx="53" cy="114" r="5"/>
    <circle cx="93" cy="114" r="5"/><circle cx="133" cy="114" r="5"/><circle cx="73" cy="140" r="5"/>
  </g>
`, `${lin('grape', 'g1', [[0, '#B98BDC'], [0.5, '#8F5CBE'], [1, '#6B3E96']])}
    ${lin('grape', 'g2', [[0, '#AE7CD4'], [0.5, '#8452B4'], [1, '#5E3488']])}
    ${lin('grape', 'g3', [[0, '#9E6BC8'], [0.5, '#7646A6'], [1, '#522C7C']])}`);

items.orange = svg('orange', `
  ${ambient(100, 176, 60, 12, 'orange')}
  ${contact(100, 172, 46, 10, 0.32, 'orange')}
  ${body('M100 50 C136 50 164 78 164 114 C164 150 136 176 100 176 C64 176 36 150 36 114 C36 78 64 50 100 50 Z', '#FFB25E', '#F08A2E', '#B85E14', 'orange')}
  <path d="M100 50 C136 50 164 78 164 114 C164 150 136 176 100 176 C64 176 36 150 36 114 C36 78 64 50 100 50 Z" fill="url(#orange-top)"/>
  ${shade('M100 50 C136 50 164 78 164 114 C164 150 136 176 100 176 C64 176 36 150 36 114 C36 78 64 50 100 50 Z', 'orange')}
  <g fill="#C9701E" opacity="0.5">
    <circle cx="80" cy="102" r="2.4"/><circle cx="110" cy="94" r="2.4"/><circle cx="128" cy="116" r="2.4"/>
    <circle cx="92" cy="128" r="2.4"/><circle cx="118" cy="138" r="2.4"/><circle cx="70" cy="126" r="2.4"/>
  </g>
  ${spec(72, 88, 12, 18, -22, 0.5, 'orange')}
  <path d="M100 54 C100 44 106 36 116 32" fill="none" stroke="#6B4A2E" stroke-width="6" stroke-linecap="round"/>
  <path d="M104 46 C114 30 138 30 146 42 C136 52 112 54 104 46 Z" fill="#7FA86A" stroke="${OUT}" stroke-width="3"/>
`, lin('orange', 'g', [[0, '#FFC97E'], [0.45, '#F59E42'], [1, '#C46A16']]));

items.cherry = svg('cherry', `
  ${ambient(100, 176, 54, 11, 'cherry')}
  ${contact(72, 164, 30, 8, 0.3, 'cherry')}
  ${contact(130, 168, 30, 8, 0.3, 'cherry')}
  <path d="M78 98 C74 68 88 48 110 38 M124 102 C126 74 118 54 110 38" fill="none" stroke="#6B4A2E" stroke-width="5" stroke-linecap="round"/>
  <path d="M104 42 C116 26 140 26 148 38 C138 48 112 50 104 42 Z" fill="#7FA86A" stroke="${OUT}" stroke-width="3"/>
  <circle cx="72" cy="128" r="30" fill="url(#cherry-g)" stroke="${OUT}" stroke-width="3.4"/>
  <circle cx="130" cy="132" r="30" fill="url(#cherry-g2)" stroke="${OUT}" stroke-width="3.4"/>
  ${spec(62, 116, 8, 12, -24, 0.5, 'cherry')}
  ${spec(120, 120, 8, 12, -24, 0.5, 'cherry')}
  <path d="M50 142 C58 154 70 158 82 156" fill="none" stroke="#8A2020" stroke-width="3" opacity="0.4"/>
  <path d="M108 146 C116 158 128 162 140 160" fill="none" stroke="#8A2020" stroke-width="3" opacity="0.4"/>
`, `${lin('cherry', 'g', [[0, '#FF8A72'], [0.5, '#E4503E'], [1, '#A82A22']])}
    ${lin('cherry', 'g2', [[0, '#FF7E68'], [0.5, '#D94636'], [1, '#9E2620']])}`);

// ---------- 甜点 ----------
items.cake = svg('cake', `
  ${ambient(100, 178, 58, 12, 'cake')}
  ${contact(100, 172, 48, 10, 0.32, 'cake')}
  <rect x="42" y="104" width="116" height="62" rx="12" fill="url(#cake-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <rect x="42" y="104" width="116" height="62" rx="12" fill="url(#cake-top)"/>
  <path d="M42 128 C60 136 76 122 94 128 C112 134 128 120 146 126 L158 126 L158 166 C158 170 154 172 148 172 L52 172 C46 172 42 170 42 166 Z" fill="url(#cake-cream)" opacity="0.96"/>
  <path d="M42 128 C60 136 76 122 94 128 C112 134 128 120 146 126" fill="none" stroke="#FFF6EC" stroke-width="4" opacity="0.9"/>
  <ellipse cx="100" cy="104" rx="58" ry="16" fill="url(#cake-icing)" stroke="${OUT}" stroke-width="${SW}"/>
  <ellipse cx="100" cy="104" rx="58" ry="16" fill="url(#cake-top)" opacity="0.7"/>
  <path d="M52 108 C62 116 74 112 82 116 C92 121 104 114 112 118 C122 123 134 116 146 112" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.7"/>
  <g>
    <rect x="52" y="130" width="12" height="28" rx="4" fill="#F59E42" stroke="${OUT}" stroke-width="2.6"/>
    <rect x="94" y="130" width="12" height="28" rx="4" fill="#F59E42" stroke="${OUT}" stroke-width="2.6"/>
    <rect x="136" y="130" width="12" height="28" rx="4" fill="#F59E42" stroke="${OUT}" stroke-width="2.6"/>
  </g>
  <circle cx="100" cy="86" r="15" fill="url(#cake-cherry)" stroke="${OUT}" stroke-width="3"/>
  ${spec(95, 80, 5, 7, -20, 0.7, 'cake')}
  <path d="M100 71 C100 61 104 55 110 51" fill="none" stroke="#5A7A4A" stroke-width="4" stroke-linecap="round"/>
`, `${lin('cake', 'g', [[0, '#F9D3C4'], [0.5, '#EFB8A6'], [1, '#C98A78']])}
    ${lin('cake', 'cream', [[0, '#FFF9EE'], [0.55, '#FBEBD8'], [1, '#E8CFB4']])}
    ${lin('cake', 'icing', [[0, '#FFFFFF'], [0.5, '#FDF2E4'], [1, '#F0D8BE']])}
    ${lin('cake', 'cherry', [[0, '#FF8A78'], [0.5, '#E4503E'], [1, '#A82A22']])}`);

items.donut = svg('donut', `
  ${ambient(100, 176, 56, 12, 'donut')}
  ${contact(100, 172, 44, 10, 0.32, 'donut')}
  <circle cx="100" cy="110" r="60" fill="url(#donut-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <circle cx="100" cy="110" r="60" fill="url(#donut-top)"/>
  <circle cx="100" cy="110" r="60" fill="url(#donut-dark)"/>
  <path d="M42 104 C60 82 86 80 100 94 C114 80 140 82 158 104 C166 124 148 136 136 128 C126 142 110 146 100 134 C88 148 66 142 60 128 C48 136 34 124 42 104 Z" fill="url(#donut-frost)" stroke="${OUT}" stroke-width="${SW}"/>
  <path d="M46 102 C62 84 84 82 98 96 C112 82 138 84 154 102" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="0.55"/>
  <circle cx="100" cy="112" r="17" fill="#F3E2C8" stroke="${OUT}" stroke-width="${SW}"/>
  <circle cx="100" cy="112" r="17" fill="url(#donut-hole)"/>
  <g stroke-linecap="round" stroke-width="4.5">
    <path d="M72 96 l8 6" stroke="#8FC7E8"/><path d="M118 92 l10 4" stroke="#F7DE8C"/>
    <path d="M66 124 l9 5" stroke="#FFF6EC"/><path d="M134 118 l9 5" stroke="#8FC7E8"/>
    <path d="M96 132 l8 4" stroke="#FFF6EC"/>
  </g>
`, `${lin('donut', 'g', [[0, '#F6C27A'], [0.5, '#E0A052'], [1, '#B0702E']])}
    ${lin('donut', 'frost', [[0, '#FFC0CE'], [0.5, '#F49BB2'], [1, '#D8708C']])}
    ${lin('donut', 'hole', [[0, '#F7EBD6'], [1, '#DCC6A4']])}`);

items.cookie = svg('cookie', `
  ${ambient(100, 176, 56, 12, 'cookie')}
  ${contact(100, 172, 44, 10, 0.3, 'cookie')}
  <circle cx="100" cy="110" r="60" fill="url(#cookie-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <circle cx="100" cy="110" r="60" fill="url(#cookie-top)"/>
  <circle cx="100" cy="110" r="60" fill="url(#cookie-dark)"/>
  <circle cx="100" cy="110" r="52" fill="none" stroke="#C08A48" stroke-width="3" opacity="0.5"/>
  <g fill="url(#cookie-chip)" stroke="#4A2E18" stroke-width="2.4">
    <circle cx="78" cy="92" r="9"/><circle cx="120" cy="88" r="8"/><circle cx="140" cy="118" r="8"/>
    <circle cx="86" cy="130" r="9"/><circle cx="112" cy="126" r="7"/><circle cx="64" cy="112" r="6"/>
  </g>
  <g fill="#FFFFFF" opacity="0.35"><circle cx="74" cy="87" r="3"/><circle cx="116" cy="83" r="2.6"/></g>
`, `${lin('cookie', 'g', [[0, '#F2C88C'], [0.5, '#DFA860'], [1, '#B47A3A']])}
    ${lin('cookie', 'chip', [[0, '#7C4A2A'], [1, '#4A2A16']])}`);

items.icecream = svg('icecream', `
  ${ambient(100, 178, 46, 11, 'icecream')}
  ${contact(100, 174, 34, 8, 0.3, 'icecream')}
  <path d="M70 110 L100 180 L130 110 Z" fill="url(#icecream-cone)" stroke="${OUT}" stroke-width="${SW}"/>
  <path d="M78 124 L122 124 M84 140 L116 140 M90 156 L110 156" stroke="#B8803E" stroke-width="3" opacity="0.75"/>
  <path d="M70 110 L100 180 L130 110" fill="url(#icecream-top)" opacity="0.55"/>
  <circle cx="78" cy="98" r="26" fill="url(#icecream-scoop1)" stroke="${OUT}" stroke-width="${SW}"/>
  <circle cx="122" cy="98" r="26" fill="url(#icecream-scoop2)" stroke="${OUT}" stroke-width="${SW}"/>
  <circle cx="100" cy="74" r="27" fill="url(#icecream-scoop3)" stroke="${OUT}" stroke-width="${SW}"/>
  ${spec(90, 62, 9, 7, -18, 0.65, 'icecream')}
  ${spec(70, 88, 7, 6, -18, 0.5, 'icecream')}
  <path d="M100 48 C100 40 104 34 110 30" fill="none" stroke="#6B4A2E" stroke-width="4" stroke-linecap="round"/>
  <circle cx="112" cy="26" r="6" fill="#E8584A" stroke="${OUT}" stroke-width="2.6"/>
`, `${lin('icecream', 'cone', [[0, '#F2C88C'], [0.5, '#DDA45C'], [1, '#A8702E']])}
    ${lin('icecream', 'scoop1', [[0, '#FFD3DC'], [0.5, '#F4A0B4'], [1, '#C9708A']])}
    ${lin('icecream', 'scoop2', [[0, '#FFF9EE'], [0.5, '#F7E8D2'], [1, '#DCC2A2']])}
    ${lin('icecream', 'scoop3', [[0, '#BFE3F2'], [0.5, '#8FC7E8'], [1, '#5A96BC']])}`);

items.macaron = svg('macaron', `
  ${ambient(100, 176, 56, 12, 'macaron')}
  ${contact(100, 172, 44, 10, 0.3, 'macaron')}
  <path d="M42 92 C42 68 68 56 100 56 C132 56 158 68 158 92 C158 102 146 108 100 108 C54 108 42 102 42 92 Z" fill="url(#mac-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <path d="M42 92 C42 68 68 56 100 56 C132 56 158 68 158 92 C158 102 146 108 100 108 C54 108 42 102 42 92 Z" fill="url(#mac-top)"/>
  <rect x="48" y="106" width="104" height="20" rx="10" fill="url(#mac-cream)" stroke="${OUT}" stroke-width="3"/>
  <path d="M42 138 C42 160 68 172 100 172 C132 172 158 160 158 138 C158 128 146 122 100 122 C54 122 42 128 42 138 Z" fill="url(#mac-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <path d="M42 138 C42 160 68 172 100 172 C132 172 158 160 158 138 C158 128 146 122 100 122 C54 122 42 128 42 138 Z" fill="url(#mac-top)" opacity="0.7"/>
  <path d="M56 74 C66 62 84 58 98 58" fill="none" stroke="#FFFFFF" stroke-width="5" opacity="0.5" stroke-linecap="round"/>
  <g fill="#FFFFFF" opacity="0.35"><circle cx="70" cy="88" r="2.4"/><circle cx="126" cy="86" r="2.4"/></g>
`, `${lin('mac', 'g', [[0, '#C4DDB4'], [0.5, '#9CB98F'], [1, '#6E8F62']])}
    ${lin('mac', 'cream', [[0, '#FFF9EE'], [0.5, '#F7E8C8'], [1, '#DFC79E']])}`);

items.pudding = svg('pudding', `
  ${ambient(100, 176, 52, 11, 'pudding')}
  ${contact(100, 172, 42, 9, 0.3, 'pudding')}
  <path d="M54 108 C54 148 72 170 100 170 C128 170 146 148 146 108 Z" fill="url(#pud-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <path d="M54 108 C54 148 72 170 100 170 C128 170 146 148 146 108 Z" fill="url(#pud-top)"/>
  <path d="M54 108 C54 96 74 88 100 88 C126 88 146 96 146 108 C146 120 126 128 100 128 C74 128 54 120 54 108 Z" fill="url(#pud-caramel)" stroke="${OUT}" stroke-width="3.4"/>
  <path d="M62 104 C74 96 90 92 100 92" fill="none" stroke="#FFE0A8" stroke-width="4" opacity="0.6" stroke-linecap="round"/>
  <path d="M70 88 C70 74 82 66 100 66 C118 66 130 74 130 88" fill="url(#pud-cream)" stroke="${OUT}" stroke-width="3.2"/>
  <circle cx="100" cy="58" r="10" fill="url(#pud-cherry)" stroke="${OUT}" stroke-width="2.8"/>
  ${spec(88, 56, 3.6, 5, -20, 0.6, 'pudding')}
  <path d="M76 142 C82 152 90 156 100 156" fill="none" stroke="#FFE9B0" stroke-width="4" opacity="0.4" stroke-linecap="round"/>
`, `${lin('pud', 'g', [[0, '#FFE9A8'], [0.5, '#F5C542'], [1, '#C98E1E']])}
    ${lin('pud', 'caramel', [[0, '#D89250'], [0.5, '#B86A2E'], [1, '#8A4418']])}
    ${lin('pud', 'cream', [[0, '#FFFFFF'], [0.5, '#FBF0DC'], [1, '#E8D0B0']])}
    ${lin('pud', 'cherry', [[0, '#FF8A78'], [0.5, '#E4503E'], [1, '#A82A22']])}`);

// ---------- 玩具 ----------
items.bear = svg('bear', `
  ${ambient(100, 178, 54, 12, 'bear')}
  ${contact(100, 172, 42, 10, 0.32, 'bear')}
  <circle cx="58" cy="70" r="22" fill="url(#bear-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <circle cx="142" cy="70" r="22" fill="url(#bear-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <circle cx="58" cy="70" r="11" fill="url(#bear-inner)"/>
  <circle cx="142" cy="70" r="11" fill="url(#bear-inner)"/>
  <circle cx="100" cy="106" r="56" fill="url(#bear-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <circle cx="100" cy="106" r="56" fill="url(#bear-top)"/>
  <ellipse cx="100" cy="124" rx="25" ry="19" fill="url(#bear-muzzle)" stroke="${OUT}" stroke-width="3"/>
  <circle cx="100" cy="116" r="7" fill="#4A3020"/>
  <path d="M92 132 q8 8 16 0" fill="none" stroke="#4A3020" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="80" cy="94" r="6.5" fill="#3A2A1A"/><circle cx="120" cy="94" r="6.5" fill="#3A2A1A"/>
  <circle cx="78" cy="91.5" r="2" fill="#FFFFFF" opacity="0.85"/><circle cx="118" cy="91.5" r="2" fill="#FFFFFF" opacity="0.85"/>
  <circle cx="68" cy="110" r="7" fill="#F4A0B4" opacity="0.55"/><circle cx="132" cy="110" r="7" fill="#F4A0B4" opacity="0.55"/>
  ${spec(78, 78, 12, 8, -20, 0.35, 'bear')}
`, `${lin('bear', 'g', [[0, '#E8C69A'], [0.5, '#C89B6A'], [1, '#94663C']])}
    ${lin('bear', 'inner', [[0, '#F7E2C4'], [1, '#D9B98C']])}
    ${lin('bear', 'muzzle', [[0, '#FFF1DC'], [0.6, '#F2D9B8'], [1, '#D6B489']])}`);

items.blocks = svg('blocks', `
  ${ambient(100, 178, 56, 12, 'blocks')}
  ${contact(100, 172, 46, 10, 0.3, 'blocks')}
  <rect x="46" y="100" width="64" height="64" rx="10" fill="url(#blk-blue)" stroke="${OUT}" stroke-width="${SW}"/>
  <rect x="46" y="100" width="64" height="22" rx="10" fill="#FFFFFF" opacity="0.28"/>
  <rect x="92" y="100" width="64" height="64" rx="10" fill="url(#blk-orange)" stroke="${OUT}" stroke-width="${SW}"/>
  <rect x="92" y="100" width="64" height="22" rx="10" fill="#FFFFFF" opacity="0.28"/>
  <rect x="68" y="44" width="64" height="64" rx="10" fill="url(#blk-green)" stroke="${OUT}" stroke-width="${SW}"/>
  <rect x="68" y="44" width="64" height="22" rx="10" fill="#FFFFFF" opacity="0.3"/>
  <path d="M100 58 l6.4 13 14.4 2 -10.4 10.2 2.5 14.4 -12.9 -6.8 -12.9 6.8 2.5 -14.4 -10.4 -10.2 14.4 -2 Z" fill="#FFF6D8" stroke="#C8982A" stroke-width="2.4"/>
  <circle cx="78" cy="132" r="10" fill="#FFF6EC" opacity="0.9" stroke="${OUT}" stroke-width="2.4"/>
  <rect x="108" y="118" width="28" height="28" rx="7" fill="#FFF6EC" opacity="0.9" stroke="${OUT}" stroke-width="2.4"/>
  <path d="M112 118 v28 M132 118 v28 M108 132 h28" stroke="#D8C8A8" stroke-width="2"/>
`, `${lin('blk', 'blue', [[0, '#B8E0F2'], [0.5, '#8FC7E8'], [1, '#5A94B8']])}
    ${lin('blk', 'orange', [[0, '#FFC97E'], [0.5, '#F59E42'], [1, '#C06E18']])}
    ${lin('blk', 'green', [[0, '#C4DDB4'], [0.5, '#9CB98F'], [1, '#6E8F62']])}`);

items.duck = svg('duck', `
  ${ambient(100, 178, 56, 12, 'duck')}
  ${contact(100, 172, 44, 10, 0.3, 'duck')}
  <path d="M56 122 C50 158 82 176 112 172 C144 168 162 146 156 122 C150 102 128 98 112 106 C104 110 96 112 90 110 C80 106 78 100 82 94 C76 102 62 108 56 122 Z" fill="url(#duck-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <path d="M56 122 C50 158 82 176 112 172 C144 168 162 146 156 122" fill="url(#duck-top)" opacity="0.7"/>
  <circle cx="80" cy="78" r="30" fill="url(#duck-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <circle cx="80" cy="78" r="30" fill="url(#duck-top)"/>
  <path d="M52 72 C38 70 34 80 44 86 C50 89 58 88 62 84" fill="url(#duck-beak)" stroke="${OUT}" stroke-width="3.2"/>
  <circle cx="70" cy="70" r="5.4" fill="#3A3020"/>
  <circle cx="68.4" cy="68.4" r="1.8" fill="#FFFFFF" opacity="0.9"/>
  <path d="M104 156 C122 150 138 138 142 124" fill="none" stroke="#D8A81E" stroke-width="3.2" stroke-linecap="round" opacity="0.6"/>
  <path d="M60 132 q14 8 28 4" fill="none" stroke="#D8A81E" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
  ${spec(66, 62, 8, 5, -20, 0.5, 'duck')}
`, `${lin('duck', 'g', [[0, '#FFE98A'], [0.5, '#F7DE5C'], [1, '#C9A820']])}
    ${lin('duck', 'beak', [[0, '#FFC97E'], [0.5, '#F59E42'], [1, '#C06E18']])}`);

items.car = svg('car', `
  ${ambient(100, 178, 64, 12, 'car')}
  ${contact(100, 170, 56, 10, 0.34, 'car')}
  <path d="M32 124 C32 108 44 98 60 98 L76 98 C84 78 98 70 118 70 C142 70 158 82 164 98 L168 98 C180 98 186 108 184 122 C184 132 176 136 166 136 L48 136 C38 136 32 132 32 124 Z" fill="url(#car-body)" stroke="${OUT}" stroke-width="${SW}"/>
  <path d="M32 124 C32 108 44 98 60 98 L76 98 C84 78 98 70 118 70 C142 70 158 82 164 98 L168 98 C180 98 186 108 184 122 C184 132 176 136 166 136 L48 136 C38 136 32 132 32 124 Z" fill="url(#car-top)"/>
  <path d="M84 96 C90 84 100 78 114 78 L114 96 Z" fill="url(#car-glass)" stroke="${OUT}" stroke-width="2.8"/>
  <path d="M120 78 C134 78 146 86 152 96 L120 96 Z" fill="url(#car-glass)" stroke="${OUT}" stroke-width="2.8"/>
  <path d="M86 94 C92 84 100 80 110 80" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.75" stroke-linecap="round"/>
  <path d="M40 116 C52 110 68 108 84 108" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="0.45" stroke-linecap="round"/>
  <rect x="34" y="120" width="18" height="8" rx="4" fill="#FFE9A8" stroke="${OUT}" stroke-width="2.4"/>
  <circle cx="70" cy="138" r="18" fill="url(#car-tyre)" stroke="${OUT}" stroke-width="3.2"/>
  <circle cx="70" cy="138" r="8" fill="url(#car-hub)" stroke="${OUT}" stroke-width="2.4"/>
  <circle cx="148" cy="138" r="18" fill="url(#car-tyre)" stroke="${OUT}" stroke-width="3.2"/>
  <circle cx="148" cy="138" r="8" fill="url(#car-hub)" stroke="${OUT}" stroke-width="2.4"/>
  <path d="M60 138 a10 10 0 0 1 10 -10" fill="none" stroke="#FFFFFF" stroke-width="2.4" opacity="0.5"/>
  <path d="M138 138 a10 10 0 0 1 10 -10" fill="none" stroke="#FFFFFF" stroke-width="2.4" opacity="0.5"/>
`, `${lin('car', 'body', [[0, '#FF8A7A'], [0.45, '#E8584A'], [1, '#A82A28']])}
    ${lin('car', 'glass', [[0, '#D6EEF8'], [0.5, '#9CCFE8'], [1, '#5A8FA8']])}
    ${lin('car', 'tyre', [[0, '#6A6A6A'], [0.5, '#3E3E3E'], [1, '#1E1E1E']])}
    ${lin('car', 'hub', [[0, '#F2F2F2'], [0.5, '#C8C8C8'], [1, '#8A8A8A']])}`);

items.ball = svg('ball', `
  ${ambient(100, 176, 58, 12, 'ball')}
  ${contact(100, 172, 46, 10, 0.34, 'ball')}
  <circle cx="100" cy="110" r="60" fill="url(#ball-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <path d="M100 50 C120 76 120 144 100 170" fill="none" stroke="url(#ball-red)" stroke-width="16"/>
  <path d="M44 84 C70 96 130 96 156 84" fill="none" stroke="url(#ball-blue)" stroke-width="16"/>
  <path d="M44 136 C70 124 130 124 156 136" fill="none" stroke="url(#ball-yellow)" stroke-width="16"/>
  <circle cx="100" cy="110" r="60" fill="url(#ball-top)"/>
  <circle cx="100" cy="110" r="60" fill="url(#ball-dark)" opacity="0.5"/>
  ${spec(74, 82, 16, 11, -22, 0.65, 'ball')}
`, `${lin('ball', 'g', [[0, '#FFFFFF'], [0.6, '#FBF0DC'], [1, '#DCC7A8']])}
    ${lin('ball', 'red', [[0, '#FF8A7A'], [1, '#C83A32']])}
    ${lin('ball', 'blue', [[0, '#A8D8F0'], [1, '#4E86A8']])}
    ${lin('ball', 'yellow', [[0, '#FFE9A8'], [1, '#D8A820']])}`);

items.robot = svg('robot', `
  ${ambient(100, 178, 52, 12, 'robot')}
  ${contact(100, 172, 40, 10, 0.32, 'robot')}
  <rect x="62" y="98" width="76" height="64" rx="14" fill="url(#rob-body)" stroke="${OUT}" stroke-width="${SW}"/>
  <rect x="62" y="98" width="76" height="24" rx="14" fill="#FFFFFF" opacity="0.25"/>
  <rect x="54" y="40" width="92" height="60" rx="18" fill="url(#rob-head)" stroke="${OUT}" stroke-width="${SW}"/>
  <rect x="54" y="40" width="92" height="22" rx="16" fill="#FFFFFF" opacity="0.3"/>
  <circle cx="78" cy="70" r="9" fill="url(#rob-eye)" stroke="${OUT}" stroke-width="2.4"/>
  <circle cx="122" cy="70" r="9" fill="url(#rob-eye)" stroke="${OUT}" stroke-width="2.4"/>
  <circle cx="75.6" cy="67" r="2.6" fill="#FFFFFF"/><circle cx="119.6" cy="67" r="2.6" fill="#FFFFFF"/>
  <path d="M86 86 q14 8 28 0" fill="none" stroke="#3A4A54" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M100 40 L100 26" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="100" cy="20" r="8" fill="url(#rob-antenna)" stroke="${OUT}" stroke-width="2.8"/>
  <rect x="76" y="114" width="48" height="20" rx="7" fill="#3E5A66" stroke="${OUT}" stroke-width="2.8"/>
  <circle cx="88" cy="124" r="4" fill="#F7DE8C"/><circle cx="100" cy="124" r="4" fill="#8FC7E8"/><circle cx="112" cy="124" r="4" fill="#F4A0B4"/>
  <rect x="42" y="108" width="14" height="32" rx="7" fill="url(#rob-body)" stroke="${OUT}" stroke-width="3"/>
  <rect x="144" y="108" width="14" height="32" rx="7" fill="url(#rob-body)" stroke="${OUT}" stroke-width="3"/>
`, `${lin('rob', 'body', [[0, '#CFE0E8'], [0.5, '#9FB8C8'], [1, '#6A8898']])}
    ${lin('rob', 'head', [[0, '#DCEAF0'], [0.5, '#B8D0DE'], [1, '#7E9AAA']])}
    ${lin('rob', 'eye', [[0, '#7EE0C8'], [0.5, '#3E9A88'], [1, '#1E5A4E']])}
    ${lin('rob', 'antenna', [[0, '#FF8A78'], [0.5, '#E4503E'], [1, '#A82A22']])}`);

// ---------- 生活用品 ----------
items.cup = svg('cup', `
  ${ambient(100, 178, 46, 11, 'cup')}
  ${contact(100, 174, 34, 8, 0.3, 'cup')}
  <path d="M62 62 L74 168 C75 176 82 180 90 180 L110 180 C118 180 125 176 126 168 L138 62 Z" fill="url(#cup-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <path d="M62 62 L74 168 C75 176 82 180 90 180 L110 180 C118 180 125 176 126 168 L138 62 Z" fill="url(#cup-top)" opacity="0.55"/>
  <path d="M67 96 L70 132 L124 132 L127 96 Z" fill="url(#cup-water)" opacity="0.9"/>
  <path d="M67 96 L70 132 L124 132 L127 96 Z" fill="#FFFFFF" opacity="0.18"/>
  <ellipse cx="100" cy="62" rx="38" ry="10" fill="url(#cup-rim)" stroke="${OUT}" stroke-width="${SW}"/>
  <ellipse cx="100" cy="62" rx="30" ry="6.5" fill="#FDF6EC" opacity="0.9"/>
  <path d="M120 84 q18 -4 15 12 q-3 14 -18 10" fill="none" stroke="#EAF6FA" stroke-width="6" opacity="0.75"/>
  ${spec(86, 78, 6, 12, -8, 0.7, 'cup')}
`, `${lin('cup', 'g', [[0, '#EAF8FC'], [0.55, '#D2EEF6'], [1, '#9CC8D8']])}
    ${lin('cup', 'rim', [[0, '#FFFFFF'], [0.5, '#E8F4F8'], [1, '#B8D8E4']])}
    ${lin('cup', 'water', [[0, '#BFE3F2'], [0.5, '#8FC7E8'], [1, '#5A96BC']])}`);

items.clock = svg('clock', `
  ${ambient(100, 178, 56, 12, 'clock')}
  ${contact(100, 172, 44, 10, 0.32, 'clock')}
  <circle cx="70" cy="56" r="16" fill="url(#clk-bell)" stroke="${OUT}" stroke-width="3.4"/>
  <circle cx="130" cy="56" r="16" fill="url(#clk-bell)" stroke="${OUT}" stroke-width="3.4"/>
  <path d="M60 44 L48 30 M140 44 L152 30" stroke="${OUT}" stroke-width="4.6" stroke-linecap="round"/>
  <circle cx="100" cy="116" r="60" fill="url(#clk-body)" stroke="${OUT}" stroke-width="${SW}"/>
  <circle cx="100" cy="116" r="60" fill="url(#clk-top)"/>
  <circle cx="100" cy="116" r="46" fill="url(#clk-face)" stroke="${OUT}" stroke-width="3"/>
  <g stroke="#8C8073" stroke-width="2.4" stroke-linecap="round">
    <path d="M100 78 v6"/><path d="M100 148 v6"/><path d="M62 116 h6"/><path d="M132 116 h6"/>
  </g>
  <path d="M100 116 L100 84" stroke="#3A3026" stroke-width="5" stroke-linecap="round"/>
  <path d="M100 116 L126 128" stroke="#3A3026" stroke-width="4.4" stroke-linecap="round"/>
  <circle cx="100" cy="116" r="5" fill="#E8584A"/>
  <path d="M66 172 L84 158 M134 172 L116 158" stroke="${OUT}" stroke-width="4.6" stroke-linecap="round"/>
  ${spec(78, 88, 12, 9, -20, 0.4, 'clock')}
`, `${lin('clk', 'body', [[0, '#FFE9B8'], [0.5, '#F7E8C8'], [1, '#C8A878']])}
    ${lin('clk', 'face', [[0, '#FFFFFF'], [0.6, '#FDF6EC'], [1, '#E4D4BC']])}
    ${lin('clk', 'bell', [[0, '#FFC97E'], [0.5, '#F59E42'], [1, '#C06E18']])}`);

items.headphones = svg('headphones', `
  ${ambient(100, 176, 56, 12, 'headphones')}
  ${contact(100, 170, 44, 10, 0.3, 'headphones')}
  <path d="M52 128 C48 78 70 46 100 46 C130 46 152 78 148 128" fill="none" stroke="url(#hp-band)" stroke-width="14" stroke-linecap="round"/>
  <path d="M56 122 C52 80 72 52 100 52" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="0.4" stroke-linecap="round"/>
  <rect x="34" y="112" width="34" height="52" rx="16" fill="url(#hp-cup)" stroke="${OUT}" stroke-width="${SW}"/>
  <rect x="132" y="112" width="34" height="52" rx="16" fill="url(#hp-cup)" stroke="${OUT}" stroke-width="${SW}"/>
  <rect x="42" y="122" width="18" height="32" rx="9" fill="url(#hp-pad)"/>
  <rect x="140" y="122" width="18" height="32" rx="9" fill="url(#hp-pad)"/>
  ${spec(46, 120, 5, 8, -10, 0.6, 'headphones')}
  ${spec(144, 120, 5, 8, -10, 0.6, 'headphones')}
`, `${lin('hp', 'band', [[0, '#FFC97E'], [0.5, '#E07B2A'], [1, '#9A4A10']])}
    ${lin('hp', 'cup', [[0, '#FFD79A'], [0.5, '#F59E42'], [1, '#B85E14']])}
    ${lin('hp', 'pad', [[0, '#FFF3D8'], [0.6, '#F7E0B4'], [1, '#D0B080']])}`);

items.toothbrush = svg('toothbrush', `
  ${ambient(100, 176, 56, 12, 'toothbrush')}
  ${contact(96, 168, 46, 9, 0.28, 'toothbrush')}
  <g transform="rotate(-22 96 120)">
    <rect x="34" y="108" width="118" height="24" rx="12" fill="url(#tb-handle)" stroke="${OUT}" stroke-width="${SW}"/>
    <rect x="34" y="112" width="118" height="8" rx="4" fill="#FFFFFF" opacity="0.3"/>
    <rect x="140" y="56" width="34" height="58" rx="10" fill="url(#tb-head)" stroke="${OUT}" stroke-width="3"/>
    <g stroke="url(#tb-bristle)" stroke-width="3.4" stroke-linecap="round">
      <path d="M146 58 v-12"/><path d="M154 58 v-14"/><path d="M162 58 v-12"/><path d="M170 58 v-14"/>
    </g>
    <rect x="52" y="112" width="26" height="14" rx="7" fill="#F4A0B4" opacity="0.9"/>
  </g>
  ${spec(70, 116, 14, 4, -22, 0.35, 'toothbrush')}
`, `${lin('tb', 'handle', [[0, '#BFE3F2'], [0.5, '#8FC7E8'], [1, '#4E86A8']])}
    ${lin('tb', 'head', [[0, '#FFFFFF'], [0.6, '#F2F7FA'], [1, '#C8DCE6']])}
    ${lin('tb', 'bristle', [[0, '#8FC7E8'], [1, '#4E86A8']])}`);

items.soap = svg('soap', `
  ${ambient(100, 176, 54, 11, 'soap')}
  ${contact(100, 170, 44, 9, 0.3, 'soap')}
  <rect x="36" y="86" width="128" height="66" rx="30" fill="url(#soap-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <rect x="36" y="86" width="128" height="30" rx="15" fill="#FFFFFF" opacity="0.35"/>
  <rect x="44" y="92" width="112" height="20" rx="10" fill="#FFFFFF" opacity="0.4"/>
  <circle cx="140" cy="66" r="10" fill="url(#soap-bubble)" stroke="#9CC8D8" stroke-width="2.2"/>
  <circle cx="158" cy="48" r="6" fill="url(#soap-bubble)" stroke="#9CC8D8" stroke-width="1.8"/>
  <circle cx="126" cy="44" r="4" fill="#FFFFFF" opacity="0.8"/>
  <circle cx="136" cy="62" r="2.6" fill="#FFFFFF" opacity="0.85"/>
  <circle cx="154" cy="45" r="1.8" fill="#FFFFFF" opacity="0.85"/>
  ${spec(70, 104, 16, 5, -8, 0.55, 'soap')}
`, `${lin('soap', 'g', [[0, '#C8EDE2'], [0.5, '#9CD8C8'], [1, '#5FA898']])}
    ${lin('soap', 'bubble', [[0, '#FFFFFF'], [0.6, '#E8F6FA'], [1, '#B8DCE8']])}`);

items.key = svg('key', `
  ${ambient(100, 176, 54, 11, 'key')}
  ${contact(100, 168, 44, 9, 0.28, 'key')}
  <circle cx="68" cy="82" r="30" fill="none" stroke="url(#key-g)" stroke-width="15"/>
  <circle cx="68" cy="82" r="30" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.35"/>
  <path d="M90 104 L150 162" stroke="url(#key-g)" stroke-width="15" stroke-linecap="round"/>
  <path d="M92 100 L148 156" stroke="#FFFFFF" stroke-width="3" opacity="0.3" stroke-linecap="round"/>
  <path d="M136 148 L152 132 M122 158 L138 142" stroke="url(#key-g)" stroke-width="13" stroke-linecap="round"/>
  <circle cx="68" cy="82" r="10" fill="#FBF0DC" stroke="#B8860B" stroke-width="3"/>
  <circle cx="68" cy="82" r="10" fill="url(#key-hole)"/>
`, `${lin('key', 'g', [[0, '#FFE9A8'], [0.4, '#F5C542'], [1, '#B8860B']])}
    ${lin('key', 'hole', [[0, '#FDF6EC'], [1, '#DCC79E']])}`);

// ---------- 文具 ----------
items.pencil = svg('pencil', `
  ${ambient(100, 176, 54, 11, 'pencil')}
  ${contact(100, 170, 42, 9, 0.28, 'pencil')}
  <g transform="rotate(42 100 100)">
    <rect x="84" y="34" width="32" height="104" fill="url(#pen-body)" stroke="${OUT}" stroke-width="${SW}"/>
    <rect x="84" y="34" width="10" height="104" fill="#FFFFFF" opacity="0.28"/>
    <rect x="106" y="34" width="10" height="104" fill="#000000" opacity="0.12"/>
    <path d="M84 138 L100 172 L116 138 Z" fill="url(#pen-wood)" stroke="${OUT}" stroke-width="${SW}"/>
    <path d="M93 156 L100 172 L107 156 Z" fill="#3A2E22"/>
    <rect x="84" y="22" width="32" height="16" rx="5" fill="url(#pen-eraser)" stroke="${OUT}" stroke-width="3"/>
    <rect x="84" y="18" width="32" height="8" rx="3" fill="url(#pen-band)" stroke="${OUT}" stroke-width="2.6"/>
    <path d="M90 44 v84" stroke="#D8A820" stroke-width="2.4" opacity="0.6"/>
  </g>
`, `${lin('pen', 'body', [[0, '#FFE08A'], [0.45, '#F5C542'], [1, '#C08E14']])}
    ${lin('pen', 'wood', [[0, '#F2D6A8'], [0.6, '#D8B47C'], [1, '#A87E48']])}
    ${lin('pen', 'eraser', [[0, '#FFC0CE'], [0.6, '#F4A0B4'], [1, '#C9708A']])}
    ${lin('pen', 'band', [[0, '#E8E8E8'], [1, '#9A9A9A']])}`);

items.book = svg('book', `
  ${ambient(100, 176, 58, 12, 'book')}
  ${contact(100, 172, 46, 10, 0.32, 'book')}
  <path d="M48 56 C48 48 54 44 62 44 L152 44 L152 158 L62 158 C54 158 48 154 48 146 Z" fill="url(#book-cover)" stroke="${OUT}" stroke-width="${SW}"/>
  <path d="M48 56 C48 48 54 44 62 44 L152 44 L152 158 L62 158 C54 158 48 154 48 146 Z" fill="url(#book-top)" opacity="0.6"/>
  <path d="M62 44 L62 158" stroke="${OUT}" stroke-width="3" opacity="0.5"/>
  <rect x="140" y="44" width="14" height="114" fill="url(#book-spine)" stroke="${OUT}" stroke-width="3"/>
  <rect x="66" y="66" width="62" height="10" rx="5" fill="#FDF6EC" opacity="0.95"/>
  <rect x="66" y="86" width="46" height="10" rx="5" fill="#FDF6EC" opacity="0.8"/>
  <rect x="66" y="110" width="70" height="34" rx="6" fill="#FDF6EC" opacity="0.35"/>
  <path d="M152 158 L152 166 L60 166 C54 166 50 162 50 156" fill="#E8DCC8" stroke="${OUT}" stroke-width="2.6"/>
  <path d="M52 60 L52 148" stroke="#FFFFFF" stroke-width="3" opacity="0.35" stroke-linecap="round"/>
`, `${lin('book', 'cover', [[0, '#A8D8F0'], [0.5, '#8FC7E8'], [1, '#4E86A8']])}
    ${lin('book', 'spine', [[0, '#5E9CC0'], [0.5, '#3E7290'], [1, '#2A4E64']])}`);

items.eraser = svg('eraser', `
  ${ambient(100, 176, 54, 11, 'eraser')}
  ${contact(100, 170, 44, 9, 0.28, 'eraser')}
  <g transform="rotate(-10 100 116)">
    <rect x="42" y="90" width="116" height="54" rx="12" fill="url(#er-g)" stroke="${OUT}" stroke-width="${SW}"/>
    <rect x="42" y="90" width="116" height="18" rx="9" fill="#FFFFFF" opacity="0.35"/>
    <rect x="118" y="90" width="40" height="54" rx="12" fill="url(#er-paper)" stroke="${OUT}" stroke-width="3"/>
    <path d="M52 110 l40 -6 M52 124 l28 -4" stroke="#C9708A" stroke-width="2.8" opacity="0.6" stroke-linecap="round"/>
  </g>
`, `${lin('er', 'g', [[0, '#FFC0CE'], [0.5, '#F4A0B4'], [1, '#C9708A']])}
    ${lin('er', 'paper', [[0, '#FFFFFF'], [0.6, '#FBF0E4'], [1, '#DCC8B4']])}`);

items.scissors = svg('scissors', `
  ${ambient(100, 176, 54, 11, 'scissors')}
  ${contact(100, 172, 44, 9, 0.28, 'scissors')}
  <path d="M62 40 L124 126" stroke="url(#sc-blade)" stroke-width="12" stroke-linecap="round"/>
  <path d="M138 40 L76 126" stroke="url(#sc-blade)" stroke-width="12" stroke-linecap="round"/>
  <path d="M66 44 L122 124" stroke="#FFFFFF" stroke-width="3" opacity="0.45" stroke-linecap="round"/>
  <path d="M134 44 L80 124" stroke="#FFFFFF" stroke-width="3" opacity="0.3" stroke-linecap="round"/>
  <circle cx="128" cy="146" r="19" fill="none" stroke="url(#sc-red)" stroke-width="10"/>
  <circle cx="72" cy="146" r="19" fill="none" stroke="url(#sc-blue)" stroke-width="10"/>
  <circle cx="100" cy="88" r="7" fill="#5A4A3A" stroke="${OUT}" stroke-width="2.4"/>
  ${spec(120, 140, 5, 4, -30, 0.6, 'scissors')}
`, `${lin('sc', 'blade', [[0, '#E8EEF2'], [0.45, '#B8C4CC'], [1, '#7A8A96']])}
    ${lin('sc', 'red', [[0, '#FF9A88'], [0.5, '#E8584A'], [1, '#A82A22']])}
    ${lin('sc', 'blue', [[0, '#BFE3F2'], [0.5, '#8FC7E8'], [1, '#4E86A8']])}`);

items.ruler = svg('ruler', `
  ${ambient(100, 176, 58, 12, 'ruler')}
  ${contact(100, 172, 48, 9, 0.26, 'ruler')}
  <g transform="rotate(-14 100 110)">
    <rect x="30" y="88" width="140" height="44" rx="8" fill="url(#rul-g)" stroke="${OUT}" stroke-width="${SW}"/>
    <rect x="30" y="88" width="140" height="14" rx="7" fill="#FFFFFF" opacity="0.45"/>
    <g stroke="#B8860B" stroke-width="3.2" stroke-linecap="round">
      <path d="M52 88 v16"/><path d="M72 88 v11"/><path d="M92 88 v16"/><path d="M112 88 v11"/><path d="M132 88 v16"/><path d="M152 88 v11"/>
    </g>
    <path d="M30 118 h140" stroke="#D8B040" stroke-width="1.6" opacity="0.5"/>
  </g>
`, `${lin('rul', 'g', [[0, '#FFF0B8'], [0.5, '#F7DE8C'], [1, '#C8A032']])}`);

items.penholder = svg('penholder', `
  ${ambient(100, 176, 50, 11, 'penholder')}
  ${contact(100, 172, 38, 9, 0.3, 'penholder')}
  <path d="M58 96 L70 172 C71 179 78 182 86 182 L114 182 C122 182 129 179 130 172 L142 96 Z" fill="url(#ph-g)" stroke="${OUT}" stroke-width="${SW}"/>
  <path d="M58 96 L70 172 C71 179 78 182 86 182 L114 182 C122 182 129 179 130 172 L142 96 Z" fill="url(#ph-top)" opacity="0.5"/>
  <ellipse cx="100" cy="96" rx="42" ry="11" fill="url(#ph-rim)" stroke="${OUT}" stroke-width="3.2"/>
  <ellipse cx="100" cy="96" rx="33" ry="7" fill="#3E5A66" opacity="0.35"/>
  <g transform="rotate(-12 78 60)">
    <rect x="72" y="42" width="12" height="58" fill="url(#ph-p1)" stroke="${OUT}" stroke-width="2.6"/>
    <path d="M72 42 L78 30 L84 42 Z" fill="#F2D6A8" stroke="${OUT}" stroke-width="2.2"/>
  </g>
  <g transform="rotate(8 112 62)">
    <rect x="106" y="46" width="12" height="54" fill="url(#ph-p2)" stroke="${OUT}" stroke-width="2.6"/>
    <path d="M106 46 L112 34 L118 46 Z" fill="#F2D6A8" stroke="${OUT}" stroke-width="2.2"/>
  </g>
  <path d="M94 56 C94 44 100 38 106 36" fill="none" stroke="#6B4A2E" stroke-width="4" stroke-linecap="round"/>
  <circle cx="106" cy="34" r="7" fill="url(#ph-flower)" stroke="${OUT}" stroke-width="2.4"/>
  <path d="M74 128 C82 138 92 142 100 142" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="0.35" stroke-linecap="round"/>
`, `${lin('ph', 'g', [[0, '#BFE3F2'], [0.5, '#8FC7E8'], [1, '#4E86A8']])}
    ${lin('ph', 'rim', [[0, '#FFFFFF'], [0.6, '#E8F4F8'], [1, '#B0D4E0']])}
    ${lin('ph', 'p1', [[0, '#FFC97E'], [1, '#C06E18']])}
    ${lin('ph', 'p2', [[0, '#C4DDB4'], [1, '#6E8F62']])}
    ${lin('ph', 'flower', [[0, '#FFC0CE'], [1, '#C9708A']])}`);

// =====================================================================
// UI 素材（立体按钮 / 凹槽 / 托盘 / 金币 / 图标）
// =====================================================================

function uiSvg(w, h, bodyHtml, extraDefs = '', ns = 'ui') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${defs(ns, extraDefs)}
  ${bodyHtml}
  </svg>`;
}

const UI = {};

// 主按钮：3D 圆角 + 顶高光 + 底部厚度 + 投影
UI.btn_primary = uiSvg(340, 110, `
  <rect x="6" y="14" width="328" height="94" rx="47" fill="#8A4210" opacity="0.35" filter="url(#ui-soft)"/>
  <rect x="4" y="4" width="332" height="96" rx="48" fill="url(#ui-btn-p)" stroke="#A8500E" stroke-width="3"/>
  <rect x="4" y="4" width="332" height="44" rx="22" fill="url(#ui-btn-p-hi)"/>
  <rect x="18" y="10" width="304" height="26" rx="13" fill="#FFFFFF" opacity="0.35"/>
  <rect x="4" y="76" width="332" height="24" rx="12" fill="#8A4210" opacity="0.22"/>
`, `${lin('ui', 'btn-p', [[0, '#FFC072'], [0.45, '#F59332'], [1, '#D9701A']])}
    ${lin('ui', 'btn-p-hi', [[0, '#FFFFFF', 0.55], [1, '#FFFFFF', 0]])}`, 'ui');

UI.btn_secondary = uiSvg(340, 110, `
  <rect x="6" y="14" width="328" height="94" rx="47" fill="#3E5A34" opacity="0.35" filter="url(#ui-soft)"/>
  <rect x="4" y="4" width="332" height="96" rx="48" fill="url(#ui-btn-s)" stroke="#4E6E42" stroke-width="3"/>
  <rect x="4" y="4" width="332" height="44" rx="22" fill="url(#ui-btn-s-hi)"/>
  <rect x="18" y="10" width="304" height="26" rx="13" fill="#FFFFFF" opacity="0.32"/>
  <rect x="4" y="76" width="332" height="24" rx="12" fill="#3E5A34" opacity="0.22"/>
`, `${lin('ui', 'btn-s', [[0, '#C4E0B0'], [0.45, '#9CB98F'], [1, '#789868']])}
    ${lin('ui', 'btn-s-hi', [[0, '#FFFFFF', 0.5], [1, '#FFFFFF', 0]])}`, 'ui');

// 收纳槽托盘：木质凹槽 + 内阴影 + 前缘高光
UI.tray = uiSvg(710, 140, `
  <rect x="6" y="18" width="698" height="112" rx="30" fill="#6B4A22" opacity="0.32" filter="url(#ui-soft)"/>
  <rect x="2" y="6" width="706" height="120" rx="30" fill="url(#ui-tray)" stroke="#8A6438" stroke-width="4"/>
  <rect x="14" y="16" width="682" height="100" rx="22" fill="#B08A52" opacity="0.35"/>
  <rect x="14" y="16" width="682" height="100" rx="22" fill="url(#ui-tray-in)"/>
  <rect x="14" y="16" width="682" height="26" rx="13" fill="#5A3C18" opacity="0.22"/>
  <rect x="2" y="6" width="706" height="16" rx="8" fill="#FFFFFF" opacity="0.3"/>
`, `${lin('ui', 'tray', [[0, '#E8C79A'], [0.45, '#D0A870'], [1, '#A87C46']])}
    ${lin('ui', 'tray-in', [[0, '#8A6438', 0.5], [0.5, '#A87C46', 0.15], [1, '#D8B888', 0.35]])}`, 'ui');

// 槽位凹槽
UI.slot_cell = uiSvg(96, 96, `
  <rect x="3" y="3" width="90" height="90" rx="20" fill="url(#ui-slot)" stroke="#B89868" stroke-width="3"/>
  <rect x="8" y="8" width="80" height="80" rx="16" fill="#C8A878" opacity="0.45"/>
  <rect x="8" y="8" width="80" height="80" rx="16" fill="url(#ui-slot-in)"/>
  <rect x="8" y="8" width="80" height="22" rx="11" fill="#7A5A30" opacity="0.28"/>
  <rect x="10" y="82" width="76" height="8" rx="4" fill="#FFFFFF" opacity="0.28"/>
`, `${lin('ui', 'slot', [[0, '#F6E6CC'], [0.5, '#E4CFAC'], [1, '#C8A878']])}
    ${lin('ui', 'slot-in', [[0, '#8A6438', 0.35], [0.55, '#A87C46', 0.05], [1, '#FFFFFF', 0.18]])}`, 'ui');

// 面板：厚纸卡片
UI.panel = uiSvg(640, 800, `
  <rect x="10" y="20" width="620" height="770" rx="42" fill="#3A2A16" opacity="0.28" filter="url(#ui-soft)"/>
  <rect x="4" y="4" width="632" height="776" rx="42" fill="url(#ui-panel)" stroke="#E0CFB2" stroke-width="4"/>
  <rect x="4" y="4" width="632" height="120" rx="42" fill="#FFFFFF" opacity="0.25"/>
  <rect x="22" y="22" width="596" height="740" rx="30" fill="none" stroke="#F2E6D0" stroke-width="2.5"/>
`, `${lin('ui', 'panel', [[0, '#FFFDF8'], [0.55, '#FCF4E6'], [1, '#F0DFC4']])}`, 'ui');

// 金币：立体硬币
UI.coin = uiSvg(96, 96, `
  <ellipse cx="48" cy="56" rx="40" ry="36" fill="#8A5A10" opacity="0.4" filter="url(#ui-soft)"/>
  <circle cx="48" cy="46" r="40" fill="url(#ui-coin-edge)" stroke="#B8860B" stroke-width="3"/>
  <circle cx="48" cy="44" r="33" fill="url(#ui-coin)" stroke="#C8982A" stroke-width="2.5"/>
  <circle cx="48" cy="44" r="26" fill="none" stroke="#D8A820" stroke-width="2" opacity="0.7"/>
  <path d="M48 26 l5.6 11.4 12.6 1.8 -9.1 8.9 2.2 12.6 -11.3 -6 -11.3 6 2.2 -12.6 -9.1 -8.9 12.6 -1.8 Z" fill="url(#ui-coin-star)"/>
  <ellipse cx="34" cy="30" rx="9" ry="6" fill="#FFFFFF" opacity="0.55" transform="rotate(-24 34 30)"/>
`, `${lin('ui', 'coin', [[0, '#FFE9A8'], [0.45, '#F5C542'], [1, '#D89A18']])}
    ${lin('ui', 'coin-edge', [[0, '#E8B830'], [0.5, '#C8982A'], [1, '#8A5A10']])}
    ${lin('ui', 'coin-star', [[0, '#FFF6D0'], [1, '#E8B830']])}`, 'ui');

// 关卡徽章
UI.level_badge = uiSvg(200, 120, `
  <rect x="6" y="16" width="188" height="94" rx="30" fill="#8A4210" opacity="0.3" filter="url(#ui-soft)"/>
  <path d="M20 8 H180 C188 8 192 14 190 22 L178 96 C176 104 168 108 160 108 H40 C32 108 24 104 22 96 L10 22 C8 14 12 8 20 8 Z" fill="url(#ui-badge)" stroke="#A8500E" stroke-width="3"/>
  <path d="M22 10 H178 C184 10 186 14 184 20 L178 34 H22 L16 20 C14 14 16 10 22 10 Z" fill="#FFFFFF" opacity="0.3"/>
`, `${lin('ui', 'badge', [[0, '#FFC97E'], [0.5, '#F0932E'], [1, '#C4681A']])}`, 'ui');

// 柔和阴影贴图（Cocos 用）
UI.shadow_soft = uiSvg(120, 60, `
  <ellipse cx="60" cy="30" rx="52" ry="20" fill="#2A1A0C" opacity="0.45" filter="url(#ui-soft)"/>
`, '', 'ui');

// 道具图标（3D 风格）
UI.icon_undo = uiSvg(96, 96, `
  <circle cx="48" cy="48" r="40" fill="url(#ui-ic-bg)" stroke="#3E5A34" stroke-width="3"/>
  <path d="M28 44 L52 20 M28 44 L52 68 M28 44 H74 C84 44 90 52 90 62" fill="none" stroke="#FFF6E4" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M30 40 L52 18" stroke="#FFFFFF" stroke-width="3" opacity="0.45" stroke-linecap="round"/>
`, `${lin('ui', 'ic-bg', [[0, '#C4E0B0'], [0.5, '#9CB98F'], [1, '#6E8F62']])}`, 'ui');

UI.icon_shuffle = uiSvg(96, 96, `
  <circle cx="48" cy="48" r="40" fill="url(#ui-ic-bg)" stroke="#3E5A34" stroke-width="3"/>
  <path d="M16 32 H34 C54 32 58 64 78 64 H86 M78 64 l-9 -9 M78 64 l-9 9 M16 64 H34 C44 64 50 54 56 46 M86 32 H78 C72 32 68 36 64 42 M86 32 l-9 -9 M86 32 l-9 9" fill="none" stroke="#FFF6E4" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
`, `${lin('ui', 'ic-bg', [[0, '#C4E0B0'], [0.5, '#9CB98F'], [1, '#6E8F62']])}`, 'ui');

UI.icon_remove = uiSvg(96, 96, `
  <circle cx="48" cy="48" r="40" fill="url(#ui-ic-red)" stroke="#8A2A20" stroke-width="3"/>
  <path d="M32 32 L64 64 M64 32 L32 64" stroke="#FFF6E4" stroke-width="11" stroke-linecap="round"/>
  <path d="M34 30 L62 58" stroke="#FFFFFF" stroke-width="3" opacity="0.4" stroke-linecap="round"/>
`, `${lin('ui', 'ic-red', [[0, '#FF9A88'], [0.5, '#E8584A'], [1, '#A82A22']])}`, 'ui');

UI.icon_slot = uiSvg(96, 96, `
  <circle cx="48" cy="48" r="40" fill="url(#ui-ic-blue)" stroke="#3E6E88" stroke-width="3"/>
  <rect x="24" y="24" width="48" height="48" rx="10" fill="none" stroke="#FFF6E4" stroke-width="7"/>
  <path d="M48 32 v22 M48 32 l-8 8 M48 32 l8 8" stroke="#FFF6E4" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
`, `${lin('ui', 'ic-blue', [[0, '#BFE3F2'], [0.5, '#8FC7E8'], [1, '#4E86A8']])}`, 'ui');

// 游戏场景：桌面容器（棋盘底板）
UI.table = uiSvg(750, 940, `
  <rect x="0" y="0" width="750" height="940" fill="url(#ui-table)"/>
  <rect x="0" y="0" width="750" height="940" fill="url(#ui-table-vig)"/>
  <g opacity="0.18" stroke="#8A6438" stroke-width="2">
    <path d="M0 180 C180 160 300 200 470 176 C600 158 690 180 750 168"/>
    <path d="M0 420 C160 400 320 440 500 416 C630 398 700 420 750 408"/>
    <path d="M0 700 C200 680 340 720 520 696 C650 678 700 700 750 688"/>
  </g>
`, `${lin('ui', 'table', [[0, '#FBF1DE'], [0.5, '#F5E7CE'], [1, '#E8D3B0']])}
    <radialGradient id="ui-table-vig" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#8A6438" stop-opacity="0.22"/>
    </radialGradient>`, 'ui');

// 宝箱（2.5D）
UI.chest_closed = uiSvg(200, 200, `
  <ellipse cx="100" cy="184" rx="62" ry="11" fill="#2A1A0C" opacity="0.28" filter="url(#ui-soft)"/>
  <path d="M40 96 C40 66 66 50 100 50 C134 50 160 66 160 96 L160 108 L40 108 Z" fill="url(#ui-chest-lid)" stroke="#5A3A18" stroke-width="4"/>
  <path d="M40 96 C40 66 66 50 100 50 C134 50 160 66 160 96" fill="none" stroke="#FFE0A8" stroke-width="4" opacity="0.45" stroke-linecap="round"/>
  <rect x="38" y="104" width="124" height="70" rx="9" fill="url(#ui-chest-body)" stroke="#5A3A18" stroke-width="4"/>
  <rect x="38" y="98" width="124" height="15" fill="url(#ui-chest-band)" stroke="#5A3A18" stroke-width="3"/>
  <rect x="38" y="126" width="124" height="10" fill="url(#ui-chest-band)" opacity="0.85"/>
  <rect x="38" y="104" width="124" height="22" rx="8" fill="#FFFFFF" opacity="0.18"/>
  <rect x="86" y="110" width="28" height="34" rx="7" fill="url(#ui-chest-lock)" stroke="#8A5A10" stroke-width="3"/>
  <circle cx="100" cy="122" r="5" fill="#7C4A2A"/>
  <path d="M100 127 v8" stroke="#7C4A2A" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M50 112 v56 M150 112 v56" stroke="#8A5A2A" stroke-width="3" opacity="0.55"/>
`, `${lin('ui', 'chest-lid', [[0, '#E8B878'], [0.5, '#C8783A'], [1, '#9A5420']])}
    ${lin('ui', 'chest-body', [[0, '#D89A5C'], [0.45, '#B06A2E'], [1, '#7C4418']])}
    ${lin('ui', 'chest-band', [[0, '#FFE9A8'], [0.45, '#F5C542'], [1, '#C8982A']])}
    ${lin('ui', 'chest-lock', [[0, '#FFF3C4'], [0.5, '#F5C542'], [1, '#C8982A']])}`, 'ui');

UI.chest_open = uiSvg(200, 200, `
  <circle cx="100" cy="88" r="82" fill="url(#ui-chest-ray)"/>
  <ellipse cx="100" cy="184" rx="62" ry="11" fill="#2A1A0C" opacity="0.26" filter="url(#ui-soft)"/>
  <g transform="rotate(-22 100 62)">
    <path d="M42 84 C42 56 68 40 100 40 C132 40 158 56 158 84 L158 96 L42 96 Z" fill="url(#ui-chest-lid)" stroke="#5A3A18" stroke-width="4"/>
    <path d="M42 84 C42 56 68 40 100 40 C132 40 158 56 158 84" fill="none" stroke="#FFE9C0" stroke-width="4" opacity="0.5" stroke-linecap="round"/>
  </g>
  <rect x="38" y="100" width="124" height="76" rx="9" fill="url(#ui-chest-body)" stroke="#5A3A18" stroke-width="4"/>
  <rect x="38" y="94" width="124" height="15" fill="url(#ui-chest-band)" stroke="#5A3A18" stroke-width="3"/>
  <rect x="38" y="100" width="124" height="20" rx="8" fill="#FFFFFF" opacity="0.2"/>
  <rect x="86" y="106" width="28" height="30" rx="7" fill="url(#ui-chest-lock)" stroke="#8A5A10" stroke-width="3"/>
  <circle cx="100" cy="118" r="5" fill="#7C4A2A"/>
  <g fill="#FFF3C4" opacity="0.95"><circle cx="70" cy="64" r="4"/><circle cx="132" cy="54" r="5"/><circle cx="104" cy="34" r="3.4"/><circle cx="150" cy="84" r="3"/></g>
`, `${lin('ui', 'chest-lid', [[0, '#E8B878'], [0.5, '#C8783A'], [1, '#9A5420']])}
    ${lin('ui', 'chest-body', [[0, '#D89A5C'], [0.45, '#B06A2E'], [1, '#7C4418']])}
    ${lin('ui', 'chest-band', [[0, '#FFE9A8'], [0.45, '#F5C542'], [1, '#C8982A']])}
    ${lin('ui', 'chest-lock', [[0, '#FFF3C4'], [0.5, '#F5C542'], [1, '#C8982A']])}
    <radialGradient id="ui-chest-ray" cx="0.5" cy="0.44" r="0.5">
      <stop offset="0" stop-color="#FFF6D0" stop-opacity="0.95"/>
      <stop offset="0.45" stop-color="#F7DE8C" stop-opacity="0.4"/>
      <stop offset="1" stop-color="#F7DE8C" stop-opacity="0"/>
    </radialGradient>`, 'ui');

// 写入
let itemCount = 0;
for (const [id, svgStr] of Object.entries(items)) {
  const resvg = new Resvg(svgStr, { fitTo: { mode: 'width', value: 240 } });
  fs.writeFileSync(path.join(ITEM_DIR, `${id}.png`), resvg.render().asPng());
  itemCount++;
}
console.log(`items rendered: ${itemCount}`);

for (const [name, svgStr] of Object.entries(UI)) {
  const m = svgStr.match(/viewBox="0 0 (\d+) (\d+)"/);
  const designW = m ? Number(m[1]) : 400;
  const outW = Math.round(designW * 1.5);
  const resvg = new Resvg(svgStr, { fitTo: { mode: 'width', value: outW } });
  fs.writeFileSync(path.join(UI_DIR, `${name}.png`), resvg.render().asPng());
  console.log('ui:', name, outW);
}
console.log('2.5D ART DONE');
