/* sankey：數量從哪裡來、往哪裡去（預算分配、流量、轉換漏斗）。說明見 README.md。特殊元件：需要 vendor/d3/（d3 與 d3-sankey，vendor.json）。
   產生時就算好版面輸出 SVG，沒有動態內容；縮圖、匯出與單頁相同。 */
'use strict';
(() => {
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const f = n => Math.round(n * 10) / 10;
const PALETTE = ['--deck-primary', '--deck-accent', '--deck-highlight', '--muted'];

deck.define('sankey', (key, links, { unit = '', caption = '' } = {}) => {
  if (!Array.isArray(links) || !links.length || links.some(l => !(l.length === 3 && typeof l[2] === 'number' && l[2] > 0))) {
    throw new Error(`deck.sankey(${key}): links 需為 [來源, 去處, 正數] 的陣列`);
  }
  const fmt = v => `${v.toLocaleString()}${unit}`;
  const names = [...new Set(links.flatMap(l => [l[0], l[1]]))];
  const cap = caption ? `<figcaption data-key="${key}-caption" data-edit>${caption}</figcaption>` : '';
  // 沒有 d3：退成逐條清單
  if (!window.d3?.sankey) {
    return `<figure class="deck-sankey" data-key="${key}"><ul class="deck-sankey-list">${links.map(([s, t, v]) => `<li>${esc(s)} → ${esc(t)}：${fmt(v)}</li>`).join('')}</ul>${cap}</figure>`;
  }
  const W = 800, H = 420;
  const { nodes, links: ls } = d3.sankey().nodeId(d => d.name).nodeWidth(14).nodePadding(18).nodeSort(null).extent([[1, 6], [W - 1, H - 6]])({
    nodes: names.map(name => ({ name })), links: links.map(([source, target, value]) => ({ source, target, value })),
  });
  const maxDepth = Math.max(...nodes.map(n => n.depth));
  // 每個第一欄節點一種顏色，往後的連線沿用來源的顏色
  const roots = nodes.filter(n => !n.targetLinks.length);
  const colorOf = n => (n.targetLinks.length ? colorOf(n.targetLinks.reduce((a, b) => (b.value > a.value ? b : a)).source) : `var(${PALETTE[roots.indexOf(n) % PALETTE.length]})`);
  const path = d3.sankeyLinkHorizontal();
  const paths = ls.map(l => `<path d="${path(l)}" style="stroke:${colorOf(l.source)};stroke-width:${f(Math.max(1, l.width))}"><title>${esc(l.source.name)} → ${esc(l.target.name)}：${fmt(l.value)}</title></path>`).join('');
  // 每個節點一組（色塊＋標籤），帶 data-node 供朗讀動作的 box／arrow 指向
  const nodeGroups = nodes.map(n => {
    const right = n.depth < maxDepth;
    return `<g data-node="${esc(n.name)}"><rect x="${f(n.x0)}" y="${f(n.y0)}" width="${f(n.x1 - n.x0)}" height="${f(Math.max(1, n.y1 - n.y0))}" style="fill:${colorOf(n)}"/>`
      + `<text x="${f(right ? n.x1 + 8 : n.x0 - 8)}" y="${f((n.y0 + n.y1) / 2)}" text-anchor="${right ? 'start' : 'end'}">${esc(n.name)}<tspan dx="6">${fmt(n.value)}</tspan></text></g>`;
  }).join('');
  return `<figure class="deck-sankey" data-key="${key}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(links.map(([s, t, v]) => `${s} → ${t} ${fmt(v)}`).join('；'))}">`
    + `<g class="deck-sankey-links">${paths}</g><g class="deck-sankey-nodes">${nodeGroups}</g></svg>${cap}</figure>`;
}, {
  tier: 'special',
  vendor: ['d3'],
  summary: '數量從哪裡來、分到哪裡去：預算分配、流量去向、轉換漏斗；寬度即數量。',
  demo: () => deck.sankey('demo', [
    ['自然搜尋', '首頁', 4200], ['廣告', '首頁', 2600], ['廣告', '活動頁', 1800], ['社群', '活動頁', 1400],
    ['首頁', '商品頁', 3900], ['首頁', '離開', 2900], ['活動頁', '商品頁', 2300], ['活動頁', '離開', 900],
    ['商品頁', '結帳', 1700], ['商品頁', '離開', 4500],
  ], { unit: ' 人', caption: '本月訪客從哪裡進來、在哪一步離開。滑過連線看數字。' }),
});
})();
