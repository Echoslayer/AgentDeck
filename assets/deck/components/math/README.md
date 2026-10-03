# math

## 用途
數學公式（推導、更新規則、目標函式）。

## API
`deck.math(key, tex, { display?, caption? })`
- `tex`：TeX 字串；建議用 `String.raw` 避免反斜線被轉義。
- `display`：預設 `true`（獨立一行、置中）；`false` 為行內大小。
- `caption`：說明，可在現場修改。公式本身**不開放現場編輯**，要改請改 `story.js`。
- 需要 `vendor/katex/katex.min.js`（vendor.json 的 `katex`），且須在本元件 js **之前**引用：公式在產生時就轉成 MathML，縮圖與匯出也看得到。未載入時顯示 TeX 原文並在主控台提示。
- 只用 MathML 輸出，由瀏覽器原生排版，不需 KaTeX 的 css 與字型；字形與 KaTeX 官網示範略有不同。

## 必須保留
- 一頁一到兩條公式；推導多步時拆頁或放進 `stepper`。
- 在 `caption` 或 `point` 用一句話說明公式在講什麼；符號第一次出現時定義。
- 語法錯誤不會中斷簡報（顯示為紅字），交付前逐頁檢查。

## 範例
```js
art: deck.math('vi', String.raw`V_{k+1}(s)=\max_a \sum_{s'} P(s'\mid s,a)\,\bigl[R(s,a,s')+\gamma V_k(s')\bigr]`,
  { caption: '價值迭代：新值只讀上一輪的舊值。' }),
```
