/* stack3d：分層結構的 3D 堆疊。說明見 README.md。特殊元件：需要 vendor/three/three.min.js（vendor.json）。 */
'use strict';
(() => {
deck.define('stack3d', (key, layers, { hint = '拖曳可旋轉；滑過右側項目會抬起該層。' } = {}) => {
  if (!Array.isArray(layers) || layers.length < 2 || layers.length > 6) throw new Error(`deck.stack3d(${key}): layers 需為 2–6 層（由上而下）`);
  const n = layers.length, a = 120, b = 44, t = 16, gap = 46, top = b + 8;
  const H = top + (n - 1) * gap + b + t + 8;
  const slab = (i, it) => {
    const y = top + i * gap, cx = 160;
    const p = pts => pts.map(([x, yy]) => `${x},${yy}`).join(' ');
    return `<g class="deck-stack3d-slab${it.highlight ? ' deck-hl' : ''}" style="--i:${i / (n - 1)}">`
      + `<polygon class="s" points="${p([[cx - a, y], [cx, y + b], [cx, y + b + t], [cx - a, y + t]])}"/>`
      + `<polygon class="s r" points="${p([[cx, y + b], [cx + a, y], [cx + a, y + t], [cx, y + b + t]])}"/>`
      + `<polygon class="f" points="${p([[cx, y - b], [cx + a, y], [cx, y + b], [cx - a, y]])}"/></g>`;
  };
  const svg = `<svg class="deck-fallback" viewBox="0 0 320 ${H}" aria-hidden="true">`
    + layers.map((it, i) => [i, it]).reverse().map(([i, it]) => slab(i, it)).join('') + '</svg>';
  const items = layers.map((it, i) => {
    const k = deck.util.itemKey(key, it, i);
    return `<li class="${it.highlight ? 'deck-hl' : ''}" data-key="${k}" data-hide>`
      + `<b data-key="${k}-label" data-edit>${deck.util.textOf(it)}</b>`
      + (it.note ? `<span data-key="${k}-note" data-edit>${it.note}</span>` : '') + '</li>';
  }).join('');
  return `<div class="deck-stack3d" data-key="${key}"><div class="deck-view">${svg}</div>`
    + `<div class="deck-stack3d-side"><ol>${items}</ol>${hint ? `<p class="deck-hint">${hint}</p>` : ''}</div></div>`;
}, {
  tier: 'special',
  vendor: ['three'],
  live,
  summary: '分層結構：由上而下 2–6 層，以 3D 堆疊呈現上下依賴。',
  demo: () => deck.stack3d('demo', [
    { text: '應用層', note: '簡報、報表、看板' },
    { text: '服務層', note: 'API 與權限' },
    { text: '資料層', note: '量測與製程資料', highlight: true },
    { text: '設備層', note: '機台與感測器' },
  ]),
});

function live(el) {
  const host = el.querySelector('.deck-view');
  const items = [...el.querySelectorAll('.deck-stack3d-side>ol>li')];
  let active = -1;
  const enter = items.map((li, i) => () => { active = i; });
  const leave = () => { active = -1; };
  items.forEach((li, i) => { li.addEventListener('pointerenter', enter[i]); li.addEventListener('pointerleave', leave); });

  const stop = deck.util.three(host, ({ T, scene, camera, drag, token }) => {
    const n = items.length;
    const primary = new T.Color(token('--deck-primary')), accent = new T.Color(token('--deck-accent')), hl = new T.Color(token('--deck-highlight'));
    scene.add(new T.AmbientLight(0xffffff, 1.6));
    const sun = new T.DirectionalLight(0xffffff, 2.2);
    sun.position.set(4, 8, 5);
    scene.add(sun);
    const group = new T.Group();
    scene.add(group);
    const geo = new T.BoxGeometry(3, 0.26, 3);
    const edges = new T.EdgesGeometry(geo);
    const slabs = items.map((li, i) => {
      const color = li.classList.contains('deck-hl') ? hl : primary.clone().lerp(accent, i / (n - 1));
      const mesh = new T.Mesh(geo, new T.MeshStandardMaterial({ color, roughness: 0.55, transparent: true, opacity: 0.93 }));
      mesh.add(new T.LineSegments(edges, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })));
      group.add(mesh);
      return { mesh, lift: 0 };
    });
    const d = 7 + n * 0.8;
    camera.position.set(d * 0.62, d * 0.5, d * 0.62);
    camera.lookAt(0, 0, 0);

    return time => {
      const editing = document.body.classList.contains('is-editing');
      const spread = 0.8 + 0.12 * Math.sin(time * 0.9);
      slabs.forEach((s, i) => {
        const hidden = items[i].hasAttribute('data-hidden');
        s.mesh.visible = !hidden || editing;
        s.mesh.material.opacity = hidden ? 0.25 : 0.93;
        s.lift += ((i === active ? 0.45 : 0) - s.lift) * 0.15;
        s.mesh.position.y = ((n - 1) / 2 - i) * spread + s.lift;
        s.mesh.material.emissive.set(i === active ? 0x333333 : 0x000000);
      });
      group.rotation.y = time * 0.25 + drag.x;
      group.rotation.x = drag.y * 0.5;
    };
  });

  return () => {
    stop();
    items.forEach((li, i) => { li.removeEventListener('pointerenter', enter[i]); li.removeEventListener('pointerleave', leave); });
  };
}
})();
