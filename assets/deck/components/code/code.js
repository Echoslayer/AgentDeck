/* code：程式碼片段；強調行、兩版差異（diff）、終端機（prompt）。說明見 README.md。特殊元件：需要 vendor/highlight/highlight.min.js（vendor.json）。 */
'use strict';
(() => {
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const trim = s => s.replace(/^\n+|\s+$/g, '');

// 產生時就上色：縮圖與匯出也有顏色；未載入 highlight.js 或語言不認得時為純文字
const colorize = (src, lang) => (lang && window.hljs?.getLanguage(lang) ? window.hljs.highlight(src, { language: lang, ignoreIllegals: true }).value : esc(src));

// 上色結果按行切開：跨行的 <span>（多行註解、字串）在行尾關閉、下一行重新開啟
function splitLines(html) {
  const out = [], open = [];
  let cur = '';
  for (const t of html.split(/(<span[^>]*>|<\/span>|\n)/)) {
    if (t === '\n') { out.push(cur + '</span>'.repeat(open.length)); cur = open.join(''); }
    else { if (t.startsWith('<span')) open.push(t); else if (t === '</span>') open.pop(); cur += t; }
  }
  out.push(cur + '</span>'.repeat(open.length));
  return out;
}

// 逐行 LCS；投影片程式碼只有十幾行，O(n·m) 足夠
function diffLines(a, b) {
  const L = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) ops.push(['=', j++, i++]);
    else if (i < a.length && (j === b.length || L[i + 1][j] >= L[i][j + 1])) ops.push(['-', i++]); // 同分時先刪後增，與一般 diff 一致
    else ops.push(['+', j++]);
  }
  return ops;
}

deck.define('code', (key, source, { lang = '', lines = [], caption = '', diff, prompt } = {}) => {
  if (typeof source !== 'string') throw new Error(`deck.code(${key}): source 需為字串`);
  if ([diff != null, prompt != null, lines.length > 0].filter(Boolean).length > 1) throw new Error(`deck.code(${key}): lines、diff、prompt 一次只用一種`);
  const src = trim(source);
  const raw = src.split('\n');
  for (const l of lines) if (!(Number.isInteger(l) && l >= 1 && l <= raw.length)) throw new Error(`deck.code(${key}): lines 需為 1–${raw.length} 的行號，收到 ${l}`);
  let rows;
  if (diff != null) {
    const old = trim(diff), oldRaw = old.split('\n');
    const now = splitLines(colorize(src, lang)), before = splitLines(colorize(old, lang));
    rows = diffLines(oldRaw, raw).map(([op, j, i]) => (op === '-' ? ['is-del', before[j]] : [op === '+' ? 'is-add' : '', now[j]]));
  } else if (prompt != null) {
    // 以 prompt 開頭的是指令，其餘是輸出
    rows = raw.map(l => (l.startsWith(prompt) ? ['is-cmd', `<span class="deck-code-prompt">${esc(prompt)}</span>${esc(l.slice(prompt.length))}`] : ['is-out', esc(l)]));
  } else {
    rows = splitLines(colorize(src, lang)).map((h, i) => [lines.includes(i + 1) ? 'is-hl' : '', h]);
  }
  const mode = diff != null ? ' deck-code-diff' : prompt != null ? ' deck-code-term' : lines.length ? ' deck-code-focus' : '';
  const body = rows.map(([c, h]) => `<span class="${c}">${h || ' '}</span>`).join('');
  return `<figure class="deck-code${mode}" data-key="${key}"><pre><code>${body}</code></pre>`
    + (caption ? `<figcaption data-key="${key}-caption" data-edit>${caption}</figcaption>` : '') + '</figure>';
}, {
  tier: 'special',
  vendor: ['highlight'],
  summary: '程式碼片段：強調行、兩版差異或終端機；載入 highlight.js 時上色。',
  demo: () => deck.code('demo', `
std::unordered_set<std::string> seen;
for (const auto& row : rows) {
  if (!seen.insert(row.id).second) return reject(row);
}`, { lang: 'cpp', caption: 'G02 → G03：查重從逐筆掃描改成集合，報告順序仍由 rows 保存。', diff: `
for (size_t i = 0; i < rows.size(); ++i) {
  for (size_t j = 0; j < i; ++j)
    if (rows[j].id == rows[i].id) return reject(rows[i]);
}` }),
});
})();
