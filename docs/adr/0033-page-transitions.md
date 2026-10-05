# 0033. 換頁轉場由閱讀器提供，作者以 `transition` 選效果，讀者可關閉

- 狀態：已接受
- 日期：2026-10-05

## 背景

閱讀器換頁是直接替換內容區的 HTML，沒有任何過渡，連續翻頁時容易看不出已經換頁、也看不出前進或後退。作者希望由 LLM 在製作時依場合選擇轉場，觀看者則要能關掉。

轉場發生在兩頁之間，不屬於任何一頁的 `art`；而且必須在換頁之前取得舊頁畫面，元件只能收到換頁之後的 `story:render`，做不到。

## 決策

1. **機制在閱讀器**：`reader.js` 換頁時以瀏覽器原生的 View Transitions（`document.startViewTransition`）包住渲染；不支援的瀏覽器照舊直接換頁。不加套件。
2. **只動內容區**：`main` 為轉場主體；頁首、翻頁列、索引各自成組疊在內容之上，長頁轉場時不被蓋住。方向依頁序寫在 `<html data-turn>`。
3. **效果固定一組**，樣式全部在 `reader.css`：`slide`（預設）、`fade`、`push`、`zoom`、`flip`、`cover`、`wipe`、`rise`、`blur`、`none`。作者以 `story.transition` 設整份、頁面 `transition` 設「進入該頁」的效果；`deck.cover()`／`deck.end()` 轉傳此欄位。其他值在載入時報錯。
4. **讀者可關閉**：「設定 → 個人客製」的「換頁轉場」勾選框，存於瀏覽器（ADR 0026 的偏好模型）。系統要求減少動態（`prefers-reduced-motion`）時一律不轉場。首次載入與同頁重繪不轉場。
5. **不做成元件**：不進 `CATALOG.md`，不經 `add`；展示放在元件展示頁的「換頁轉場」一頁。
6. 只新增可選欄位，既有簡報不寫就得到預設 `slide`，不遞增契約。

## 後果

- 既有簡報更新核心後會出現 `slide` 轉場；要維持原樣時設 `transition: 'none'`。
- 轉場可被關閉，內容不可依賴轉場傳達資訊。
- 匯出（pptx、分享）與縮圖不受影響；它們不經換頁流程。
- 頁面渲染改在轉場回呼內執行，比原本晚一個畫格；外掛層仍應以 `story:render` 取得新頁，不要在 `storyReader.go()` 之後同步讀取 DOM。
- 新增效果時同步改 `reader.js` 的 `TRANSITIONS`、`reader.css` 與 `AGENTDECK.md` 的清單。
