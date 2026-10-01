# 0012. 範本只留空白骨架，寫作方式改為建議指引

- 狀態：已接受
- 日期：2026-09-30
- 修訂：[0004](0004-component-template-strategy.md)、[0009](0009-components-as-extensions.md)（範本改名為 `templates/blank/`；頁面模式移到指引）

## 背景

`templates/visual-story/` 混了兩種東西：

- **框架契約**：`index.html` 的載入順序、空的 `edits.js`、`story` 物件結構。寫錯就無法播放。
- **寫作風格**：每頁一個認知步驟、先寫分鏡、預測題、互動頁。這是一種教學型的寫作方法，只是 AgentDeck 的一種用法。

名稱與內容讓人以為 AgentDeck 的簡報都該寫成 visual story；但報告、公告、進度更新並不需要這套流程。另外，README 的分鏡資料契約指向本機的外部專案路徑，clone 下來的人看不到。

## 決策

1. **範本只留契約**：`templates/visual-story/` 改名為 `templates/blank/`，示範文字改為中性的佔位，不帶寫作建議。仍是複製起點，因為載入順序屬於機械式規則，交給檔案固化（[0007](0007-builders-over-markup-rules.md)）。
2. **契約寫進本專案**：分鏡資料契約（欄位、題目、`mount`／`previewArt`）寫在 README「分鏡資料契約」，不再引用外部專案。
3. **寫作方式改為指引**：`docs/guides/<name>.md` 放寫作方式的建議，第一份是 `visual-story.md`（工作流程、頁面寫法、預測題與互動頁範例、自我檢查）。指引是建議，不得與 ADR 或 `AGENTS.md` 衝突。
4. **LLM 的選用規則**：依人指定的指引寫作；未指定時，講解機制、因果類的簡報預設參考 `visual-story.md`，其他類型不必套用。新增指引需經人同意。

## 後果

- 框架與寫作風格分開：換一種簡報類型只需新增一份指引，不動範本與框架。
- 下游（[0010](0010-theme-layer-and-downstream.md)）可在 `docs/guides/` 加自己的指引（例如公司週報格式），合併上游時互不衝突。
- 契約說明不再依賴本機路徑。
- 舊路徑 `templates/visual-story/` 失效；既有主題是複製出去的，不受影響。
