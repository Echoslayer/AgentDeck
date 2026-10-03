/* mark：一段文字裡用手繪筆觸依序強調幾個詞（螢光筆、底線、圈選、框、刪除線）。說明見 README.md。特殊元件：需要 vendor/rough-notation/（vendor.json）。
   ==詞== 標出要強調的部分；靜態後備（縮圖、匯出）用 CSS 畫同類型的標記。 */
'use strict';
(() => {
const TYPES = ['highlight', 'underline', 'circle', 'box', 'strike-through', 'crossed-off', 'bracket'];
const COLORS = { primary: '--deck-primary', accent: '--deck-accent', highlight: '--deck-highlight' };

deck.define('mark', (key, html, { type = 'highlight', types = [], color = 'highlight', gap = 500 } = {}) => {
  if (typeof html !== 'string' || !html.includes('==')) throw new Error(`deck.mark(${key}): 用 ==詞== 標出要強調的部分`);
  for (const t of [type, ...types]) if (!TYPES.includes(t)) throw new Error(`deck.mark(${key}): type 只能是 ${TYPES.join('、')}`);
  if (!COLORS[color]) throw new Error(`deck.mark(${key}): color 只能是 ${Object.keys(COLORS).join('、')}`);
  let i = 0;
  const body = html.replace(/==(.+?)==/g, (_, t) => `<span class="deck-mark-${types[i++] ?? type}">${t}</span>`);
  return `<p class="deck-mark" data-key="${key}" data-edit data-gap="${gap}" style="--c:var(${COLORS[color]})">${body}</p>`;
}, {
  tier: 'special',
  vendor: ['rough-notation'],
  live,
  summary: '一段文字裡依序用手繪筆觸強調關鍵詞；翻到這頁時逐一畫出。',
  demo: () => deck.mark('demo', '模型準確率 92%，但==召回率只有 41%==：每 10 位真正的病人，有 ==6 位被判成健康==。<br>要追的指標是==召回率==，不是準確率。', { types: ['highlight', 'underline', 'circle'] }),
});

function live(el) {
  if (!window.RoughNotation) throw new Error('rough-notation 未載入');
  const color = getComputedStyle(el).getPropertyValue('--c').trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const list = [...el.querySelectorAll('[class^="deck-mark-"]')].map(span => {
    const type = span.className.slice('deck-mark-'.length);
    return RoughNotation.annotate(span, { type, color, padding: type === 'circle' ? 6 : 2, strokeWidth: type === 'highlight' ? 1 : 2, iterations: 2, animate: !reduced, animationDuration: 700, multiline: true, ...(type === 'bracket' ? { brackets: ['left', 'right'] } : {}) });
  });
  // 頁面淡入後再開始畫
  const timer = setTimeout(() => RoughNotation.annotationGroup(list).show(), +el.dataset.gap);
  return () => { clearTimeout(timer); list.forEach(a => a.remove()); };
}
})();
