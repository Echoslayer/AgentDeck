/* range：數值區間與實際值。說明見 README.md。 */
'use strict';
deck.define('range', (key, items, { min, max, unit = '', format = v => v.toLocaleString() } = {}) => {
  const num = v => typeof v === 'number' && Number.isFinite(v);
  for (const it of items) {
    if (!num(it.low) || !num(it.high) || it.low > it.high) throw new Error(`deck.range(${key}): ${it.label} 需要 low ≤ high 的數字`);
    if (it.value != null && !num(it.value)) throw new Error(`deck.range(${key}): ${it.label} 的 value 需為數字`);
  }
  const all = items.flatMap(it => [it.low, it.high, it.value].filter(num));
  const lo = min ?? Math.min(...all), hi = max ?? Math.max(...all);
  if (!(hi > lo)) throw new Error(`deck.range(${key}): max 需大於 min`);
  const pct = v => (Math.min(Math.max((v - lo) / (hi - lo), 0), 1) * 100).toFixed(2) + '%';
  const u = unit ? `<small>${unit}</small>` : '';
  const rows = items.map((it, i) => {
    const k = deck.util.itemKey(key, it, i);
    const has = num(it.value);
    // 實際值落在區間外自動標示，不靠手動 highlight
    const out = has && (it.value < it.low || it.value > it.high);
    const mark = has ? `<em style="left:${pct(it.value)}"></em>` : '';
    const text = has ? `${format(it.value)}${u}` : `${format(it.low)}–${format(it.high)}${u}`;
    return `<div class="deck-range-row${out ? ' deck-hl' : ''}" data-key="${k}" data-hide><span data-key="${k}-label" data-edit>${it.label}</span>`
      + `<i><s style="left:${pct(it.low)};right:calc(100% - ${pct(it.high)})"></s>${mark}</i><b>${text}</b></div>`;
  }).join('');
  return `<div class="deck-range" data-key="${key}">${rows}<div class="deck-range-axis"><span>${format(lo)}</span><span>${format(hi)}${u}</span></div></div>`;
}, {
  summary: '區間（規格上下限、預估範圍）與實際值；超出區間自動標示。',
  demo: () => deck.range('demo', [
    { label: '爐區 1', low: 180, high: 220, value: 205 },
    { label: '爐區 2', low: 190, high: 230, value: 236 },
    { label: '爐區 3（規劃）', low: 170, high: 210 },
  ], { min: 160, max: 250, unit: '°C' }),
});
