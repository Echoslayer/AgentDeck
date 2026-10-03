/* physics：2D 物理模擬（碰撞、重力、擺錘、彈跳）。說明見 README.md。特殊元件：需要 vendor/matter/（vendor.json）。
   世界座標 100×60（左上為原點、y 向下）；靜態後備畫初始狀態與初速度箭頭。 */
'use strict';
(() => {
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const f = n => Math.round(n * 100) / 100;
const COLORS = { primary: '--deck-primary', accent: '--deck-accent', highlight: '--deck-highlight', muted: '--muted' };
const W = 100, H = 60, S = 10; // matter 以像素為單位調校，內部放大 10 倍

// 物體：{ shape: 'ball'|'box', at: [x, y], r | size: [w, h], v: [vx, vy], fixed, pin: [x, y], bounce, color, label }
function check(key, bodies) {
  if (!Array.isArray(bodies) || !bodies.length) throw new Error(`deck.physics(${key}): bodies 需為非空陣列`);
  for (const [i, b] of bodies.entries()) {
    if (!['ball', 'box'].includes(b.shape)) throw new Error(`deck.physics(${key}): 第 ${i + 1} 個物體的 shape 需為 ball 或 box`);
    if (!(Array.isArray(b.at) && b.at.length === 2)) throw new Error(`deck.physics(${key}): 第 ${i + 1} 個物體缺 at: [x, y]`);
    if (b.shape === 'box' && !(Array.isArray(b.size) && b.size.length === 2)) throw new Error(`deck.physics(${key}): 第 ${i + 1} 個 box 缺 size: [w, h]`);
    if (b.color && !COLORS[b.color]) throw new Error(`deck.physics(${key}): color 只能是 ${Object.keys(COLORS).join('、')}`);
  }
}
const half = b => (b.shape === 'ball' ? b.r ?? 3 : b.size[1] / 2);
const fill = b => `var(${COLORS[b.color ?? (b.fixed ? 'muted' : 'primary')]})`;

deck.define('physics', (key, bodies, { gravity = 1, caption = '', hint = '拖曳物體可以丟出去；按「重來」回到初始狀態。' } = {}) => {
  check(key, bodies);
  const shapes = bodies.map(b => {
    const [x, y] = b.at;
    const pin = b.pin ? `<line class="deck-physics-rope" x1="${b.pin[0]}" y1="${b.pin[1]}" x2="${x}" y2="${y}"/><circle class="deck-physics-pin" cx="${b.pin[0]}" cy="${b.pin[1]}" r=".8"/>` : '';
    const body = b.shape === 'ball'
      ? `<circle cx="${x}" cy="${y}" r="${b.r ?? 3}" style="fill:${fill(b)}"/>`
      : `<rect x="${f(x - b.size[0] / 2)}" y="${f(y - b.size[1] / 2)}" width="${b.size[0]}" height="${b.size[1]}" transform="rotate(${b.angle ?? 0} ${x} ${y})" style="fill:${fill(b)}"/>`;
    const v = b.v ? `<line class="deck-physics-v" x1="${x}" y1="${y}" x2="${f(x + b.v[0] * 0.6)}" y2="${f(y + b.v[1] * 0.6)}"/>` : '';
    const label = b.label ? `<text x="${x}" y="${f(y - half(b) - 1.5)}">${esc(b.label)}</text>` : '';
    return pin + body + v + label;
  }).join('');
  const svg = `<svg class="deck-fallback" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><marker id="${key}-v" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs><g style="--arrow:url(#${key}-v)">${shapes}</g></svg>`;
  return `<figure class="deck-physics" data-key="${key}" data-world="${esc(JSON.stringify({ bodies, gravity }))}"><div class="deck-view">${svg}</div>`
    + `<div class="deck-physics-bar"><button type="button">重來</button>${hint ? `<p class="deck-hint">${hint}</p>` : ''}</div>`
    + (caption ? `<figcaption data-key="${key}-caption" data-edit>${caption}</figcaption>` : '') + '</figure>';
}, {
  tier: 'special',
  vendor: ['matter'],
  live,
  summary: '2D 物理模擬：碰撞、重力、擺錘、彈跳；可拖曳物體、重來。',
  demo: () => deck.physics('demo', [
    { shape: 'box', at: [50, 58], size: [100, 4], fixed: true },
    { shape: 'box', at: [72, 44], size: [3, 24], fixed: true },
    { shape: 'ball', at: [14, 20], r: 3, v: [22, -6], bounce: 0.8, color: 'highlight', label: '彈性 0.8' },
    { shape: 'ball', at: [30, 12], r: 3, bounce: 0.2, label: '彈性 0.2' },
    { shape: 'ball', at: [88, 30], r: 3.5, pin: [88, 6], v: [-20, 0], color: 'accent', label: '擺錘' },
    ...[0, 1, 2, 3].map(i => ({ shape: 'box', at: [58, 53 - i * 4.4], size: [4, 4], color: 'muted' })),
  ], { caption: '同樣落下，彈性不同；擺錘撞上牆後能量轉移。' }),
});

function live(el) {
  if (!window.Matter) throw new Error('matter-js 未載入');
  const M = Matter, { bodies, gravity } = JSON.parse(el.dataset.world);
  const view = el.querySelector('.deck-view');
  const canvas = Object.assign(document.createElement('canvas'), { className: 'deck-canvas' });
  view.append(canvas);
  const css = getComputedStyle(el), token = n => css.getPropertyValue(n).trim();
  const ink = token('--ink'), muted = token('--muted');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let engine, items, raf, mouseC;

  const build = () => {
    engine = M.Engine.create({ gravity: { y: gravity } });
    items = bodies.map(b => {
      const o = { isStatic: !!b.fixed, restitution: b.bounce ?? 0.4, friction: 0.05, frictionAir: 0.002, angle: (b.angle ?? 0) * Math.PI / 180 };
      const body = b.shape === 'ball' ? M.Bodies.circle(b.at[0] * S, b.at[1] * S, (b.r ?? 3) * S, o) : M.Bodies.rectangle(b.at[0] * S, b.at[1] * S, b.size[0] * S, b.size[1] * S, o);
      if (b.v) M.Body.setVelocity(body, { x: b.v[0] / 6, y: b.v[1] / 6 });
      return { b, body, color: token(COLORS[b.color ?? (b.fixed ? 'muted' : 'primary')]) };
    });
    M.Composite.add(engine.world, items.map(i => i.body));
    for (const i of items) if (i.b.pin) M.Composite.add(engine.world, M.Constraint.create({ pointA: { x: i.b.pin[0] * S, y: i.b.pin[1] * S }, bodyB: i.body, stiffness: 1 }));
    // 世界外圍的牆，避免物體飛出畫面
    M.Composite.add(engine.world, [[-5, H / 2, 10, H * 3], [W + 5, H / 2, 10, H * 3], [W / 2, -H, W * 2, 10]].map(([x, y, w, h]) => M.Bodies.rectangle(x * S, y * S, w * S, h * S, { isStatic: true })));
    const mouse = M.Mouse.create(canvas);
    mouseC = M.MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2 } });
    M.Composite.add(engine.world, mouseC);
  };

  const draw = () => {
    const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    if (canvas.width !== Math.round(r.width * dpr)) { canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); }
    const k = canvas.width / (W * S);
    M.Mouse.setScale(mouseC.mouse, { x: 1 / (k / dpr), y: 1 / (k / dpr) });
    const g = canvas.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    g.clearRect(0, 0, W * S, H * S);
    for (const { b, body, color } of items) {
      if (b.pin) { g.strokeStyle = muted; g.lineWidth = 3; g.beginPath(); g.moveTo(b.pin[0] * S, b.pin[1] * S); g.lineTo(body.position.x, body.position.y); g.stroke(); }
      g.fillStyle = color;
      g.beginPath();
      if (b.shape === 'ball') g.arc(body.position.x, body.position.y, (b.r ?? 3) * S, 0, Math.PI * 2);
      else body.vertices.forEach((v, i) => (i ? g.lineTo(v.x, v.y) : g.moveTo(v.x, v.y)));
      g.fill();
      if (b.label) { g.fillStyle = ink; g.font = `${2.2 * S}px ${css.fontFamily}`; g.textAlign = 'center'; g.fillText(b.label, body.position.x, body.position.y - (half(b) + 1.5) * S); }
    }
  };

  // 依實際經過時間推進（120Hz 螢幕不會變兩倍速）；切走分頁回來時最多補一格
  let last = 0;
  const loop = now => { M.Engine.update(engine, last ? Math.min(now - last, 33) : 1000 / 60); last = now; draw(); raf = requestAnimationFrame(loop); };
  const reset = () => { cancelAnimationFrame(raf); last = 0; if (engine) M.Engine.clear(engine); build(); if (reduced) draw(); else raf = requestAnimationFrame(loop); };
  // 減少動態：不自動播放，按「重來」才開始
  const btn = el.querySelector('.deck-physics-bar button');
  const start = () => { if (reduced) { cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(loop); } else reset(); };
  btn.addEventListener('click', start);
  reset();
  return () => { cancelAnimationFrame(raf); btn.removeEventListener('click', start); M.Mouse.clearSourceEvents?.(mouseC.mouse); M.Engine.clear(engine); canvas.remove(); };
}
})();
