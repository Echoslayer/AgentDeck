// node tools/check-share-export.cjs；先 agentdeck vendor，使用既有選用依賴 playwright。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentdeck-share-'));
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    try { res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
    catch { res.writeHead(404).end(); }
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, executablePath: process.env.PLAYWRIGHT_EXECUTABLE || undefined });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const url = `http://127.0.0.1:${server.address().port}/templates/blank/index.html`;
    const open = () => page.getByRole('button', { name: '匯出', exact: true }).click();
    const status = page.locator('#reader-export [role=status]');
    const settled = () => page.waitForFunction(() => !document.querySelector('#reader-export').hasAttribute('aria-busy'));
    await page.goto(url);
    assert.equal(await page.evaluate(() => !!window.htmlToImage || !!window.jspdf || !!window.PptxGenJS), false, '閱讀不載入匯出套件');
    await page.evaluate(() => storyReader.go(1));
    await open();
    await page.keyboard.press('d');
    assert.equal(await page.evaluate(() => storyReader.index), 1, '匯出視窗不觸發背景翻頁');
    const { unzip } = await import('../cli/lib/zip.mjs');
    for (const format of ['pdf', 'pptx']) {
      const waiting = page.waitForEvent('download');
      await page.locator(`[data-format=${format}]`).click();
      const download = await waiting;
      const file = path.join(tmp, `share.${format}`);
      await download.saveAs(file);
      await settled();
      assert.match(await status.textContent(), /已產生 3 頁/);
      assert.equal(await page.evaluate(() => storyReader.index), 1);
      assert.equal(await page.locator('.reader-export-host').count(), 0);
      const bytes = fs.readFileSync(file);
      assert.ok(bytes.length > 10000);
      if (format === 'pdf') {
        assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
        assert.equal((bytes.toString('latin1').match(/\/Type \/Page\b/g) || []).length, 3);
      } else {
        const files = unzip(bytes);
        const slides = [...files.keys()].filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n));
        assert.equal(slides.length, 3);
        for (const n of slides) assert.equal((files.get(n).toString().match(/<p:pic>/g) || []).length, 1);
        for (const [n, content] of files) if (/^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n)) {
          assert.doesNotMatch(content.toString(), /口頭說明|講者怎麼講|開場怎麼講/, '不匯出講稿內容');
        }
      }
    }
    // 在既有範本的測試執行環境加入互動頁；匯出不能 mount 或改變既有狀態。
    await page.addStyleTag({ content: '.share-svg rect{fill:rgb(20,100,160)}' });
    await page.evaluate(() => {
      story.pages[1].previewArt = '<p data-key="share-preview">靜態摘要</p><p data-hidden>隱藏內容</p><svg class="share-svg" width="80" height="80"><rect width="80" height="80"/></svg>';
      story.pages[1].mount = () => { window.shareMounts = (window.shareMounts || 0) + 1; };
      window.shareSeen = [];
      const original = htmlToImage.toJpeg;
      htmlToImage.toJpeg = async (node, options) => {
        shareSeen.push({ text: node.innerText, hidden: node.querySelector('[data-hidden]')?.checkVisibility() });
        const result = await original(node, options);
        const rect = node.querySelector('.share-svg rect');
        if (rect) {
          const img = new Image(); img.src = result; await img.decode();
          const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
          const r = rect.getBoundingClientRect(), base = node.getBoundingClientRect();
          window.sharePixel = [...ctx.getImageData((r.x - base.x + 40) * options.pixelRatio, (r.y - base.y + 40) * options.pixelRatio, 1, 1).data];
        }
        return result;
      };
    });
    const waiting = page.waitForEvent('download');
    await page.locator('[data-format=pdf]').click();
    await waiting; await settled();
    assert.equal(await page.evaluate(() => window.shareMounts || 0), 0);
    const pixel = await page.evaluate(() => window.sharePixel);
    assert.ok([20, 100, 160].every((value, i) => Math.abs(pixel[i] - value) < 8), `SVG 填色遺失：${pixel}`);
    assert.equal(await page.evaluate(() => shareSeen[1].hidden), false);
    assert.match(await page.evaluate(() => shareSeen[1].text), /靜態摘要/);
    // 遺失背景圖必須報錯，不下載缺圖的文件。
    let downloads = 0;
    page.on('download', () => downloads++);
    await page.evaluate(() => { story.pages[1].previewArt = '<div style="height:100px;background-image:url(/missing-share-image.png)"></div>'; });
    await page.locator('[data-format=pdf]').click(); await settled();
    assert.match(await status.textContent(), /圖片無法讀取/);
    assert.equal(downloads, 0);
    assert.equal(await page.locator('.reader-export-host').count(), 0);
    // 在資源讀取中取消，立即中斷請求並清理。
    await page.evaluate(() => { story.pages[1].previewArt = '<div style="height:100px;background-image:url(/slow-share-image.png)"></div>'; });
    let started;
    const requestStarted = new Promise(resolve => { started = resolve; });
    await page.route('**/slow-share-image.png', route => { started(route); });
    await page.locator('[data-format=pdf]').click();
    const pending = await requestStarted;
    await page.getByRole('button', { name: '取消匯出', exact: true }).click();
    await settled(); await pending.abort().catch(() => {});
    assert.match(await status.textContent(), /已取消/);
    assert.equal(downloads, 0);
    assert.equal(await page.locator('.reader-export-host').count(), 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#reader-export').isVisible(), false);
    // 小螢幕能操作，file URL 有明確的預覽指引。
    await page.goto(pathToFileURL(path.join(root, 'templates/blank/index.html')).href);
    await page.setViewportSize({ width: 390, height: 844 });
    await open();
    assert.equal(await page.locator('#reader-export').evaluate(el => el.scrollWidth <= el.clientWidth && el.getBoundingClientRect().bottom <= innerHeight), true);
    await page.locator('[data-format=pdf]').click();
    assert.match(await status.textContent(), /http:\/\/localhost:8000/);
    // 缺套件可重試，不會卡在 disabled。
    await page.goto(url);
    await page.route('**/html-to-image.js', route => route.abort());
    await open(); await page.locator('[data-format=pdf]').click(); await settled();
    assert.match(await status.textContent(), /agentdeck vendor/);
    assert.equal(await page.locator('[data-format=pdf]').isEnabled(), true);
    assert.deepEqual(errors, []);
    console.log('PASS: PDF/PPTX downloads, static preview, SVG colors, hidden content, state preservation, image failure, cancellation, mobile, file URL and missing dependency');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
