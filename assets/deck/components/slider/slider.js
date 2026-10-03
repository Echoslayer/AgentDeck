/* slider（零依賴）：同一畫面的前後對照，拖曳分隔線。說明見 README.md。 */
'use strict';
(() => {
deck.define('slider', (key, before, after, { at = 50, hint = '拖曳分隔線比較前後。' } = {}) => {
  for (const s of [before, after]) if (!s || !s.src) throw new Error(`deck.slider(${key}): before 與 after 需要 { src, label }`);
  const side = (s, n) => `<figure class="deck-slider-${n}"><img src="${s.src}" alt="${s.alt ?? s.label ?? ''}"><figcaption data-key="${key}-${n}" data-edit>${s.label ?? ''}</figcaption></figure>`;
  // 靜態後備＝左右並排（縮圖、編輯模式、未啟動）；啟動後疊在一起，以原生 range 控制分隔線
  return `<div class="deck-slider" data-key="${key}" style="--at:${at}%">${side(before, 'before')}${side(after, 'after')}`
    + `<input type="range" min="0" max="100" value="${at}" aria-label="前後分隔位置"><b></b>`
    + (hint ? `<p class="deck-hint">${hint}</p>` : '') + '</div>';
}, {
  tier: 'special',
  live,
  summary: '同一畫面的前後對照；拖曳分隔線切換，靜態時左右並排。',
  demo: () => deck.slider('demo', { src: demoImg(true), label: '改善前' }, { src: demoImg(false), label: '改善後' }),
});

function live(el) {
  const input = el.querySelector('input');
  const set = () => el.style.setProperty('--at', `${input.value}%`);
  input.addEventListener('input', set);
  return () => input.removeEventListener('input', set);
}

// 示範用：同一塊表面，改善前有瑕疵點
function demoImg(defects) {
  const dots = defects ? [[60, 40], [150, 95], [230, 60], [95, 130], [270, 140]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#d4572a"/>`).join('') : '';
  const lines = Array.from({ length: 9 }, (_, i) => `<line x1="0" x2="320" y1="${i * 20 + 10}" y2="${i * 20 + 10}" stroke="#9fb7c4" stroke-width="${defects ? 3 : 1}"/>`).join('');
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#e8f0f4"/>${lines}${dots}</svg>`);
}
})();
