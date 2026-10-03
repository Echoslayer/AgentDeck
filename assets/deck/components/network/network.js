/* network：大型網路圖（相依、引用、概念關聯）；自動排版、可縮放拖曳、點選看鄰居。說明見 README.md。特殊元件：需要 vendor/cytoscape/（vendor.json）。 */
'use strict';
(() => {
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const f = n => Math.round(n * 10) / 10;
const GROUPS = ['--deck-primary', '--deck-accent', '--deck-highlight', '--muted'];

// 排版在產生時算好：縮圖、匯出與動態版位置相同。有 cytoscape 用 cose（初始位置固定，結果穩定），否則排成圓形。
function layout(nodes, edges) {
  const n = nodes.length;
  const pos = nodes.map((_, i) => ({ x: 300 * Math.cos(2 * Math.PI * i / n), y: 300 * Math.sin(2 * Math.PI * i / n) }));
  if (!window.cytoscape) return pos;
  const cy = cytoscape({ headless: true, styleEnabled: true, elements: [
    ...nodes.map((d, i) => ({ data: { id: d.id }, position: pos[i] })),
    ...edges.map(([s, t], i) => ({ data: { id: `e${i}`, source: s, target: t } })),
  ], style: [{ selector: 'node', style: { width: 30, height: 30 } }] });
  cy.layout({ name: 'cose', animate: false, randomize: false, fit: false, nodeRepulsion: () => 9000, idealEdgeLength: () => 70, numIter: 1500 }).run();
  const out = nodes.map(d => ({ ...cy.getElementById(d.id).position() }));
  cy.destroy();
  // 投影片是橫的：結果比較高時轉 90°
  const span = k => Math.max(...out.map(p => p[k])) - Math.min(...out.map(p => p[k]));
  return span('y') > span('x') ? out.map(p => ({ x: p.y, y: -p.x })) : out;
}

deck.define('network', (key, nodes, edges, { directed = false, caption = '', hint = '滾輪縮放、拖曳移動；點節點看它連到誰。' } = {}) => {
  nodes = (nodes ?? []).map(d => (typeof d === 'string' ? { id: d } : d));
  const ids = new Set(nodes.map(d => d.id));
  if (!nodes.length || ids.size !== nodes.length) throw new Error(`deck.network(${key}): nodes 需為不重複的 id`);
  for (const e of edges ?? []) if (!ids.has(e[0]) || !ids.has(e[1])) throw new Error(`deck.network(${key}): 邊 ${e[0]} → ${e[1]} 指到不存在的節點`);
  const groups = [...new Set(nodes.map(d => d.group).filter(Boolean))];
  const pos = layout(nodes, edges);
  const xs = pos.map(p => p.x), ys = pos.map(p => p.y), pad = 40;
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, W = Math.max(...xs) - x0 + pad, H = Math.max(...ys) - y0 + pad;
  const at = Object.fromEntries(nodes.map((d, i) => [d.id, { x: pos[i].x - x0, y: pos[i].y - y0 }]));
  const color = d => `var(${GROUPS[Math.max(0, groups.indexOf(d.group)) % GROUPS.length]})`;
  const lines = edges.map(([s, t]) => {
    const a = at[s], b = at[t], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, k = directed ? 14 / len : 0;
    return `<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x - dx * k)}" y2="${f(b.y - dy * k)}"/>`;
  }).join('');
  const dots = nodes.map(d => {
    const p = at[d.id];
    return `<g transform="translate(${f(p.x)} ${f(p.y)})"><circle r="10" style="fill:${color(d)}"/><text y="24">${esc(d.label ?? d.id)}</text></g>`;
  }).join('');
  const marker = directed ? `<defs><marker id="${key}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>` : '';
  const svg = `<svg class="deck-fallback" viewBox="0 0 ${f(W)} ${f(H)}" aria-hidden="true">${marker}<g class="deck-network-edges"${directed ? ` style="--arrow:url(#${key}-arrow)"` : ''}>${lines}</g>${dots}</svg>`;
  const legend = groups.length ? `<ul class="deck-network-legend">${groups.map((g, i) => `<li style="--c:var(${GROUPS[i % GROUPS.length]})" data-key="${key}-g${i + 1}" data-edit>${esc(g)}</li>`).join('')}</ul>` : '';
  const data = { nodes: nodes.map((d, i) => ({ id: d.id, label: d.label ?? d.id, g: Math.max(0, groups.indexOf(d.group)) % GROUPS.length, x: at[d.id].x, y: at[d.id].y })), edges, directed };
  return `<figure class="deck-network" data-key="${key}" data-graph="${esc(JSON.stringify(data))}" style="--ratio:${f(W / H)}"><div class="deck-view">${svg}</div>`
    + legend + (caption ? `<figcaption data-key="${key}-caption" data-edit>${caption}</figcaption>` : '')
    + (hint ? `<p class="deck-hint">${hint}</p>` : '') + '</figure>';
}, {
  tier: 'special',
  vendor: ['cytoscape'],
  live,
  summary: '節點多、關係交錯的網路（相依、引用、概念先修）；自動排版，點節點突顯鄰居。',
  demo: () => {
    const g = (group, ...ids) => ids.map(id => ({ id, group }));
    return deck.network('demo', [
      ...g('基礎', '向量', '矩陣', '導數', '機率', '梯度'),
      ...g('模型', '線性迴歸', '邏輯迴歸', '神經網路', '卷積', '注意力', 'Transformer'),
      ...g('訓練', '損失函數', '梯度下降', '反向傳播', '正則化', '過擬合', '交叉驗證'),
    ], [
      ['向量', '矩陣'], ['導數', '梯度'], ['矩陣', '線性迴歸'], ['梯度', '梯度下降'], ['機率', '邏輯迴歸'],
      ['線性迴歸', '邏輯迴歸'], ['邏輯迴歸', '神經網路'], ['損失函數', '梯度下降'], ['梯度下降', '反向傳播'],
      ['反向傳播', '神經網路'], ['神經網路', '卷積'], ['神經網路', '注意力'], ['注意力', 'Transformer'], ['矩陣', '注意力'],
      ['過擬合', '正則化'], ['過擬合', '交叉驗證'], ['神經網路', '過擬合'], ['機率', '損失函數'],
    ], { directed: true, caption: '機器學習課程的先修關係：先學箭頭起點。' });
  },
});

function live(el) {
  if (!window.cytoscape) throw new Error('cytoscape 未載入');
  const { nodes, edges, directed } = JSON.parse(el.dataset.graph);
  const token = n => getComputedStyle(el).getPropertyValue(n).trim();
  const colors = GROUPS.map(token), muted = token('--muted'), ink = token('--ink'), hl = token('--deck-highlight');
  const host = document.createElement('div');
  host.className = 'deck-canvas';
  el.querySelector('.deck-view').append(host);
  const cy = cytoscape({
    container: host, minZoom: 0.3, maxZoom: 3,
    elements: [
      ...nodes.map(d => ({ data: { id: d.id, label: d.label, c: colors[d.g] }, position: { x: d.x, y: d.y } })),
      ...edges.map(([s, t], i) => ({ data: { id: `e${i}`, source: s, target: t } })),
    ],
    layout: { name: 'preset', fit: true, padding: 10 },
    style: [
      { selector: 'node', style: { width: 20, height: 20, 'background-color': 'data(c)', label: 'data(label)', 'font-size': 14, color: ink, 'text-valign': 'bottom', 'text-margin-y': 4, 'text-background-color': token('--card'), 'text-background-opacity': 0.85, 'text-background-padding': 2, 'font-family': getComputedStyle(el).fontFamily.split(',')[0].replace(/"/g, '') } },
      { selector: 'edge', style: { width: 1.6, 'line-color': muted, 'curve-style': 'straight', 'target-arrow-shape': directed ? 'triangle' : 'none', 'target-arrow-color': muted, 'arrow-scale': 0.9 } },
      { selector: '.faded', style: { opacity: 0.15 } },
      { selector: 'edge.near', style: { 'line-color': hl, 'target-arrow-color': hl, width: 2.6 } },
      { selector: 'node.focus', style: { 'border-width': 4, 'border-color': hl } },
    ],
  });
  // 點節點：自己與鄰居保留，其餘淡出；點空白處還原
  cy.on('tap', e => {
    cy.elements().removeClass('faded near focus');
    if (e.target === cy || !e.target.isNode()) return;
    const near = e.target.closedNeighborhood();
    cy.elements().not(near).addClass('faded');
    near.edges().addClass('near');
    e.target.addClass('focus');
  });
  return () => { cy.destroy(); host.remove(); };
}
})();
