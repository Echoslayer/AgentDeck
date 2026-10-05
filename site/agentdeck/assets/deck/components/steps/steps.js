/* steps：流程步驟，步驟間自動加箭頭。說明見 README.md。 */
'use strict';
deck.define('steps', (key, items) => {
  const { itemKey, textOf } = deck.util;
  const body = items.map((it, i) => `<div data-key="${itemKey(key, it, i)}" data-edit>${textOf(it)}</div>`).join('<i>→</i>');
  return `<div class="deck-steps" data-key="${key}">${body}</div>`;
}, {
  summary: '單向的步驟與先後順序。',
  demo: () => deck.steps('demo', ['輸入', '處理', '輸出']),
});
