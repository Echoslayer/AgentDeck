/* cards：並列卡片。說明見 README.md。 */
'use strict';
deck.define('cards', (key, items) => {
  const body = items.map((it, i) => {
    const k = deck.util.itemKey(key, it, i);
    return `<div class="deck-card" data-key="${k}" data-hide><b data-key="${k}-title" data-edit>${it.title}</b><span data-key="${k}-text" data-edit>${it.text}</span></div>`;
  }).join('');
  return `<div class="deck-cards" data-key="${key}">${body}</div>`;
}, {
  summary: '並列同粒度的項目，每張卡可單獨隱藏。',
  demo: () => deck.cards('demo', [
    { title: '現況', text: '目前的做法與限制。' },
    { title: '改善', text: '調整了什麼、為什麼。' },
    { title: '效益', text: '可量化的結果。' },
  ]),
});
