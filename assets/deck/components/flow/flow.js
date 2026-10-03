/* flow：分支流程圖（判斷、回圈、樹狀），零依賴分層排版。說明見 README.md。判斷用六角形而非菱形：菱形放不下一句中文。 */
'use strict';
(() => {
const NW = 150, NH = 56, GAP_R = 46, GAP_P = 34, PAD = 12, LANE = 18;

deck.define('flow', (key, nodes, edges, { dir = 'TB' } = {}) => {
  const fail = msg => { throw new Error(`deck.flow(${key}): ${msg}`); };
  if (!['TB', 'LR'].includes(dir)) fail(`dir 需為 TB 或 LR`);
  const idx = new Map();
  nodes.forEach((n, i) => { if (!n.id || idx.has(n.id)) fail(`node id 缺少或重複：${n.id}`); idx.set(n.id, i); });
  const E = edges.map(e => (Array.isArray(e) ? { from: e[0], to: e[1], label: e[2] } : e));
  for (const e of E) if (!idx.has(e.from) || !idx.has(e.to)) fail(`edge 指向不存在的節點：${e.from} → ${e.to}`);
  const L = layout(nodes.length, E.map(e => [idx.get(e.from), idx.get(e.to)]));

  // 版面座標：rank 軸（TB 為縱、LR 為橫）與 pos 軸
  const tb = dir === 'TB';
  const along = tb ? NH : NW, across = tb ? NW : NH;
  const RS = along + GAP_R, PS = across + GAP_P;
  const lanes = L.back.length ? GAP_P / 2 + L.back.length * LANE : 0;
  const PADR = PAD + (L.back.length ? GAP_R / 2 : 0); // 回頭邊會走到首尾兩層外側
  const rankLen = PADR * 2 + L.ranks * RS - GAP_R, posLen = PAD * 2 + L.width * PS - GAP_P + lanes;
  const [W, H] = tb ? [posLen, rankLen] : [rankLen, posLen];
  const xy = (r, p) => (tb ? [p, r] : [r, p]);
  const center = v => [PADR + v.rank * RS + along / 2, PAD + v.pos * PS + across / 2];
  const f = n => Math.round(n * 10) / 10;
  const P = (r, p) => xy(r, p).map(f).join(',');

  const paths = [], labels = [];
  const label = (e, i, r, p) => {
    if (!e.label) return;
    const [x, y] = xy(r, p);
    labels.push(`<span class="deck-flow-elabel" style="left:${f(x / W * 100)}%;top:${f(y / H * 100)}%" data-key="${key}-e${i + 1}" data-edit>${e.label}</span>`);
  };
  L.chains.forEach((chain, i) => {
    const e = E[i];
    if (L.back.includes(i)) {
      // 回頭的邊：從節點出口端進入層間空隙（空隙裡沒有節點），沿外側車道回到目標入口端
      const k = L.back.indexOf(i);
      const lane = PAD + L.width * PS - GAP_P + GAP_P / 2 + (k + 0.5) * LANE;
      const [ru, pu] = center(L.v[chain[0]]), [rv, pv] = center(L.v[chain.at(-1)]);
      const ro = ru + along / 2 + GAP_R / 2 - k * 6, ri = rv - along / 2 - GAP_R / 2 + k * 6;
      paths.push(`<path class="deck-flow-back" d="M${P(ru + along / 2, pu)}L${P(ro, pu)}L${P(ro, lane)}L${P(ri, lane)}L${P(ri, pv)}L${P(rv - along / 2, pv)}"/>`);
      label(e, i, (ru + rv) / 2, lane);
      return;
    }
    // 前進的邊：經過每個虛擬節點，逐段以 S 形曲線連接
    const pts = chain.map(c => center(L.v[c]));
    pts[0] = [pts[0][0] + along / 2, pts[0][1]];
    pts[pts.length - 1] = [pts.at(-1)[0] - along / 2, pts.at(-1)[1]];
    let d = `M${P(...pts[0])}`;
    for (let j = 1; j < pts.length; j++) {
      const [r0, p0] = pts[j - 1], [r1, p1] = pts[j], m = (r1 - r0) / 2;
      d += `C${P(r0 + m, p0)} ${P(r1 - m, p1)} ${P(r1, p1)}`;
    }
    paths.push(`<path d="${d}"/>`);
    // 標籤放在第一段 35% 處，靠近分支起點才讀得出「是／否」屬於哪個判斷
    const [r0, p0] = pts[0], [r1, p1] = pts[1], m = (r1 - r0) / 2, t = 0.35, u = 1 - t;
    label(e, i, u ** 3 * r0 + 3 * u * u * t * (r0 + m) + 3 * u * t * t * (r1 - m) + t ** 3 * r1, u ** 3 * p0 + 3 * u * u * t * p0 + 3 * u * t * t * p1 + t ** 3 * p1);
  });

  const shapes = nodes.map((n, i) => {
    const [x, y] = xy(...center(L.v[i]));
    const cls = `deck-flow-${n.type || 'step'}${n.highlight ? ' deck-hl' : ''}`;
    const shape = n.type === 'decision'
      ? `<polygon class="${cls}" points="${[[x - NW / 2 + 16, y - NH / 2], [x + NW / 2 - 16, y - NH / 2], [x + NW / 2, y], [x + NW / 2 - 16, y + NH / 2], [x - NW / 2 + 16, y + NH / 2], [x - NW / 2, y]].map(q => q.map(f).join(',')).join(' ')}"/>`
      : `<rect class="${cls}" x="${f(x - NW / 2)}" y="${f(y - NH / 2)}" width="${NW}" height="${NH}" rx="${n.type === 'start' || n.type === 'end' ? NH / 2 : 8}"/>`;
    labels.push(`<span class="deck-flow-label deck-flow-t-${n.type || 'step'}${n.highlight ? ' deck-hl' : ''}" style="left:${f((x - NW / 2) / W * 100)}%;top:${f((y - NH / 2) / H * 100)}%;width:${f(NW / W * 100)}%;height:${f(NH / H * 100)}%" data-key="${key}-${n.id}" data-edit>${n.text}</span>`);
    return shape;
  }).join('');

  const marker = `<defs><marker id="${key}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z"/></marker></defs>`;
  return `<div class="deck-flow" data-key="${key}"><div class="deck-flow-canvas" style="aspect-ratio:${f(W)}/${f(H)};width:min(100%,${f(W * 1.3)}px,calc(60vh * ${f(W / H)}))">`
    + `<svg viewBox="0 0 ${f(W)} ${f(H)}" aria-hidden="true">${marker}<g class="deck-flow-edges" style="--arrow:url(#${key}-arrow)">${paths.join('')}</g>${shapes}</svg>`
    + `<div class="deck-flow-text" style="--u:${f(100 / W)}cqw">${labels.join('')}</div></div></div>`;
}, {
  summary: '有分支、判斷或回圈的流程；節點自動分層排版。',
  demo: () => deck.flow('demo', [
    { id: 'in', text: '收到異常', type: 'start' },
    { id: 'auto', text: '自動判定可信？', type: 'decision' },
    { id: 'pass', text: '直接放行' },
    { id: 'manual', text: '人工複判' },
    { id: 'defect', text: '是否為缺陷？', type: 'decision' },
    { id: 'scrap', text: '報廢並回饋模型', highlight: true },
    { id: 'end', text: '結案', type: 'end' },
  ], [
    ['in', 'auto'], ['auto', 'pass', '是'], ['auto', 'manual', '否'], ['manual', 'defect'],
    ['defect', 'scrap', '是'], ['defect', 'pass', '否'], ['pass', 'end'], ['scrap', 'end'],
  ]),
});

// 分層排版（簡化的 Sugiyama）：DFS 找回頭邊 → 最長路徑分層 → 長邊插虛擬節點 → 重心法排序兩輪。
// ponytail: 適合十幾個節點的投影片流程；更大的圖或交叉太多時改用 dagre（vendor）。
function layout(n, edges) {
  const out = Array.from({ length: n }, () => []);
  edges.forEach(([u], j) => out[u].push(j));
  const state = [], back = [];
  const visit = u => {
    state[u] = 1;
    for (const j of out[u]) { const w = edges[j][1]; if (state[w] === 1) back.push(j); else if (!state[w]) visit(w); }
    state[u] = 2;
  };
  for (let i = 0; i < n; i++) if (!state[i]) visit(i);
  const rank = Array(n).fill(0);
  for (let k = 0; k < n; k++) edges.forEach(([u, w], j) => { if (!back.includes(j)) rank[w] = Math.max(rank[w], rank[u] + 1); });

  const v = rank.map(r => ({ rank: r })); // 真實節點在前，虛擬節點接在後面
  const links = [];
  const chains = edges.map(([u, w], j) => {
    if (back.includes(j)) return [u, w];
    const chain = [u];
    for (let r = rank[u] + 1; r < rank[w]; r++) { v.push({ rank: r, dummy: true }); chain.push(v.length - 1); }
    chain.push(w);
    for (let k = 1; k < chain.length; k++) links.push([chain[k - 1], chain[k]]);
    return chain;
  });
  const ranks = Math.max(...rank) + 1;
  const layers = Array.from({ length: ranks }, (_, r) => v.map((x, i) => i).filter(i => v[i].rank === r));
  const width = Math.max(...layers.map(l => l.length));
  const place = () => layers.forEach(l => l.forEach((i, k) => { v[i].pos = (width - l.length) / 2 + k; }));
  place();
  for (let sweep = 0; sweep < 2; sweep++) {
    for (const l of layers.slice(1)) {
      const bary = new Map(l.map(i => {
        const ps = links.filter(([, b]) => b === i).map(([a]) => v[a].pos);
        return [i, ps.length ? ps.reduce((s, x) => s + x, 0) / ps.length : v[i].pos];
      }));
      l.sort((a, b) => bary.get(a) - bary.get(b));
    }
    place();
  }
  return { v, chains, back, ranks, width };
}
})();
