# 0008. 編輯層與閱讀器、元件解耦

- 狀態：已接受（`window.storyReader` 由 [0021](0021-pptx-export.md) 新增 `go(i)`、由 [0026](0026-reader-personal-preferences.md) 新增 `preferences` 與 `navigationDelta`）
- 日期：2026-09-30
- 修訂：[0003](0003-hide-as-live-fallback.md)（畫布判定改用 `data-canvas`）

## 背景

`deck-editor.js` 有兩處隱性耦合：

- 直接讀 `reader.js` 的頂層變數 `current` 與函式 `renderPreviews`，並以 MutationObserver 猜測換頁重繪。閱讀器已 fork 獨立演進（[0006](0006-fork-story-reader.md)），只要改名，編輯層就會拋錯或縮圖靜默不同步。
- 以寫死的 `.deck-cover,.deck-end` 判定畫布版面。依 [0004](0004-component-template-strategy.md)，主題可自訂絕對定位的畫布元件，卻無法依 [0003](0003-hide-as-live-fallback.md) 以畫布內元件為單位隱藏。

## 決策

- 閱讀器提供對外介面，外掛層只能使用這兩者：
  - `window.storyReader`：`index`（目前頁序）、`page`（目前頁面物件）、`refresh()`（重繪縮圖與索引）、`go(i)`（跳到第 i 頁，0 起算；0021 新增）。
  - `story:render` 事件：每次換頁渲染完成（含 `mount`）後在 `document` 上觸發，`detail` 為 `{ page, root }`。
- 編輯層在 `story:render` 時重新布置；頁內變動（`mount` 重繪、全選改寫）仍以 MutationObserver 補回按鈕。
- 畫布版面改以開關屬性 `data-canvas` 標示，加在 `art` 的第一層元素上，編輯層以其子元素為隱藏單位。`deck.cover()`／`deck.end()` 自動加上。
- `data-canvas` 只影響編輯粒度；封面／結尾隱藏 reader 欄位的外觀仍由 `deck.css` 的 `.deck-cover`／`.deck-end` 負責。
- 編輯按鈕不帶 `data-key`（改用 `data-for`），主題程式以 `[data-key]` 查詢時不會選到編輯 UI。

## 後果

- 閱讀器內部可自由重構，只要維持上述介面。
- 主題自訂畫布只需加 `data-canvas` 即可獲得逐元件隱藏。
- 未加 `data-canvas` 的舊式 `.deck-cover`／`.deck-end` 原生 HTML 會退回整塊隱藏；應改用 `deck.cover()`／`deck.end()`。
