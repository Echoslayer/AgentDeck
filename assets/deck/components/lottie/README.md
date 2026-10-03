# lottie（特殊：lottie-web）

## 用途
播放設計師做好的向量動畫（LottieFiles 下載或 After Effects 以 Bodymovin 匯出的 JSON）：圖示動畫、產品示意、流程動畫。只是要讓文字出現或移動時用 CSS 即可，不必用本元件。

## API
`deck.lottie(key, data, { frame?, loop?, caption?, hint? })`
- `data`：Lottie JSON **物件**（含 `w`、`h`、`layers`）。把 `.json` 檔內容貼進 `story.js`，例如 `const anim = { … };`；不要用網址或檔案路徑（`file://` 無法讀檔）。
- `frame`：縮圖、匯出與「減少動態」時停在第幾格；預設最後一格。
- `loop`：是否重複播放，預設 `true`。點動畫可暫停／繼續。
- `caption` 可現場修改；動畫本身不開放編輯。
- 靜態畫面在產生時就用 lottie 畫成 SVG，縮圖與匯出看得到。
- 需要套件 `lottie`：在元件 js 之前引用 `vendor/lottie/lottie_svg.min.js`（SVG 渲染器版）。

## 必須保留
- 只用向量動畫；含點陣圖（`assets` 有 `p` 圖片路徑）的 JSON 在 `file://` 下載不到圖片，先在 LottieFiles 轉成純向量或改用 `figure` 放圖。
- 檔案大小建議 300 KB 以內，每頁一個。
- 動畫的顏色寫在 JSON 裡，不會跟著主題色票變；選素材時對照品牌色，必要時在 LottieFiles 編輯器改色。
- 確認素材授權（LottieFiles 免費素材多為 Lottie Simple License），在 `caption` 或附註標示來源。

## 範例
```js
const checkAnim = { v: '5.7.0', fr: 30, ip: 0, op: 90, w: 200, h: 200, layers: [ /* … */ ] };
art: deck.lottie('done', checkAnim, { loop: false, caption: '驗收完成。' }),
```
