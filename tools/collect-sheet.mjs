import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const DIR = 'F:/Game3.0/assets/resources/textures/collect';
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).sort();

const groups = {};
for (const f of files) {
  const k = f.replace(/_\d+\.png$/, '');
  (groups[k] ||= []).push(f);
}

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#fff;font-family:"Microsoft YaHei",sans-serif}
.row{padding:8px 10px}
h2{font-size:16px;margin:4px 0;color:#333}
.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:6px}
.cell{text-align:center}
.cell img{width:80px;height:80px;display:block;margin:0 auto;background:#fafafa;border:1px solid #eee}
.cell span{font-size:11px;color:#666}
</style></head><body>
${Object.entries(groups)
  .map(
    ([k, arr]) => `<div class="row"><h2>${k} (${arr.length})</h2><div class="grid">${arr
      .map(
        (f) =>
          `<div class="cell"><img src="file:///${DIR}/${f}"><span>${f.replace('.png', '')}</span></div>`,
      )
      .join('')}</div></div>`,
  )
  .join('')}
</body></html>`;

fs.writeFileSync('C:/Users/25370/AppData/Local/Temp/collect-sheet.html', html);

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-first-run', '--disable-gpu', '--allow-file-access-from-files'],
  defaultViewport: { width: 1180, height: 700, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto('file:///C:/Users/25370/AppData/Local/Temp/collect-sheet.html', {
  waitUntil: 'networkidle0',
});
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: 'C:/Users/25370/AppData/Local/Temp/collect-sheet.png', fullPage: true });
await browser.close();
console.log('done', files.length);
