/* predict（零依賴）：先猜再揭曉。說明見 README.md。 */
'use strict';
(() => {
deck.define('predict', (key, question, answer, { choices = [], correct, button = '揭曉' } = {}) => {
  if (correct != null && !(correct >= 0 && correct < choices.length)) throw new Error(`deck.predict(${key}): correct 需為 choices 的索引`);
  const opts = choices.map((c, i) => `<li class="${i === correct ? 'is-correct' : ''}" data-key="${key}-c${i + 1}" data-edit>${c}</li>`).join('');
  return `<div class="deck-predict" data-key="${key}"><p class="deck-predict-q" data-key="${key}-q" data-edit>${question}</p>`
    + (opts ? `<ol>${opts}</ol>` : '')
    + `<button type="button" aria-expanded="false">${button}</button>`
    + `<div class="deck-predict-a" data-key="${key}-a" data-edit>${answer}</div></div>`;
}, {
  tier: 'special',
  live,
  summary: '先讓觀眾猜，按下揭曉才顯示答案；縮圖、匯出與編輯模式直接顯示答案。',
  demo: () => deck.predict('demo', 'n 筆不重複資料逐筆掃描查重，總共要比幾次？',
    '<b>n(n−1)/2 次</b>：第 k 筆要和前面 k−1 筆比。改用集合後平均每筆一次查找。',
    { choices: ['n 次', 'n log n 次', 'n(n−1)/2 次'], correct: 2 }),
});

function live(el) {
  const btn = el.querySelector('button');
  // 再按一次收回，方便講者重來
  const toggle = () => { const open = !el.classList.contains('is-open'); el.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open); };
  btn.addEventListener('click', toggle);
  return () => btn.removeEventListener('click', toggle);
}
})();
