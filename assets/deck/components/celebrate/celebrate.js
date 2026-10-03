/* celebrate：包住的內容裡按下按鈕時噴彩帶（揭曉答案、宣布上線、達標）。說明見 README.md。特殊元件：需要 vendor/confetti/（vendor.json）。 */
'use strict';
(() => {
deck.define('celebrate', (key, html) => {
  if (typeof html !== 'string' || !html.trim()) throw new Error(`deck.celebrate(${key}): 需要包住的內容，例如 deck.celebrate('k', deck.predict(...))`);
  return `<div class="deck-celebrate" data-key="${key}">${html}</div>`;
}, {
  tier: 'special',
  vendor: ['confetti'],
  live,
  summary: '包住的內容裡按下按鈕時噴彩帶：揭曉答案、宣布上線、達成目標。',
  // 元件之間不互相呼叫：demo 用一般按鈕；實際使用時可包住 deck.predict(...) 的輸出
  demo: () => deck.celebrate('demo', '<p data-key="demo-text" data-edit>新版本今天上線，30 天內 0 次回滾。</p><button type="button">上線了 🎉</button>'),
});

function live(el) {
  if (!window.confetti) throw new Error('canvas-confetti 未載入：引用 vendor/confetti/confetti.browser.js 並執行 agentdeck vendor');
  const css = getComputedStyle(el);
  const burst = btn => {
    // 收合類按鈕（如 predict 再按一次收回答案）不放
    if (btn.getAttribute('aria-expanded') === 'false') return;
    const r = btn.getBoundingClientRect();
    confetti({
      particleCount: 90, spread: 70, startVelocity: 38, ticks: 160, disableForReducedMotion: true,
      origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight },
      colors: ['--deck-primary', '--deck-accent', '--deck-highlight'].map(n => css.getPropertyValue(n).trim()),
    });
  };
  // 等包住的元件先處理完自己的點擊（例如 predict 展開答案）再判斷
  const onClick = e => { const btn = e.target.closest('button'); if (btn && el.contains(btn)) requestAnimationFrame(() => burst(btn)); };
  el.addEventListener('click', onClick);
  return () => { el.removeEventListener('click', onClick); confetti.reset(); };
}
})();
