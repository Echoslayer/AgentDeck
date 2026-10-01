# trend

## 用途
隨時間變化的趨勢（時間序列、走勢、改善前後的變化過程）。純 SVG，零依賴；進場時線條依序畫出，縮圖即完整圖。

## API
`deck.trend(key, labels, [{ label, values, key?, highlight? }], { min?, max?, unit?, format?, mark? })`
- `labels`：時間點，至少 2 個；每條 `values` 與 `labels` 等長。
- 1–5 條線；`highlight` 以突顯色與粗線標出主角。
- 未指定 `min`／`max` 時自動取整；**比較絕對量時請指定 `min: 0`**，避免放大差異。
- `mark: { at, text }`：在第 `at` 個時間點加事件標記（如「導入新配方」），文字可編輯、可隱藏。
- 圖例文字可編輯；每條線可從圖例單獨隱藏（線同步隱藏，縮圖也同步）。數值不開放編輯。

## 必須保留
- 最多 5 條線（隱藏對應規則寫在 css）；更多就拆頁。
- 多組比較時用相同 `min`／`max`。
- 以 `deck.figure` 包起來，在 caption 註明資料來源與期間。

## 範例
```js
art: deck.trend('yield', ['1月', '2月', '3月', '4月'], [
  { label: 'A 線', values: [91.2, 92.1, 94.6, 96.0], highlight: true },
  { label: 'B 線', values: [92.0, 92.4, 92.2, 92.9] },
], { unit: '%', mark: { at: 2, text: '導入新配方' } }),
```