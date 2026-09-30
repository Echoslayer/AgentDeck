/* metrics：KPI 大數字。說明見 README.md。 */
'use strict';
deck.define('metrics', (key, items) => {
  const body = items.map((it, i) => {
    const k = deck.util.itemKey(key, it, i);
    return `<div class="deck-metric${it.highlight ? ' deck-hl' : ''}" data-key="${k}" data-hide><p><b data-key="${k}-value" data-edit>${it.value}</b>${it.unit ? `<small>${it.unit}</small>` : ''}</p><span data-key="${k}-label" data-edit>${it.label}</span></div>`;
  }).join('');
  return `<div class="deck-metrics" data-key="${key}">${body}</div>`;
}, {
  summary: '關鍵數字（KPI），一個或多個並排。',
  demo: () => deck.metrics('demo', [
    { value: '97.4', unit: '%', label: '良率', highlight: true },
    { value: '35', unit: '秒', label: '單件工時' },
  ]),
});
