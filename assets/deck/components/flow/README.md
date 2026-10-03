# flow

## 用途
有分支、判斷、匯流或回圈的流程（異常處置、審核流程、決策樹）；小型樹狀結構（組織圖）也可用。

## API
`deck.flow(key, nodes, edges, { dir? })`
- `nodes`：`[{ id, text, type?, highlight? }]`。`type`：`'start'`／`'end'`（膠囊形）、`'decision'`（六角形）、省略為一般步驟（圓角矩形）。`id` 不可重複。
- `edges`：`[from, to, label?]` 或 `{ from, to, label? }`；`label` 用於分支（「是」「否」）。
- `dir`：`'TB'`（由上而下，預設）或 `'LR'`（由左而右，適合寬而淺的流程）。
- 版面自動推導：依邊分層、長邊經過層間、回頭的邊（回圈）以虛線繞外側。同層左右位置主要由上下游決定，位置相同時依 `nodes` 先後。
- 節點文字（`<key>-<id>`）與邊標籤（`<key>-e<序號>`）可在現場修改；**結構不開放現場編輯**，要改流程請改 `story.js`。

## 必須保留
- 約 12 個節點以內；超過時拆頁，或把細節收成一個節點另頁展開。節點多、交叉多時版面會變亂。
- 節點文字一句話內（約 10 字）；說明放 `point` 或口述。
- 沒有分支、只有單一路徑時改用 `steps`；只有時間先後時改用 `timeline`。
- 一頁最多一個 `highlight` 節點，指出這頁要講的那一步。

## 範例
```js
art: deck.flow('triage', [
  { id: 'in', text: '收到異常', type: 'start' },
  { id: 'auto', text: '自動判定可信？', type: 'decision' },
  { id: 'pass', text: '直接放行' },
  { id: 'manual', text: '人工複判', highlight: true },
  { id: 'end', text: '結案', type: 'end' },
], [
  ['in', 'auto'], ['auto', 'pass', '是'], ['auto', 'manual', '否'],
  ['manual', 'end'], ['pass', 'end'],
]),
```
