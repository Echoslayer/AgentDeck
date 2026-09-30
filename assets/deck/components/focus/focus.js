/* focus：單句重點。說明見 README.md。 */
'use strict';
deck.define('focus', (key, html = '', { edit = true } = {}) => `<div class="deck-focus" data-key="${key}"${edit ? ' data-edit' : ''}>${html}</div>`, {
  summary: '一頁只講一句的結論或重點。',
  demo: () => deck.focus('demo', '看見現象 → 理解原因'),
});
