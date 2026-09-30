/* compare：左右對照。說明見 README.md。 */
'use strict';
deck.define('compare', (key, items) => {
  if (items.length < 2) throw new Error(`deck.compare(${key}): 至少兩欄`);
  const body = items.map((it, i) => {
    const k = deck.util.itemKey(key, it, i);
    // 欄內放了其他元件時整欄鎖定，由內層元件各自開放編輯，避免巢狀可編輯區。
    const edit = /data-key/.test(it.body) ? '' : ' data-edit';
    return `<section data-key="${k}" data-hide><h3 data-key="${k}-title" data-edit>${it.title}</h3><div data-key="${k}-body"${edit}>${it.body}</div></section>`;
  }).join('');
  return `<div class="deck-compare" data-key="${key}" style="--n:${items.length}">${body}</div>`;
}, {
  summary: '改善前後、方案 A／B 的並排對照。',
  demo: () => deck.compare('demo', [
    { title: '改善前', body: '人工目檢，每件 48 秒。' },
    { title: '改善後', body: 'AOI 初篩＋人工複判，每件 35 秒。' },
  ]),
});
