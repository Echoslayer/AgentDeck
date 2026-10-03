/* matrix：2×2 象限。說明見 README.md。 */
'use strict';
deck.define('matrix', (key, quads, { x, y } = {}) => {
  if (quads.length !== 4) throw new Error(`deck.matrix(${key}): 需要 4 個象限（左上、右上、左下、右下），收到 ${quads.length}`);
  const body = quads.map((q, i) => {
    const k = deck.util.itemKey(key, q, i);
    return `<div class="${q.highlight ? 'deck-hl' : ''}" data-key="${k}" data-hide><b data-key="${k}-title" data-edit>${q.title}</b>${q.text ? `<span data-key="${k}-text" data-edit>${q.text}</span>` : ''}</div>`;
  }).join('');
  // 縱軸不旋轉：中文直排由上往下讀，箭頭另放並保持朝上
  const axis = (n, t) => (t ? `<p class="deck-matrix-${n}">${n === 'y' ? '<i>↑</i>' : ''}<span data-key="${key}-${n}" data-edit>${t}</span>${n === 'x' ? ' →' : ''}</p>` : '');
  return `<div class="deck-matrix" data-key="${key}">${axis('y', y)}<div class="deck-matrix-grid">${body}</div>${axis('x', x)}</div>`;
}, {
  summary: '兩個軸切出四個象限；象限順序為左上、右上、左下、右下。',
  demo: () => deck.matrix('demo', [
    { title: '排程', text: '重要但不急' },
    { title: '立刻做', text: '重要且急迫', highlight: true },
    { title: '刪除', text: '不重要也不急' },
    { title: '委派', text: '急迫但不重要' },
  ], { x: '急迫性', y: '重要性' }),
});
