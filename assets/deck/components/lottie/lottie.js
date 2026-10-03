/* lottie：播放 After Effects／LottieFiles 匯出的向量動畫（JSON 直接寫在頁面裡）。說明見 README.md。特殊元件：需要 vendor/lottie/（vendor.json）。 */
'use strict';
(() => {
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// 靜態畫面在產生時就畫好（縮圖、匯出也看得到）：載入後停在指定格；預設最後一格
function still(data, frame) {
  if (!window.lottie) return '';
  const box = document.createElement('div');
  const anim = lottie.loadAnimation({ container: box, renderer: 'svg', autoplay: false, loop: false, animationData: JSON.parse(JSON.stringify(data)) });
  anim.goToAndStop(frame ?? data.op - 1, true);
  const svg = box.innerHTML;
  anim.destroy();
  return svg;
}

deck.define('lottie', (key, data, { frame, loop = true, auto = true, caption = '', hint = '' } = {}) => {
  if (!(data && typeof data === 'object' && Array.isArray(data.layers) && data.w && data.h)) throw new Error(`deck.lottie(${key}): data 需為 Lottie JSON 物件（含 w、h、layers）`);
  const svg = still(data, frame);
  return `<figure class="deck-lottie" data-key="${key}" data-anim="${esc(JSON.stringify(data))}" data-loop="${loop}" data-auto="${auto}" style="--ratio:${data.w}/${data.h}">`
    + `<div class="deck-view"><div class="deck-fallback">${svg}</div></div>`
    + (caption ? `<figcaption data-key="${key}-caption" data-edit>${caption}</figcaption>` : '')
    + (hint ? `<p class="deck-hint">${hint}</p>` : '') + '</figure>';
}, {
  tier: 'special',
  vendor: ['lottie'],
  live,
  summary: '設計師做好的向量動畫（Lottie JSON）；縮圖與匯出停在最後一格。',
  demo: () => deck.lottie('demo', demoCheck(), { caption: '示範動畫：圓環畫完後打勾。實際使用時貼上 LottieFiles 或 AE（Bodymovin）匯出的 JSON。' }),
});

function live(el) {
  if (!window.lottie) throw new Error('lottie 未載入');
  const box = el.querySelector('.deck-fallback');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return null; // 減少動態：停在靜態畫面
  box.innerHTML = '';
  const data = JSON.parse(el.dataset.anim);
  const auto = el.dataset.auto === 'true';
  const anim = lottie.loadAnimation({ container: box, renderer: 'svg', autoplay: auto, loop: el.dataset.loop === 'true', animationData: data });
  // auto：點一下暫停／繼續。auto: false：停在第一格，點一下從頭播（朗讀動作 click 重播安全）
  if (!auto) anim.goToAndStop(0, true);
  const toggle = () => (!auto ? anim.goToAndPlay(0, true) : anim.isPaused ? anim.play() : anim.pause());
  box.addEventListener('click', toggle);
  return () => { box.removeEventListener('click', toggle); anim.destroy(); };
}

// 示範用的小動畫：色票 → Lottie 顏色（0–1）
function demoCheck() {
  const rgb = name => {
    const c = getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace('#', '');
    return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255).concat(1);
  };
  const ease = { i: { x: [0.3], y: [1] }, o: { x: [0.6], y: [0] } };
  const stroke = (color, w) => ({ ty: 'st', c: { a: 0, k: color }, o: { a: 0, k: 100 }, w: { a: 0, k: w }, lc: 2, lj: 2 });
  const tr = r => ({ ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: r }, o: { a: 0, k: 100 } });
  const trim = (t0, t1) => ({ ty: 'tm', s: { a: 0, k: 0 }, e: { a: 1, k: [{ t: t0, s: [0], ...ease }, { t: t1, s: [100] }] }, o: { a: 0, k: 0 }, m: 1 });
  const layer = (ind, nm, shapes, scale) => ({ ddd: 0, ind, ty: 4, nm, sr: 1, ao: 0, ip: 0, op: 90, st: 0, bm: 0, shapes,
    ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [100, 100, 0] }, a: { a: 0, k: [0, 0, 0] }, s: scale ?? { a: 0, k: [100, 100, 100] } } });
  const pop = { a: 1, k: [{ t: 40, s: [100, 100, 100], ...ease }, { t: 48, s: [112, 112, 100], ...ease }, { t: 56, s: [100, 100, 100] }] };
  return { v: '5.7.0', fr: 30, ip: 0, op: 90, w: 200, h: 200, nm: 'check', ddd: 0, assets: [], layers: [
    layer(1, 'check', [{ ty: 'gr', it: [{ ty: 'sh', ks: { a: 0, k: { c: false, v: [[-34, 2], [-10, 26], [38, -24]], i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]] } } }, stroke(rgb('--deck-highlight'), 14), tr(0)] }, trim(28, 44)], pop),
    layer(2, 'ring', [{ ty: 'gr', it: [{ ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [150, 150] }, d: 1 }, stroke(rgb('--deck-primary'), 10), tr(-90)] }, trim(0, 30)], pop),
  ] };
}
})();
