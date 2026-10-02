// agentdeck export：以無頭瀏覽器播放簡報並輸出 pptx（docs/adr/0021）。
// 外框（章節、標題、引言、重點）為 PPT 原生文字；內容區截圖；有 record 的頁照步驟錄影轉 mp4，只有標註的 record 改為原生圖形與動畫（docs/adr/0025）；講稿進備忘稿。
// playwright、pptxgenjs 是選用依賴，只在這裡動態載入；ffmpeg 與瀏覽器由使用者環境提供，缺 ffmpeg 時互動頁降級為截圖。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fail } from './util.mjs';
import { zip, unzip } from './zip.mjs';

const VIEW = { width: 1600, height: 1100 };
const HIDE = '.deck-side,.deck-edit-bar,body>nav,#index,.made-with{display:none!important}';
const W = 13.333, H = 7.5, M = 0.5, FONT = 'Microsoft JhengHei';

async function load(name) {
  try { return await import(name); } catch { return null; }
}
function findFfmpeg(given) {
  for (const c of [given, process.env.FFMPEG_PATH, 'ffmpeg'].filter(Boolean)) {
    const r = spawnSync(c, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
    if (r.status === 0) return /libx264/.test(r.stdout) ? { path: c } : { path: c, warn: '沒有 libx264 編碼器，無法轉 mp4' };
  }
  return null;
}
async function launch(chromium) {
  for (const channel of ['chrome', 'msedge', undefined]) {
    try { return { browser: await chromium.launch({ channel }), name: channel ?? 'Playwright Chromium' }; } catch {}
  }
  return null;
}

// 回報環境；缺必要條件時 ok 為 false。
export async function exportEnv({ ffmpeg } = {}, log = console.log) {
  const pw = await load('playwright'), px = await load('pptxgenjs');
  const ff = findFfmpeg(ffmpeg);
  const b = pw && await launch(pw.chromium);
  log(`playwright：${pw ? '已安裝' : '找不到（在 AgentDeck 執行 npm i playwright）'}`);
  log(`pptxgenjs：${px ? '已安裝' : '找不到（在 AgentDeck 執行 npm i pptxgenjs）'}`);
  log(`瀏覽器：${b ? b.name : pw ? '找不到（安裝 Chrome／Edge，或 npx playwright install chromium）' : '－'}`);
  log(`ffmpeg：${ff ? ff.path + (ff.warn ? `（${ff.warn}）` : '') : '找不到（互動頁改放截圖；以 --ffmpeg 或 FFMPEG_PATH 指定）'}`);
  return { ok: !!(pw && px && b), browser: b?.browser, pptxgen: px?.default, ffmpeg: ff && !ff.warn ? ff.path : null };
}

// 錄影用的模擬游標：只存在錄影的瀏覽器內容，不影響截圖。
function installCursor() {
  const c = document.createElement('div');
  c.id = 'agentdeck-cursor';
  c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transition-property:transform;transition-timing-function:cubic-bezier(.3,.7,.4,1)';
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l6.5 19 2.6-7.6L21 11z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.append(c);
  const r = document.querySelector('#page .stage').getBoundingClientRect();
  c.style.transform = `translate(${r.x + r.width / 2}px,${r.y + r.height * 0.8}px)`;
}
// 目標點：range 取該值的滑桿位置，其餘取元素中心。回傳游標移動所需毫秒數。
function moveCursor([sel, value]) {
  const e = document.querySelector(sel), c = document.getElementById('agentdeck-cursor');
  if (!e) throw new Error(`record 找不到元素：${sel}`);
  const r = e.getBoundingClientRect();
  const t = e.type === 'range' && value !== undefined
    ? { x: r.x + (value - (e.min || 0)) / ((e.max || 100) - (e.min || 0)) * r.width, y: r.y + r.height / 2 }
    : { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  const [, x0, y0] = c.style.transform.match(/([-\d.]+)px,\s*([-\d.]+)px/) ?? [0, t.x, t.y];
  const ms = Math.round(Math.min(700, 150 + Math.hypot(t.x - x0, t.y - y0) * 0.8));
  c.style.transitionDuration = `${ms}ms`;
  c.style.transform = `translate(${t.x}px,${t.y}px)`;
  return { ms, ...t };
}
function ripple({ x, y }) {
  const d = document.createElement('div');
  d.style.cssText = `position:fixed;left:${x - 18}px;top:${y - 18}px;width:36px;height:36px;border-radius:50%;background:#3a9fb566;border:2px solid #3a9fb5;z-index:2147483646;pointer-events:none`;
  document.body.append(d);
  d.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 450 }).onfinish = () => d.remove();
}
const placeCursor = ([x, y]) => { const c = document.getElementById('agentdeck-cursor'); c.style.transitionDuration = '0ms'; c.style.transform = `translate(${x}px,${y}px)`; };
const setValue = (e, v) => { e.value = v; for (const t of ['input', 'change']) e.dispatchEvent(new Event(t, { bubbles: true })); };

// dry：只驗證步驟能執行（export --check），不等待、不顯示游標。
async function runStep(pg, s, { cursor = false, dry = false } = {}) {
  if (s.wait !== undefined) return dry ? undefined : pg.waitForTimeout(s.wait);
  // arrow／box／clear 是畫面標註，交給簡報自己的 deck-editor 畫（docs/adr/0024）；at 只用於朗讀同步，錄影時依序執行。
  if (s.arrow || s.box || s.clear) {
    await pg.evaluate(s => {
      if (!window.deckActions) throw new Error('核心版本過舊，不支援 arrow／box／clear；請先執行 agentdeck update core');
      window.deckActions.annotate(s);
    }, s);
    return dry || s.clear ? undefined : pg.waitForTimeout(400); // 等標註淡入完成，最後一步是標註時影片才看得清楚
  }
  const target = s.click ?? s.set ?? s.drag;
  if (typeof target !== 'string') throw new Error(`不認得的 record 步驟：${JSON.stringify(s)}`);
  const sel = `#page ${target}`;
  if (cursor) {
    const t = await pg.evaluate(moveCursor, [sel, s.set ? s.value : undefined]);
    await pg.waitForTimeout(t.ms);
    await pg.evaluate(ripple, t);
  }
  if (s.click) return pg.click(sel, { timeout: 3000 });
  if (s.set) return pg.$eval(sel, setValue, String(s.value));
  // drag：從元素中心按住，約 1 秒內移動 by=[dx, dy] 像素後放開（例如旋轉 3D 元件）。
  const b = await pg.locator(sel).first().boundingBox({ timeout: 3000 });
  if (!b) throw new Error(`record 的拖曳目標不可見：${target}`);
  const x0 = b.x + b.width / 2, y0 = b.y + b.height / 2, N = 25;
  await pg.mouse.move(x0, y0);
  await pg.mouse.down();
  for (let k = 1; k <= N; k++) {
    const x = x0 + s.by[0] * k / N, y = y0 + s.by[1] * k / N;
    await pg.mouse.move(x, y);
    if (cursor) await pg.evaluate(placeCursor, [x, y]);
    if (!dry) await pg.waitForTimeout(40);
  }
  await pg.mouse.up();
}

// ── 只有標註的 record（box／arrow／clear，可夾 wait）不錄影：內容區放截圖，標註畫成 PPT 原生圖形，
//    以最簡單的「出現／消失」動畫按一下依序顯示（docs/adr/0021）。幾何與 deck-editor 的 drawMarks 相同。
const MARK = 'E5484D', MARK_NAME = 'agentdeck-mark-';
const marksOnly = r => r.every(s => s.click === undefined && s.set === undefined && s.drag === undefined) && r.some(s => s.box || s.arrow);
// 在瀏覽器內量每個標註目標相對於 .stage 的位置（CSS px），以及標籤的實際尺寸。
function measureMarks(steps) {
  const st = document.querySelector('#page .stage').getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'deck-marks';
  document.body.append(layer);
  try {
    return steps.map(s => {
      const sel = s.box ?? s.arrow;
      if (typeof sel !== 'string') return null;
      const e = document.querySelector(`#page ${sel}`);
      if (!e) throw new Error(`record 找不到元素：${sel}`);
      const r = e.getBoundingClientRect();
      let label = null;
      if (s.text) {
        const d = Object.assign(document.createElement('div'), { className: 'deck-mark-label', textContent: s.text });
        d.style.animation = 'none';
        layer.append(d);
        const b = d.getBoundingClientRect();
        label = { w: b.width, h: b.height };
      }
      return { x: r.left - st.left, y: r.top - st.top, w: r.width, h: r.height, label };
    });
  } finally { layer.remove(); }
}
// 把步驟分成「按一下」：有 at 時每個帶 at 的步驟開新的一下，其後的步驟併入；沒有 at 時每個 box／arrow 各一下，
// clear 讓先前的標註在下一下消失（最後一步是 clear 時自成一下）。同一下裡的 wait 成為後續效果的延遲。
// 回傳 [[{ name, out, delay }]]。
function markClicks(steps, names) {
  const anyAt = steps.some(s => s.at !== undefined);
  const clicks = [];
  let visible = [], pending = [], t = 0;
  steps.forEach((s, i) => {
    if (s.wait !== undefined && !(s.box || s.arrow || s.clear)) { if (clicks.length) t += s.wait; return; }
    if (anyAt ? s.at !== undefined || !clicks.length : !s.clear) { clicks.push([]); t = 0; }
    if (s.clear) {
      if (anyAt) clicks.at(-1).push(...visible.map(name => ({ name, out: true, delay: t })));
      else pending.push(...visible);
      visible = [];
      return;
    }
    clicks.at(-1).push(...pending.map(name => ({ name, out: true, delay: 0 })), ...names[i].map(name => ({ name, delay: t })));
    pending = [];
    visible.push(...names[i]);
  });
  if (pending.length) clicks.push(pending.map(name => ({ name, out: true, delay: 0 })));
  return clicks.filter(c => c.length);
}
// 投影片的 <p:timing>：進場與離場都用「出現」（presetID 1）；同一下裡延遲相同的效果同時發生，有延遲的接在前一組之後。
function timingXml(clicks, ids) {
  let n = 2;
  const groups = new Set();
  const effect = ({ name, out }, type, delay) => {
    const spid = ids.get(name), grp = out ? 1 : 0;
    groups.add(`${spid}:${grp}`);
    return `<p:par><p:cTn id="${++n}" presetID="1" presetClass="${out ? 'exit' : 'entr'}" presetSubtype="0" fill="hold" grpId="${grp}" nodeType="${type}">`
      + `<p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst><p:set><p:cBhvr><p:cTn id="${++n}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>`
      + `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>`
      + `<p:to><p:strVal val="${out ? 'hidden' : 'visible'}"/></p:to></p:set></p:childTnLst></p:cTn></p:par>`;
  };
  const seq = clicks.map(c => {
    const outer = ++n;
    const delays = [...new Set(c.map(e => e.delay))].sort((a, b) => a - b);
    // 組容器從前一組的時間點開始，效果自身的延遲是兩組的間隔（與 PowerPoint 存檔的結構相同）。
    const inner = delays.map((d, j) => { const base = j ? delays[j - 1] : 0; return `<p:par><p:cTn id="${++n}" fill="hold"><p:stCondLst><p:cond delay="${base}"/></p:stCondLst><p:childTnLst>`
      + c.filter(e => e.delay === d).map((e, k) => effect(e, k ? 'withEffect' : j ? 'afterEffect' : 'clickEffect', d - base)).join('')
      + '</p:childTnLst></p:cTn></p:par>'; }).join('');
    return `<p:par><p:cTn id="${outer}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>${inner}</p:childTnLst></p:cTn></p:par>`;
  }).join('');
  return '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
    + `<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${seq}</p:childTnLst></p:cTn>`
    + '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
    + '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
    + '</p:childTnLst></p:cTn></p:par></p:tnLst>'
    + `<p:bldLst>${[...groups].map(g => { const [spid, grp] = g.split(':'); return `<p:bldP spid="${spid}" grpId="${grp}" animBg="1"/>`; }).join('')}</p:bldLst></p:timing>`;
}
// pptxgenjs 不支援動畫：寫出後在 slideN.xml 補 <p:timing>。標註圖形改用不與其他物件衝突的 id。
function addTimings(buf, anims) {
  const files = unzip(buf);
  let next = 1000;
  for (const [slide, clicks] of anims) {
    const name = `ppt/slides/slide${slide}.xml`, ids = new Map();
    let xml = files.get(name).toString('utf8')
      .replace(new RegExp(`<p:cNvPr id="\\d+" name="(${MARK_NAME}\\d+)"`, 'g'), (_, n) => { ids.set(n, ++next); return `<p:cNvPr id="${next}" name="${n}"`; });
    const t = timingXml(clicks, ids);
    xml = xml.includes('</p:clrMapOvr>') ? xml.replace('</p:clrMapOvr>', `</p:clrMapOvr>${t}`) : xml.replace('</p:sld>', `${t}</p:sld>`);
    files.set(name, Buffer.from(xml, 'utf8'));
  }
  return zip([...files].map(([name, data]) => ({ name, data })));
}

async function openDeck(ctx, url, errors) {
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errors.push(e.message));
  await pg.goto(url);
  await pg.waitForFunction(() => window.storyReader);
  await pg.addStyleTag({ content: HIDE });
  return pg;
}
async function goTo(pg, i) {
  // 舊核心沒有 storyReader.go（0021 前）時，改以方向鍵逐頁翻。
  if (!await pg.evaluate(i => storyReader.go ? (storyReader.go(i), true) : false, i)) {
    for (let n = 0; n < 500 && await pg.evaluate(() => storyReader.index) !== i; n++) {
      await pg.evaluate(k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })),
        await pg.evaluate(() => storyReader.index) < i ? 'ArrowRight' : 'ArrowLeft');
    }
  }
  await pg.waitForTimeout(400); // ponytail: 固定等待讓圖片與 mount 完成；遇到慢元件再改等 load 事件
}

// export --check 在簡報資料夾內：逐頁試跑 record，回報找不到的選擇器。
export async function checkRecords(browser, dir, log = console.log) {
  const errors = [], bad = [];
  const ctx = await browser.newContext({ viewport: VIEW });
  const pg = await openDeck(ctx, pathToFileURL(path.join(dir, 'index.html')).href, errors);
  const total = await pg.evaluate(() => Number(document.getElementById('progress').max));
  let n = 0;
  for (let i = 0; i < total; i++) {
    await goTo(pg, i);
    const { id, record } = await pg.evaluate(() => ({ id: storyReader.page.id, record: storyReader.page.record ?? null }));
    if (!record) continue;
    n++;
    for (const [k, s] of record.entries()) {
      try { await runStep(pg, s, { dry: true }); }
      catch (e) { bad.push(`${i + 1} ${id} 第 ${k + 1} 步 ${JSON.stringify(s)}：${/Timeout/.test(e.message) ? '找不到元素或無法點擊' : e.message.split('\n')[0]}`); break; }
    }
  }
  await ctx.close();
  if (errors.length) bad.push(...new Set(errors.map(e => `頁面錯誤：${e}`)));
  log(`record：${n} 頁${bad.length ? `，${bad.length} 個問題\n  ${bad.join('\n  ')}` : '，都能執行'}`);
  return !bad.length;
}

export async function exportPptx({ dir, out, ffmpeg }, log = console.log) {
  const env = await exportEnv({ ffmpeg }, log);
  if (!env.ok) fail('匯出環境不完整，見上方說明。');
  const { browser } = env;
  const url = pathToFileURL(path.join(dir, 'index.html')).href;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentdeck-export-'));
  const errors = [];

  const open = ctx => openDeck(ctx, url, errors);
  // 目前頁面的可見文字（含 edits.js 的修改與隱藏）與講稿。
  const readPage = pg => pg.evaluate(() => {
    const vis = s => { const e = document.querySelector(`#page ${s}`); return e && e.checkVisibility() ? e.innerText.trim() : ''; };
    const text = h => { if (!h) return ''; const d = document.createElement('div'); d.innerHTML = h.replace(/<br\s*\/?>/gi, '\n'); return d.textContent.trim(); };
    const p = storyReader.page;
    return {
      id: p.id, full: !!document.querySelector('#page :is(.deck-cover,.deck-end)'),
      chapter: vis('.chapter'), title: vis('h1'), lead: vis('.lead'), point: vis('.point'),
      instruction: text(p.instruction), speech: text(p.speech), explain: text(p.explain), record: p.record ?? null,
      audio: p.audio ? new URL(p.audio, location.href).href : null,
    };
  });
  async function shot(pg, sel) {
    const el = pg.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    return { data: 'image/png;base64,' + (await el.screenshot()).toString('base64'), w: box.width, h: box.height };
  }
  async function record(i, steps, file) {
    const ctx = await browser.newContext({ viewport: VIEW, recordVideo: { dir: path.join(tmp, `v${i}`), size: VIEW } });
    const t0 = Date.now();
    const pg = await open(ctx);
    await goTo(pg, i);
    const box = await pg.evaluate(() => { const e = document.querySelector('#page .stage'); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); e.style.minHeight = `${r.height}px`; return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    // ponytail: 錄影期間 stage 不縮，裁切框不露出下方內容；操作後變高的部分會被裁掉，遇到再改為先量最大高度
    await pg.evaluate(installCursor);
    await pg.waitForTimeout(300);
    const start = (Date.now() - t0) / 1000;
    for (const s of steps) await runStep(pg, s, { cursor: true });
    await pg.waitForTimeout(300);
    const dur = (Date.now() - t0) / 1000 - start;
    const video = pg.video();
    await ctx.close();
    const even = v => Math.max(2, Math.floor(v / 2) * 2);
    const x = Math.max(0, Math.round(box.x)), y = Math.max(0, Math.round(box.y));
    const crop = `crop=${even(Math.min(box.w, VIEW.width - x))}:${even(Math.min(box.h, VIEW.height - y))}:${x}:${y}`;
    const r = spawnSync(env.ffmpeg, ['-y', '-loglevel', 'error', '-ss', start.toFixed(2), '-i', await video.path(), '-t', dur.toFixed(2),
      '-vf', crop, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', file], { encoding: 'utf8' });
    if (r.status !== 0) fail(`ffmpeg 轉檔失敗：${r.stderr}`);
  }

  try {
    const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
    const pg = await open(ctx);
    const total = await pg.evaluate(() => Number(document.getElementById('progress').max));
    const theme = await pg.evaluate(() => {
      const css = getComputedStyle(document.documentElement), v = n => css.getPropertyValue(n).trim();
      return { primary: v('--deck-primary'), accent: v('--deck-accent'), ink: v('--ink') };
    });
    const hex = (c, d) => /^#[0-9a-f]{6}$/i.test(c) ? c.slice(1) : d; // ponytail: 只認 #rrggbb；其他色彩格式退回預設
    const C = { primary: hex(theme.primary, '1E3A5F'), accent: hex(theme.accent, '3A9FB5'), ink: hex(theme.ink, '374151') };
    const header = await shot(pg, 'body>header');
    const headerH = W * header.h / header.w;

    const pptx = new env.pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.title = await pg.title();
    const fit = (img, a) => { const s = Math.min(a.w / img.w, a.h / img.h); return { x: a.x + (a.w - img.w * s) / 2, y: a.y + (a.h - img.h * s) / 2, w: img.w * s, h: img.h * s }; };
    const report = [], small = [], anims = [];
    let markN = 0;
    // 標註畫成原生圖形；k 是每 CSS px 對應的英吋，線寬與字級同比例換成 pt。
    function addMarks(slide, steps, rects, pos, k) {
      const X = v => pos.x + v * k, Y = v => pos.y + v * k, pt = v => Math.max(0.75, v * k * 72);
      const label = (text, l, x, y) => {
        const name = MARK_NAME + ++markN;
        slide.addText(text, {
          objectName: name, shape: pptx.ShapeType.roundRect, rectRadius: 6 * k, x: X(x), y: Y(y), w: (l.w + 4) * k, h: l.h * k,
          fill: { color: MARK }, color: 'FFFFFF', bold: true, fontFace: FONT, fontSize: pt(18), margin: 0, align: 'center', valign: 'middle', wrap: false,
        });
        return name;
      };
      const names = steps.map((s, i) => {
        const r = rects[i];
        if (!r) return [];
        const out = [MARK_NAME + ++markN];
        if (s.box) {
          slide.addShape(pptx.ShapeType.roundRect, { objectName: out[0], x: X(r.x - 6), y: Y(r.y - 6), w: (r.w + 12) * k, h: (r.h + 12) * k, rectRadius: 10 * k, fill: { type: 'none' }, line: { color: MARK, width: pt(4) } });
          if (r.label) out.push(label(s.text, r.label, r.x - 6, r.y - 10 - r.label.h));
          return out;
        }
        const from = s.from ?? 'left', L = 90, G = 10, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        const [hx, hy, dx, dy] = { left: [r.x - G, cy, -1, 0], right: [r.x + r.w + G, cy, 1, 0], top: [cx, r.y - G, 0, -1], bottom: [cx, r.y + r.h + G, 0, 1] }[from];
        const tx = hx + dx * L, ty = hy + dy * L;
        slide.addShape(pptx.ShapeType.line, {
          objectName: out[0], x: X(Math.min(tx, hx)), y: Y(Math.min(ty, hy)), w: Math.abs(hx - tx) * k, h: Math.abs(hy - ty) * k,
          flipH: hx < tx, flipV: hy < ty, line: { color: MARK, width: pt(5), endArrowType: 'triangle' },
        });
        if (r.label) {
          const { w, h } = r.label;
          const [lx, ly] = { left: [tx - w, ty - h / 2], right: [tx, ty - h / 2], top: [tx - w / 2, ty - h], bottom: [tx - w / 2, ty] }[from];
          out.push(label(s.text, r.label, lx, ly));
        }
        return out;
      });
      return markClicks(steps, names);
    }

    for (let i = 0; i < total; i++) {
      await goTo(pg, i);
      const p = await readPage(pg);
      const slide = pptx.addSlide();
      const notes = [p.instruction && `【講者動作】\n${p.instruction}`, p.speech && `【口語稿】\n${p.speech}`, p.explain && `【補充解釋】\n${p.explain}`];
      if (p.full) {
        const img = await shot(pg, '#page :is(.deck-cover,.deck-end)');
        slide.addImage({ data: img.data, x: 0, y: 0, w: W, h: H });
        report.push(`${i + 1} ${p.id}：整頁截圖`);
      } else {
        slide.addImage({ data: header.data, x: 0, y: 0, w: W, h: headerH });
        let y = headerH + 0.15;
        const text = (t, h, o) => { if (!t) return; slide.addText(t, { x: M, y, w: W - 2 * M, h, fontFace: FONT, color: C.ink, margin: 0, valign: 'top', ...o }); y += h; };
        text(p.chapter, 0.35, { fontSize: 12, bold: true, color: C.accent });
        text(p.title, 0.6, { fontSize: 26, bold: true, color: C.primary, fit: 'shrink' });
        text(p.lead, 0.5, { fontSize: 14, fit: 'shrink' });
        const pointH = p.point ? 0.6 : 0;
        const img = await shot(pg, '#page .stage');
        const pos = fit(img, { x: M, y: y + 0.1, w: W - 2 * M, h: H - 0.2 - pointH - (y + 0.1) });
        // 字級相對於在 1600px 寬瀏覽器播放時的比例；一般頁約 100–120%，低於 80% 時投影出來明顯比網頁小。
        const scale = (pos.w / img.w) / (W / VIEW.width);
        if (scale < 0.8) small.push(`${i + 1} ${p.id}：內容區縮為 ${Math.round(scale * 100)}%，字可能過小，考慮拆頁或降低內容高度`);
        if (p.record && marksOnly(p.record)) {
          slide.addImage({ data: img.data, ...pos });
          const clicks = addMarks(slide, p.record, await pg.evaluate(measureMarks, p.record), pos, pos.w / img.w);
          anims.push([i + 1, clicks]);
          report.push(`${i + 1} ${p.id}：截圖＋PPT 標註動畫（${clicks.length} 下）`);
        } else if (p.record && env.ffmpeg) {
          const mp4 = path.join(tmp, `${i}.mp4`);
          await record(i, p.record, mp4);
          slide.addMedia({ type: 'video', path: mp4, cover: img.data, ...pos });
          report.push(`${i + 1} ${p.id}：錄影（${p.record.length} 步）`);
        } else {
          slide.addImage({ data: img.data, ...pos });
          if (p.record) notes.push('（本頁原為互動，匯出環境沒有 ffmpeg，改放截圖；請改用 HTML 版示範。）');
          report.push(`${i + 1} ${p.id}：截圖${p.record ? '（互動降級）' : ''}`);
        }
        if (p.point) {
          const py = H - pointH - 0.1;
          slide.addShape(pptx.ShapeType.rect, { x: M, y: py, w: 0.06, h: pointH, fill: { color: C.accent }, line: { color: C.accent } });
          slide.addText(p.point, { x: M + 0.2, y: py, w: W - 2 * M - 0.2, h: pointH, fontFace: FONT, fontSize: 14, bold: true, color: C.ink, margin: 0, valign: 'middle', fit: 'shrink' });
        }
      }
      // 口語稿音檔放在右下角的小圖示，放映時點擊播放。
      const audio = p.audio?.startsWith('file:') && fileURLToPath(p.audio);
      if (audio && fs.existsSync(audio)) {
        slide.addMedia({ type: 'audio', path: audio, x: W - 0.55, y: H - 0.55, w: 0.4, h: 0.4 });
        report[report.length - 1] += '＋音檔';
      } else if (p.audio) small.push(`${i + 1} ${p.id}：找不到音檔 ${p.audio}`);
      const n = notes.filter(Boolean).join('\n\n');
      if (n) slide.addNotes(n);
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (anims.length) fs.writeFileSync(out, addTimings(await pptx.write({ outputType: 'nodebuffer' }), anims));
    else await pptx.writeFile({ fileName: out });
    log(report.join('\n'));
    if (small.length) log(`注意：\n  ${small.join('\n  ')}`);
    if (errors.length) log(`注意：播放時有頁面錯誤\n  ${[...new Set(errors)].join('\n  ')}`);
    log(`已輸出 ${out}`);
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
