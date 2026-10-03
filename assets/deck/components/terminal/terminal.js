/* terminal：重播終端機操作（打字、輸出、可暫停與拖時間軸）。說明見 README.md。特殊元件：需要 vendor/asciinema-player/（vendor.json）。 */
'use strict';
(() => {
// 播放器樣式隨套件下載，依本檔位置找：上游 vendor/、下游 agentdeck/vendor/ 都在往上四層
const CSS = document.currentScript && new URL('../../../../vendor/asciinema-player/asciinema-player.css', document.currentScript.src).href;
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const trim = s => s.replace(/^\n+|\s+$/g, '');
// eslint-disable-next-line no-control-regex
const stripAnsi = s => s.replace(/\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07/g, '');

// 腳本 → asciicast v2：以 prompt 開頭的行逐字打出，其餘行直接輸出。間隔固定，重播結果每次一樣。
function toCast(lines, prompt, cols, rows) {
  const ev = [];
  let t = 0.6;
  const out = s => ev.push([+t.toFixed(3), 'o', s]);
  for (const l of lines) {
    if (l.startsWith(prompt)) {
      t += 0.5; out(`\x1b[1;32m${prompt}\x1b[0m`);
      for (const [i, ch] of [...l.slice(prompt.length)].entries()) { t += 0.045 + (i % 3) * 0.02; out(ch); }
      t += 0.45; out('\r\n');
    } else { t += 0.06; out(`${l}\r\n`); }
  }
  t += 0.4; out(`\x1b[1;32m${prompt}\x1b[0m`);
  return [JSON.stringify({ version: 2, width: cols, height: rows }), ...ev.map(e => JSON.stringify(e))].join('\n');
}

// 錄製檔的最後畫面（靜態後備）：串起輸出、去掉控制碼，取最後 rows 行
function castTail(cast, rows) {
  const text = cast.split('\n').slice(1).filter(Boolean).map(l => JSON.parse(l)).filter(e => e[1] === 'o').map(e => e[2]).join('');
  return stripAnsi(text).replace(/\r\n/g, '\n').split('\n').map(l => l.split('\r').pop()).slice(-rows);
}

deck.define('terminal', (key, source, { prompt = '$ ', cols = 72, rows = 12, caption = '', hint = '可暫停、拖時間軸；空白鍵播放。' } = {}) => {
  if (typeof source !== 'string') throw new Error(`deck.terminal(${key}): source 需為字串（腳本或 asciicast v2）`);
  const isCast = source.trimStart().startsWith('{"version"');
  let cast, still;
  if (isCast) {
    cast = source.trim();
    still = castTail(cast, rows).map(l => `<span>${esc(l) || ' '}</span>`);
  } else {
    const lines = trim(source).split('\n');
    cast = toCast(lines, prompt, cols, rows);
    still = lines.slice(-rows).map(l => (l.startsWith(prompt) ? `<span class="is-cmd"><i>${esc(prompt)}</i>${esc(l.slice(prompt.length))}</span>` : `<span>${esc(l) || ' '}</span>`));
  }
  return `<figure class="deck-terminal" data-key="${key}" data-cast="${esc(cast)}" data-cols="${cols}" data-rows="${rows}">`
    + `<div class="deck-view"><pre class="deck-fallback" style="--rows:${rows}">${still.join('')}</pre></div>`
    + (caption ? `<figcaption data-key="${key}-caption" data-edit>${caption}</figcaption>` : '')
    + (hint ? `<p class="deck-hint">${hint}</p>` : '') + '</figure>';
}, {
  tier: 'special',
  vendor: ['asciinema-player'],
  live,
  summary: '重播終端機操作：逐字打出指令、逐行輸出；可暫停與拖時間軸。也接受 asciinema 錄製檔。',
  demo: () => deck.terminal('demo', `
$ agentdeck init talks/q3-review
建立 talks/q3-review/（index.html、agentdeck/、resources/）
$ cd talks/q3-review && agentdeck add flow terminal
+ agentdeck/assets/deck/components/flow/
+ agentdeck/assets/deck/components/terminal/
需要套件：asciinema-player → 執行 agentdeck vendor
$ agentdeck vendor
asciinema-player 3.17.0  ✓ sha256
$ agentdeck pack
dist/q3-review.zip  1.8 MB`, { caption: '從建立到打包：四個指令。' }),
});

function live(el) {
  if (!window.AsciinemaPlayer) throw new Error('asciinema-player 未載入：引用 vendor/asciinema-player/asciinema-player.min.js 並執行 agentdeck vendor');
  if (CSS && !document.querySelector(`link[href="${CSS}"]`)) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: CSS }));
  const view = el.querySelector('.deck-view');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const player = AsciinemaPlayer.create({ data: el.dataset.cast }, view, {
    cols: +el.dataset.cols, rows: +el.dataset.rows, fit: 'width', theme: 'deck',
    autoPlay: !reduced, preload: true, idleTimeLimit: 1.5, controls: true,
  });
  return () => player.dispose();
}
})();
