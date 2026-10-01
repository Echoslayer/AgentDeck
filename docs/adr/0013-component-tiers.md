# 0013. 元件分為基礎與特殊兩級，候選元件升級

- 狀態：已接受
- 日期：2026-09-30
- 修訂：[0009](0009-components-as-extensions.md)（核心多負責動態內容的生命週期；本次升級由人直接決定，未走「第二個主題再出現」的流程）

## 背景

`playground/` 研究了五個候選元件：`stack3d`、`globe`、`surface`（three.js）、`trend`（SVG）、`cube`（CSS 3D）。人決定全部升為正式元件，並提出兩個要求：

- LLM 建立主題時要讀目錄、了解元件設計；人提出特定需求（例如「放地圖」）時，LLM 要能從目錄找到可能可用的元件。
- 基礎元件與特殊元件要分開，兩者的成本與使用規則不同。

候選版本靠 `playground/live.js` 監聽 `story:render` 啟動 WebGL，元件與主題都要額外引用它；升級後不應讓每個主題自己處理這件事。

## 決策

1. **兩級**，以 `deck.define` 的 `tier` 標示：
   - **基礎**（`basic`，預設）：靜態 HTML／SVG／CSS，零依賴，縮圖即本體。`trend` 歸此級。
   - **特殊**（`special`）：有動態內容（`live`）、依賴 `vendor.json` 套件（`vendor`），或以自動動畫為主體。`surface`、`stack3d`、`globe`、`cube` 歸此級。核心強制：有 `live` 或 `vendor` 的元件必須是 `special`。
   資料夾維持 `components/<name>/` 平鋪，不依等級分資料夾：引用路徑不因改分級而變，下游主題不會失效。
2. **動態生命週期併入核心**：`deck.define(name, fn, { live })`。核心監聽 `story:render`，對每個 `.deck-<name>` 根元素呼叫 `live(el)`，換頁時先執行上一頁的清理函式；啟動成功加 `.deck-live-on` 隱藏後備，失敗則保留後備並在主控台說明。three.js 外殼（renderer、尺寸、拖曳、`forceContextLoss` 釋放）放在 `deck.util.three`，只在呼叫時檢查 `window.THREE`，核心本身不依賴套件。共用樣式（`.deck-view`、`.deck-fallback`、`.deck-canvas`、`.deck-hint`）放 `deck.css`。
3. **正式元件可依賴套件**：three.js 經人同意列入 `vendor.json`（[0011](0011-vendor-manifest-and-packing.md)）。用到套件的元件必須有靜態後備；主題自行引用 `vendor/three/three.min.js`，`tools\pack.cmd` 依引用打包。
4. **目錄即查找入口**：`CATALOG.md` 分「基礎元件」「特殊元件」兩表，另有「依需求查找」把人常用的說法對應到元件，以及「特殊元件規則」（引用套件、每頁最多一個 three.js 元件、講解不依賴互動）。`AGENTS.md` 規定建立主題時讀完目錄、人提出需求時先查目錄並說明取捨。
5. **展示頁分級**：`components/index.html` 先列基礎、再列特殊，章節標示依賴。

## 後果

- 主題用特殊元件時只多引用一個套件檔，不用寫 `mount`／`previewArt`。
- 核心多了約 90 行（生命週期與 three.js 外殼）；`deck.util.three` 綁定 three.js 的 API，改用其他 3D 套件時需另加外殼。
- 特殊元件在沒有執行 `tools\setup.cmd` 的環境只顯示後備；展示頁與主題都能播放，只是沒有 3D。
- `playground/` 清空，回到候選研究區。
