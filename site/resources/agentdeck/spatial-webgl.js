/* A deliberately advanced, project-specific view. The SVG remains the export/fallback view. */
'use strict';
window.siteSpatial = {
  mount(root, state, { samples, threshold, zh, onSlice }) {
    const t = (en, cn) => zh ? cn : en;
    const inert = { update() {}, dispose() {} };
    let renderer;
    try {
      if (!window.THREE) throw new Error('Three.js unavailable');
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (_) {
      const note = document.createElement('small');
      note.className = 'site-gl-fallback';
      note.textContent = t('WebGL unavailable · static spatial view', 'WebGL 無法使用 · 顯示靜態空間圖');
      root.append(note);
      return inert;
    }
    const T = THREE, scene = new T.Scene();
    const camera = new T.PerspectiveCamera(34, 1, .1, 80);
    let z = state.z ?? 1, turn = state.turn ?? 0, disposed = false, frame = 0;
    let yaw = .72 + turn * Math.PI / 2, pitch = .52, radius = 12.2, spread = .55;
    const target = new T.Vector3(0, 0, 0), raycaster = new T.Raycaster();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('Interactive 48-voxel volume. Arrow keys orbit; plus and minus zoom. Slice buttons show exact values.', '48 個體素的互動空間圖。方向鍵旋轉，加減鍵縮放；切片按鈕提供精確數值。'));
    scene.add(new T.HemisphereLight(0xd5f7ff, 0x17233d, 2.4));
    const light = new T.DirectionalLight(0xffffff, 3.5);
    light.position.set(3, 7, 6); scene.add(light);
    const rim = new T.DirectionalLight(0x4de0d0, 2.8);
    rim.position.set(-5, 2, -5); scene.add(rim);
    const volume = new T.Group(); scene.add(volume);
    const geometry = new T.BoxGeometry(.72, .56, .72);
    const edges = new T.EdgesGeometry(geometry);
    const edgeMaterial = new T.LineBasicMaterial({ color: 0x9af8ea, transparent: true, opacity: .2 });
    const voxels = samples.map(sample => {
      const material = new T.MeshStandardMaterial({ roughness: .28, metalness: .3 });
      const mesh = new T.Mesh(geometry, material);
      mesh.userData.sample = sample;
      mesh.add(new T.LineSegments(edges, edgeMaterial));
      volume.add(mesh);
      return mesh;
    });
    const plateMaterial = new T.MeshBasicMaterial({ color: 0x46d5c2, transparent: true, opacity: .085, side: T.DoubleSide, depthWrite: false });
    const plate = new T.Mesh(new T.PlaneGeometry(4.45, 4.45), plateMaterial);
    plate.rotation.x = -Math.PI / 2; scene.add(plate);
    const outline = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(4.45, .035, 4.45)), new T.LineBasicMaterial({ color: 0x69ecda, transparent: true, opacity: .85 }));
    scene.add(outline);
    const cage = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(4.45, 3.7, 4.45)), new T.LineBasicMaterial({ color: 0x8fabc1, transparent: true, opacity: .2 }));
    scene.add(cage);
    const floor = new T.GridHelper(12, 24, 0x42627a, 0x203749);
    floor.position.y = -2.12; scene.add(floor);
    const selection = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(.83, .67, .83)), new T.LineBasicMaterial({ color: 0xffffff }));
    selection.visible = false; scene.add(selection);
    const fallback = document.createDocumentFragment();
    while (root.firstChild) fallback.append(root.firstChild);
    root.classList.add('site-gl');
    root.innerHTML = `<div class="site-gl-status"><span>WEBGL / 48 VOXELS</span><b data-gl-slice></b></div><div class="site-gl-tools"><button type="button" data-gl-view="iso">${t('Isometric', '斜視')}</button><button type="button" data-gl-view="top">${t('Top', '俯視')}</button><label>${t('Layer gap', '層間距')}<input data-gl-gap type="range" min="0" max="1" step=".05" value=".55" aria-label="${t('Layer separation', '切片分離間距')}"></label></div><div class="site-gl-readout" aria-live="polite">${t('Select a voxel to inspect its coordinates and score.', '點選體素，查看座標與數值。')}</div><div class="site-gl-help">${t('DRAG · ORBIT / SCROLL · ZOOM', '拖曳 · 旋轉 / 滾輪 · 縮放')}</div>`;
    root.prepend(canvas);
    const status = root.querySelector('[data-gl-slice]'), readout = root.querySelector('.site-gl-readout');
    let picked = null;
    function paint() {
      if (disposed) return;
      frame = 0;
      camera.position.set(radius * Math.cos(pitch) * Math.sin(yaw), radius * Math.sin(pitch), radius * Math.cos(pitch) * Math.cos(yaw));
      camera.lookAt(target);
      renderer.render(scene, camera);
    }
    function render() { if (!disposed && !frame) frame = requestAnimationFrame(paint); }
    function updateData() {
      for (const mesh of voxels) {
        const s = mesh.userData.sample, hot = s.score >= threshold, active = s.z === z;
        mesh.position.set((s.x - 1.5) * 1.04, (s.z - 1) * (1.05 + spread), (s.y - 1.5) * 1.04);
        mesh.material.color.setHex(hot ? 0xffbc58 : 0x168d90);
        mesh.material.emissive.setHex(hot ? 0xff8c25 : 0x1aaca6);
        mesh.material.emissiveIntensity = active ? .28 : .035;
        mesh.material.color.multiplyScalar(active ? 1 : .43);
        mesh.scale.setScalar(active ? 1 : .87);
      }
      plate.position.y = (z - 1) * (1.05 + spread) - .34;
      outline.position.y = plate.position.y;
      cage.scale.y = (2 * (1.05 + spread) + .7) / 3.7;
      floor.position.y = -(1.05 + spread) - .65;
      status.textContent = `Z${z} / T=${threshold}`;
      if (picked) selection.position.copy(picked.position);
      render();
    }
    function resize() {
      const width = root.clientWidth, height = root.clientHeight;
      if (!width || !height || disposed) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix(); render();
    }
    const observer = new ResizeObserver(resize); observer.observe(root);
    const events = [];
    function listen(el, event, fn, options) { el.addEventListener(event, fn, options); events.push(() => el.removeEventListener(event, fn, options)); }
    let drag = null;
    listen(canvas, 'pointerdown', e => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
      canvas.setPointerCapture(e.pointerId);
    });
    listen(canvas, 'pointermove', e => {
      if (!drag) return;
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
      yaw -= (e.clientX - drag.lastX) * .009;
      pitch = Math.max(.08, Math.min(1.48, pitch + (e.clientY - drag.lastY) * .007));
      drag.lastX = e.clientX; drag.lastY = e.clientY; render();
    });
    listen(canvas, 'pointerup', e => {
      const clicked = drag && !drag.moved; drag = null;
      if (!clicked) return;
      const box = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new T.Vector2((e.clientX - box.left) / box.width * 2 - 1, 1 - (e.clientY - box.top) / box.height * 2), camera);
      const hit = raycaster.intersectObjects(voxels, false)[0];
      if (!hit) return;
      picked = hit.object; selection.visible = true;
      const s = picked.userData.sample;
      readout.textContent = `X${s.x} · Y${s.y} · Z${s.z} / ${t('score', '數值')} ${s.score}`;
      z = s.z; updateData(); onSlice?.(z, s.id);
    });
    listen(canvas, 'pointercancel', () => { drag = null; });
    listen(canvas, 'wheel', e => { e.preventDefault(); radius = Math.max(7.5, Math.min(20, radius + e.deltaY * .008)); render(); }, { passive: false });
    listen(canvas, 'keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'ArrowLeft') yaw -= .15;
      if (e.key === 'ArrowRight') yaw += .15;
      if (e.key === 'ArrowUp') pitch = Math.min(1.48, pitch + .12);
      if (e.key === 'ArrowDown') pitch = Math.max(.08, pitch - .12);
      if (e.key === '+' || e.key === '=') radius = Math.max(7.5, radius - .6);
      if (e.key === '-') radius = Math.min(20, radius + .6);
      render();
    });
    listen(root, 'click', e => {
      const view = e.target.closest('[data-gl-view]')?.dataset.glView;
      if (!view) return;
      yaw = .72 + turn * Math.PI / 2; pitch = view === 'top' ? 1.48 : .52; radius = 12.2; render();
    });
    listen(root.querySelector('[data-gl-gap]'), 'input', e => { spread = Number(e.target.value); updateData(); });
    function dispose() {
      if (disposed) return;
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); events.forEach(off => off());
      const geometries = new Set(), materials = new Set();
      scene.traverse(obj => { if (obj.geometry) geometries.add(obj.geometry); if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => materials.add(m)); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      renderer.dispose(); renderer.forceContextLoss();
      root.classList.remove('site-gl'); root.replaceChildren(fallback);
    }
    listen(canvas, 'webglcontextlost', e => { e.preventDefault(); dispose(); });
    updateData(); resize();
    return {
      update(next) {
        if (disposed) return;
        z = next.z ?? z; threshold = next.threshold ?? threshold;
        if (next.reset) {
          yaw = .72; pitch = .52; radius = 12.2; spread = .55;
          root.querySelector('[data-gl-gap]').value = '.55';
        }
        if (next.reset || (picked && picked.userData.sample.z !== z)) {
          picked = null; selection.visible = false;
          readout.textContent = t('Select a voxel to inspect its coordinates and score.', '點選體素，查看座標與數值。');
        }
        if (next.turn !== undefined && next.turn !== turn) { yaw = .72 + next.turn * Math.PI / 2; pitch = .52; radius = 12.2; turn = next.turn; }
        updateData();
      },
      dispose,
    };
  },
};
