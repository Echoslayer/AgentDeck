// node tools/check-tree-map.cjs [簡報樹根目錄]；不帶路徑時用 CLI 建一棵英文、未分組的樹。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

function makeTree(root) {
  const cli = path.resolve(__dirname, '../cli/agentdeck.mjs');
  execFileSync(process.execPath, [cli, 'init', root]);
  const names = ['atlas', 'river', 'summit'];
  const paths = ['index.html', 'branches/river/index.html', 'branches/summit/index.html'];
  names.forEach((name, i) => {
    execFileSync(process.execPath, [cli, 'new', name, '--dir', root, ...(i ? ['--related', 'branches'] : [])]);
    const html = path.join(root, paths[i]);
    const prefix = i ? '../../' : '';
    fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace('lang="zh-Hant"', 'lang="en"')
      .replace('<script src="' + prefix + 'resources/' + name + '/story.js">', '<script src="' + prefix + 'resources/sequence.js"></script>$&'));
    const storyFile = path.join(root, 'resources', name, 'story.js');
    fs.appendFileSync(storyFile, '\nstory.sequence = atlasSequence;\n' + (i ? 'story.back = atlasSequence[0];\n' : ''));
  });
  fs.writeFileSync(path.join(root, 'resources/sequence.js'), `const atlasSequence = ${JSON.stringify(paths)}.map((p,i) => ({
    href: new URL('../' + p, document.currentScript.src).href, label: ['Atlas','River','Summit'][i]
  }));`);
}

(async () => {
  const temp = process.argv[2] ? null : fs.mkdtempSync(path.join(os.tmpdir(),'agentdeck-tree-'));
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
  try {
    const root = temp || path.resolve(process.argv[2]);
    if (temp) makeTree(root);
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    const entries = await page.evaluate(() => story.sequence.map(e => ({ ...e, href: new URL(e.href, document.baseURI).href })));
    const button = page.locator('.reader-overview-toggle + .reader-tree-toggle');
    const dialog = page.locator('#reader-tree'), input = dialog.locator('input');
    await button.click();
    assert.equal(await dialog.locator('.tree-hub').count(), new Set(entries.slice(1).map(e => e.group).filter(Boolean)).size);
    if (temp) assert.equal(await button.getAttribute('aria-label'), 'Presentation tree');
    const target = entries.at(-1);
    if (target.group) {
      await dialog.getByRole('button', { name: target.group, exact: true }).click();
      assert.equal(await dialog.locator('.tree-links a').count(), entries.filter(e => e.group === target.group).length);
      await input.fill(target.group);
      assert.ok(await dialog.locator('.tree-links a').count() >= entries.filter(e => e.group === target.group).length);
    }
    const n = entries.length - 1;
    await input.fill('xxx-no-match');
    assert.equal(await dialog.locator('.tree-links a').count(),0);
    await input.fill(String(n));
    assert.equal(await dialog.locator('.tree-links a').count(),1);
    await input.press('Enter');
    await page.waitForURL(u => u.pathname === new URL(target.href).pathname);
    await page.evaluate(() => storyReader.go(story.pages.length - 1));
    const before = await page.evaluate(() => storyReader.index);
    await button.click();
    assert.equal(await dialog.locator('.tree-location strong').textContent(), target.label);
    await input.fill(target.label);
    await input.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.entry), String(n));
    await page.keyboard.press('Escape');
    assert.ok(!await dialog.isVisible());
    assert.equal(await page.evaluate(() => storyReader.index),before);
    assert.ok(await button.evaluate(el => document.activeElement === el));
    await page.setViewportSize({width:390,height:760});
    await button.click();
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth));
    await dialog.locator('.tree-root').click();
    await page.waitForURL(u => u.pathname === new URL(entries[0].href).pathname);
    await button.click();
    const leaves = dialog.locator('.tree-leaf');
    await (await leaves.count() ? leaves : dialog.locator('.tree-links a')).first().click();
    await page.waitForURL(u => u.pathname !== new URL(entries[0].href).pathname);
    assert.deepEqual(errors,[]);
    console.log('PASS tree: ' + entries.length + ' entries, placement, groups, search, star links, keyboard, mobile');
  } finally { await browser.close(); if (temp) fs.rmSync(temp,{recursive:true,force:true}); }
})().catch(e => { console.error(e); process.exitCode = 1; });
