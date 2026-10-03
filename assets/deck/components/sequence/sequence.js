/* sequence：多方時序（請求、回覆、遺失、本地事件）。說明見 README.md。 */
'use strict';
deck.define('sequence', (key, actors, rows) => {
  if (!Array.isArray(actors) || actors.length < 2 || actors.length > 4) throw new Error(`deck.sequence(${key}): actors 需為 2–4 個`);
  const col = name => { const i = actors.indexOf(name); if (i < 0) throw new Error(`deck.sequence(${key}): 沒有參與者「${name}」`); return i + 1; };
  const head = actors.map((a, i) => `<b style="grid-column:${i + 1}" data-key="${key}-a${i + 1}" data-edit>${a}</b>`).join('');
  const lifelines = actors.map((_, i) => `<i style="grid-column:${i + 1}"></i>`).join('');
  const body = rows.map((r, i) => {
    const k = deck.util.itemKey(key, r, i), row = `grid-row:${i + 2}`;
    const hl = r.highlight ? ' deck-hl' : '';
    if (r.at) return `<p class="deck-seq-event${hl}" style="${row};grid-column:${col(r.at)}" data-key="${k}" data-hide><span data-key="${k}-text" data-edit>${r.text}</span></p>`;
    const a = col(r.from), b = col(r.to);
    if (a === b) throw new Error(`deck.sequence(${key}): 同一方的事件請用 { at, text }`);
    // 訊息橫跨兩條生命線之間：起訖各內縮半欄
    return `<p class="deck-seq-msg${b < a ? ' is-left' : ''}${r.lost ? ' is-lost' : ''}${hl}" style="${row};grid-column:${Math.min(a, b)}/${Math.max(a, b) + 1};--k:${Math.abs(b - a) + 1}" data-key="${k}" data-hide>`
      + `<span data-key="${k}-text" data-edit>${r.text}</span></p>`;
  }).join('');
  return `<div class="deck-sequence" data-key="${key}" style="grid-template-columns:repeat(${actors.length},minmax(0,1fr));grid-template-rows:auto repeat(${rows.length},auto)">`
    + `${lifelines}${head}${body}</div>`;
}, {
  summary: '多方之間的事件順序：請求、回覆、遺失與各方本地事件；由上往下是順序，間距不代表時間。',
  demo: () => deck.sequence('demo', ['用戶端', '資料庫'], [
    { from: '用戶端', to: '資料庫', text: '送出交易 X' },
    { at: '資料庫', text: '提交成功 ✓' },
    { from: '資料庫', to: '用戶端', text: '成功回覆', lost: true },
    { at: '用戶端', text: '逾時：結果未知', highlight: true },
  ]),
});
