# bars

## 用途
同單位數值的橫條比較，長度由數值推導。

## API
`deck.bars(key, [{ label, value, key?, highlight? }], { max?, unit?, format? })`
- `value` 必須是非負數字；`max` 預設取最大值；`format` 預設 `toLocaleString()`。
- 每條 key 預設為 `key-序號`，可單獨隱藏；標籤可編輯，**數值與長度不開放現場編輯**（避免文字與長度不一致），要改數字請改 `story.js`。

## 必須保留
- 所有橫條同一尺度；跨頁或多組比較時指定相同 `max`。
- 以 `deck.figure` 包起來，在 `caption` 註明資料來源、期間與條件。

## 範例
```js
art: deck.figure('cost', deck.bars('cost-bars', [
  { label: '人工複判', value: 120 },
  { label: '報廢', value: 18, highlight: true },
], { unit: '萬／月' }), { caption: '2026/7–9 月平均，A 線。' }),
```
需同時引用 `figure` 元件。
