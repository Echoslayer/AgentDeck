# backdrop（特殊：vanta + three.js）

## 用途
封面、章節頁或收尾頁的動態 3D 背景（網點、波浪），標題疊在上面，滑鼠移動時背景跟著反應。純粹營造氣勢，不承載資訊；一份簡報用一兩次。

## API
`deck.backdrop(key, html, { effect? })`
- `html`：疊在背景上的內容，通常是一行小字與標題；要現場可改的文字自己加 `data-key` 與 `data-edit`。
- `effect`：`'net'`（網點連線）或 `'waves'`（波浪），預設 `'waves'`。顏色取自主題色票。
- 靜態後備為品牌漸層 `--deck-gradient`（縮圖、匯出、未下載套件、WebGL 不可用、「減少動態」設定時）。
- 需要套件 `three` 與 `vanta`：在元件 js 之前引用 `vendor/three/three.min.js`、`vendor/vanta/vanta.net.min.js`、`vendor/vanta/vanta.waves.min.js`（`agentdeck add` 會印出）。

## 必須保留
- 算一個 three.js 元件：同一頁不要再放 `surface`／`stack3d`／`globe`。
- 文字放在畫面中央、字數少；背景會動，長文讀不下去。
- 不要放在需要講者細講的內容頁。

## 範例
```js
art: deck.backdrop('ch2', '<p class="deck-backdrop-kicker">第二章</p><h2 data-key="ch2-title" data-edit>從試做到正式元件</h2>', { effect: 'net' }),
```
