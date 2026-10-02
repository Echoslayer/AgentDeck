# stack3d（特殊：three.js）

## 用途
分層結構：由上而下 2–6 層（系統架構、技術堆疊、責任分層），以 3D 堆疊呈現「上層依賴下層」。滑過右側項目會抬起該層，方便講解時指認。

## API
`deck.stack3d(key, [{ text, note?, key?, highlight? }], { hint? })`
- 層次由上而下排列；`highlight` 以突顯色標出本頁要講的那一層。
- 每層 key 預設 `key-序號`，可單獨隱藏（3D 中的對應層同步隱藏）；`text`、`note` 可現場編輯。
- 引用方式見 `CATALOG.md`「特殊元件」：需先引用 three.js 套件（下游為 `agentdeck/vendor/three/three.min.js`，`agentdeck add` 會印出引用行）。

## 必須保留
- 層數 2–6；超過時拆頁或改用 `list`。
- 3D 只負責「上下關係」，每層說明寫在右側清單，不要把文字放進 3D。
- 只是條列層次、不強調依賴時，用基礎元件 `list` 即可。
- 靜態後備（等角 SVG）用於縮圖與 WebGL 失敗，不可移除。

## 範例
```js
art: deck.stack3d('arch', [
  { text: '應用層', note: '簡報、報表' },
  { text: '資料層', note: '量測資料', highlight: true },
  { text: '設備層', note: '機台與感測器' },
]),
```