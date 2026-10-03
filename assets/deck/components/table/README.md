# table

## 用途
需要讀精確數值、或多個項目在多個欄位上對照（規格表、比較表）。

## API
`deck.table(key, rows, { columns, format? })`
- `columns`：表頭文字陣列。
- `rows`：每列是陣列，或 `{ cells, key?, highlight? }`；每列格數須等於 `columns` 長度。第一格作為列標題。
- 數字（`number`）以 `format` 輸出（預設 `toLocaleString()`），且所在欄連同表頭靠右對齊；`'98.2%'` 這類字串不算數字。
- 每列 key 預設為 `key-序號`，可單獨隱藏；每格可在現場修改（`<列 key>-<欄序號>`，表頭為 `<key>-h<欄序號>`）。

## 必須保留
- 只放講者會講到的欄與列；超過約 6 列 × 5 欄就拆頁或改用圖表。
- 要比大小或看趨勢時改用 `bars`／`trend`，表格只負責精確數值。
- 數字欄的單位寫在表頭（例如「日產量（件）」）。

## 範例
```js
art: deck.table('lines', [
  ['A 線', 1250, '98.2%'],
  { cells: ['B 線', 980, '94.6%'], highlight: true },
], { columns: ['產線', '日產量（件）', '良率'] }),
```
