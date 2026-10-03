# terminal（特殊：asciinema-player）

## 用途
重播一段終端機操作：指令逐字打出、輸出逐行出現，可暫停、拖時間軸。適合 CLI 教學、部署流程、agent 操作示範。只要靜態呈現指令與輸出時用 `code` 的 `prompt` 模式。

## API
`deck.terminal(key, source, { prompt?, cols?, rows?, caption?, hint? })`
- `source`：兩種格式擇一。
  - **腳本**（字串）：以 `prompt`（預設 `'$ '`）開頭的行是指令，播放時逐字打出；其餘行是輸出，一次出現一行。節奏固定，每次播放相同。
  - **asciinema 錄製檔**：以 `asciinema rec` 錄下的 asciicast v2 內容（`{"version": 2, …}` 開頭的整段文字），直接貼成字串；不要用網址或檔案路徑（`file://` 無法讀檔）。
- `cols`／`rows`：終端機欄數與列數，預設 72×12；錄製檔請填錄製時的大小。
- `caption`：說明，可現場修改。指令與輸出**不開放現場編輯**，要改請改 `story.js`。
- `hint`：操作提示；縮圖不顯示，傳空字串隱藏。
- 需要套件 `asciinema-player`：在元件 js 之前引用 `vendor/asciinema-player/asciinema-player.min.js`（`agentdeck add` 會印出）。播放器樣式 `asciinema-player.css` 由元件依自己的位置自動載入，不用另外引用。
- 靜態後備（縮圖、匯出、未下載套件）：腳本為完整的最後畫面；錄製檔為去掉控制碼後的最後 `rows` 行。

## 必須保留
- 一段只示範一件事，約 5–15 行；長的錄製先用 `asciinema` 剪短，或拆成多頁。
- 錄製檔不可含密碼、token、個人路徑等敏感內容；錄製前先檢查，必要時改用腳本格式。
- 色彩由色票 token 覆寫播放器主題，不另引用 asciinema 的佈景主題。
- 「減少動態」設定下不自動播放，由講者按播放。

## 範例
```js
art: deck.terminal('deploy', `
$ agentdeck vendor
asciinema-player 3.17.0  ✓ sha256
$ agentdeck pack
dist/q3-review.zip  1.8 MB`, { caption: '下載套件後打包交付。' }),
```
