// PLAYWRIGHT_CHANNEL=chrome node tools/check-scrubber.cjs
// 拖動軸（reader.js createScrubber）：滑過預覽、點擊／拖曳跳頁、答題前隱藏、鍵盤、手機觸控。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentdeck-scrub-'));
  try {
    const src = f => pathToFileURL(path.resolve(__dirname, '..', f)).href;
    const template = fs.readFileSync(path.resolve(__dirname, '../templates/blank/index.html'), 'utf8')
      .replace(/href="\.\.\/\.\.\/([^"]+)"/g, (_, f) => `href="${src(f)}"`).replace('href="story.css"', '');
    const page = (id, section, title, extra = {}) => ({ id, section, title, lead: '', art: `<p data-key="t">${title}</p>`, point: '', ...extra });
    const pages = [page('c', '封面', '封面'), page('a1', '01', '甲一'), page('a2', '01', '甲二'), page('a3', '01', '甲三'),
      page('q', '02', '題目', { question: { prompt: '?', hideFuturePreviews: true, choices: [{ value: 'y', label: '好', feedback: '好' }] } }),
      page('b1', '03', '乙一'), page('b2', '03', '乙二'), page('b3', '03', '乙三'), page('e', '結尾', '結尾')];
    fs.writeFileSync(path.join(temp, 'index.html'), template.replace(/<script[\s\S]*?<\/script>/g, '').replace('</body>', `<script src="${src('assets/deck/deck-core.js')}"></script>
<script>const story = { title: '拖動軸', transition: 'none', pages: ${JSON.stringify(pages)} };</script>
<script src="${src('assets/deck/deck-editor.js')}"></script><script src="${src('assets/story-reader/reader.js')}"></script></body>`));
    const url = pathToFileURL(path.join(temp, 'index.html')).href;
    const errors = [];
    const desk = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    desk.on('pageerror', e => errors.push(e.message));
    await desk.goto(url);
    await desk.waitForFunction(() => window.storyReader);
    const index = p => p.evaluate(() => storyReader.index);
    const segs = desk.locator('.scrub-seg');
    assert.equal(await segs.count(), 9);
    assert.equal(await desk.locator('.scrub-chapter').count(), 4);
    const at = async i => { const b = await segs.nth(i).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };

    // 滑過：顯示該頁縮圖與標題，不換頁；上一步／下一步不再帶縮圖
    await desk.mouse.move(...await at(2));
    assert.equal(await desk.locator('.scrub-tip').isVisible(), true);
    assert.match(await desk.locator('.scrub-caption').innerText(), /3 \/ 9 · 01[\s\S]*甲二/);
    assert.equal(await desk.locator('.scrub-thumb .mini-page').count(), 1);
    assert.equal(await index(desk), 0);
    assert.equal(await desk.locator('body>nav .mini').count(), 0);

    // 點擊跳頁，且不觸發翻頁列空白處的左右翻頁
    await desk.mouse.click(...await at(3));
    assert.equal(await index(desk), 3);
    // 拖曳：放開才跳頁
    await desk.mouse.move(...await at(5));
    await desk.mouse.down();
    await desk.mouse.move(...await at(7), { steps: 6 });
    assert.equal(await index(desk), 3, '拖曳中不換頁');
    await desk.mouse.up();
    assert.equal(await index(desk), 7);
    assert.equal(await desk.locator('.scrub').getAttribute('aria-valuenow'), '8');

    // 題目頁未作答：後面的格子顯示 ?；作答後出現縮圖
    await desk.evaluate(() => storyReader.go(4));
    await desk.mouse.move(...await at(6));
    assert.equal(await desk.locator('.scrub-thumb .mini-placeholder').count(), 1);
    assert.match(await desk.locator('.scrub-caption').innerText(), /繼續閱讀後揭曉/);
    await desk.click('[data-answer="y"]');
    await desk.mouse.move(...await at(7));
    await desk.mouse.move(...await at(6));
    assert.equal(await desk.locator('.scrub-thumb .mini-page').count(), 1);

    // 鍵盤：方向鍵只翻一頁（不與閱讀器翻頁鍵重複），End 到最後
    await desk.mouse.move(640, 300);
    await desk.locator('.scrub').focus();
    await desk.keyboard.press('ArrowRight');
    assert.equal(await index(desk), 5);
    await desk.keyboard.press('End');
    assert.equal(await index(desk), 8);

    // 手機：真實觸控拖曳，縮圖不超出畫面，放開才跳頁
    const phone = await browser.newPage({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    phone.on('pageerror', e => errors.push(e.message));
    await phone.goto(url);
    await phone.waitForFunction(() => window.storyReader);
    const pb = await phone.locator('.scrub').boundingBox();
    assert(pb.x >= 0 && pb.x + pb.width <= 390);
    const cdp = await phone.context().newCDPSession(phone);
    const touch = (type, f) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: pb.x + pb.width * f, y: pb.y + pb.height / 2 }] });
    await touch('touchStart', 0.1);
    for (const f of [0.3, 0.5, 0.65]) await touch('touchMove', f);
    const tip = await phone.locator('.scrub-tip').boundingBox();
    assert(tip && tip.x >= 0 && tip.x + tip.width <= 390, '縮圖顯示且不超出畫面');
    assert.equal(await index(phone), 0);
    await touch('touchEnd');
    await phone.waitForFunction(() => storyReader.index === 5);
    assert(await phone.evaluate(() => document.documentElement.scrollWidth) <= 390);

    assert.deepEqual(errors, []);
    console.log('PASS scrubber: 滑過預覽、點擊與拖曳跳頁、答題前隱藏、鍵盤、按鈕無縮圖、手機觸控');
  } finally { await browser.close(); fs.rmSync(temp, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
