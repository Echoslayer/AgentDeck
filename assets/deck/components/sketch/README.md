# sketch（特殊：rough.js）

## 用途
把包住的 SVG 圖（`flow`、`sequence`、`matrix` 或自製 SVG）改成手繪草圖風，並可加一張「草案」便條。用來表示「這是提案、還在討論、尚未定案」，和定案版的同一張圖形成對比。

## API
`deck.sketch(key, html, { note? })`
- `html`：含 SVG 的內容，通常是其他元件的輸出，例如 `deck.sketch('draft', deck.flow('draft-flow', …))`。被包住的元件照常可編輯。
- `note`：右下角的便條文字（可現場修改），例如「草案」「待確認」。
- 處理 SVG 內的 `rect`、`circle`、`ellipse`、`line`、`polyline`、`polygon`、`path`：外框改成手繪線；淺色填滿改成斜線，深色填滿（上面多半是白字）保留實心；箭頭保留原樣。HTML 文字與方框不處理，字型改為手寫感字體。
- 縮圖與匯出維持原圖（手繪效果在頁面出現時才套上）。
- 需要套件 `rough`：在元件 js 之前引用 `vendor/rough/rough.js`；包住的元件也要照常引用。

## 必須保留
- 只用在「未定案」的語意；定案內容用原元件，避免觀眾誤會。
- 手繪線會偏移 1–3 px，不適合需要精確對位的圖（刻度、座標）。
- 每頁一個。

## 範例
```js
art: deck.sketch('proposal', deck.flow('proposal-flow', [
  { id: 'a', text: '收到需求', type: 'start' }, { id: 'b', text: '試做' }, { id: 'c', text: '審核', type: 'end' },
], [['a', 'b'], ['b', 'c']], { dir: 'LR' }), { note: '草案：流程還在討論' }),
```
