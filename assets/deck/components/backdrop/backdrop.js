/* backdrop：封面、章節頁的動態 3D 背景（波浪、網點），內容疊在上面。說明見 README.md。特殊元件：需要 vendor/vanta/ 與 vendor/three/（vendor.json）。
   靜態後備為品牌漸層；減少動態時不啟動。 */
'use strict';
(() => {
const EFFECTS = { waves: 'WAVES', net: 'NET' };

deck.define('backdrop', (key, html, { effect = 'waves' } = {}) => {
  if (!EFFECTS[effect]) throw new Error(`deck.backdrop(${key}): effect 只能是 ${Object.keys(EFFECTS).join('、')}`);
  return `<div class="deck-backdrop deck-backdrop-${effect}" data-key="${key}" data-effect="${effect}"><div class="deck-backdrop-bg"></div><div class="deck-backdrop-body">${html}</div></div>`;
}, {
  tier: 'special',
  vendor: ['vanta', 'three'],
  live,
  summary: '封面或章節頁的動態 3D 背景（波浪、網點）；靜態時為品牌漸層。',
  demo: () => deck.backdrop('demo', '<p class="deck-backdrop-kicker">第二章</p><h2 data-key="demo-title" data-edit>從試做到正式元件</h2>', { effect: 'net' }),
});

function live(el) {
  if (!window.VANTA || !window.THREE) throw new Error('vanta 或 three 未載入');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const css = getComputedStyle(el), hex = n => parseInt(css.getPropertyValue(n).trim().slice(1), 16);
  const effect = el.dataset.effect, bg = el.querySelector('.deck-backdrop-bg');
  const common = { el: bg, THREE: window.THREE, mouseControls: true, touchControls: true, gyroControls: false, scale: 1, scaleMobile: 1 };
  const fx = effect === 'net'
    ? VANTA.NET({ ...common, color: hex('--deck-accent'), backgroundColor: hex('--deck-primary'), points: 9, maxDistance: 22, spacing: 18 })
    : VANTA.WAVES({ ...common, color: hex('--deck-primary'), shininess: 40, waveHeight: 14, waveSpeed: 0.6, zoom: 0.9 });
  return () => fx.destroy();
}
})();
