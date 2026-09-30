# figure

## 用途
圖表外框：上方說明（kicker）、內容、圖例、下方條件與資料來源（caption）。內容可以是 `bars` 或自製圖。

## API
`deck.figure(key, content, { kicker?, caption?, legend? })`
- `content`：HTML 字串，通常是其他元件的輸出。
- `legend`：`[{ label, color }]`，`color` 用色票 token，如 `var(--deck-accent)`。
- 整個 figure 是一個元件，可整塊隱藏；`kicker`、`caption` 可編輯。

## 必須保留
- 有數字的圖一定寫 `caption`：來源、期間、條件。
- 圖例顏色與圖中顏色一致。

## 範例
```js
art: deck.figure('trend', '<div class="topic-chart" data-key="chart">…</div>', {
  kicker: '良率逐月變化',
  caption: '資料：MES，2026/1–9。',
}),
```
