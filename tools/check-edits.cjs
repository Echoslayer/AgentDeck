// PLAYWRIGHT_CHANNEL=chrome node tools/check-edits.cjs
// edits.js 模型（window.deckEdits）與標註幾何（deckActions.geometry）：經由 interface 測，不點 UI。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentdeck-edits-'));
  try {
    const src = f => pathToFileURL(path.resolve(__dirname, '..', f)).href;
    const template = fs.readFileSync(path.resolve(__dirname, '../templates/blank/index.html'), 'utf8');
    const art = '<div data-key="a" data-edit>甲</div><div data-key="m" data-move>移</div><div><p>位置</p></div>';
    fs.writeFileSync(path.join(temp, 'index.html'), template.replace(/<script[\s\S]*?<\/script>/g, '').replace('</body>', `<script src="${src('assets/deck/deck-core.js')}"></script><script>
      const story = { title: '測試', label: '原標籤', pages: [{ id: 'p1', section: '章', title: '原標題', lead: '', point: '', art: ${JSON.stringify(art)} }] };
      window.storyEdits = { label: '新標籤', pages: { p1: { title: { html: '改標題' }, a: { html: '改甲', hidden: true }, m: { x: 5, y: -2 }, '@2.0': { hidden: true } } } };
      </script><script src="${src('assets/deck/deck-editor.js')}"></script><script src="${src('assets/story-reader/reader.js')}"></script></body>`));
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(temp, 'index.html')).href);
    await page.waitForFunction(() => window.storyReader);

    // 載入時套用 edits.js
    const p = await page.evaluate(() => ({ label: story.label, title: story.pages[0].title, art: story.pages[0].art }));
    assert.equal(p.label, '新標籤');
    assert.equal(p.title, '改標題');
    assert.match(p.art, /data-key="a"[^>]*data-hidden[^>]*>改甲</);
    assert.match(p.art, /translate: 5cqw -2cqw/);
    assert.match(p.art, /<p data-hidden="">位置<\/p>/);

    // set：html 一律 sanitize；欄位隱藏以標記 span；text() 可還原成同一份資料
    const out = await page.evaluate(() => {
      const pg = story.pages[0];
      deckEdits.set(pg, 'a', { html: '<b onclick="x()">粗</b><script>bad()</script><img src=x>' });
      deckEdits.set(pg, 'title', { hidden: true });
      deckEdits.addComment('p1', '  留言  ');
      deckEdits.addComment('p1', '   ');
      const text = deckEdits.text();
      window.storyEdits = undefined;
      eval(text);
      return { a: deckEdits.get('p1', 'a'), title: pg.title, saved: window.storyEdits, comments: deckEdits.comments('p1') };
    });
    assert.equal(out.a.html, '<b>粗</b>');
    assert.equal(out.title, '<span data-field-hidden></span>改標題');
    assert.deepEqual(out.saved.pages.p1.a, { html: '<b>粗</b>', hidden: true });
    assert.equal(out.saved.label, '新標籤');
    assert.deepEqual(out.comments.map(c => c.text), ['留言']);
    assert.equal(await page.evaluate(() => { deckEdits.removeComment('p1', 0); return JSON.parse(deckEdits.text().match(/= ([\s\S]*);\n$/)[1]).comments; }), undefined);

    // 標註幾何：畫面上的標籤與框位置來自同一份計算（agentdeck export 也用它）
    const g = await page.evaluate(() => deckActions.geometry({ arrow: '.x', from: 'right' }, { x: 100, y: 100, w: 50, h: 20 }, 40, 10));
    assert.deepEqual(g, { arrow: { tx: 250, ty: 110, hx: 160, hy: 110, dx: 1, dy: 0 }, label: { x: 250, y: 105 } });
    assert.deepEqual(await page.evaluate(() => deckActions.geometry({ box: '.x' }, { x: 10, y: 20, w: 30, h: 40 }, 0, 12)),
      { box: { x: 4, y: 14, w: 42, h: 52 }, label: { x: 4, y: -2 } });
    const placed = await page.evaluate(() => {
      deckActions.annotate({ box: '[data-key="m"]', text: '這裡' });
      const r = document.querySelector('#page [data-key="m"]').getBoundingClientRect();
      const box = document.querySelector('.deck-mark-box'), label = document.querySelector('.deck-mark-label');
      const want = deckActions.geometry({ box: 1 }, { x: r.left, y: r.top, w: r.width, h: r.height }, label.offsetWidth, label.offsetHeight);
      return { box: [parseFloat(box.style.left), parseFloat(box.style.top)], label: [parseFloat(label.style.left), parseFloat(label.style.top)], want };
    });
    const near = (a, b) => assert(a.every((v, i) => Math.abs(v - b[i]) < 0.01), `${a} ≠ ${b}`);
    near(placed.box, [placed.want.box.x, placed.want.box.y]);
    near(placed.label, [placed.want.label.x, placed.want.label.y]);
    assert.deepEqual(errors, []);
    console.log('PASS edits: 載入套用、位置 key、sanitize、欄位隱藏、另存文字還原、註解、標註幾何');
  } finally { await browser.close(); fs.rmSync(temp, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
