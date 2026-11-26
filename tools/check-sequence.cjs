// node tools/check-sequence.cjs <簡報樹根目錄>
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const url = pathToFileURL(path.resolve(process.argv[2], 'index.html')).href;
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    const entries = await page.evaluate(() => story.sequence.map(link => new URL(link.href, document.baseURI).href));
    assert.equal(entries[0], url);
    assert.ok(entries.length > 1);
    assert.ok(await page.locator('#prev').isDisabled());
    for (let i = 1; i < entries.length; i++) {
      await page.evaluate(() => storyReader.go(story.pages.length - 1));
      const lastPage = page.url();
      await page.locator('#next').click();
      await page.waitForURL(u => u.href.split('#')[0] === entries[i]);
      assert.equal(await page.evaluate(() => storyReader.index), 0);
      await page.keyboard.press('ArrowLeft');
      await page.waitForURL(lastPage);
      assert.ok(await page.evaluate(() => storyReader.index === story.pages.length - 1));
      await page.keyboard.press('ArrowRight');
      await page.waitForURL(u => u.href.split('#')[0] === entries[i]);
    }
    await page.evaluate(() => storyReader.go(story.pages.length - 1));
    await page.locator('#next').click();
    assert.equal(page.url().split('#')[0], entries.at(-1));
    assert.equal(await page.evaluate(() => storyReader.index), 0);
    assert.deepEqual(errors, []);
    console.log(`PASS: ${entries.length - 1} 個交界均可雙向翻頁，首尾與頁面定位正確。`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
