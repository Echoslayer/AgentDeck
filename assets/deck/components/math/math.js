/* math：數學公式。說明見 README.md。特殊元件：需要 vendor/katex/katex.min.js（vendor.json）；KaTeX 只輸出 MathML，由瀏覽器原生排版（不需 KaTeX 字型與 css）。 */
'use strict';
deck.define('math', (key, tex, { display = true, caption = '' } = {}) => {
  if (typeof tex !== 'string' || !tex.trim()) throw new Error(`deck.math(${key}): tex 需為非空字串`);
  // 產生時就排好：縮圖與匯出也看得到公式；未載入 KaTeX 時顯示 TeX 原文
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const body = window.katex
    ? window.katex.renderToString(tex, { output: 'mathml', displayMode: display, throwOnError: false })
    : `<code class="deck-math-tex">${esc(tex)}</code>`;
  if (!window.katex) console.error(`deck.math(${key}): KaTeX 未載入，顯示 TeX 原文；在 index.html 引用 agentdeck/vendor/katex/katex.min.js（上游內為 vendor/katex/katex.min.js），並執行 agentdeck vendor 下載（docs/adr/0011）`);
  return `<figure class="deck-math${display ? '' : ' deck-math-inline'}" data-key="${key}">${body}`
    + (caption ? `<figcaption data-key="${key}-caption" data-edit>${caption}</figcaption>` : '') + '</figure>';
}, {
  tier: 'special',
  vendor: ['katex'],
  summary: '數學公式（TeX）；KaTeX 轉成 MathML 由瀏覽器排版，未載入時顯示 TeX 原文。',
  demo: () => deck.math('demo', String.raw`V_{k+1}(s)=\max_a \sum_{s'} P(s'\mid s,a)\,\bigl[R(s,a,s')+\gamma V_k(s')\bigr]`,
    { caption: '價值迭代：新值只讀上一輪的舊值。' }),
});
