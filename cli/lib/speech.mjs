// 語音資料檢查獨立於 PPT 匯出；不需要 pptxgenjs 或 ffmpeg。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fail } from './util.mjs';
import { launch, runStep, coreReady, OLD_CORE } from './export.mjs';

export async function checkSpeech(dir, root, { replay = '2' } = {}, log = console.log) {
  if (!['1', '2'].includes(String(replay))) fail('--replay 只能是 1 或 2');
  let pw;
  try { pw = await import('playwright'); } catch { fail('語音檢查需要已列為選用依賴的 playwright；請先在 AgentDeck 安裝依賴。'); }
  const env = await launch(pw.chromium);
  if (!env) fail('找不到可啟動的 Chrome、Edge 或 Playwright Chromium。');
  const bad = [], warnings = [];
  let checked = 0;
  try {
    const context = await env.browser.newContext({ viewport: { width: 1600, height: 1100 }, acceptDownloads: false });
    // 驗證離線簡報，禁止測試時的遠端請求。
    await context.route(/^https?:/, route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', e => bad.push(`頁面錯誤：${e.message}`));
    page.on('dialog', dialog => dialog.dismiss());
    page.on('popup', popup => popup.close());
    await page.goto(pathToFileURL(path.join(dir, 'index.html')).href);
    await page.waitForFunction(() => window.storyReader, null, { timeout: 10000 });
    if (!await coreReady(page)) fail(OLD_CORE);
    const count = await page.evaluate(() => story.pages.length);
    for (let i = 0; i < count; i++) {
      // 換頁轉場內非同步渲染；等 story:render 再檢查，否則動作會找不到新頁的元素。
      await page.evaluate(i => new Promise(done => { document.addEventListener('story:render', done, { once: true }); storyReader.go(i); }), i);
      const p = await page.evaluate(() => {
        const p = storyReader.page;
        return { id: p.id, audio: p.audio, cues: p.cues, record: p.record, n: deckSpeech.sentences(p).length };
      });
      if (!p.audio && !p.n && !p.record?.some(s => s.at)) continue;
      checked++;
      let duration;
      if (p.audio) {
        try {
          const url = new URL(p.audio, page.url());
          if (url.protocol !== 'file:') throw new Error('音檔必須位於本簡報單位');
          const file = fs.realpathSync(fileURLToPath(url)), base = fs.realpathSync(root);
          const rel = path.relative(base, file);
          if (rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) throw new Error('音檔超出簡報單位');
          duration = await page.evaluate(src => new Promise((resolve, reject) => {
            const audio = new Audio();
            const timer = setTimeout(() => finish(new Error('讀取音檔逾時')), 5000);
            function finish(error) { clearTimeout(timer); audio.onloadedmetadata = audio.onerror = null; const d = audio.duration; audio.removeAttribute('src'); audio.load(); error ? reject(error) : resolve(d); }
            audio.onloadedmetadata = () => Number.isFinite(audio.duration) && audio.duration > 0 ? finish() : finish(new Error('音檔時長無效'));
            audio.onerror = () => finish(new Error('音檔無法解碼'));
            audio.src = src;
          }), p.audio);
        } catch (e) { bad.push(`${p.id}：${e.message.split('\n')[0]}`); }
        if (!p.cues) warnings.push(`${p.id}：沒有 cues，播放將依字數估算同步`);
      }
      // 規則與編輯器載入時相同（deck-editor.js 的 deckSpeech）；編輯器只警告的項目，這裡一律算錯。
      const { errors, warnings: w } = await page.evaluate(d => deckSpeech.problems(storyReader.page, d), duration);
      bad.push(...[...errors, ...w].map(s => `${p.id}：${s}`));
      if (!p.record?.some(s => s.at)) continue;
      // 同頁連續重跑，不替作者重設狀態；由第一組動作負責初始化。
      for (let round = 1; round <= Number(replay); round++) {
        for (const [k, s] of p.record.entries()) {
          try { await runStep(page, s, { dry: true }); }
          catch (e) { bad.push(`${p.id}：第 ${round} 輪第 ${k + 1} 步：${e.message.split('\n')[0]}`); break; }
        }
      }
    }
  } finally { await env.browser.close(); }
  for (const warning of warnings) log(`提醒：${warning}`);
  for (const problem of [...new Set(bad)]) log(`錯誤：${problem}`);
  log(`語音資料與動作檢查：${checked} 頁，${bad.length ? '未通過' : '通過'}（動作執行 ${replay} 輪）`);
  log('尚未驗證：音質、語意與動作是否一致、多語速實播、PPT 匯出。重跑成功不代表結果相同，仍須核對案例數值。');
  return !bad.length;
}
