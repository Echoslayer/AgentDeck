# predict

## 用途
先讓觀眾猜，再揭曉答案：教學與課程的「先寫下預測，再操作」。

## API
`deck.predict(key, question, answer, { choices?, correct?, button? })`
- `question`、`answer`：HTML 字串；`answer` 可含粗體與換行。
- `choices`：選項（選填），自動以 A、B、C 編號；`correct` 為正確選項的索引，揭曉時標示。
- `button`：按鈕文字，預設「揭曉」；再按一次收回，方便講者重來。
- 縮圖、匯出、編輯模式與動態未啟動時**直接顯示答案**，避免靜態版缺內容。題目、選項、答案皆可在現場修改。

## 必須保留
- 題目要能從前面的內容推得出來，答案附一句理由，不只給結論。
- 匯出 pptx 會直接看到答案；要在 PPT 保留揭曉，寫 `record: [{ wait: 3000 }, { click: '[data-key=<key>] button' }, { wait: 1500 }]`。
- 一頁一題。

## 範例
```js
art: deck.predict('dup', 'n 筆不重複資料逐筆掃描查重，總共要比幾次？',
  '<b>n(n−1)/2 次</b>：第 k 筆要和前面 k−1 筆比。',
  { choices: ['n 次', 'n log n 次', 'n(n−1)/2 次'], correct: 2 }),
```
