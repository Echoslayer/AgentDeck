// node tools/check-reader.cjs（使用 package.json 已列的選用依賴 playwright）
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const url = pathToFileURL(path.resolve(__dirname, '../templates/blank/index.html')).href;
    await page.goto(url);
    // 實際視窗尺寸：封面不被導覽遮住、設定操作列不隨內容捲走。
    for (const viewport of [{ width: 1280, height: 720 }, { width: 1024, height: 600 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.waitForFunction(() => {
        const cover = document.querySelector('#page .deck-cover').getBoundingClientRect();
        return cover.bottom <= document.querySelector('body>nav').getBoundingClientRect().top;
      });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.getByRole('button', { name: '設定', exact: true }).click();
      await page.locator('#reader-personal-settings').evaluate(el => { el.open = true; });
      const before = await page.locator('.reader-settings-footer').boundingBox();
      await page.locator('.reader-settings-content').evaluate(el => { el.scrollTop = el.scrollHeight; });
      const after = await page.locator('.reader-settings-footer').boundingBox();
      assert.equal(after.y, before.y);
      assert.ok(after.y + after.height <= viewport.height);
      assert.equal(await page.locator('#reader-settings').evaluate(el => el.scrollWidth <= el.clientWidth), true);
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.locator('#edit-hide').click();
    assert.equal(await page.locator('#edit-toggle').isVisible(), false);
    assert.equal(await page.locator('#edit-hide').isVisible(), true);
    await page.locator('#edit-hide').click();
    assert.equal(await page.locator('#edit-toggle').isVisible(), true);
    const index = () => page.evaluate(() => storyReader.index);
    const open = async () => {
      await page.getByRole('button', { name: '設定', exact: true }).click();
      await page.locator('#reader-personal-settings').evaluate(el => { el.open = true; });
    };
    const save = () => page.locator('#reader-settings').getByRole('button', { name: '儲存', exact: true }).click();
    await page.keyboard.press('d');
    assert.equal(await index(), 1);
    await page.keyboard.press('A');
    assert.equal(await index(), 0);
    await open();
    await page.getByLabel('下一頁', { exact: true }).fill('e');
    await save();
    assert.match(await page.locator('#reader-settings [role=status]').textContent(), /保留/);
    await page.getByLabel('下一頁', { exact: true }).fill('a');
    await save();
    assert.equal(await page.locator('#reader-settings').evaluate(el => el.open), true);
    await page.getByLabel('下一頁', { exact: true }).fill('x');
    await page.getByLabel('朗讀速度', { exact: true }).selectOption('1.5');
    await page.getByLabel('顯示字幕', { exact: true }).check();
    await page.getByLabel('講稿字級（14–56 px）', { exact: true }).fill('34');
    await page.getByLabel('顯示講稿', { exact: true }).uncheck();
    await page.getByLabel('顯示註解', { exact: true }).uncheck();
    await page.keyboard.press('x');
    assert.equal(await index(), 0);
    await save();
    await page.keyboard.press('d');
    assert.equal(await index(), 0);
    await page.keyboard.press('x');
    assert.equal(await index(), 1);
    await page.reload();
    await open();
    assert.equal(await page.getByLabel('下一頁', { exact: true }).inputValue(), 'x');
    assert.equal(await page.getByLabel('朗讀速度', { exact: true }).inputValue(), '1.5');
    assert.equal(await page.getByLabel('顯示字幕', { exact: true }).isChecked(), true);
    assert.equal(await page.getByLabel('講稿字級（14–56 px）', { exact: true }).inputValue(), '34');
    await page.getByRole('button', { name: '恢復預設', exact: true }).click();
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await open();
    assert.equal(await page.getByLabel('下一頁', { exact: true }).inputValue(), 'x');
    await page.keyboard.press('Escape');
    const popupPromise = page.waitForEvent('popup');
    await page.locator('#edit-presenter').click();
    const presenter = await popupPromise;
    await presenter.waitForLoadState();
    assert.equal(await presenter.locator('html').evaluate(el => el.style.getPropertyValue('--size')), '34px');
    assert.equal(await presenter.locator('[data-show=notes]').getAttribute('aria-pressed'), 'false');
    await presenter.keyboard.press('x');
    assert.equal(await index(), 1);
    await presenter.locator('[data-size="2"]').click();
    await open();
    assert.equal(await page.getByLabel('講稿字級（14–56 px）', { exact: true }).inputValue(), '36');
    await page.getByRole('button', { name: '恢復預設', exact: true }).click();
    await save();
    assert.equal(await presenter.locator('html').evaluate(el => el.style.getPropertyValue('--size')), '26px');
    assert.equal(await presenter.locator('[data-show=notes]').getAttribute('aria-pressed'), 'true');
    // 公開介面防誤觸，包含 IME、其他元件已攔截與輸入框。
    assert.equal(await page.evaluate(() => {
      const target = document.createElement('input');
      return storyReader.preferences.navigationDelta({ key: 'd', target });
    }), 0);
    for (const flag of ['ctrlKey', 'metaKey', 'altKey', 'isComposing', 'defaultPrevented']) {
      assert.equal(await page.evaluate(flag => storyReader.preferences.navigationDelta({ key: 'd', target: document.body, [flag]: true }), flag), 0);
    }
    await open();
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('denied'); }; });
    await save();
    assert.match(await page.locator('#reader-settings [role=status]').textContent(), /無法儲存/);
    await page.keyboard.press('Escape');
    await context.close();
    // 閱讀器不載入編輯層時仍可獨立使用，舊偏好損壞時退回預設。
    const bare = await browser.newContext();
    await bare.route('**/deck-editor.js', route => route.fulfill({ body: '', contentType: 'application/javascript' }));
    await bare.addInitScript(() => {
      localStorage.setItem('agentdeck-navigation-keys', '{broken');
    });
    const reader = await bare.newPage();
    reader.on('pageerror', e => errors.push(e.message));
    await reader.goto(url);
    await reader.getByRole('button', { name: '設定', exact: true }).click();
    assert.equal(await reader.locator('#reader-personal-settings').isVisible(), false);
    await reader.keyboard.press('Escape');
    await reader.keyboard.press('d');
    assert.equal(await reader.evaluate(() => storyReader.index), 1);
    assert.deepEqual(errors, []);
    console.log('PASS: 設定分層、快捷鍵、持久儲存、草稿取消、恢復預設、講者同步、防誤觸與獨立閱讀器');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
