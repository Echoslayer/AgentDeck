# codeexplorer

## 用途

把作者先行核對的「程式責任、跨檔關係與資料交接」接到真實程式碼。適合接手舊系統、追事件／callback、理解資料所有權。屬於特殊（進階）元件，依賴 Highlight.js，無須執行來源程式。

支援閱讀路線、關係跳轉、返回／前進、語法高亮、作者逐行解說開關、多行 `{}` 折疊、整檔上下文與放大代碼區。少量靜態片段或 diff 請用 `code`；單純目錄導覽不需要本元件。

**實作前必讀：[資料與閱讀約束](IMPLEMENTATION.md)**。

## API

```js
deck.codeexplorer(key, {
  sources: { date?, files: { [file]: { lines, sha, lang? } } },
  nodes: { [id]: { title, symbol, file, ranges, what, input, output, note } },
  edges: [[from, to, relation, evidence]],
  routes: { [id]: { name, ids } },
  explanations?: { [file]: { [line]: text } }
}, { start?, route?, notesKey? })
```

- `lines`：完整來源的逐行字串陣列，保留空行與縮排。`sha`：非空的來源版本識別，建議 SHA256；元件不計算或認證雜湊。`lang` 預設 `cpp`，可指定 Highlight.js 語言。
- 節點可代表函式、分支或交接點。`ranges` 是原始行號，1 起算、含首尾，如 `[[76,108],[109,115]]`；不可重疊，按作者指定順序呈現，可先講後段再回到前段。其餘欄位均為純文字，HTML 會跳脫。
- `edges` 的關係種類與來源證據由作者提供，允許回圈。上方路線是**閱讀順序**，不是自動產生的執行流程。
- `explanations` 是作者補寫的解說，在對應行之前顯示，不加入原始碼、不另編行號。預設顯示，可關閉。
- `start`、`route` 預設各自第一項。換頁再返回保留節點、歷史、折疊與開關；重新整理重設探索狀態。
- `notesKey` 預設空字串，不提供讀者筆記操作。指定唯一儲存鍵時啟用逐行筆記、瀏覽器暫存及 JSON 匯入／匯出；與作者解說及 `edits.js` 分開。來源版本不符或同一行有不同筆記，整份匯入拒絕，不覆蓋。
- `mount`／`previewArt` 不用自行提供；元件自帶起始節點的靜態摘要。可用頁面的 `previewArt` 提供更適合匯出的作者摘要。
- Highlight.js 未載入時仍能讀原碼、解說及跳轉；語法色與自動折疊停用。

### 引用

```sh
node cli/agentdeck.mjs add codeexplorer --dir <簡報單位>
```

```html
<link rel="stylesheet" href="agentdeck/assets/deck/components/codeexplorer/codeexplorer.css">
<script src="agentdeck/vendor/highlight/highlight.min.js"></script>
<script src="agentdeck/assets/deck/components/codeexplorer/codeexplorer.js"></script>
```

執行 `agentdeck vendor` 或 `pack` 取得本地套件，播放不連網。樣式跟隨色票；主題可覆寫 `--deck-codeexplorer-code-bg`、`code-ink`、`comment-bg`、`comment-ink`、`comment-line`、`comment-border`、`keyword`、`type`、`function`、`string`、`number`、`source-comment`、`meta`、`gutter`、`fold-bg`、`fold-ink`、`jump-bg`、`jump-ink`（全部加 `--deck-codeexplorer-` 前綴）。

## 必須保留

- 來源只讀：展示層不能重排、改寫原始行號，解說與讀者筆記須獨立保存。
- 節點與關係必須由作者追碼查證，標明直接呼叫、事件、callback 或資料契約；未知的 DLL／框架保證要明說。
- 不把折疊當成完整語法解析。它配對多行大括號並排除高亮器辨識的字串／註解；不解析前處理器分支、巨集、模板語意，也不支援縮排式區塊。精選片段只折疊可見部分。
- 保留鍵盤可操作的控制項、Esc 關閉放大、原始行號、解說開關與靜態後備。
- 完整來源會隨 HTML 資料交付，先確認取用與分享範圍；元件不會在播放時讀原始 repo。
- 每頁以一個探索器為主要內容；先從約 5–15 個關係節點開始。大量來源會增加 HTML、縮圖與高亮成本，需要時按任務拆成不同探索器。

## 範例

```js
art: deck.codeexplorer('flow', {
  sources: { files: {
    'worker.cpp': { sha: 'example-v1', lang: 'cpp', lines: [
      'int twice(int value) {',
      '  return value * 2;',
      '}'
    ] }
  } },
  nodes: {
    twice: {
      title: '回傳兩倍', symbol: 'twice', file: 'worker.cpp', ranges: [[1, 3]],
      what: '將輸入乘以二。', input: 'value', output: 'value * 2',
      note: '示範程式；此頁不執行 C++。'
    }
  },
  edges: [],
  routes: { main: { name: '讀懂計算', ids: ['twice'] } },
  explanations: { 'worker.cpp': { 2: '計算後直接回傳，沒有修改呼叫者的變數。' } }
})
```
