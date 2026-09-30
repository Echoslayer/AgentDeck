/* figure：圖表外框（上方說明、內容、圖例、條件與來源）。說明見 README.md。 */
'use strict';
deck.define('figure', (key, content, { kicker = '', caption = '', legend = [] } = {}) => {
  const head = kicker ? `<p class="deck-kicker" data-key="${key}-kicker" data-edit>${kicker}</p>` : '';
  const keys = legend.length ? `<p class="deck-legend">${legend.map(l => `<span><i style="background:${l.color}"></i>${l.label}</span>`).join('')}</p>` : '';
  const cap = caption ? `<figcaption data-key="${key}-caption" data-edit>${caption}</figcaption>` : '';
  return `<figure class="deck-figure" data-key="${key}">${head}${content}${keys}${cap}</figure>`;
}, {
  summary: '替圖表加上說明、圖例與資料來源。',
  demo: () => deck.figure('demo', '<div style="height:120px;background:var(--tint);border-radius:6px"></div>', {
    kicker: '圖上說明：這張圖要看什麼',
    caption: '資料來源、期間與條件寫在這裡。',
    legend: [{ label: '改善前', color: 'var(--deck-accent)' }, { label: '改善後', color: 'var(--deck-highlight)' }],
  }),
});
