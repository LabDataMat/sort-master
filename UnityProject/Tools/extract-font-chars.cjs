/**
 * 从全部 C# 源码中提取实际使用的字符，生成字体子集。
 * 这样字体只包含界面真正出现的汉字，避免 8MB 全量字体进入 WebGL 包体。
 */
const fs = require('fs');
const path = require('path');

const ROOTS = ['Assets/Scripts', 'Assets/Tests'];
const chars = new Set();

// ASCII 可打印字符
for (let c = 0x20; c <= 0x7e; c++) chars.add(String.fromCharCode(c));

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name.endsWith('.cs')) scan(p);
  }
}

function scan(file) {
  const src = fs.readFileSync(file, 'utf8');
  for (const ch of src) {
    const code = ch.codePointAt(0);
    // CJK 统一表意文字、CJK 标点、全角字符、通用标点（…）、箭头（→）
    if ((code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0x3000 && code <= 0x303f) ||
        (code >= 0xff00 && code <= 0xffef) ||
        (code >= 0x2000 && code <= 0x206f) ||
        (code >= 0x2190 && code <= 0x21ff)) {
      chars.add(ch);
    }
  }
}

for (const r of ROOTS) if (fs.existsSync(r)) walk(r);

const sorted = [...chars].sort();
fs.writeFileSync('Tools/font-chars.txt', sorted.join(''), 'utf8');
console.log('字符数：' + sorted.length);
console.log('中文示例：' + sorted.filter((c) => c.codePointAt(0) > 0x4e00).slice(0, 40).join(''));
