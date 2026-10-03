# split

## 用途
總量拆成幾股：分流、分類結果、時間或成本的去向。比例條按數量呈現，下方每股附數量、佔比與說明（例如換算後的工時）。

## API
`deck.split(key, total, parts, { unit?, format? })`
- `total`：`{ value, label? }`，`value` 為正數。
- `parts`：至少 2 股，`[{ label, value, note?, highlight?, key? }]`；**加總必須等於 `total.value`**，否則報錯。
- 佔比自動計算到小數一位；`format` 預設 `toLocaleString()`。
- 每股 key 預設為 `key-序號`，可單獨隱藏；標籤與說明可編輯，**數值不開放現場編輯**（避免與比例條不一致），要改數字請改 `story.js`。

## 必須保留
- 比例看上方的條；下方卡片等寬只為放文字，不代表數量。
- 2–4 股；更多時把小項合併成「其他」。
- 以 `deck.figure` 包起來，在 `caption` 註明資料來源與期間；教學用的假設數字要寫明。

## 範例
```js
art: deck.split('route', { value: 100, label: '進入分類流程' }, [
  { label: '自動通過', value: 80 },
  { label: '人工複判', value: 20, note: '20 × 2 分鐘 = 40 分鐘／小時', highlight: true },
], { unit: '件／時' }),
```
