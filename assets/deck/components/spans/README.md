# spans

## 用途
依真實時間比例畫出多條泳道上的區間（甘特式）：多個工作者、執行列或階段何時開始與結束，哪裡重疊、哪裡在等待。講者可播放或拖曳時間游標，畫面同步標出「此刻正在進行的區間」。適合流水線與平行處理、請求的各階段耗時、排程與資源佔用、CI job 的平行度。

## API
`deck.spans(key, { unit?, categories, groups }, { hint?, duration? })`
- `categories`：`{ <id>: { label } }`，1–6 類。顏色依宣告順序取主題色票，不能自訂色碼；圖例文字（`<key>-cat-<序號>`）可在現場修改。
- `groups`：`[{ label, note?, key?, lanes }]`，同一組代表一個比較對象（例如一種語言、一種做法）。組可單獨隱藏；組名（`<組 key>-label`）與附註（`<組 key>-note`）可在現場修改。組 key 預設 `key-序號`，已被 `edits.js` 引用的組要調整順序時，給明確的 `key`。
- `lanes`：`[{ label, spans }]`，一條泳道是一個執行者。`spans`：`[{ start, end, label, cat }]`，`start ≤ end`，單位由 `unit` 說明（只用於顯示，例如 `'ms'`）。區間文字屬於資料，不開放現場修改。
- 所有組共用同一條時間軸：起點為 `min(0, 最早開始)`，終點為最晚結束，方便跨組比較長度。
- `duration`：從頭播放到尾的秒數（預設 6）。`hint`：操作提示，傳空字串可省略。
- 控制列：播放／暫停、「下一個事件」（跳到下一個區間的開始或結束）、拉桿（原生 range，0–1000）。每組上方顯示此刻進行中的區間，沒有時顯示「空檔」或「已完成」。
- 靜態時（縮圖、匯出、未啟動）只畫完整時間軸，不顯示游標與控制列。

## 必須保留
- 區間的開始與結束必須來自量測或模型輸出，同一份資料、同一個時間基準；不要手寫比例，也不要把不同測量範圍放在同一條時間軸上比長短。
- 長度就是時間：沒有時間比例、只有先後時改用 `steps`／`sequence`；有日期的里程碑改用 `timeline`。
- 約 2–5 組、每組 1–4 條泳道、每條泳道約 15 個區間以內。資料更多時篩選代表樣本或拆頁，不要縮小字體硬塞。
- 太短的區間會窄到看不見文字，靠游標與「此刻」文字辨識；需要讀精確耗時時另附 `table`。
- 類別最多 6 類；「等待」「空檔」這類非工作時間建議獨立成一類，觀眾才看得出閒置。
- 匯出 pptx 要呈現游標移動時，在頁面寫 `record`，以 `set` 逐步設定拉桿：`[{ set: '[data-key=<key>] input', value: 300 }, { wait: 800 }, { set: '[data-key=<key>] input', value: 700 }, { wait: 800 }]`。

## 範例
```js
art: deck.spans('pipe', {
  unit: 'ms',
  categories: { io: { label: '讀檔' }, cpu: { label: '前處理' }, gpu: { label: '推論' }, wait: { label: '等待' } },
  groups: [
    { label: '循序處理', note: '共 52 ms', lanes: [{ label: '執行列 1', spans: [
      { start: 0, end: 6, label: '讀圖 1', cat: 'io' }, { start: 6, end: 14, label: '前處理 1', cat: 'cpu' },
      { start: 14, end: 26, label: '推論 1', cat: 'gpu' } /* … */ ] }] },
    { label: '管線處理', note: '共 38 ms', lanes: [
      { label: '執行列 1', spans: [{ start: 0, end: 6, label: '讀圖 1', cat: 'io' } /* … */ ] },
      { label: '執行列 2', spans: [{ start: 0, end: 14, label: '等待輸入', cat: 'wait' } /* … */ ] }] },
  ],
}),
```
