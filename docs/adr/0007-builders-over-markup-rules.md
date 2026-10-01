# 0007. 以產生函式固化標記規範，模板分三層

- 狀態：已接受（元件存放位置、範本內容與選圖表位置被 [0009](0009-components-as-extensions.md) 取代）
- 日期：2026-09-30
- 修訂：[0005](0005-data-key-attribute-model.md)（新增編輯模式標示）

## 背景

依 [0003](0003-hide-as-live-fallback.md)、[0005](0005-data-key-attribute-model.md)，LLM 每次產出都要記得：每個第一層元件是單一元素、加 `data-key`、依需要加 `data-edit`／`data-move`／`data-hide`、封面與結尾照固定結構寫。這些是機械式規則，每次都一樣，卻全靠 LLM 記憶與自律；漏加 key 時錯誤不會被發現。

建立模板的目的就是降低 LLM 的心智負擔，讓它把注意力放在內容與版面設計上。

## 決策

規則依性質分三層：

1. **程式固化**（LLM 不用記）：共用外觀與編輯契約這類一定要成立的規則，寫成 單一檔案的產生函式（後由 [0009](0009-components-as-extensions.md) 拆為按需引用的元件），在 `story.js` 之前載入。
   - 頁型：`deck.cover({ title, meta })`、`deck.end()` 回傳完整頁面物件。
   - 基本元件：`deck.list`、`deck.cards`、`deck.steps`、`deck.focus`，第一個參數必為 `data-key`，否則直接報錯；產生單一根元素，並自動加上編輯、隱藏、畫布等標記。
   - 資料元件：`deck.compare`、`deck.metrics`、`deck.bars`、`deck.figure`。取自既有簡報主題中重複出現的結構（對照、KPI、同尺度橫條、圖表外框），經人同意升級（[0004](0004-component-template-strategy.md)）。`bars` 的長度由數值推導，不開放現場編輯。
   - 選圖依據（關係 → 元件 → 必須保留的約束）寫在 `AGENTS.md`。
   - 子項目 key 預設為「父 key-序號」（如 `cards-2`）；已被 `edits.js` 引用的項目要調整順序時，由 LLM 給明確的 `key`。
2. **模板照抄**：`templates/visual-story/` 示範分鏡骨架、題目頁、互動頁（`mount`＋`previewArt`＋清理函式）、原生 HTML 元件。這些是設計上的選擇，不固化。
3. **ADR 規範**：只有主題自訂的新元件（原生 HTML）才需要對照 [0003](0003-hide-as-live-fallback.md)、[0005](0005-data-key-attribute-model.md) 手動加標記。
- 耦合允許單向：主題依賴預設層的產生函式；預設層不依賴任何主題。
- 修訂 0005「不在執行期警告」：**編輯模式**下，退回位置 key 或 key 在本頁重複的元件以橘框標示，👁 提示原因。播放與縮圖不受影響，仍不提供驗證腳本。

## 後果

- 用產生函式的元件不會漏 key、不會拆錯元件，LLM 產出更一致。
- `story.js` 從原生 HTML 變成函式呼叫，要看實際標記需讀產生函式；原生 HTML 仍可混用。
- 產生函式屬於預設層（[0004](0004-component-template-strategy.md)），新增或修改要經人同意；主題重複出現的元件經審核後可升級為新的產生函式。
- 漏 key 的問題改在現場編輯時就能看見，但仍需人告知 LLM 修正。
