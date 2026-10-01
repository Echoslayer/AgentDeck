/* globe：地點分布與地點間連線。說明見 README.md。特殊元件：需要 vendor/three/three.min.js（vendor.json）。 */
'use strict';
(() => {
  const RAD = Math.PI / 180;
  // 與 three 端相同的球面座標：y 朝北極。
  const vec = (lat, lon) => {
    const phi = (90 - lat) * RAD, th = (lon + 180) * RAD;
    return [-Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)];
  };
  // 讓所有地點的重心朝向觀眾的 y 軸旋轉角。
  const facing = points => {
    const s = points.reduce((acc, p) => vec(p.lat, p.lon).map((v, i) => acc[i] + v), [0, 0, 0]);
    return -Math.atan2(s[0], s[2]);
  };
  const rotY = ([x, y, z], r) => [x * Math.cos(r) + z * Math.sin(r), y, -x * Math.sin(r) + z * Math.cos(r)];

  function resolve(key, points, links) {
    const index = new Map(points.map((p, i) => [deck.util.itemKey(key, p, i), i]));
    return links.map(([a, b]) => [a, b].map(x => {
      const i = typeof x === 'number' ? x : index.get(`${x}`);
      if (!(i >= 0 && i < points.length)) throw new Error(`deck.globe(${key}): links 參照不存在的地點 ${JSON.stringify(x)}`);
      return i;
    }));
  }

  deck.define('globe', (key, points, { links = [], hint = '拖曳可旋轉。' } = {}) => {
    if (!Array.isArray(points) || !points.length) throw new Error(`deck.globe(${key}): 至少需要一個地點`);
    for (const p of points) {
      if (!(Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180)) throw new Error(`deck.globe(${key}): ${p.label} 的 lat／lon 超出範圍`);
    }
    const pairs = resolve(key, points, links);
    // 靜態後備：正射投影，重心朝前。
    const r0 = facing(points), R = 130, c = 150;
    const proj = p => { const [x, y, z] = rotY(vec(p.lat, p.lon), r0); return [c + x * R, c - y * R, z]; };
    const P = points.map(proj);
    const grid = [-60, -30, 0, 30, 60].map(lat => `<ellipse cx="${c}" cy="${c - Math.sin(lat * RAD) * R}" rx="${Math.cos(lat * RAD) * R}" ry="${Math.cos(lat * RAD) * R * 0.08}"/>`).join('')
      + [30, 60].map(d => `<ellipse cx="${c}" cy="${c}" rx="${Math.sin(d * RAD) * R}" ry="${R}"/>`).join('') + `<line x1="${c}" y1="${c - R}" x2="${c}" y2="${c + R}"/>`;
    const arcs = pairs.map(([a, b]) => {
      const [x1, y1] = P[a], [x2, y2] = P[b], mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const ox = mx - c, oy = my - c, len = Math.hypot(ox, oy) || 1, lift = 20 + Math.hypot(x2 - x1, y2 - y1) * 0.25;
      return `<path d="M${x1},${y1} Q${mx + ox / len * lift},${my + oy / len * lift} ${x2},${y2}"/>`;
    }).join('');
    const dots = points.map((p, i) => P[i][2] > 0 ? `<circle class="${p.highlight ? 'deck-hl' : ''}" cx="${P[i][0]}" cy="${P[i][1]}" r="6"/>` : '').join('');
    const svg = `<svg class="deck-fallback" viewBox="0 0 300 300" aria-hidden="true"><circle class="o" cx="${c}" cy="${c}" r="${R}"/><g class="g">${grid}</g><g class="a">${arcs}</g><g class="d">${dots}</g></svg>`;
    const items = points.map((p, i) => {
      const k = deck.util.itemKey(key, p, i);
      return `<li class="${p.highlight ? 'deck-hl' : ''}" data-key="${k}" data-hide><b data-key="${k}-label" data-edit>${p.label}</b>`
        + (p.note ? `<span data-key="${k}-note" data-edit>${p.note}</span>` : '') + '</li>';
    }).join('');
    const data = JSON.stringify({ points: points.map(p => [p.lat, p.lon]), links: pairs });
    return `<div class="deck-globe" data-key="${key}" data-globe='${data}'><div class="deck-view">${svg}</div>`
      + `<div class="deck-globe-side"><ul>${items}</ul>${hint ? `<p class="deck-hint">${hint}</p>` : ''}</div></div>`;
  }, {
    tier: 'special',
    vendor: ['three'],
    live,
    summary: '地點分布與地點之間的流向（據點、供應鏈、跨區協作）。',
    demo: () => deck.globe('demo', [
      { label: '新竹', note: '研發與試產', lat: 24.8, lon: 121.0, highlight: true },
      { label: '東京', note: '材料供應', lat: 35.7, lon: 139.7 },
      { label: '亞利桑那', note: '量產據點', lat: 33.4, lon: -112.0 },
      { label: '德勒斯登', note: '量產據點', lat: 51.0, lon: 13.7 },
    ], { links: [[1, 0], [0, 2], [0, 3]] }),
  });

  function live(el) {
    const host = el.querySelector('.deck-view');
    const items = [...el.querySelectorAll('.deck-globe-side>ul>li')];
    const { points, links } = JSON.parse(el.dataset.globe);
    return deck.util.three(host, ({ T, scene, camera, drag, token }) => {
      const primary = new T.Color(token('--deck-primary')), accent = new T.Color(token('--deck-accent')), hl = new T.Color(token('--deck-highlight'));
      const V = (lat, lon, r = 1) => new T.Vector3(...vec(lat, lon)).multiplyScalar(r);
      const globe = new T.Group();
      scene.add(globe);
      camera.position.set(0, 0.6, 4.4);
      camera.lookAt(0, 0, 0);

      globe.add(new T.Mesh(new T.SphereGeometry(0.985, 48, 32), new T.MeshBasicMaterial({ color: 0xf3f6f9, transparent: true, opacity: 0.9 })));
      // 斐波那契點雲當作抽象地表，不需要地圖貼圖。
      const N = 1600, pos = [];
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
        pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
      }
      const cloud = new T.BufferGeometry();
      cloud.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      globe.add(new T.Points(cloud, new T.PointsMaterial({ color: accent, size: 0.018, transparent: true, opacity: 0.45 })));

      const markers = points.map(([lat, lon], i) => {
        const color = items[i].classList.contains('deck-hl') ? hl : primary;
        const m = new T.Mesh(new T.SphereGeometry(0.04, 16, 12), new T.MeshBasicMaterial({ color }));
        m.position.copy(V(lat, lon, 1.01));
        const ring = new T.Mesh(new T.RingGeometry(0.05, 0.065, 32), new T.MeshBasicMaterial({ color, transparent: true, side: T.DoubleSide }));
        ring.position.copy(m.position);
        ring.lookAt(m.position.clone().multiplyScalar(2));
        globe.add(m, ring);
        return { m, ring };
      });
      const arcs = links.map(([a, b]) => {
        const A = V(...points[a], 1.01), B = V(...points[b], 1.01);
        const mid = A.clone().add(B).normalize().multiplyScalar(1.05 + A.distanceTo(B) * 0.35);
        const curve = new T.QuadraticBezierCurve3(A, mid, B);
        const line = new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(64)), new T.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.8 }));
        const dot = new T.Mesh(new T.SphereGeometry(0.025, 12, 8), new T.MeshBasicMaterial({ color: hl }));
        globe.add(line, dot);
        return { a, b, curve, line, dot };
      });

      const r0 = facing(points.map(([lat, lon]) => ({ lat, lon })));
      return time => {
        const editing = document.body.classList.contains('is-editing');
        const shown = items.map(li => editing || !li.hasAttribute('data-hidden'));
        markers.forEach(({ m, ring }, i) => {
          m.visible = ring.visible = shown[i];
          const s = 1 + ((time * 0.8 + i * 0.3) % 1) * 1.6;
          ring.scale.setScalar(s);
          ring.material.opacity = 1 - (s - 1) / 1.6;
        });
        arcs.forEach((arc, i) => {
          arc.line.visible = arc.dot.visible = shown[arc.a] && shown[arc.b];
          arc.dot.position.copy(arc.curve.getPoint((time * 0.35 + i * 0.27) % 1));
        });
        globe.rotation.y = r0 + Math.sin(time * 0.2) * 0.5 + drag.x;
        globe.rotation.x = drag.y;
      };
    });
  }
})();
