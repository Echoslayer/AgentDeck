/* treemap：階層佔比（預算、程式碼大小、市場份額）；面積即數量。說明見 README.md。特殊元件：需要 vendor/d3/（vendor.json）。
   產生時就算好版面輸出 HTML，沒有動態內容。 */
'use strict';
(() => {
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const f = n => Math.round(n * 100) / 100;
const PALETTE = ['--deck-primary', '--deck-accent', '--deck-highlight', '--muted'];

// { 名稱: 數字 | { …子項 } } → d3.hierarchy 的節點
const toTree = (name, v) => (typeof v === 'number' ? { name, value: v } : { name, children: Object.entries(v).map(([k, c]) => toTree(k, c)) });

deck.define('treemap', (key, data, { unit = '', caption = '' } = {}) => {
  if (!data || typeof data !== 'object') throw new Error(`deck.treemap(${key}): data 需為 { 名稱: 數字或子物件 }`);
  const fmt = v => `${v.toLocaleString()}${unit}`;
  const groups = Object.keys(data);
  const cap = caption ? `<figcaption data-key="${key}-caption" data-edit>${caption}</figcaption>` : '';
  const legend = `<ul class="deck-treemap-legend">${groups.map((g, i) => `<li style="--c:var(${PALETTE[i % PALETTE.length]})">${esc(g)}</li>`).join('')}</ul>`;
  if (!window.d3?.treemap) {
    const sum = v => (typeof v === 'number' ? v : Object.values(v).reduce((a, c) => a + sum(c), 0));
    return `<figure class="deck-treemap" data-key="${key}"><ul class="deck-treemap-list">${groups.map(g => `<li>${esc(g)}：${fmt(sum(data[g]))}</li>`).join('')}</ul>${cap}</figure>`;
  }
  const root = d3.treemap().size([160, 90]).tile(d3.treemapSquarify.ratio(1.2)).paddingInner(0.8)(
    d3.hierarchy(toTree('', data)).sum(d => d.value ?? 0).sort((a, b) => b.value - a.value));
  const total = root.value;
  const tiles = root.leaves().map(d => {
    const top = d.ancestors().at(-2), i = groups.indexOf(top.data.name);
    const shade = Math.round(100 - (d.parent === root ? 0 : (d.parent.children.indexOf(d) % 4) * 12));
    const small = (d.x1 - d.x0) < 18 || (d.y1 - d.y0) < 10;
    const X = v => f(v / 1.6), Y = v => f(v / 0.9); // 160×90 → 百分比
    return `<div class="deck-treemap-tile${small ? ' is-small' : ''}" data-node="${esc(d.data.name)}" style="left:${X(d.x0)}%;top:${Y(d.y0)}%;width:${X(d.x1 - d.x0)}%;height:${Y(d.y1 - d.y0)}%;--c:color-mix(in srgb,var(${PALETTE[i % PALETTE.length]}) ${shade}%,#fff)" title="${esc(d.ancestors().reverse().slice(1).map(a => a.data.name).join(' / '))}：${fmt(d.value)}">`
      + `<b>${esc(d.data.name)}</b><small>${fmt(d.value)}・${Math.round(d.value / total * 100)}%</small></div>`;
  }).join('');
  return `<figure class="deck-treemap" data-key="${key}"><div class="deck-treemap-area" role="img" aria-label="${esc(root.leaves().map(d => `${d.data.name} ${fmt(d.value)}`).join('；'))}">${tiles}</div>${legend}${cap}</figure>`;
}, {
  tier: 'special',
  vendor: ['d3'],
  summary: '階層佔比：預算、程式碼大小、市場份額；面積即數量，顏色是第一層分組。',
  demo: () => deck.treemap('demo', {
    人事: { 研發: 4200, 業務: 1800, 管理: 900 },
    營運: { 雲端: 1600, 辦公室: 700, 差旅: 300 },
    行銷: { 廣告: 1300, 活動: 500 },
    其他: 400,
  }, { unit: ' 萬', caption: '年度支出 1.17 億：人事超過一半。' }),
});
})();
