/* stepper（零依賴）：逐步播放一組畫面（演算法每一輪、狀態變化）。說明見 README.md。 */
'use strict';
(() => {
deck.define('stepper', (key, frames, { start = 0, hint = '用按鈕、拉桿或方向鍵逐步播放。' } = {}) => {
  if (!Array.isArray(frames) || frames.length < 2) throw new Error(`deck.stepper(${key}): frames 至少 2 格`);
  if (!(Number.isInteger(start) && start >= 0 && start < frames.length)) throw new Error(`deck.stepper(${key}): start 需為 0–${frames.length - 1}`);
  const n = frames.length;
  // 每格的 art 可放其他元件的輸出；其中的 data-key 要跨格唯一
  const body = frames.map((f, i) => `<section class="deck-stepper-frame${i === start ? ' is-on' : ''}">`
    + `<h4><small>${i + 1} / ${n}</small> <span data-key="${key}-f${i + 1}" data-edit>${f.label}</span></h4>${f.art}</section>`).join('');
  const ctrl = `<div class="deck-stepper-ctrl"><button type="button" data-go="first" aria-label="第一步">⏮</button><button type="button" data-go="-1" aria-label="上一步">←</button>`
    + `<input type="range" min="0" max="${n - 1}" value="${start}" aria-label="步驟"><button type="button" data-go="1" aria-label="下一步">→</button><button type="button" data-go="last" aria-label="最後一步">⏭</button></div>`;
  return `<div class="deck-stepper" data-key="${key}">${body}${ctrl}${hint ? `<p class="deck-hint">${hint}</p>` : ''}</div>`;
}, {
  tier: 'special',
  live,
  summary: '逐步播放一組畫面；靜態時顯示起始那格，編輯模式攤開全部。',
  // 示範：一列格子，右端 +10 的價值一輪一輪往左傳（純 HTML，不依賴其他元件）
  demo: () => deck.stepper('demo', [[0, 0, 0, 0, 10], [0, 0, 0, 9, 10], [0, 0, 8.1, 9, 10], [0, 7.3, 8.1, 9, 10]].map((row, i) => ({
    label: i ? `第 ${i} 輪：再往左傳一格` : '起點：只有終點有獎勵',
    art: `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${row.map(v => `<b style="padding:18px 0;text-align:center;border-radius:6px;font-size:20px;background:color-mix(in srgb,var(--deck-accent) ${v * 9}%,var(--tint))">${v}</b>`).join('')}</div>`,
  }))),
});

function live(el) {
  const input = el.querySelector('input');
  const frames = el.querySelectorAll('.deck-stepper-frame');
  const show = () => frames.forEach((f, i) => f.classList.toggle('is-on', i === +input.value));
  const go = e => {
    const g = e.target.closest('[data-go]')?.dataset.go;
    if (!g) return;
    input.value = g === 'first' ? 0 : g === 'last' ? input.max : +input.value + +g; // range 自動夾在 min–max
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  input.addEventListener('input', show);
  el.addEventListener('click', go);
  return () => { input.removeEventListener('input', show); el.removeEventListener('click', go); };
}
})();
