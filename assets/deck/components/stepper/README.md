# stepper

## 用途
逐步播放一組事先算好的畫面：演算法每一輪、狀態一步步變化、同一張圖在不同條件下的結果。講者一步一步講，讀者會後可以自己拉。

## API
`deck.stepper(key, frames, { start?, hint? })`
- `frames`：至少 2 格，`[{ label, art }]`。`art` 是 HTML 字串，可放其他元件的輸出（例如每一輪一個 `deck.bars`）；**各格內的 `data-key` 要跨格唯一**（例如 `round-1`、`round-2`）。
- `start`：起始格（0 起算，預設 0）。`hint` 為操作提示，傳空字串可省略。
- 控制列：⏮ ← 拉桿 → ⏭；拉桿是原生 range，鍵盤方向鍵可用。
- 靜態時（縮圖、匯出、未啟動）只顯示 `start` 那格；編輯模式攤開全部格，可逐格改字。每格標題（`<key>-f<序號>`）可在現場修改。

## 必須保留
- 每格由同一個模型產生，數字與尺寸前後一致；不要手寫每格的數字。
- 約 3–10 格；格與格之間只改一件事，讓觀眾看得出變化。
- 選 `start` 時想清楚靜態版（縮圖、匯出）要呈現哪一格；通常是起點或最終結果。
- 匯出 pptx 要呈現逐步變化時，在頁面寫 `record`，以 `set` 逐步設定拉桿：`[{ set: '[data-key=<key>] input', value: 1 }, { wait: 800 }, …]`。

## 範例
```js
const rounds = [[0, 0, 10], [0, 9, 10], [8.1, 9, 10]];
art: deck.stepper('vi', rounds.map((row, i) => ({
  label: i ? `第 ${i} 輪` : '起點',
  art: deck.bars(`vi-${i}`, row.map((v, j) => ({ label: `格 ${j + 1}`, value: v })), { max: 10 }),
}))),
```
需同時引用 `bars` 元件。
