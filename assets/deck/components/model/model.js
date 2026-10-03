/* model：用方塊、圓柱、圓錐、球組成的扁平風 3D 示意圖，可拖曳旋轉。說明見 README.md。特殊元件：需要 vendor/zdog/（vendor.json），比 three 輕。
   座標：x 向右、y 向下、z 朝向觀眾；單位約為像素（畫面 400×300）。靜態畫面在產生時以 SVG 畫好。 */
'use strict';
(() => {
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const COLORS = { primary: '--deck-primary', accent: '--deck-accent', highlight: '--deck-highlight', muted: '--muted' };
const SHAPES = ['box', 'cylinder', 'cone', 'sphere'];
const VW = 400, VH = 300, TILT = { x: -0.45, y: 0.6 };

const token = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
// 同一色的明暗面：往白或黑混
const mix = (hex, to, k) => {
  const c = hex.replace('#', ''), t = to === 'w' ? 255 : 0;
  return `#${[0, 2, 4].map(i => Math.round(parseInt(c.slice(i, i + 2), 16) * (1 - k) + t * k).toString(16).padStart(2, '0')).join('')}`;
};

// parts → Zdog 場景（加到 illo）
function scene(illo, parts) {
  const Z = Zdog, rad = d => (d ?? 0) * Math.PI / 180;
  for (const p of parts) {
    const c = token(COLORS[p.color ?? 'primary']) || '#888';
    const [x = 0, y = 0, z = 0] = p.at ?? [], [rx, ry, rz] = p.rotate ?? [];
    const base = { addTo: illo, translate: { x, y, z }, rotate: { x: rad(rx), y: rad(ry), z: rad(rz) }, color: c, stroke: false };
    const [a, b, d] = p.size ?? [];
    if (p.shape === 'box') new Z.Box({ ...base, width: a, height: b, depth: d, stroke: 1, topFace: mix(c, 'w', 0.25), leftFace: mix(c, 'b', 0.15), rightFace: mix(c, 'b', 0.3), bottomFace: mix(c, 'b', 0.4) });
    if (p.shape === 'cylinder') new Z.Cylinder({ ...base, diameter: a, length: b, stroke: 1, rotate: { x: rad((rx ?? 0) + 90), y: rad(ry), z: rad(rz) }, frontFace: mix(c, 'w', 0.25), backface: mix(c, 'b', 0.25) });
    if (p.shape === 'cone') new Z.Cone({ ...base, diameter: a, length: b, stroke: 1, rotate: { x: rad((rx ?? 0) + 90), y: rad(ry), z: rad(rz) }, backface: mix(c, 'b', 0.25) });
    if (p.shape === 'sphere') new Z.Shape({ ...base, stroke: a });
  }
}

function still(parts) {
  if (!window.Zdog) return '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', VW);
  svg.setAttribute('height', VH);
  const illo = new Zdog.Illustration({ element: svg, rotate: TILT });
  scene(illo, parts);
  illo.updateRenderGraph();
  svg.setAttribute('class', 'deck-fallback');
  svg.setAttribute('aria-hidden', 'true');
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  return svg.outerHTML;
}

deck.define('model', (key, parts, { caption = '', hint = '拖曳可旋轉。' } = {}) => {
  if (!Array.isArray(parts) || !parts.length) throw new Error(`deck.model(${key}): parts 需為非空陣列`);
  for (const [i, p] of parts.entries()) {
    if (!SHAPES.includes(p.shape)) throw new Error(`deck.model(${key}): 第 ${i + 1} 個 shape 需為 ${SHAPES.join('、')}`);
    if (!Array.isArray(p.size)) throw new Error(`deck.model(${key}): 第 ${i + 1} 個缺 size（box: [寬, 高, 深]；cylinder／cone: [直徑, 長]；sphere: [直徑]）`);
    if (p.color && !COLORS[p.color]) throw new Error(`deck.model(${key}): color 只能是 ${Object.keys(COLORS).join('、')}`);
  }
  const named = parts.map((p, i) => [p, i]).filter(([p]) => p.label);
  const legend = named.length ? `<ul class="deck-model-legend">${named.map(([p, i]) => `<li style="--c:var(${COLORS[p.color ?? 'primary']})" data-key="${key}-p${i + 1}" data-edit>${esc(p.label)}</li>`).join('')}</ul>` : '';
  return `<figure class="deck-model" data-key="${key}" data-parts="${esc(JSON.stringify(parts))}"><div class="deck-view">${still(parts)}</div>`
    + `<div class="deck-model-side">${legend}${caption ? `<figcaption data-key="${key}-caption" data-edit>${caption}</figcaption>` : ''}${hint ? `<p class="deck-hint">${hint}</p>` : ''}</div></figure>`;
}, {
  tier: 'special',
  vendor: ['zdog'],
  live,
  summary: '方塊、圓柱、圓錐、球組成的扁平風 3D 示意；比 three 輕，適合簡單的立體結構。',
  demo: () => deck.model('demo', [
    { shape: 'box', at: [0, 40, 0], size: [220, 16, 140], color: 'muted' },
    { shape: 'box', at: [-55, -2, 0], size: [70, 68, 70], label: '應用伺服器' },
    ...[0, 1, 2].map(i => ({ shape: 'cylinder', at: [55, 20 - i * 22, 0], size: [62, 18], color: 'accent', ...(i === 0 ? { label: '資料庫（三份副本）' } : {}) })),
    { shape: 'cone', at: [-55, -66, 0], size: [44, 30], color: 'highlight', label: '快取' },
    { shape: 'sphere', at: [0, -40, 60], size: [26], color: 'highlight' },
  ], { caption: '一台應用伺服器、三份資料庫副本；快取擋在最上層。' }),
});

function live(el) {
  if (!window.Zdog) throw new Error('zdog 未載入');
  const parts = JSON.parse(el.dataset.parts);
  const view = el.querySelector('.deck-view');
  const canvas = Object.assign(document.createElement('canvas'), { className: 'deck-canvas' });
  view.append(canvas);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dragging = false, raf;
  const illo = new Zdog.Illustration({ element: canvas, rotate: { ...TILT }, dragRotate: true, onDragStart: () => { dragging = true; }, onDragEnd: () => { dragging = false; } });
  scene(illo, parts);
  const fit = () => {
    const r = view.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    illo.setSize(canvas.width, canvas.height);
    illo.zoom = Math.min(canvas.width / VW, canvas.height / VH);
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(view);
  const tick = () => { if (!dragging && !reduced) illo.rotate.y += 0.004; illo.updateRenderGraph(); raf = requestAnimationFrame(tick); };
  tick();
  return () => { cancelAnimationFrame(raf); ro.disconnect(); canvas.remove(); };
}
})();
