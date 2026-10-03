/* timeline：時程與里程碑。說明見 README.md。 */
'use strict';
deck.define('timeline', (key, items) => {
  const now = items.findIndex(it => it.now);
  const body = items.map((it, i) => {
    const k = deck.util.itemKey(key, it, i);
    // ponytail: 節點等距排列，不按實際日期比例；需要真實時間刻度時再加 scale 選項
    const state = now < 0 ? '' : i < now ? ' deck-done' : i === now ? ' deck-now' : '';
    return `<li class="${state.trim()}" data-key="${k}" data-hide><time data-key="${k}-date" data-edit>${it.date}</time><span data-key="${k}-label" data-edit>${it.label}</span></li>`;
  }).join('');
  return `<ol class="deck-timeline" data-key="${key}">${body}</ol>`;
}, {
  summary: '有日期的里程碑；標記 now 的節點之前為已完成，之後為未來。',
  demo: () => deck.timeline('demo', [
    { date: '2026 Q1', label: '需求訪談' },
    { date: '2026 Q2', label: 'PoC 驗證' },
    { date: '2026 Q3', label: '試產導入', now: true },
    { date: '2026 Q4', label: '全線上線' },
  ]),
});
