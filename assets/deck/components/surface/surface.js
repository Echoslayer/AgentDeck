/* surface：兩個因子對結果的影響，以 3D 曲面呈現。說明見 README.md。特殊元件：需要 vendor/three/three.min.js（vendor.json）。 */
'use strict';
(() => {
deck.define('surface', (key, values, { x = 'X', y = 'Y', z = '結果', hint = '拖曳可旋轉；橘點為最高值。' } = {}) => {
  const rows = values?.length, cols = values?.[0]?.length;
  if (!(rows >= 2 && cols >= 2) || values.some(r => r.length !== cols || r.some(v => typeof v !== 'number' || !isFinite(v)))) {
    throw new Error(`deck.surface(${key}): values 需為至少 2×2、每列等長的數字陣列`);
  }
  const flat = values.flat(), lo = Math.min(...flat), hi = Math.max(...flat), span = hi - lo || 1;
  // 靜態後備：熱度圖。
  const cw = 300 / cols, ch = 220 / rows;
  const cells = values.map((r, i) => r.map((v, j) => `<rect x="${j * cw}" y="${i * ch}" width="${cw + 0.5}" height="${ch + 0.5}" style="--v:${((v - lo) / span * 100).toFixed(1)}%"/>`).join('')).join('');
  const svg = `<svg class="deck-fallback" viewBox="0 0 300 220" preserveAspectRatio="none" aria-hidden="true">${cells}</svg>`;
  const axis = (k, label, text) => `<li><small>${label}</small><b data-key="${key}-${k}-label" data-edit>${text}</b></li>`;
  return `<div class="deck-surface" data-key="${key}" data-values='${JSON.stringify(values)}'><div class="deck-view">${svg}</div>`
    + `<div class="deck-surface-side"><ul>${axis('x', '橫軸 →', x)}${axis('y', '縱深 ↗', y)}${axis('z', '高度 ↑', z)}</ul>`
    + `<p class="deck-surface-range">${lo.toLocaleString()} – ${hi.toLocaleString()}</p>${hint ? `<p class="deck-hint">${hint}</p>` : ''}</div></div>`;
}, {
  tier: 'special',
  vendor: ['three'],
  live,
  summary: '兩個因子共同決定一個結果（製程窗口、參數掃描）。',
  demo: () => deck.surface('demo', Array.from({ length: 9 }, (_, i) => Array.from({ length: 11 }, (_, j) => {
    const a = (j - 6) / 3, b = (i - 3.5) / 2.5;
    return Math.round(98 * Math.exp(-(a * a + b * b) / 2) * 10) / 10;
  })), { x: '溫度', y: '壓力', z: '良率 %' }),
});

function live(el) {
  const values = JSON.parse(el.dataset.values);
  const rows = values.length, cols = values[0].length;
  const flat = values.flat(), lo = Math.min(...flat), hi = Math.max(...flat), span = hi - lo || 1;
  return deck.util.three(el.querySelector('.deck-view'), ({ T, scene, camera, drag, token }) => {
    const primary = new T.Color(token('--deck-primary')), accent = new T.Color(token('--deck-accent')), hl = new T.Color(token('--deck-highlight'));
    scene.add(new T.AmbientLight(0xffffff, 1.4));
    const sun = new T.DirectionalLight(0xffffff, 2);
    sun.position.set(3, 6, 4);
    scene.add(sun);
    const group = new T.Group();
    scene.add(group);

    const W = 3, D = 3 * (rows - 1) / (cols - 1) || 3, Hmax = 1.4;
    const geo = new T.PlaneGeometry(W, D, cols - 1, rows - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, colors = [];
    let peak = 0;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const idx = i * cols + j, r = (values[i][j] - lo) / span;
      pos.setY(idx, r * Hmax);
      const c = r < 0.5 ? primary.clone().lerp(accent, r * 2) : accent.clone().lerp(hl, (r - 0.5) * 2);
      colors.push(c.r, c.g, c.b);
      if (values[i][j] === hi) peak = idx;
    }
    geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    group.add(new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: 0.7 })));
    group.add(new T.LineSegments(new T.WireframeGeometry(geo), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })));
    const grid = new T.GridHelper(Math.max(W, D), 6, 0xc8d0da, 0xe2e7ee);
    grid.position.y = -0.01;
    group.add(grid);
    const dot = new T.Mesh(new T.SphereGeometry(0.07, 16, 12), new T.MeshBasicMaterial({ color: hl }));
    dot.position.set(pos.getX(peak), pos.getY(peak) + 0.1, pos.getZ(peak));
    group.add(dot);
    group.position.y = -Hmax / 2;
    camera.position.set(0, 3.2, 5.2);
    camera.lookAt(0, 0, 0);

    return time => {
      group.rotation.y = Math.sin(time * 0.3) * 0.6 + drag.x;
      group.rotation.x = drag.y * 0.5;
      dot.scale.setScalar(1 + Math.sin(time * 3) * 0.2);
    };
  });
}
})();
