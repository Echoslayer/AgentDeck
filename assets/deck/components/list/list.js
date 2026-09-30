/* list：四層階層清單（● → – → 1. → 1)）。說明見 README.md。 */
'use strict';
(() => {
  const TAGS = ['ul', 'ul', 'ol', 'ol'];
  deck.define('list', (key, items) => {
    const { textOf } = deck.util;
    const render = (items, depth) => items.map(it => {
      const sub = typeof it === 'object' && it.items?.length ? it.items : null;
      if (sub && depth >= TAGS.length - 1) throw new Error(`deck.list(${key}): 最多四層`);
      const children = sub ? `<${TAGS[depth + 1]}>${render(sub, depth + 1)}</${TAGS[depth + 1]}>` : '';
      return `<li>${textOf(it)}${children}</li>`;
    }).join('');
    return `<ul class="deck-list" data-key="${key}" data-edit>${render(items, 0)}</ul>`;
  }, {
    summary: '條列重點與層次，最多四層。',
    demo: () => deck.list('demo', [
      { text: '第一層重點', items: [{ text: '第二層說明', items: [{ text: '第三層步驟', items: ['第四層細節'] }] }] },
      '另一個第一層重點',
    ]),
  });
})();
