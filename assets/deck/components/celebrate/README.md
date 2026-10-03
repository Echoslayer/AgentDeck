# celebrate（特殊：canvas-confetti）

## 用途
包住的內容裡按下按鈕時，從按鈕位置噴出彩帶：揭曉測驗答案、宣布上線、達成目標的那一刻。只是裝飾，不承載資訊；一份簡報用一兩次。

## API
`deck.celebrate(key, html)`
- `html`：要包住的內容，通常是其他元件的輸出或一個按鈕，例如 `deck.celebrate('quiz', deck.predict(...))`（按「揭曉」時噴彩帶）或 `'<button type="button">上線了 🎉</button>'`。
- 包住的任何 `<button>` 被按下都會觸發；按鈕標示為收合（`aria-expanded="false"`，例如 predict 再按一次收回答案）時不觸發。
- 沒有靜態後備：縮圖與匯出只顯示包住的內容。
- 需要套件 `confetti`：在元件 js 之前引用 `vendor/confetti/confetti.browser.js`；包住的元件也要照常引用。

## 必須保留
- 彩帶顏色取自主題色票。
- 「減少動態」設定下不播放。
- 只用在一個值得慶祝的時刻，不要包住每一題。

## 範例
```js
art: deck.celebrate('reveal', deck.predict('q1', '改成集合後大約快幾倍？', '約 2000 倍。', { choices: ['2 倍', '20 倍', '2000 倍'], correct: 2 })),
```
