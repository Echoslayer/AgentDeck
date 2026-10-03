// 語音資料檢查獨立於 PPT 匯出；不需要 pptxgenjs 或 ffmpeg。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fail } from './util.mjs';
import { launch, runStep } from './export.mjs';

export function speechProblems(p, duration) {
  const bad = [], parts = p.sentences ?? [];
  const cues = p.cues;
  if (p.audio && !parts.length) bad.push('有音檔但沒有口語稿，無法核對逐句同步');
  if (cues !== undefined) {
    if (!Array.isArray(cues) || !cues.every((t, i) => Number.isFinite(t) && t >= 0 && (!i || t > cues[i - 1]))) bad.push('cues 必須是嚴格遞增的非負秒數');
    else {
      if (cues.length !== parts.length) bad.push(`cues ${cues.length} 個，口語稿 ${parts.length} 句`);
      if (Number.isFinite(duration) && cues.some(t => t >= duration)) bad.push('cues 超過音檔時長');
    }
  }
  if (p.record !== undefined && !Array.isArray(p.record)) { bad.push('record 必須是陣列'); return bad; }
  let at = 1, elapsed = 0;
  for (const [i, s] of (p.record ?? []).entries()) {
    if (!s || typeof s !== 'object') { bad.push(`第 ${i + 1} 步不是物件`); continue; }
    if (s.at !== undefined) {
      if (!Number.isInteger(s.at) || s.at < at || s.at > parts.length) bad.push(`第 ${i + 1} 步 at 超出句數或順序倒退`);
      if (s.at !== at) elapsed = 0;
      at = s.at;
    }
    if (s.wait !== undefined && (!Number.isFinite(s.wait) || s.wait < 0)) bad.push(`第 ${i + 1} 步 wait 必須是非負毫秒數`);
    elapsed += (Number.isFinite(s.wait) ? s.wait / 1000 : 0) + (s.drag ? 1 : 0);
    if (Array.isArray(cues) && Number.isFinite(cues[at - 1])) {
      const end = cues[at] ?? duration;
      if (Number.isFinite(end) && elapsed >= end - cues[at - 1]) bad.push(`第 ${at} 句的等待／拖曳時間超過句子時段`);
    }
  }
  return [...new Set(bad)];
}

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
    const count = await page.evaluate(() => story.pages.length);
    for (let i = 0; i < count; i++) {
      await page.evaluate(i => storyReader.go(i), i);
      const p = await page.evaluate(() => {
        const p = storyReader.page, div = document.createElement('div');
        div.innerHTML = (p.speech ?? '').replace(/<br\s*\/?>/gi, '\n');
        return { id: p.id, audio: p.audio, cues: p.cues, record: p.record,
          sentences: div.textContent.split(/(?<=[。！？!?；;\n])/).map(s => s.trim()).filter(Boolean) };
      });
      if (!p.audio && !p.sentences.length && !p.record?.some(s => s.at)) continue;
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
      bad.push(...speechProblems(p, duration).map(s => `${p.id}：${s}`));
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
