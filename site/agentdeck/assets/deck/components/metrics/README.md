# metrics

## 用途
關鍵數字（KPI），一個或多個並排。

## API
`deck.metrics(key, [{ value, unit?, label, key?, highlight? }])`
- 每個數字 key 預設為 `key-序號`，可單獨隱藏；數值（`<key>-value`）與說明（`<key>-label`）可在現場修改。
- `highlight: true` 以金色強調。

## 必須保留
- 數字附單位；說明寫清楚分母或條件（例如「良率（9 月，A 線）」）。
- 多個數字要比長短時改用 `bars`。

## 範例
```js
art: deck.metrics('kpi', [
  { value: '97.4', unit: '%', label: '良率', highlight: true },
  { value: '35', unit: '秒', label: '單件工時' },
]),
```
