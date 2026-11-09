import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = '/home/user/-bacheca-cliente/reel/lucianails02/build';
const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,300;1,400&family=Jost:wght@300;400&display=swap" rel="stylesheet">`;

const base = (body, extra='') => `<!doctype html><html><head><meta charset="utf-8">${fonts}
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:transparent}
.wrap{position:relative;width:1080px;height:1920px;font-family:'Jost',sans-serif;color:#fff}
.serif{font-family:'Cormorant Garamond',serif}
.rule{height:1px;background:rgba(255,255,255,.65);margin:26px auto;box-shadow:0 1px 6px rgba(0,0,0,.25)}
.shadow{text-shadow:0 2px 24px rgba(0,0,0,.45),0 0 3px rgba(0,0,0,.35)}
${extra}
</style></head><body><div class="wrap">${body}</div></body></html>`;

// 1) INTRO TITLE
const title = base(`
<div style="position:absolute;left:0;right:0;top:0;height:1920px;
 background:linear-gradient(180deg,rgba(0,0,0,0) 32%,rgba(0,0,0,.30) 46%,rgba(0,0,0,.30) 60%,rgba(0,0,0,0) 74%)"></div>
<div style="position:absolute;left:90px;right:90px;top:720px;text-align:center" class="shadow">
  <div style="font-weight:300;font-size:30px;letter-spacing:12px;opacity:.9">✦</div>
  <div class="serif" style="font-style:italic;font-weight:400;font-size:118px;line-height:1.02;margin-top:6px">onicotecnica</div>
  <div class="rule" style="width:110px"></div>
  <div style="font-weight:300;font-size:41px;letter-spacing:7px">a giugliano in campania</div>
</div>`);

// 2) HANDLE WATERMARK (subtle, middle section)
const mark = base(`
<div style="position:absolute;left:0;right:0;top:1500px;text-align:center">
  <div style="font-weight:300;font-size:30px;letter-spacing:5px;color:rgba(255,255,255,.92);
   text-shadow:0 2px 16px rgba(0,0,0,.5),0 0 2px rgba(0,0,0,.4)">@lucianails02</div>
</div>`);

// 3) OUTRO CARD
const outro = base(`
<div style="position:absolute;inset:0;background:rgba(0,0,0,.20)"></div>
<div style="position:absolute;inset:0;background:radial-gradient(135% 72% at 50% 44%,rgba(0,0,0,.62) 0%,rgba(0,0,0,.45) 40%,rgba(0,0,0,.18) 68%,rgba(0,0,0,0) 86%)"></div>
<div style="position:absolute;left:90px;right:90px;top:690px;text-align:center" class="shadow">
  <div style="font-weight:300;font-size:33px;letter-spacing:9px;opacity:.9">unghie curate, sempre</div>
  <div class="serif" style="font-weight:400;font-size:96px;line-height:1.02;margin-top:14px">@lucianails02</div>
  <div class="rule" style="width:130px"></div>
  <div style="font-weight:300;font-size:36px;letter-spacing:6px">onicotecnica · giugliano in campania</div>
  <div style="margin-top:46px">
    <span style="display:inline-block;font-weight:400;font-size:33px;letter-spacing:5px;
     padding:20px 44px;border:1px solid rgba(255,255,255,.75);border-radius:999px;
     box-shadow:0 4px 24px rgba(0,0,0,.25)">prenota in dm</span>
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
