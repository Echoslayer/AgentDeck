# compare

## 用途
左右對照：改善前後、方案 A／B。可放 2 欄以上，手機上改為上下排列。

## API
`deck.compare(key, [{ title, body, key? }])`
- 每欄 key 預設為 `key-序號`，可單獨隱藏；欄標題可編輯。
- `body` 為純文字時可編輯；內含其他 `deck.*` 元件（例如 `metrics`）時整欄鎖定，由內層元件各自開放編輯。

## 必須保留
- 兩邊相同起點、單位、期間與分母；條件不同時要寫在頁面上。
- 欄的順序固定為「前 → 後」或「現行 → 提案」。

## 範例
```js
art: deck.compare('kpi', [
  { title: '改善前', body: deck.metrics('before', [{ value: '92.1', unit: '%', label: '良率' }]) },
  { title: '改善後', body: deck.metrics('after', [{ value: '97.4', unit: '%', label: '良率', highlight: true }]) },
]),
```
需同時引用 `metrics` 元件。
