/**
 * 收藏品与收藏系统素材生成器（SVG -> PNG）。
 * 48 件收藏品（4 系列 × 12）+ 宝箱 / 稀有度框 / 碎片 / 收藏册图标等。
 * 统一规范：200x200 视口、左上光源、圆角轮廓、柔和阴影。
 */
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COLLECT_DIR = path.join(__dirname, '..', 'assets', 'resources', 'textures', 'collect');
const UI_DIR = path.join(__dirname, '..', 'assets', 'resources', 'textures', 'ui');
fs.mkdirSync(COLLECT_DIR, { recursive: true });
fs.mkdirSync(UI_DIR, { recursive: true });

const O = '#5A4A3A';

function wrap(body, size = 200) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size * 2}" height="${size * 2}">
  <defs>
    <linearGradient id="hl" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.34" cy="0.28" r="0.75">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="0.65" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="100" cy="182" rx="52" ry="9" fill="#3A2E20" opacity="0.13"/>
  ${body}
  </svg>`;
}

function render(name, svg, dir = COLLECT_DIR, w = 200) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: w } });
  fs.writeFileSync(path.join(dir, `${name}.png`), resvg.render().asPng());
}

// ---------------- 甜品系列 ----------------
const dessert = [
  // 1 草莓奶油蛋糕（切块）
  `<path d="M46 156 L100 52 L154 156 Z" fill="#F7E8C8" stroke="${O}" stroke-width="4"/>
   <path d="M46 156 L100 52 L154 156 Z" fill="url(#hl)"/>
   <path d="M64 118 L136 118" stroke="#F4A0B4" stroke-width="9" stroke-linecap="round"/>
   <path d="M54 142 L146 142" stroke="#E8584A" stroke-width="7" stroke-linecap="round"/>
   <circle cx="100" cy="58" r="12" fill="#E8584A" stroke="${O}" stroke-width="3"/>
   <path d="M100 44 C100 36 104 30 110 26" fill="none" stroke="#5A7A4A" stroke-width="4" stroke-linecap="round"/>`,
  // 2 焦糖布丁
  `<path d="M56 108 C56 148 74 168 100 168 C126 168 144 148 144 108 Z" fill="#F7DE8C" stroke="${O}" stroke-width="4"/>
   <path d="M56 108 C56 96 74 88 100 88 C126 88 144 96 144 108 C144 120 126 128 100 128 C74 128 56 120 56 108 Z" fill="#C8783A" stroke="${O}" stroke-width="3.5"/>
   <ellipse cx="80" cy="146" rx="9" ry="14" fill="url(#hl)"/>
   <circle cx="100" cy="80" r="7" fill="#FDF6EC" opacity="0.9"/>`,
  // 3 彩虹甜甜圈
  `<circle cx="100" cy="110" r="60" fill="#E8A85C" stroke="${O}" stroke-width="4"/>
   <path d="M44 104 C62 84 86 82 100 96 C114 82 140 84 156 104 C164 124 146 134 134 126 C126 140 110 144 100 132 C88 146 68 140 62 126 C50 134 36 124 44 104 Z" fill="#F4A0B4" stroke="${O}" stroke-width="4"/>
   <circle cx="100" cy="112" r="16" fill="#FDF6EC" stroke="${O}" stroke-width="4"/>
   <g stroke-linecap="round" stroke-width="5"><path d="M72 96 l8 6" stroke="#8FC7E8"/><path d="M118 92 l10 4" stroke="#F7DE8C"/><path d="M66 124 l9 5" stroke="#FDF6EC"/><path d="M134 118 l9 5" stroke="#8FC7E8"/></g>`,
  // 4 巧克力曲奇
  `<circle cx="100" cy="110" r="60" fill="#E0A860" stroke="${O}" stroke-width="4"/>
   <circle cx="100" cy="110" r="60" fill="url(#sheen)"/>
   <g fill="#7C4A2A" stroke="${O}" stroke-width="2.5"><circle cx="78" cy="92" r="9"/><circle cx="120" cy="88" r="8"/><circle cx="140" cy="118" r="8"/><circle cx="86" cy="130" r="9"/><circle cx="112" cy="126" r="7"/><circle cx="64" cy="112" r="6"/></g>`,
  // 5 香草冰淇淋
  `<path d="M70 110 L100 178 L130 110 Z" fill="#E8B878" stroke="${O}" stroke-width="4"/>
   <path d="M78 124 L122 124 M84 140 L116 140" stroke="#C08A48" stroke-width="3"/>
   <circle cx="78" cy="98" r="25" fill="#FDF6EC" stroke="${O}" stroke-width="4"/>
   <circle cx="122" cy="98" r="25" fill="#F7E8C8" stroke="${O}" stroke-width="4"/>
   <circle cx="100" cy="74" r="26" fill="#FDF6EC" stroke="${O}" stroke-width="4"/>
   <path d="M100 48 C100 40 104 34 110 30" fill="none" stroke="#7C5A3A" stroke-width="4" stroke-linecap="round"/>`,
  // 6 蜂蜜华夫饼
  `<path d="M52 78 L148 78 L148 152 L52 152 Z" rx="10" fill="#E8B45C" stroke="${O}" stroke-width="4" transform="rotate(-6 100 115)"/>
   <g stroke="#C08A38" stroke-width="4" transform="rotate(-6 100 115)"><path d="M84 80 L84 150 M116 80 L116 150 M54 100 L146 100 M54 128 L146 128"/></g>
   <path d="M70 74 C86 62 118 62 134 74" fill="none" stroke="#F5C542" stroke-width="9" stroke-linecap="round"/>`,
  // 7 蓝莓慕斯
  `<path d="M60 96 L140 96 L132 162 C131 170 122 174 112 174 L88 174 C78 174 69 170 68 162 Z" fill="#C9B6E4" stroke="${O}" stroke-width="4"/>
   <ellipse cx="100" cy="96" rx="40" ry="11" fill="#FDF6EC" stroke="${O}" stroke-width="3.5"/>
   <g fill="#5C6BC0" stroke="${O}" stroke-width="2"><circle cx="82" cy="86" r="8"/><circle cx="100" cy="82" r="8"/><circle cx="118" cy="86" r="8"/></g>
   <path d="M74 120 q26 10 52 0" fill="none" stroke="#FDF6EC" stroke-width="4" opacity="0.7"/>`,
  // 8 抹茶马卡龙
  `<path d="M42 92 C42 70 68 58 100 58 C132 58 158 70 158 92 C158 102 146 108 100 108 C54 108 42 102 42 92 Z" fill="#9CB98F" stroke="${O}" stroke-width="4"/>
   <rect x="48" y="106" width="104" height="20" rx="10" fill="#F7E8C8" stroke="${O}" stroke-width="3.5"/>
   <path d="M42 138 C42 160 68 172 100 172 C132 172 158 160 158 138 C158 128 146 122 100 122 C54 122 42 128 42 138 Z" fill="#9CB98F" stroke="${O}" stroke-width="4"/>`,
  // 9 奶油泡芙
  `<circle cx="100" cy="112" r="52" fill="#E8B878" stroke="${O}" stroke-width="4"/>
   <path d="M56 96 C70 76 130 76 144 96 C130 108 70 108 56 96 Z" fill="#FDF6EC" stroke="${O}" stroke-width="3.5"/>
   <circle cx="100" cy="70" r="10" fill="#FDF6EC" stroke="${O}" stroke-width="3"/>
   <path d="M74 130 q26 12 52 0" fill="none" stroke="#C08A48" stroke-width="3.5" opacity="0.7"/>`,
  // 10 水果塔
  `<path d="M50 104 L150 104 L138 166 C136 172 128 176 118 176 L82 176 C72 176 64 172 62 166 Z" fill="#E8B45C" stroke="${O}" stroke-width="4"/>
   <ellipse cx="100" cy="102" rx="50" ry="14" fill="#F7E8C8" stroke="${O}" stroke-width="3.5"/>
   <g stroke="${O}" stroke-width="2.5"><circle cx="78" cy="94" r="11" fill="#E8584A"/><circle cx="106" cy="90" r="10" fill="#F59E42"/><circle cx="130" cy="96" r="9" fill="#9CB98F"/></g>
   <path d="M100 78 C100 70 104 66 110 62" fill="none" stroke="#5A7A4A" stroke-width="3.5" stroke-linecap="round"/>`,
  // 11 肉桂卷
  `<circle cx="100" cy="112" r="58" fill="#D89A5C" stroke="${O}" stroke-width="4"/>
   <path d="M100 112 m-36 0 a36 36 0 1 1 72 0 a30 30 0 1 1 -60 0 a24 24 0 1 1 48 0 a18 18 0 1 1 -36 0 a12 12 0 1 1 24 0" fill="none" stroke="#A8683A" stroke-width="7"/>
   <path d="M68 88 C84 76 116 76 132 88" fill="none" stroke="#FDF6EC" stroke-width="8" stroke-linecap="round"/>`,
  // 12 星愿蛋糕（传说）
  `<path d="M50 108 L150 108 L150 164 C150 172 142 176 132 176 L68 176 C58 176 50 172 50 164 Z" fill="#F4A0B4" stroke="${O}" stroke-width="4"/>
   <rect x="50" y="100" width="100" height="22" rx="11" fill="#FDF6EC" stroke="${O}" stroke-width="4"/>
   <path d="M70 96 C70 76 84 62 100 62 C116 62 130 76 130 96" fill="#F7DE8C" stroke="${O}" stroke-width="3.5"/>
   <path d="M100 30 l6.5 14 15 1.8 -11 10.4 2.6 15 -13.1 -7 -13.1 7 2.6 -15 -11 -10.4 15 -1.8 Z" fill="#F5C542" stroke="#C8982A" stroke-width="2.5"/>
   <g fill="#FFFFFF"><circle cx="72" cy="140" r="3"/><circle cx="100" cy="150" r="3"/><circle cx="128" cy="140" r="3"/></g>`,
];

// ---------------- 萌宠系列 ----------------
const pet = [
  // 1 橘猫
  `<ellipse cx="100" cy="122" rx="52" ry="46" fill="#F2A94E" stroke="${O}" stroke-width="4"/>
   <path d="M62 84 L54 44 L92 70 Z M138 84 L146 44 L108 70 Z" fill="#F2A94E" stroke="${O}" stroke-width="4"/>
   <ellipse cx="82" cy="116" rx="7" ry="9" fill="#3A3020"/><ellipse cx="118" cy="116" rx="7" ry="9" fill="#3A3020"/>
   <path d="M96 130 l4 6 4 -6" fill="#E8705F"/><path d="M100 136 q-10 10 -20 2 M100 136 q10 10 20 2" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
   <path d="M56 118 h-18 M56 128 h-16 M144 118 h18 M144 128 h16" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/>`,
  // 2 柴犬
  `<ellipse cx="100" cy="124" rx="52" ry="44" fill="#E8B45C" stroke="${O}" stroke-width="4"/>
   <path d="M66 86 L58 48 L94 72 Z M134 86 L142 48 L106 72 Z" fill="#E8B45C" stroke="${O}" stroke-width="4"/>
   <ellipse cx="100" cy="140" rx="30" ry="22" fill="#FDF6EC" stroke="${O}" stroke-width="3"/>
   <circle cx="82" cy="112" r="6" fill="#3A3020"/><circle cx="118" cy="112" r="6" fill="#3A3020"/>
   <ellipse cx="100" cy="130" rx="6" ry="4.5" fill="#3A3020"/>
   <path d="M100 136 q-8 9 -16 3 M100 136 q8 9 16 3" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`,
  // 3 雪球兔
  `<ellipse cx="100" cy="126" rx="46" ry="44" fill="#FDF6EC" stroke="${O}" stroke-width="4"/>
   <ellipse cx="78" cy="56" rx="14" ry="34" fill="#FDF6EC" stroke="${O}" stroke-width="4" transform="rotate(-8 78 56)"/>
   <ellipse cx="122" cy="56" rx="14" ry="34" fill="#FDF6EC" stroke="${O}" stroke-width="4" transform="rotate(8 122 56)"/>
   <circle cx="82" cy="120" r="6" fill="#3A3020"/><circle cx="118" cy="120" r="6" fill="#3A3020"/>
   <path d="M100 132 l5 5 5 -5" fill="#F4A0B4"/><circle cx="70" cy="134" r="7" fill="#F4C2C2" opacity="0.8"/><circle cx="130" cy="134" r="7" fill="#F4C2C2" opacity="0.8"/>`,
  // 4 仓鼠
  `<circle cx="100" cy="120" r="50" fill="#E8C79A" stroke="${O}" stroke-width="4"/>
   <circle cx="64" cy="76" r="16" fill="#E8C79A" stroke="${O}" stroke-width="4"/><circle cx="136" cy="76" r="16" fill="#E8C79A" stroke="${O}" stroke-width="4"/>
   <ellipse cx="100" cy="136" rx="34" ry="26" fill="#FDF6EC" stroke="${O}" stroke-width="3"/>
   <circle cx="82" cy="108" r="6" fill="#3A3020"/><circle cx="118" cy="108" r="6" fill="#3A3020"/>
   <circle cx="100" cy="126" r="5" fill="#3A3020"/>
   <path d="M86 138 q14 8 28 0" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`,
  // 5 小狐狸
  `<path d="M100 60 L58 92 L66 152 C80 172 120 172 134 152 L142 92 Z" fill="#E8705F" stroke="${O}" stroke-width="4"/>
   <path d="M58 92 L44 46 L86 74 Z M142 92 L156 46 L114 74 Z" fill="#E8705F" stroke="${O}" stroke-width="4"/>
   <path d="M100 96 C86 108 78 128 84 148 C92 164 108 164 116 148 C122 128 114 108 100 96 Z" fill="#FDF6EC" stroke="${O}" stroke-width="3"/>
   <circle cx="82" cy="110" r="6" fill="#3A3020"/><circle cx="118" cy="110" r="6" fill="#3A3020"/>
   <ellipse cx="100" cy="150" rx="6" ry="4" fill="#3A3020"/>`,
  // 6 熊猫
  `<circle cx="100" cy="122" r="50" fill="#FDF6EC" stroke="${O}" stroke-width="4"/>
   <circle cx="62" cy="78" r="17" fill="#3A3020" stroke="${O}" stroke-width="3"/><circle cx="138" cy="78" r="17" fill="#3A3020" stroke="${O}" stroke-width="3"/>
   <ellipse cx="80" cy="112" rx="14" ry="16" fill="#3A3020" transform="rotate(-12 80 112)"/>
   <ellipse cx="120" cy="112" rx="14" ry="16" fill="#3A3020" transform="rotate(12 120 112)"/>
   <circle cx="82" cy="112" r="5" fill="#FFFFFF"/><circle cx="118" cy="112" r="5" fill="#FFFFFF"/>
   <ellipse cx="100" cy="132" rx="7" ry="5" fill="#3A3020"/>
   <path d="M88 146 q12 8 24 0" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`,
  // 7 企鹅
  `<ellipse cx="100" cy="120" rx="48" ry="52" fill="#4A5568" stroke="${O}" stroke-width="4"/>
   <ellipse cx="100" cy="132" rx="32" ry="38" fill="#FDF6EC" stroke="${O}" stroke-width="3"/>
   <circle cx="84" cy="100" r="6" fill="#FDF6EC"/><circle cx="116" cy="100" r="6" fill="#FDF6EC"/>
   <path d="M100 108 l10 8 -10 8 -10 -8 Z" fill="#F59E42" stroke="${O}" stroke-width="2.5"/>
   <path d="M64 168 q10 6 18 2 M136 168 q-10 6 -18 2" stroke="#F59E42" stroke-width="6" stroke-linecap="round"/>`,
  // 8 考拉
  `<circle cx="100" cy="122" r="48" fill="#B8C4CC" stroke="${O}" stroke-width="4"/>
   <circle cx="58" cy="82" r="24" fill="#B8C4CC" stroke="${O}" stroke-width="4"/><circle cx="142" cy="82" r="24" fill="#B8C4CC" stroke="${O}" stroke-width="4"/>
   <circle cx="58" cy="82" r="12" fill="#F4C2C2"/><circle cx="142" cy="82" r="12" fill="#F4C2C2"/>
   <ellipse cx="100" cy="132" rx="16" ry="20" fill="#4A4036"/>
   <circle cx="82" cy="110" r="6" fill="#3A3020"/><circle cx="118" cy="110" r="6" fill="#3A3020"/>
   <path d="M92 148 q8 6 16 0" fill="none" stroke="#FDF6EC" stroke-width="3" stroke-linecap="round"/>`,
  // 9 粉红小猪
  `<circle cx="100" cy="122" r="50" fill="#F4A0B4" stroke="${O}" stroke-width="4"/>
   <path d="M56 78 L44 48 L84 68 Z M144 78 L156 48 L116 68 Z" fill="#F4A0B4" stroke="${O}" stroke-width="4"/>
   <ellipse cx="100" cy="134" rx="24" ry="18" fill="#F7B8C8" stroke="${O}" stroke-width="3"/>
   <circle cx="92" cy="132" r="4" fill="#B85E6A"/><circle cx="108" cy="132" r="4" fill="#B85E6A"/>
   <circle cx="80" cy="108" r="6" fill="#3A3020"/><circle cx="120" cy="108" r="6" fill="#3A3020"/>`,
  // 10 刺猬
  `<path d="M52 132 C52 96 72 68 100 68 C128 68 148 96 148 132 C148 158 128 172 100 172 C72 172 52 158 52 132 Z" fill="#A8834E" stroke="${O}" stroke-width="4"/>
   <g stroke="${O}" stroke-width="3" stroke-linecap="round" fill="none">
     <path d="M64 104 l-10 -12 M76 90 l-6 -14 M92 82 l-2 -16 M108 82 l2 -16 M124 90 l6 -14 M136 104 l10 -12"/>
   </g>
   <ellipse cx="100" cy="140" rx="26" ry="22" fill="#F2D3A8" stroke="${O}" stroke-width="3"/>
   <circle cx="90" cy="136" r="4.5" fill="#3A3020"/><circle cx="110" cy="136" r="4.5" fill="#3A3020"/>
   <circle cx="100" cy="148" r="5" fill="#3A3020"/>`,
  // 11 小恐龙
  `<path d="M56 138 C56 100 74 74 100 74 C126 74 144 100 144 138 C144 160 126 174 100 174 C74 174 56 160 56 138 Z" fill="#8FC7A8" stroke="${O}" stroke-width="4"/>
   <path d="M100 74 C100 74 92 52 104 40 C116 52 108 74 108 74" fill="#9CB98F" stroke="${O}" stroke-width="3.5"/>
   <g fill="#9CB98F" stroke="${O}" stroke-width="2.5"><circle cx="72" cy="106" r="7"/><circle cx="128" cy="106" r="7"/><circle cx="66" cy="132" r="6"/><circle cx="134" cy="132" r="6"/></g>
   <circle cx="86" cy="120" r="6" fill="#3A3020"/><circle cx="114" cy="120" r="6" fill="#3A3020"/>
   <path d="M88 146 q12 10 24 0" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`,
  // 12 月光独角兽（传说）
  `<ellipse cx="100" cy="130" rx="46" ry="44" fill="#FDF6EC" stroke="${O}" stroke-width="4"/>
   <path d="M100 52 L110 82 L96 82 Z" fill="#F5C542" stroke="#C8982A" stroke-width="3"/>
   <path d="M64 92 C54 76 56 58 68 52 C74 66 74 80 64 92 Z" fill="#F4A0B4" stroke="${O}" stroke-width="3"/>
   <path d="M100 88 C86 74 82 56 92 44 C100 56 104 74 100 88 Z" fill="#8FC7E8" stroke="${O}" stroke-width="3"/>
   <path d="M136 92 C146 76 144 58 132 52 C126 66 126 80 136 92 Z" fill="#C9B6E4" stroke="${O}" stroke-width="3"/>
   <circle cx="82" cy="120" r="6" fill="#3A3020"/><circle cx="118" cy="120" r="6" fill="#3A3020"/>
   <ellipse cx="100" cy="142" rx="7" ry="5" fill="#F4A0B4"/>
   <g fill="#F5C542"><circle cx="58" cy="140" r="3"/><circle cx="146" cy="146" r="2.5"/><circle cx="132" cy="64" r="2.5"/></g>`,
];

// ---------------- 水果系列 ----------------
const fruit = [
  // 1 红苹果
  `<path d="M100 64 C130 42 168 60 168 102 C168 144 138 174 100 174 C62 174 32 144 32 102 C32 60 70 42 100 64 Z" fill="#E8584A" stroke="${O}" stroke-width="4"/>
   <path d="M100 64 C100 48 106 38 118 32" fill="none" stroke="#7C5A3A" stroke-width="7" stroke-linecap="round"/>
   <path d="M104 54 C118 36 142 36 150 48 C140 60 114 62 104 54 Z" fill="#7FA86A" stroke="${O}" stroke-width="3"/>
   <ellipse cx="72" cy="94" rx="13" ry="19" fill="url(#hl)" transform="rotate(-18 72 94)"/>`,
  // 2 香蕉船
  `<path d="M46 58 C40 112 70 162 138 166 C156 167 168 158 166 148 C120 148 84 120 74 62 C72 48 50 46 46 58 Z" fill="#F5C542" stroke="${O}" stroke-width="4"/>
   <path d="M46 58 C58 110 88 144 138 154" fill="none" stroke="#C98F2A" stroke-width="3" opacity="0.6"/>
   <path d="M160 144 C168 144 172 152 166 154 C158 156 154 146 160 144 Z" fill="#8A6A3A" stroke="${O}" stroke-width="2"/>`,
  // 3 奶油草莓
  `<path d="M100 172 C64 152 44 120 44 94 C44 68 68 54 100 54 C132 54 156 68 156 94 C156 120 136 152 100 172 Z" fill="#E8584A" stroke="${O}" stroke-width="4"/>
   <path d="M72 54 C84 42 116 42 128 54 C116 64 84 64 72 54 Z" fill="#7FA86A" stroke="${O}" stroke-width="3"/>
   <g fill="#F7DE8C"><circle cx="78" cy="98" r="4"/><circle cx="100" cy="90" r="4"/><circle cx="122" cy="98" r="4"/><circle cx="88" cy="122" r="4"/><circle cx="112" cy="122" r="4"/><circle cx="100" cy="148" r="4"/></g>`,
  // 4 紫葡萄串
  `<g stroke="${O}" stroke-width="3.5">
     <circle cx="78" cy="96" r="19" fill="#9A6BC4"/><circle cx="122" cy="96" r="19" fill="#9A6BC4"/>
     <circle cx="60" cy="122" r="19" fill="#8A55B4"/><circle cx="100" cy="122" r="19" fill="#8A55B4"/><circle cx="140" cy="122" r="19" fill="#8A55B4"/>
     <circle cx="80" cy="148" r="19" fill="#7A48A4"/><circle cx="120" cy="148" r="19" fill="#7A48A4"/>
   </g>
   <path d="M100 62 C100 48 106 40 116 34" fill="none" stroke="#7C5A3A" stroke-width="6" stroke-linecap="round"/>
   <path d="M104 50 C116 32 142 32 150 44 C140 56 114 58 104 50 Z" fill="#7FA86A" stroke="${O}" stroke-width="3"/>`,
  // 5 阳光橙子
  `<circle cx="100" cy="114" r="62" fill="#F59E42" stroke="${O}" stroke-width="4"/>
   <circle cx="100" cy="114" r="62" fill="url(#sheen)"/>
   <g fill="#D97F26"><circle cx="80" cy="102" r="2.5"/><circle cx="110" cy="94" r="2.5"/><circle cx="126" cy="114" r="2.5"/><circle cx="92" cy="128" r="2.5"/><circle cx="118" cy="136" r="2.5"/></g>
   <path d="M100 54 C100 44 106 36 116 32" fill="none" stroke="#7C5A3A" stroke-width="6" stroke-linecap="round"/>
   <path d="M104 46 C114 30 138 30 146 42 C136 52 112 54 104 46 Z" fill="#7FA86A" stroke="${O}" stroke-width="3"/>`,
  // 6 双生樱桃
  `<path d="M78 98 C74 68 88 48 110 38 M124 102 C126 74 118 54 110 38" fill="none" stroke="#7C5A3A" stroke-width="5" stroke-linecap="round"/>
   <path d="M104 42 C116 26 140 26 148 38 C138 48 112 50 104 42 Z" fill="#7FA86A" stroke="${O}" stroke-width="3"/>
   <circle cx="72" cy="128" r="30" fill="#E8584A" stroke="${O}" stroke-width="4"/>
   <circle cx="130" cy="132" r="30" fill="#D64838" stroke="${O}" stroke-width="4"/>
   <ellipse cx="62" cy="118" rx="8" ry="12" fill="url(#hl)"/><ellipse cx="120" cy="122" rx="8" ry="12" fill="url(#hl)"/>`,
  // 7 西瓜切片
  `<path d="M32 108 A68 68 0 0 0 168 108 Z" fill="#E8584A" stroke="${O}" stroke-width="4"/>
   <path d="M32 108 A68 68 0 0 0 168 108" fill="none" stroke="#7FA86A" stroke-width="12"/>
   <path d="M46 108 A54 54 0 0 0 154 108" fill="none" stroke="#FDF6EC" stroke-width="6" opacity="0.8"/>
   <g fill="#3A3020"><ellipse cx="86" cy="128" rx="4" ry="6" transform="rotate(-16 86 128)"/><ellipse cx="112" cy="122" rx="4" ry="6" transform="rotate(10 112 122)"/><ellipse cx="100" cy="146" rx="4" ry="6"/></g>`,
  // 8 菠萝皇冠
  `<path d="M62 96 C62 132 76 164 100 168 C124 164 138 132 138 96 Z" fill="#F5C542" stroke="${O}" stroke-width="4"/>
   <g stroke="#C8982A" stroke-width="3"><path d="M78 100 L86 160 M100 96 L100 164 M122 100 L114 160"/></g>
   <path d="M100 92 L84 50 L96 62 L100 40 L110 62 L124 50 Z" fill="#7FA86A" stroke="${O}" stroke-width="3.5"/>
   <g fill="#C8982A"><circle cx="80" cy="120" r="2.5"/><circle cx="118" cy="126" r="2.5"/></g>`,
  // 9 蜜桃
  `<path d="M100 64 C130 46 164 64 164 108 C164 146 134 172 100 172 C66 172 36 146 36 108 C36 64 70 46 100 64 Z" fill="#F7B8A8" stroke="${O}" stroke-width="4"/>
   <path d="M100 64 C92 88 92 132 100 172" fill="none" stroke="#E8907A" stroke-width="3.5" opacity="0.7"/>
   <path d="M100 62 C100 46 108 36 120 30" fill="none" stroke="#7C5A3A" stroke-width="6" stroke-linecap="round"/>
   <path d="M104 52 C118 34 142 34 150 46 C140 58 114 60 104 52 Z" fill="#7FA86A" stroke="${O}" stroke-width="3"/>`,
  // 10 蓝莓簇
  `<g stroke="${O}" stroke-width="3">
     <circle cx="80" cy="108" r="24" fill="#5C6BC0"/><circle cx="120" cy="104" r="22" fill="#4A5AB0"/>
     <circle cx="100" cy="132" r="24" fill="#5C6BC0"/><circle cx="68" cy="142" r="20" fill="#4A5AB0"/>
     <circle cx="132" cy="142" r="20" fill="#4A5AB0"/>
   </g>
   <g fill="#FDF6EC" opacity="0.55"><circle cx="72" cy="100" r="5"/><circle cx="112" cy="96" r="5"/><circle cx="92" cy="124" r="5"/></g>
   <path d="M100 80 C100 68 106 60 116 56" fill="none" stroke="#5A7A4A" stroke-width="4" stroke-linecap="round"/>`,
  // 11 柠檬半切
  `<circle cx="100" cy="112" r="58" fill="#F5C542" stroke="${O}" stroke-width="4"/>
   <circle cx="100" cy="112" r="44" fill="#FDF6EC" stroke="#C8982A" stroke-width="3"/>
   <g stroke="#E8B830" stroke-width="3.5" stroke-linecap="round">
     <path d="M100 112 L100 70 M100 112 L100 154 M100 112 L60 112 M100 112 L140 112"/>
     <path d="M100 112 L72 84 M100 112 L128 84 M100 112 L72 140 M100 112 L128 140"/>
   </g>
   <circle cx="100" cy="112" r="6" fill="#F5C542"/>`,
  // 12 火龙果之心（传说）
  `<ellipse cx="100" cy="116" rx="60" ry="56" fill="#E8588A" stroke="${O}" stroke-width="4"/>
   <ellipse cx="100" cy="116" rx="46" ry="42" fill="#FDF6EC" stroke="#C8486A" stroke-width="3"/>
   <g fill="#3A3020"><circle cx="86" cy="104" r="3.5"/><circle cx="108" cy="98" r="3.5"/><circle cx="120" cy="118" r="3.5"/><circle cx="94" cy="122" r="3.5"/><circle cx="104" cy="138" r="3.5"/><circle cx="78" cy="130" r="3.5"/></g>
   <path d="M52 96 C40 84 38 70 44 60 C58 66 66 80 52 96 Z M148 96 C160 84 162 70 156 60 C142 66 134 80 148 96 Z" fill="#7FA86A" stroke="${O}" stroke-width="3"/>`,
];

// ---------------- 梦幻小屋系列 ----------------
const house = [
  // 1 奶油小屋
  `<path d="M46 168 L46 104 L100 56 L154 104 L154 168 Z" fill="#FDF6EC" stroke="${O}" stroke-width="4"/>
   <path d="M38 106 L100 50 L162 106" fill="none" stroke="#E07B2A" stroke-width="14" stroke-linecap="round"/>
   <rect x="86" y="126" width="28" height="42" rx="4" fill="#E8B45C" stroke="${O}" stroke-width="3"/>
   <rect x="56" y="118" width="20" height="20" rx="3" fill="#8FC7E8" stroke="${O}" stroke-width="3"/>
   <rect x="124" y="118" width="20" height="20" rx="3" fill="#8FC7E8" stroke="${O}" stroke-width="3"/>
   <rect x="126" y="58" width="14" height="22" fill="#C8783A" stroke="${O}" stroke-width="3"/>`,
  // 2 圆窗阁楼
  `<path d="M40 170 L40 96 L100 44 L160 96 L160 170 Z" fill="#F7E8C8" stroke="${O}" stroke-width="4"/>
   <circle cx="100" cy="94" r="26" fill="#BFE3F2" stroke="${O}" stroke-width="4"/>
   <path d="M100 68 L100 120 M74 94 L126 94" stroke="${O}" stroke-width="3"/>
   <path d="M40 96 L100 44 L160 96" fill="none" stroke="#C8783A" stroke-width="12" stroke-linecap="round"/>
   <rect x="76" y="134" width="48" height="36" rx="4" fill="#E8B45C" stroke="${O}" stroke-width="3"/>`,
  // 3 木纹大门
  `<rect x="52" y="36" width="96" height="136" rx="12" fill="#C8783A" stroke="${O}" stroke-width="4"/>
   <rect x="66" y="50" width="68" height="54" rx="6" fill="#A8683A" stroke="${O}" stroke-width="3"/>
   <rect x="66" y="116" width="68" height="42" rx="6" fill="#A8683A" stroke="${O}" stroke-width="3"/>
   <circle cx="126" cy="112" r="7" fill="#F5C542" stroke="${O}" stroke-width="3"/>
   <path d="M66 104 h68" stroke="#7C4A2A" stroke-width="4"/>`,
  // 4 花园栅栏
  `<g stroke="${O}" stroke-width="4" fill="#FDF6EC">
     <path d="M36 100 L48 82 L60 100 L60 170 L36 170 Z"/>
     <path d="M70 100 L82 82 L94 100 L94 170 L70 170 Z"/>
     <path d="M104 100 L116 82 L128 100 L128 170 L104 170 Z"/>
     <path d="M138 100 L150 82 L162 100 L162 170 L138 170 Z"/>
   </g>
   <rect x="32" y="116" width="136" height="12" fill="#E8B45C" stroke="${O}" stroke-width="3"/>
   <rect x="32" y="146" width="136" height="12" fill="#E8B45C" stroke="${O}" stroke-width="3"/>
   <g fill="#F4A0B4" stroke="${O}" stroke-width="2"><circle cx="64" cy="106" r="7"/><circle cx="116" cy="106" r="7"/><circle cx="150" cy="106" r="7"/></g>`,
  // 5 门前秋千
  `<path d="M60 30 L60 62 M140 30 L140 62" stroke="#7C5A3A" stroke-width="7" stroke-linecap="round"/>
   <path d="M56 62 L144 62" stroke="#7C5A3A" stroke-width="9" stroke-linecap="round"/>
   <path d="M74 62 L74 126 M126 62 L126 126" stroke="#C8B8A0" stroke-width="4"/>
   <rect x="62" y="126" width="76" height="16" rx="8" fill="#E8B45C" stroke="${O}" stroke-width="4"/>
   <path d="M60 34 C40 24 34 40 44 52 C54 60 62 48 60 34 Z" fill="#7FA86A" stroke="${O}" stroke-width="3"/>`,
  // 6 红顶信箱
  `<rect x="82" y="108" width="16" height="66" fill="#C8B8A0" stroke="${O}" stroke-width="3"/>
   <rect x="50" y="62" width="100" height="50" rx="10" fill="#E8584A" stroke="${O}" stroke-width="4"/>
   <path d="M50 72 L100 44 L150 72" fill="#FDF6EC" stroke="${O}" stroke-width="3.5"/>
   <rect x="60" y="84" width="30" height="8" rx="4" fill="#7C4A2A"/>
   <circle cx="130" cy="88" r="7" fill="#F5C542" stroke="${O}" stroke-width="2.5"/>`,
  // 7 花园路灯
  `<rect x="94" y="80" width="12" height="94" rx="6" fill="#5A6A72" stroke="${O}" stroke-width="3"/>
   <path d="M70 80 L100 40 L130 80 Z" fill="#5A6A72" stroke="${O}" stroke-width="4"/>
   <rect x="80" y="80" width="40" height="40" rx="8" fill="#F7DE8C" stroke="${O}" stroke-width="4"/>
   <circle cx="100" cy="100" r="9" fill="#FFF3C4"/>
   <rect x="78" y="168" width="44" height="12" rx="6" fill="#5A6A72" stroke="${O}" stroke-width="3"/>`,
  // 8 窗台花坛
  `<rect x="34" y="96" width="132" height="60" rx="10" fill="#C8783A" stroke="${O}" stroke-width="4"/>
   <rect x="34" y="96" width="132" height="16" rx="8" fill="#A8683A" stroke="${O}" stroke-width="3"/>
   <g stroke="${O}" stroke-width="2.5">
     <circle cx="62" cy="88" r="11" fill="#F4A0B4"/><circle cx="94" cy="82" r="12" fill="#F5C542"/><circle cx="128" cy="88" r="11" fill="#C9B6E4"/>
   </g>
   <g stroke="#5A7A4A" stroke-width="4" stroke-linecap="round"><path d="M62 96 v-4 M94 94 v-6 M128 96 v-4"/></g>
   <rect x="44" y="120" width="112" height="24" rx="6" fill="#8A5A2A" opacity="0.5"/>`,
  // 9 小鸟屋
  `<path d="M100 34 L60 74 L140 74 Z" fill="#E8584A" stroke="${O}" stroke-width="4"/>
   <rect x="62" y="74" width="76" height="62" rx="6" fill="#F7E8C8" stroke="${O}" stroke-width="4"/>
   <circle cx="100" cy="100" r="14" fill="#7C4A2A" stroke="${O}" stroke-width="3"/>
   <rect x="94" y="116" width="12" height="8" rx="3" fill="#E8B45C" stroke="${O}" stroke-width="2.5"/>
   <path d="M100 136 L100 168" stroke="#7C5A3A" stroke-width="6" stroke-linecap="round"/>
   <path d="M100 150 C112 144 122 148 126 156" fill="none" stroke="#7FA86A" stroke-width="4" stroke-linecap="round"/>`,
  // 10 摇椅一角
  `<path d="M56 150 C56 118 72 92 100 84 C128 92 144 118 144 150" fill="none" stroke="#C8783A" stroke-width="12" stroke-linecap="round"/>
   <path d="M62 150 L138 150" stroke="#A8683A" stroke-width="10" stroke-linecap="round"/>
   <path d="M70 150 L58 176 M130 150 L142 176 M100 150 L100 176" stroke="#A8683A" stroke-width="8" stroke-linecap="round"/>
   <rect x="120" y="120" width="44" height="34" rx="6" fill="#FDF6EC" stroke="${O}" stroke-width="3"/>
   <path d="M130 120 q10 -14 22 0" fill="none" stroke="#E8705F" stroke-width="4" stroke-linecap="round"/>`,
  // 11 砖砌烟囱
  `<path d="M62 176 L62 60 L138 60 L138 176 Z" fill="#D87A5A" stroke="${O}" stroke-width="4"/>
   <g stroke="#B85E42" stroke-width="3"><path d="M62 84 h76 M62 108 h76 M62 132 h76 M62 156 h76"/><path d="M88 60 v24 M112 84 v24 M88 108 v24 M112 132 v24"/></g>
   <rect x="54" y="48" width="92" height="16" rx="6" fill="#A85A3A" stroke="${O}" stroke-width="3"/>
   <path d="M100 40 C88 26 104 18 96 6 M120 36 C112 24 126 18 120 8" fill="none" stroke="#C8C2B8" stroke-width="6" stroke-linecap="round" opacity="0.8"/>`,
  // 12 星灯小屋（传说）
  `<path d="M40 172 L40 100 L100 48 L160 100 L160 172 Z" fill="#FDF6EC" stroke="${O}" stroke-width="4"/>
   <path d="M32 102 L100 42 L168 102" fill="none" stroke="#8FC7E8" stroke-width="13" stroke-linecap="round"/>
   <rect x="84" y="128" width="32" height="44" rx="4" fill="#E8B45C" stroke="${O}" stroke-width="3"/>
   <rect x="52" y="116" width="24" height="24" rx="4" fill="#F7DE8C" stroke="${O}" stroke-width="3"/>
   <rect x="124" y="116" width="24" height="24" rx="4" fill="#F7DE8C" stroke="${O}" stroke-width="3"/>
   <g fill="#F5C542"><path d="M60 34 l3.4 7.4 8 .9 -5.9 5.6 1.4 8 -6.9 -3.7 -6.9 3.7 1.4 -8 -5.9 -5.6 8 -0.9 Z"/><path d="M136 28 l3 6.6 7.1 0.8 -5.2 5 1.2 7.1 -6.1 -3.3 -6.1 3.3 1.2 -7.1 -5.2 -5 7.1 -0.8 Z"/></g>`,
];

const seriesData = [
  { prefix: 'dessert', list: dessert },
  { prefix: 'pet', list: pet },
  { prefix: 'fruit', list: fruit },
  { prefix: 'house', list: house },
];

let count = 0;
for (const { prefix, list } of seriesData) {
  list.forEach((body, i) => {
    render(`${prefix}_${String(i + 1).padStart(2, '0')}`, wrap(body));
    count++;
  });
}
console.log(`collectibles rendered: ${count}`);

// ---------------- 收藏系统 UI 素材 ----------------
const UI = {
  // 宝箱（关闭）
  chest_closed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400">
    <ellipse cx="100" cy="182" rx="60" ry="10" fill="#3A2E20" opacity="0.16"/>
    <path d="M40 96 C40 68 66 52 100 52 C134 52 160 68 160 96 L160 108 L40 108 Z" fill="#C8783A" stroke="#5A4A3A" stroke-width="4"/>
    <rect x="38" y="106" width="124" height="66" rx="8" fill="#A8683A" stroke="#5A4A3A" stroke-width="4"/>
    <rect x="38" y="100" width="124" height="14" fill="#F5C542" stroke="#5A4A3A" stroke-width="3"/>
    <rect x="88" y="112" width="24" height="30" rx="6" fill="#F5C542" stroke="#5A4A3A" stroke-width="3"/>
    <circle cx="100" cy="124" r="5" fill="#7C4A2A"/>
    <path d="M52 112 v56 M148 112 v56" stroke="#8A5A2A" stroke-width="3" opacity="0.6"/>
    <rect x="46" y="60" width="108" height="16" rx="8" fill="#FFFFFF" opacity="0.18"/>
  </svg>`,
  // 宝箱（开启，带光）
  chest_open: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400">
    <defs>
      <radialGradient id="ray" cx="0.5" cy="0.4" r="0.5">
        <stop offset="0" stop-color="#FFF3C4" stop-opacity="0.95"/>
        <stop offset="0.55" stop-color="#F7DE8C" stop-opacity="0.35"/>
        <stop offset="1" stop-color="#F7DE8C" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="100" cy="86" r="78" fill="url(#ray)"/>
    <path d="M40 88 C40 60 66 44 100 44 C134 44 160 60 160 88 Z" fill="#C8783A" stroke="#5A4A3A" stroke-width="4" transform="rotate(-16 100 66) translate(-6 -22)"/>
    <rect x="38" y="98" width="124" height="74" rx="8" fill="#A8683A" stroke="#5A4A3A" stroke-width="4"/>
    <rect x="38" y="92" width="124" height="14" fill="#F5C542" stroke="#5A4A3A" stroke-width="3"/>
    <rect x="88" y="104" width="24" height="30" rx="6" fill="#F5C542" stroke="#5A4A3A" stroke-width="3"/>
    <g fill="#FFF3C4"><circle cx="70" cy="60" r="4"/><circle cx="132" cy="52" r="5"/><circle cx="100" cy="34" r="3.5"/><circle cx="150" cy="80" r="3"/></g>
  </svg>`,
  icon_fragment: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="192" height="192">
    <path d="M48 10 L78 32 L66 84 L30 84 L18 32 Z" fill="#9CC8E8" stroke="#4A4036" stroke-width="4"/>
    <path d="M48 10 L48 52 L18 32 Z" fill="#BFE0F5" stroke="#4A4036" stroke-width="3"/>
    <path d="M48 52 L78 32 L66 84 Z" fill="#7FB4DC" stroke="#4A4036" stroke-width="3"/>
    <path d="M48 52 L30 84" stroke="#4A4036" stroke-width="3"/>
  </svg>`,
  icon_book: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="192" height="192">
    <path d="M16 22 C16 18 20 16 26 16 L48 20 L48 82 L26 78 C20 78 16 76 16 72 Z" fill="#F4A0B4" stroke="#4A4036" stroke-width="4"/>
    <path d="M80 22 C80 18 76 16 70 16 L48 20 L48 82 L70 78 C76 78 80 76 80 72 Z" fill="#F7C8D4" stroke="#4A4036" stroke-width="4"/>
    <path d="M48 20 L48 82" stroke="#4A4036" stroke-width="4"/>
    <path d="M26 34 L42 36 M26 46 L42 48 M54 36 L70 34 M54 48 L70 46" stroke="#B85E6A" stroke-width="3" stroke-linecap="round"/>
  </svg>`,
  icon_star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="192" height="192">
    <path d="M48 8 l10.6 24 26 2.8 -19.6 18.4 5.4 25.8 -22.4 -12.8 -22.4 12.8 5.4 -25.8 -19.6 -18.4 26 -2.8 Z" fill="#F5C542" stroke="#C8982A" stroke-width="4"/>
    <path d="M48 22 l6 13.6 14.7 1.6 -11.1 10.4 3 14.6 -12.6 -7.2 -12.6 7.2 3 -14.6 -11.1 -10.4 14.7 -1.6 Z" fill="#FFE9A8" opacity="0.7"/>
  </svg>`,
  icon_task_clear: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="192" height="192">
    <rect x="18" y="18" width="60" height="60" rx="14" fill="#9CB98F" stroke="#4A4036" stroke-width="4"/>
    <path d="M32 50 l11 11 22 -24" fill="none" stroke="#FDF6EC" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  icon_task_booster: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="192" height="192">
    <circle cx="48" cy="48" r="32" fill="#8FC7E8" stroke="#4A4036" stroke-width="4"/>
    <path d="M48 26 L48 70 M26 48 L70 48" stroke="#FDF6EC" stroke-width="9" stroke-linecap="round"/>
  </svg>`,
  icon_task_collect: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="192" height="192">
    <rect x="16" y="30" width="64" height="46" rx="8" fill="#F4A0B4" stroke="#4A4036" stroke-width="4"/>
    <path d="M16 38 L48 58 L80 38" fill="none" stroke="#FDF6EC" stroke-width="5" stroke-linecap="round"/>
    <rect x="30" y="16" width="36" height="18" rx="5" fill="#F7C8D4" stroke="#4A4036" stroke-width="3"/>
  </svg>`,
  icon_task_combo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="192" height="192">
    <path d="M52 12 L28 54 L44 54 L38 84 L70 42 L52 42 Z" fill="#F5C542" stroke="#4A4036" stroke-width="4" stroke-linejoin="round"/>
  </svg>`,
  icon_theme: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="192" height="192">
    <circle cx="48" cy="48" r="30" fill="#C9B6E4" stroke="#4A4036" stroke-width="4"/>
    <path d="M48 24 C56 34 60 42 60 48 C60 60 54 68 48 72 C42 68 36 60 36 48 C36 42 40 34 48 24 Z" fill="#FDF6EC" opacity="0.85"/>
    <circle cx="74" cy="28" r="4" fill="#F5C542"/><circle cx="22" cy="66" r="3" fill="#F5C542"/>
  </svg>`,
  // 收藏册卡片底（圆角卡片 + 内高光）
  card_bg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="400" height="480">
    <rect x="4" y="8" width="192" height="228" rx="26" fill="#3A2E20" opacity="0.12"/>
    <rect x="2" y="2" width="192" height="228" rx="26" fill="#FFFDF8" stroke="#E8D9BE" stroke-width="4"/>
    <rect x="16" y="14" width="164" height="60" rx="18" fill="#FFFFFF" opacity="0.5"/>
  </svg>`,
  // 收藏册未解锁剪影底
  card_locked: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="400" height="480">
    <rect x="4" y="8" width="192" height="228" rx="26" fill="#3A2E20" opacity="0.1"/>
    <rect x="2" y="2" width="192" height="228" rx="26" fill="#EFE6D6" stroke="#DCCBB0" stroke-width="4"/>
    <text x="100" y="150" text-anchor="middle" font-size="64" fill="#C9B692" font-family="Arial">?</text>
  </svg>`,
  series_banner_dessert: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 120" width="1120" height="240">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F9D9E2"/><stop offset="1" stop-color="#F4A0B4"/></linearGradient></defs>
    <rect x="4" y="8" width="552" height="104" rx="30" fill="#3A2E20" opacity="0.12"/>
    <rect x="2" y="2" width="552" height="104" rx="30" fill="url(#g)" stroke="#D8788C" stroke-width="4"/>
  </svg>`,
  series_banner_pet: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 120" width="1120" height="240">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FBE7CB"/><stop offset="1" stop-color="#F2C48A"/></linearGradient></defs>
    <rect x="4" y="8" width="552" height="104" rx="30" fill="#3A2E20" opacity="0.12"/>
    <rect x="2" y="2" width="552" height="104" rx="30" fill="url(#g)" stroke="#D8A05C" stroke-width="4"/>
  </svg>`,
  series_banner_fruit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 120" width="1120" height="240">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#DCEBD2"/><stop offset="1" stop-color="#9CB98F"/></linearGradient></defs>
    <rect x="4" y="8" width="552" height="104" rx="30" fill="#3A2E20" opacity="0.12"/>
    <rect x="2" y="2" width="552" height="104" rx="30" fill="url(#g)" stroke="#7C9B70" stroke-width="4"/>
  </svg>`,
  series_banner_house: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 120" width="1120" height="240">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D6ECF7"/><stop offset="1" stop-color="#8FC7E8"/></linearGradient></defs>
    <rect x="4" y="8" width="552" height="104" rx="30" fill="#3A2E20" opacity="0.12"/>
    <rect x="2" y="2" width="552" height="104" rx="30" fill="url(#g)" stroke="#6AA8CC" stroke-width="4"/>
  </svg>`,
  // 稀有度边框（4）
  frame_common: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400"><rect x="3" y="3" width="194" height="194" rx="30" fill="none" stroke="#9C9184" stroke-width="6"/></svg>`,
  frame_rare: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400"><rect x="3" y="3" width="194" height="194" rx="30" fill="none" stroke="#4E9BD6" stroke-width="7"/><rect x="12" y="12" width="176" height="176" rx="24" fill="none" stroke="#8FC7E8" stroke-width="2" opacity="0.7"/></svg>`,
  frame_epic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400"><rect x="3" y="3" width="194" height="194" rx="30" fill="none" stroke="#A15FD3" stroke-width="7"/><rect x="12" y="12" width="176" height="176" rx="24" fill="none" stroke="#C9A0E8" stroke-width="3" opacity="0.8"/></svg>`,
  frame_legendary: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="400" height="400"><rect x="3" y="3" width="194" height="194" rx="30" fill="none" stroke="#E8A020" stroke-width="8"/><rect x="12" y="12" width="176" height="176" rx="24" fill="none" stroke="#FFE9A8" stroke-width="3" opacity="0.9"/></svg>`,
  // 开箱光柱
  light_ray: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="800" height="800">
    <defs><radialGradient id="r" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF8D8" stop-opacity="0.95"/><stop offset="0.4" stop-color="#F7DE8C" stop-opacity="0.45"/><stop offset="1" stop-color="#F7DE8C" stop-opacity="0"/></radialGradient></defs>
    <circle cx="200" cy="200" r="200" fill="url(#r)"/>
  </svg>`,
};

for (const [name, svg] of Object.entries(UI)) {
  render(name, svg, UI_DIR, 200);
  console.log('ui:', name);
}
console.log('COLLECT ART DONE');
