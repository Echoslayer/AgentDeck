# network（特殊：cytoscape）

## 用途
節點多、關係交錯的網路：模組相依、文獻引用、課程先修、系統之間的呼叫。自動排版；可縮放、拖曳，點一個節點只留它與鄰居，方便講者逐一說明。有明確流向與判斷、節點不多時用 `flow`。

## API
`deck.network(key, nodes, edges, { directed?, caption?, hint? })`
- `nodes`：節點陣列；字串即 id，或 `{ id, label?, group? }`。`group` 決定顏色（依出現順序取主色、輔色、突顯色、灰），最多四組並自動產生圖例。
- `edges`：`[來源 id, 目標 id]` 陣列。
- `directed`：`true` 時畫箭頭。
- 下方「聚焦」選單：選一個節點只留它與鄰居（與點節點相同），選「全部」還原；縮圖不顯示。
- **隨朗讀**：`record: [{ at: 2, set: '[data-key=k] select', value: '<節點 id>' }, { at: 4, set: '[data-key=k] select', value: '' }]`；`value: ''` 為全部。
- `caption`、圖例文字可現場修改；節點與連線**不開放現場編輯**。
- 版面在產生時就算好（cytoscape 的 cose 排版，起始位置固定，每次結果相同），縮圖、匯出與動態版位置一致；結果比較高時自動轉成橫向。未下載套件時排成圓形。
- 需要套件 `cytoscape`：在元件 js 之前引用 `vendor/cytoscape/cytoscape.min.js`。

## 必須保留
- 約 10–40 個節點；更多時先依主題篩選或合併成群組，否則在投影片上讀不出結構。
- 標籤 2–6 個字；細節放 `point` 或口述。
- 自動排版不保證特定位置；要固定上下游順序時改用 `flow`。
- 講者點選突顯是輔助，結論仍要寫在 `point` 或 `caption`。

## 範例
```js
art: deck.network('deps', [
  { id: 'cli', group: '工具' }, { id: 'registry', group: '工具' },
  { id: 'deck-core', group: '框架' }, { id: 'reader', group: '框架' },
], [['cli', 'registry'], ['registry', 'deck-core'], ['reader', 'deck-core']], { directed: true, caption: '框架與工具的相依。' }),
```
