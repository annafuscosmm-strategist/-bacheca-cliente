import { chromium } from 'playwright';
const OUT = '/home/user/-bacheca-cliente/reel/lucianails02/build';
const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400&display=swap" rel="stylesheet">`;

const base = (body, extra='') => `<!doctype html><html><head><meta charset="utf-8">${fonts}
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:transparent}
.wrap{position:relative;width:1080px;height:1920px;font-family:'Jost',sans-serif;color:#fff}
.serif{font-family:'Cormorant Garamond',serif}
.rule{height:1px;background:rgba(255,255,255,.7);margin:24px auto;box-shadow:0 1px 6px rgba(0,0,0,.3)}
.sh{text-shadow:0 2px 26px rgba(0,0,0,.5),0 0 3px rgba(0,0,0,.4)}
${extra}
</style></head><body><div class="wrap">${body}</div></body></html>`;

// 1) INTRO TITLE — MAIUSCOLE
const title = base(`
<div style="position:absolute;left:0;right:0;top:0;height:1920px;
 background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.34) 44%,rgba(0,0,0,.34) 62%,rgba(0,0,0,0) 76%)"></div>
<div style="position:absolute;left:70px;right:70px;top:690px;text-align:center" class="sh">
  <div style="font-weight:300;font-size:30px;letter-spacing:12px;opacity:.9">✦</div>
  <div class="serif" style="font-weight:500;font-size:108px;line-height:1.02;letter-spacing:5px;margin-top:8px">LUCIA FUSCO</div>
  <div class="rule" style="width:120px"></div>
  <div style="font-weight:300;font-size:42px;letter-spacing:11px">ONICOTECNICA</div>
  <div style="font-weight:300;font-size:33px;letter-spacing:8px;margin-top:12px;opacity:.95">GIUGLIANO IN CAMPANIA</div>
</div>`);

// 2) HANDLE WATERMARK (subtle)
const mark = base(`
<div style="position:absolute;left:0;right:0;top:1500px;text-align:center">
  <div style="font-weight:300;font-size:30px;letter-spacing:5px;color:rgba(255,255,255,.92);
   text-shadow:0 2px 16px rgba(0,0,0,.55),0 0 2px rgba(0,0,0,.45)">@lucianails02</div>
</div>`);

// 3) OUTRO CARD — MAIUSCOLE
const outro = base(`
<div style="position:absolute;inset:0;background:rgba(0,0,0,.22)"></div>
<div style="position:absolute;inset:0;background:radial-gradient(135% 72% at 50% 44%,rgba(0,0,0,.64) 0%,rgba(0,0,0,.46) 40%,rgba(0,0,0,.18) 68%,rgba(0,0,0,0) 86%)"></div>
<div style="position:absolute;left:70px;right:70px;top:660px;text-align:center" class="sh">
  <div class="serif" style="font-weight:500;font-size:92px;line-height:1.02;letter-spacing:4px">LUCIA FUSCO</div>
  <div class="rule" style="width:130px"></div>
  <div style="font-weight:300;font-size:30px;letter-spacing:6px">ONICOTECNICA · GIUGLIANO IN CAMPANIA</div>
  <div class="serif" style="font-weight:500;font-size:60px;letter-spacing:2px;margin-top:26px">@lucianails02</div>
  <div style="margin-top:40px">
    <span style="display:inline-block;font-weight:400;font-size:32px;letter-spacing:5px;
     padding:20px 46px;border:1px solid rgba(255,255,255,.78);border-radius:999px;
     box-shadow:0 4px 24px rgba(0,0,0,.3)">PRENOTA IN DM</span>
  </div>
</div>`);

const pages = [['title.png', title], ['mark.png', mark], ['outro.png', outro]];
const browser = await chromium.launch({ args: ['--no-sandbox', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
for (const [name, html] of pages) {
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/${name}`, omitBackground: true });
  console.log('rendered', name);
}
await browser.close();
console.log('done');
