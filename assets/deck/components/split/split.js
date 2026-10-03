/* split：總量拆成幾股（分流、佔比）。說明見 README.md。 */
'use strict';
deck.define('split', (key, total, parts, { unit = '', format = v => v.toLocaleString() } = {}) => {
  const ok = v => typeof v === 'number' && v >= 0;
  if (!ok(total?.value) || !(total.value > 0)) throw new Error(`deck.split(${key}): total.value 需為正數`);
  if (!Array.isArray(parts) || parts.length < 2) throw new Error(`deck.split(${key}): parts 至少 2 股`);
  for (const p of parts) if (!ok(p.value)) throw new Error(`deck.split(${key}): ${p.label} 的 value 需為非負數字`);
  const sum = parts.reduce((s, p) => s + p.value, 0);
  // 各股加總必須等於總量，否則比例條會說謊
  if (Math.abs(sum - total.value) > 1e-9 * total.value) throw new Error(`deck.split(${key}): parts 加總 ${sum} ≠ total ${total.value}`);
  const u = unit ? `<small>${unit}</small>` : '';
  const pct = v => `${Math.round(v / total.value * 1000) / 10}%`;
  const bar = parts.map(p => `<i class="${p.highlight ? 'deck-hl' : ''}" style="flex:${p.value}"></i>`).join('');
  const cards = parts.map((p, i) => {
    const k = deck.util.itemKey(key, p, i);
    return `<div class="${p.highlight ? 'deck-hl' : ''}" data-key="${k}" data-hide><b>${format(p.value)}${u}<small>${pct(p.value)}</small></b>`
      + `<span data-key="${k}-label" data-edit>${p.label}</span>${p.note ? `<p data-key="${k}-note" data-edit>${p.note}</p>` : ''}</div>`;
  }).join('');
  return `<div class="deck-split" data-key="${key}"><div class="deck-split-total"><b>${format(total.value)}${u}</b><span data-key="${key}-total" data-edit>${total.label ?? ''}</span></div>`
    + `<div class="deck-split-bar" aria-hidden="true">${bar}</div><div class="deck-split-parts" style="--n:${parts.length}">${cards}</div></div>`;
}, {
  summary: '總量拆成幾股：比例條按數量，下方每股附數量、佔比與說明；加總須等於總量。',
  demo: () => deck.split('demo', { value: 100, label: '進入分類流程' }, [
    { label: '自動通過', value: 80 },
    { label: '人工複判', value: 20, note: '20 × 2 分鐘 = 40 分鐘／小時', highlight: true },
  ], { unit: '件／時' }),
});
