# cards

## 用途
並列 2–4 個同粒度的項目，例如「現況／改善／效益」。

## API
`deck.cards(key, [{ title, text, key? }])`
- 每張卡的 key 預設為 `key-序號`（如 `cards-2`），可單獨隱藏；標題與說明可編輯（`<key>-title`、`<key>-text`）。
- 已被 `edits.js` 引用的卡片要調整順序時，給該卡明確的 `key`。

## 必須保留
- 各卡相同單位與粒度，才能直接比較。
- 卡片數量控制在 2–4 張；更多就拆頁或改用 `list`。

## 範例
```js
art: deck.cards('plan', [
  { title: '現況', text: '人工目檢。' },
  { title: '改善', text: 'AOI 初篩。' },
  { title: '效益', text: '工時 −27%。' },
]),
```
