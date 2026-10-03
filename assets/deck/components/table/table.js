/* table：精確數值與多欄對照。說明見 README.md。 */
'use strict';
deck.define('table', (key, rows, { columns, format = v => v.toLocaleString() } = {}) => {
  if (!Array.isArray(columns) || !columns.length) throw new Error(`deck.table(${key}): 需要 columns`);
  const cellsOf = r => (Array.isArray(r) ? r : r.cells);
  // 欄內有數字就整欄（含表頭）靠右，數字才對得齊
  const numCol = columns.map((_, j) => rows.some(r => typeof cellsOf(r)[j] === 'number'));
  const cell = (tag, v, k, j) => `<${tag}${numCol[j] ? ' class="deck-num"' : ''} data-key="${k}" data-edit>${typeof v === 'number' ? format(v) : v}</${tag}>`;
  const head = columns.map((c, j) => cell('th', c, `${key}-h${j + 1}`, j)).join('');
  const body = rows.map((r, i) => {
    const cells = cellsOf(r);
    if (cells.length !== columns.length) throw new Error(`deck.table(${key}): 第 ${i + 1} 列有 ${cells.length} 格，columns 有 ${columns.length} 欄`);
    const k = deck.util.itemKey(key, r, i);
    return `<tr${r.highlight ? ' class="deck-hl"' : ''} data-key="${k}" data-hide>${cells.map((v, j) => cell(j ? 'td' : 'th', v, `${k}-${j + 1}`, j)).join('')}</tr>`;
  }).join('');
  return `<table class="deck-table" data-key="${key}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}, {
  summary: '需要讀精確數值或多欄位對照；數字自動靠右對齊。',
  demo: () => deck.table('demo', [
    ['A 線', 1250, '98.2%', '穩定'],
    { cells: ['B 線', 980, '94.6%', '需複判'], highlight: true },
    ['C 線', 1410, '99.1%', '穩定'],
  ], { columns: ['產線', '日產量', '良率', '狀態'] }),
});
