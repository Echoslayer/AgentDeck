# mark（特殊：rough-notation）

## 用途
一段文字裡的關鍵詞，在翻到這頁時依序用手繪筆觸畫出：螢光筆、底線、圈選、框、刪除線、括號。讓觀眾的視線跟著講者走。整頁只講一句話用 `focus`。

## API
`deck.mark(key, html, { type?, types?, color?, gap? })`
- `html`：一段文字，用 `==詞==` 標出要強調的部分（可多處）；可含 `<br>` 等行內標記。
- `type`：所有標記的類型，預設 `'highlight'`。可用 `highlight`、`underline`、`circle`、`box`、`strike-through`、`crossed-off`、`bracket`。
- `types`：依出現順序逐一指定類型，未指定的用 `type`。
- `color`：`highlight`（預設）／`accent`／`primary`。
- `gap`：翻頁後幾毫秒開始畫，預設 500。
- 整段可現場修改；改字時保留 `==` 標出的範圍（編輯後的標記以 span 保存）。
- 靜態後備（縮圖、匯出、未下載套件）以 CSS 畫同類型的標記。
- 需要套件 `rough-notation`：在元件 js 之前引用 `vendor/rough-notation/rough-notation.iife.js`。

## 必須保留
- 一頁 1–3 處標記；全部都標等於沒標。
- 標記順序就是講述順序。
- 「減少動態」設定下直接顯示完成的標記，不播放筆畫。

## 範例
```js
art: deck.mark('recall', '準確率 92%，但==召回率只有 41%==：要追的是==召回率==。', { types: ['highlight', 'circle'] }),
```
