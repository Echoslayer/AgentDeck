# range

## 用途
數值區間與實際值：規格上下限、預估範圍、目標區間，以及實際落點是否在區間內。

## API
`deck.range(key, [{ label, low, high, value?, key? }], { min?, max?, unit?, format? })`
- `low ≤ high` 必須是數字；`value` 選填。
- `min`／`max` 為共用刻度，預設取所有數值的最小與最大；建議明確指定，留出邊界。
- 有 `value` 時右側顯示實際值，**超出區間自動以強調色標示**；沒有 `value` 時顯示 `low–high`。
- 每列 key 預設為 `key-序號`，可單獨隱藏；標籤可編輯，**數值與位置不開放現場編輯**（避免文字與位置不一致），要改數字請改 `story.js`。

## 必須保留
- 所有列同一尺度、同一單位；不同單位拆成多個 `range`。
- 以 `deck.figure` 包起來，在 `caption` 說明區間的來源（規格、預估方法）。

## 範例
```js
art: deck.figure('spec', deck.range('spec-range', [
  { label: '爐區 1', low: 180, high: 220, value: 205 },
  { label: '爐區 2', low: 190, high: 230, value: 236 },
], { min: 160, max: 250, unit: '°C' }), { caption: '規格依 SOP-12；實際值為 9/30 量測。' }),
```
需同時引用 `figure` 元件。
