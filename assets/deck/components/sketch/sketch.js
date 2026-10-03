/* sketch：把包住的圖（flow、sequence、自製 SVG…）改成手繪草圖風，表示「還在討論、未定案」。說明見 README.md。特殊元件：需要 vendor/rough/（vendor.json）。
   只處理 SVG 圖形（rect、circle、ellipse、line、polyline、polygon、path）；縮圖與匯出維持原圖。 */
'use strict';
(() => {
deck.define('sketch', (key, html, { note = '' } = {}) => {
  if (typeof html !== 'string' || !/<svg/.test(html)) throw new Error(`deck.sketch(${key}): 需要包住含 SVG 的元件，例如 deck.sketch('k', deck.flow(...))`);
  return `<div class="deck-sketch" data-key="${key}">${html}${note ? `<p class="deck-sketch-note" data-key="${key}-note" data-edit>${note}</p>` : ''}</div>`;
}, {
  tier: 'special',
  vendor: ['rough'],
  live,
  summary: '包住含 SVG 的元件，改成手繪草圖風；表示方案還在討論、尚未定案。',
  // 元件之間不互相呼叫：demo 用手寫 SVG；實際使用時傳入 deck.flow(...) 等元件的輸出
  demo: () => deck.sketch('demo', '<svg viewBox="0 0 560 150" style="width:100%;font:16px system-ui;text-anchor:middle">'
    + '<rect x="10" y="45" width="140" height="60" rx="8" style="fill:var(--deck-primary);stroke:var(--deck-primary);stroke-width:2"/><text x="80" y="81" fill="#fff">收到需求</text>'
    + '<line x1="150" y1="75" x2="210" y2="75" style="stroke:var(--muted);stroke-width:2"/>'
    + '<polygon points="210,75 240,40 330,40 360,75 330,110 240,110" style="fill:var(--card);stroke:var(--deck-primary);stroke-width:2"/><text x="285" y="81" fill="currentColor">要改框架？</text>'
    + '<line x1="360" y1="75" x2="410" y2="75" style="stroke:var(--muted);stroke-width:2"/>'
    + '<rect x="410" y="45" width="140" height="60" rx="8" style="fill:var(--tint);stroke:var(--deck-primary);stroke-width:2"/><text x="480" y="81" fill="currentColor">playground 試做</text></svg>', { note: '草案：流程還在討論' }),
});

const SHAPES = 'rect,circle,ellipse,line,polyline,polygon,path';
const luma = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const num = (el, a) => parseFloat(el.getAttribute(a)) || 0;
const points = el => (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number).reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []);

function live(el) {
  if (!window.rough) throw new Error('rough.js 未載入');
  const added = [], hidden = [];
  let seed = 1;
  for (const svg of el.querySelectorAll('svg')) {
    const rc = rough.svg(svg);
    for (const s of svg.querySelectorAll(SHAPES)) {
      if (s.closest('defs, marker, .deck-sketch-skip')) continue;
      const cs = getComputedStyle(s), sw = parseFloat(cs.strokeWidth) || 1;
      const stroke = cs.stroke !== 'none' ? cs.stroke : 'none', fill = cs.fill !== 'none' && cs.fill !== 'rgba(0, 0, 0, 0)' ? cs.fill : undefined;
      // 淺色填滿改成斜線；深色填滿（上面多半是白字）保留原本的實心
      const light = fill && luma(fill) > 0.5;
      const o = { seed: seed++, stroke, strokeWidth: sw * 1.2, roughness: 1.4, bowing: 1.2, fill: light ? fill : undefined, fillStyle: 'hachure', fillWeight: sw * 0.6, hachureGap: 6 };
      const t = s.tagName;
      const node = t === 'rect' ? rc.rectangle(num(s, 'x'), num(s, 'y'), num(s, 'width'), num(s, 'height'), o)
        : t === 'circle' ? rc.circle(num(s, 'cx'), num(s, 'cy'), num(s, 'r') * 2, o)
          : t === 'ellipse' ? rc.ellipse(num(s, 'cx'), num(s, 'cy'), num(s, 'rx') * 2, num(s, 'ry') * 2, o)
            : t === 'line' ? rc.line(num(s, 'x1'), num(s, 'y1'), num(s, 'x2'), num(s, 'y2'), o)
              : t === 'polyline' ? rc.linearPath(points(s), o)
                : t === 'polygon' ? rc.polygon(points(s), o)
                  : rc.path(s.getAttribute('d'), { ...o, fill: undefined });
      // 原圖形隱藏但保留（箭頭仍由它的 marker 畫出）；位移搬到新圖形上
      if (s.getAttribute('transform')) node.setAttribute('transform', s.getAttribute('transform'));
      node.classList.add('deck-sketch-rough');
      s.after(node);
      added.push(node);
      hidden.push([s, s.getAttribute('style')]);
      s.style.setProperty('stroke-opacity', '0', 'important'); // 箭頭（marker）有自己的樣式，不受影響
      if (light) s.style.setProperty('fill-opacity', '0', 'important');
    }
  }
  el.classList.add('is-sketched');
  return () => {
    added.forEach(n => n.remove());
    hidden.forEach(([s, st]) => (st == null ? s.removeAttribute('style') : s.setAttribute('style', st)));
    el.classList.remove('is-sketched');
  };
}
})();
