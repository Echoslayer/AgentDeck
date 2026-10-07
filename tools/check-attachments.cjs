// PLAYWRIGHT_CHANNEL=chrome node tools/check-attachments.cjs
// 附件（story.attachments）：頁首按鈕、展開清單、連結與類型、點外面／Esc 收起、格式檢查、沒有附件時不顯示、手機寬度。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentdeck-attach-'));
  try {
    const src = f => pathToFileURL(path.resolve(__dirname, '..', f)).href;
    const template = fs.readFileSync(path.resolve(__dirname, '../templates/blank/index.html'), 'utf8')
      .replace(/href="\.\.\/\.\.\/([^"]+)"/g, (_, f) => `href="${src(f)}"`).replace('href="story.css"', '');
    const deck = (name, attachments) => {
      fs.writeFileSync(path.join(temp, name), template.replace(/<script[\s\S]*?<\/script>/g, '').replace('</body>', `<script src="${src('assets/deck/deck-core.js')}"></script>
<script>const story = { title: '附件', ${attachments === undefined ? '' : `attachments: ${attachments},`} pages: [{ id: 'a', section: '', title: 'A', lead: '', art: '<p data-key="t">A</p>', point: '' }] };</script>
<script src="${src('assets/deck/deck-editor.js')}"></script><script src="${src('assets/story-reader/reader.js')}"></script></body>`));
      return pathToFileURL(path.join(temp, name)).href;
    };
    const url = deck('index.html', JSON.stringify([
      { label: '實驗細節', href: 'attachments/detail/index.html#p2', note: '附件簡報' },
      { label: '原始<b>資料</b>', href: 'resources/x/data.csv' },
      { label: '無副檔名', href: 'resources/x/README' },
    ]));
    const errors = [];
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.storyReader);
    const box = page.locator('.reader-attach');
    assert.equal(await box.locator('summary').textContent(), '📎 附件 3');
    assert.equal(await box.locator('ul').isVisible(), false);
    await box.locator('summary').click();
    const links = box.locator('a');
    assert.equal(await links.count(), 3);
    assert.deepEqual(await links.evaluateAll(a => a.map(x => [x.getAttribute('href'), x.querySelector('small')?.textContent ?? ''])),
      [['attachments/detail/index.html#p2', '附件簡報'], ['resources/x/data.csv', 'CSV'], ['resources/x/README', '']]);
    assert.equal(await links.nth(1).locator('strong b').innerText(), '資料');
    // 清單疊在主內容上方仍點得到（頁首有自己的疊層）
    for (let i = 0; i < 3; i++) await links.nth(i).click({ trial: true, timeout: 2000 });
    // 清單在畫面內
    const ul = await box.locator('ul').boundingBox();
    assert(ul.x >= 0 && ul.x + ul.width <= 1280);
    // 點外面收起（不翻頁）；Esc 收起並把焦點還給按鈕
    await page.mouse.click(640, 400);
    assert.equal(await box.evaluate(d => d.open), false);
    await box.locator('summary').click();
    await page.keyboard.press('Escape');
    assert.equal(await box.evaluate(d => d.open), false);
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'SUMMARY');

    // 手機寬度：清單不超出畫面
    const phone = await browser.newPage({ viewport: { width: 390, height: 780 } });
    phone.on('pageerror', e => errors.push(e.message));
    await phone.goto(url);
    await phone.locator('.reader-attach summary').click();
    const pul = await phone.locator('.reader-attach ul').boundingBox();
    assert(pul.x >= 0 && pul.x + pul.width <= 390, `清單超出畫面 ${JSON.stringify(pul)}`);
    assert(await phone.evaluate(() => document.documentElement.scrollWidth) <= 390);
    assert.deepEqual(errors, []);

    // 沒有附件：不顯示按鈕；格式錯：載入時報錯
    await page.goto(deck('none.html'));
    await page.waitForFunction(() => window.storyReader);
    assert.equal(await page.locator('.reader-attach').count(), 0);
    const bad = [];
    page.on('pageerror', e => bad.push(e.message));
    await page.goto(deck('bad.html', "[{ label: '缺 href' }]"));
    await page.waitForTimeout(300);
    assert(bad.some(m => m.includes('story.attachments')), bad.join('\n'));
    console.log('PASS attachments: 頁首按鈕、清單、連結與類型、點外面／Esc 收起、手機寬度、無附件、格式檢查');
  } finally { await browser.close(); fs.rmSync(temp, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
