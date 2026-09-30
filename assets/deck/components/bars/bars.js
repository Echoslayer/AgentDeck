/* bars：同一尺度的橫條。說明見 README.md。 */
'use strict';
deck.define('bars', (key, items, { max, unit = '', format = v => v.toLocaleString() } = {}) => {
  for (const it of items) {
    if (typeof it.value !== 'number' || !(it.value >= 0)) throw new Error(`deck.bars(${key}): value 需為非負數字，收到 ${JSON.stringify(it.value)}`);
  }
  const top = max ?? Math.max(...items.map(it => it.value));
  if (!(top > 0)) throw new Error(`deck.bars(${key}): max 需大於 0`);
  const rows = items.map((it, i) => {
    const k = deck.util.itemKey(key, it, i);
    const r = Math.min(it.value / top, 1);
    return `<div class="deck-bar${it.highlight ? ' deck-hl' : ''}" data-key="${k}" data-hide style="--r:${r}"><span data-key="${k}-label" data-edit>${it.label}</span><i></i><b>${format(it.value)}${unit ? `<small>${unit}</small>` : ''}</b></div>`;
  }).join('');
  return `<div class="deck-bars" data-key="${key}">${rows}</div>`;
}, {
  summary: '同一尺度的數量比較；長度由數值推導。',
  demo: () => deck.bars('demo', [
    { label: '人工複判', value: 120 },
    { label: '重工', value: 45 },
    { label: '報廢', value: 18, highlight: true },
  ], { unit: '萬／月' }),
});
