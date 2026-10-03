# 0027. record 步驟的播放與匯出各自實作，不抽共用 module

- 狀態：已接受
- 日期：2026-10-03
- 相關：[0021](0021-pptx-export.md)、[0024](0024-speech-synced-actions.md)、[0025](0025-native-pptx-annotations.md)

## 背景

`record` 步驟有兩份實作：

- `deck-editor.js` 在朗讀時執行，對應 `act`、`drawMarks`、`cueGroups`。
- `cli/lib/export.mjs` 在匯出時執行，對應 `runStep`、`addMarks`、`markClicks`。

架構檢視看到兩邊有相同的常數與算法，提議抽成一個共用 module，讓瀏覽器和 CLI 都載入它。

## 決策

不抽共用 module，兩邊各自實作。

實際重複的只有約 15 行：

- 箭頭的幾何常數（`L=90`、`G=10`、四個方向的對照表）
- range 滑桿位置的換算
- 拖曳的步數與間隔

其餘的不同是刻意的：

- **執行方式**：播放用合成事件，匯出用 Playwright 真的移動滑鼠。
- **標註輸出**：播放畫成 SVG 與 DOM，匯出畫成 PPT 原生圖形。
- **分組**：`cueGroups` 依口語稿的句子分組；`markClicks` 依 PPT 的「按一下」分組，clear 落在下一下。兩者用途不同。

共用 module 的成本比省下的行數高：

- 它必須同時能當瀏覽器的 classic script 和 node 的 ESM 載入，而且要多一個核心檔與一條載入順序規則。
- 匯出執行的是下游那份核心，CLI 是上游版本，兩者可能不同。共用 module 也解決不了這種版本差。

## 後果

- 改動箭頭或標註框的幾何時，兩處都要改。`export.mjs` 標註段落開頭的註解有提醒；`markClicks` 已經 export，並在 `cli/check.mjs` 測試。
- 匯出已經透過 `window.deckActions` 呼叫下游自己的標註實作。如果將來兩邊的語意真的分不開，優先從這個介面擴充，不要新增共用檔。
- 如果出現第三個消費者，例如另一種匯出格式，再重新評估。
