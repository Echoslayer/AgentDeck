/* cube（零依賴）：同一主題的四個面向，CSS 3D 旋轉稜柱，一次看一面。說明見 README.md。 */
'use strict';
deck.define('cube', (key, faces, { interval = 3 } = {}) => {
  if (!Array.isArray(faces) || faces.length !== 4) throw new Error(`deck.cube(${key}): faces 需剛好 4 面`);
  if (!(interval >= 1)) throw new Error(`deck.cube(${key}): interval 需至少 1 秒`);
  const html = faces.map((f, i) => {
    const k = deck.util.itemKey(key, f, i);
    return `<div class="deck-cube-face${f.highlight ? ' deck-hl' : ''}" style="--n:${i}" data-key="${k}" data-hide>`
      + `<small>${i + 1} / 4</small><b data-key="${k}-title" data-edit>${f.title}</b>`
      + (f.text ? `<p data-key="${k}-text" data-edit>${f.text}</p>` : '') + '</div>';
  }).join('');
  return `<div class="deck-cube" data-key="${key}" style="--t:${interval * 4}s"><div class="deck-cube-spin">${html}</div></div>`;
}, {
  tier: 'special',
  summary: '同一主題的四個面向，輪流轉到正面（純 CSS 3D，零依賴）。滑過暫停，編輯模式攤平。',
  demo: () => deck.cube('demo', [
    { title: '品質', text: '良率從 91% 提升到 97%' },
    { title: '成本', text: '每月減少 120 萬重工' },
    { title: '交期', text: '週期縮短 2 天', highlight: true },
    { title: '人力', text: '複判人力減半' },
  ]),
});
