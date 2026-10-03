# sequence

## 用途
兩到四方之間的事件順序：請求與回覆、重試、逾時、訊息遺失，以及各方自己發生的事件（提交、寫檔）。

## API
`deck.sequence(key, actors, rows)`
- `actors`：2–4 個參與者名稱，由左到右。
- `rows`：由上往下依序，每列是其中一種：
  - 訊息 `{ from, to, text, lost?, highlight?, key? }`：`lost: true` 畫成虛線並在接收端打 ✕。
  - 本地事件 `{ at, text, highlight?, key? }`：畫在該參與者的生命線上。
- 每列 key 預設為 `key-序號`，可單獨隱藏；參與者名稱與每列文字可在現場修改。

## 必須保留
- 由上往下是**順序**，間距不代表經過時間；需要時間比例時自製。
- 約 8 列以內；超過時拆頁或用 `stepper` 逐步揭露。
- 遺失與逾時要畫出來，不要只寫在文字裡：結論常常就在「哪一則沒有到」。

## 範例
```js
art: deck.sequence('timeout', ['用戶端', '資料庫'], [
  { from: '用戶端', to: '資料庫', text: '送出交易 X' },
  { at: '資料庫', text: '提交成功 ✓' },
  { from: '資料庫', to: '用戶端', text: '成功回覆', lost: true },
  { at: '用戶端', text: '逾時：結果未知', highlight: true },
]),
```
