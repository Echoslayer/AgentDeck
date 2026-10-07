// PLAYWRIGHT_CHANNEL=chrome node tools/check-overview.cjs
// 縮圖總覽（reader.js createOverview）：開關、跳頁、章節標示、答題前隱藏、註解數、舊窗格標記移除、手機。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentdeck-overview-'));
  try {
    const src = f => pathToFileURL(path.resolve(__dirname, '..', f)).href;
    // 舊版入口仍帶左側窗格標記：閱讀器載入時要移除，入口不必改。
    const legacy = '<details class="index" id="index"><summary>投影片</summary><button class="pin" id="pin" aria-pressed="false">釘選</button><div class="index-list" id="index-list"></div></details>';
    const template = fs.readFileSync(path.resolve(__dirname, '../templates/blank/index.html'), 'utf8')
      .replace(/href="\.\.\/\.\.\/([^"]+)"/g, (_, f) => `href="${src(f)}"`).replace('href="story.css"', '')
      .replace('<main id="page"', `${legacy}\n<main id="page"`);
    const page = (id, section, title, extra = {}) => ({ id, section, title, lead: '', art: `<p data-key="t">${title}</p>`, point: '', ...extra });
    const pages = [page('c', '封面', '封面'), page('a1', '01', '甲一'), page('a2', '01', '甲二'),
      page('q', '02', '題目', { question: { prompt: '?', hideFuturePreviews: true, choices: [{ value: 'y', label: '好', feedback: '好' }] } }),
      page('b1', '03', '乙一'), page('e', '結尾', '結尾')];
    fs.writeFileSync(path.join(temp, 'index.html'), template.replace(/<script[\s\S]*?<\/script>/g, '').replace('</body>', `<script src="${src('assets/deck/deck-core.js')}"></script>
<script>const story = { title: '總覽', transition: 'none', pages: ${JSON.stringify(pages)} };
window.storyEdits = { comments: { a2: [{ text: '改字', at: '2026-10-07T10:00:00' }] } };</script>
<script src="${src('assets/deck/deck-editor.js')}"></script><script src="${src('assets/story-reader/reader.js')}"></script></body>`));
    const url = pathToFileURL(path.join(temp, 'index.html')).href;
    const errors = [];
    const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    desk.on('pageerror', e => errors.push(e.message));
    await desk.goto(url + '#a1');
    await desk.waitForFunction(() => window.storyReader);
    const index = p => p.evaluate(() => storyReader.index);
    const dialog = desk.locator('#reader-overview');

    assert.equal(await desk.locator('details#index, #pin').count(), 0, '舊窗格標記已移除');
    assert.equal(await dialog.isVisible(), false);
    await desk.locator('.reader-overview-toggle').click();
    assert.equal(await dialog.isVisible(), true);
    assert.equal(await desk.locator('.reader-overview-item').count(), 6);
    assert.deepEqual(await desk.locator('.reader-overview-chapter').allTextContents(), ['封面', '01', '', '02', '03', '結尾']);
    assert.equal(await desk.locator('[aria-current]').getAttribute('data-page'), '1');
    assert.equal(await desk.evaluate(() => document.activeElement.dataset.page), '1', '焦點在目前頁');
    // 編輯層的註解數標在對應的縮圖上
    assert.equal(await desk.locator('[data-page="2"] .deck-comment-badge').innerText(), '💬1');
    // 總覽開著時方向鍵不翻背後的頁；點縮圖跳頁並關閉
    await desk.keyboard.press('ArrowRight');
    assert.equal(await index(desk), 1);
    await desk.locator('[data-page="4"]').click();
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await index(desk), 4);
    // G 開啟、Esc 關閉、點遮罩關閉
    await desk.keyboard.press('g');
    assert.equal(await dialog.isVisible(), true);
    await desk.keyboard.press('Escape');
    assert.equal(await dialog.isVisible(), false);
    await desk.keyboard.press('g');
    await desk.mouse.click(4, 4);
    assert.equal(await dialog.isVisible(), false);

    // 題目頁未作答：後面的縮圖以 ? 代替、不露標題與章節；作答後出現
    await desk.evaluate(() => storyReader.go(3));
    await desk.keyboard.press('g');
    assert.equal(await desk.locator('[data-page="4"] .mini-placeholder').count(), 1);
    assert.match(await desk.locator('[data-page="4"]').innerText(), /繼續閱讀後揭曉/);
    assert.doesNotMatch(await desk.locator('[data-page="4"]').innerText(), /乙一/);
    await desk.keyboard.press('Escape');
    await desk.click('[data-answer="y"]');
    await desk.keyboard.press('g');
    assert.match(await desk.locator('[data-page="4"]').innerText(), /乙一/);
    await desk.keyboard.press('Escape');

    // 手機：兩欄、不超出畫面
    const phone = await browser.newPage({ viewport: { width: 390, height: 760 } });
    phone.on('pageerror', e => errors.push(e.message));
    await phone.goto(url);
    await phone.locator('.reader-overview-toggle').click();
    const body = phone.locator('.reader-overview-body');
    assert(await body.evaluate(b => b.scrollWidth <= b.clientWidth));
    const [a, b] = await phone.locator('.reader-overview-item').evaluateAll(xs => xs.slice(0, 2).map(x => x.getBoundingClientRect().top));
    assert.equal(Math.round(a), Math.round(b), '兩欄並排');
    assert.deepEqual(errors, []);
    console.log('PASS overview: 開關、跳頁、章節、焦點、註解數、答題前隱藏、舊窗格移除、手機');
  } finally { await browser.close(); fs.rmSync(temp, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
