---
name: agentdeck
description: Make web slide decks (簡報、投影片、deck、presentation、slides、分享會、報告) with the AgentDeck framework — offline HTML decks played by double-clicking index.html, with live editing and zip delivery. Use this whenever the user wants to create, revise or package a presentation, turn notes/docs/code from the current project into slides, or mentions AgentDeck, even if they don't name the framework but are asking for slides and no other slide tool is specified.
---

# AgentDeck 簡報

AgentDeck 由 LLM 寫分鏡、人在播放時微調。規則的唯一來源是 AgentDeck 的 `AGENTS.md`；這份 skill 只負責找到框架、決定在哪裡做、照流程走。

AgentDeck 本體：`{{AGENTDECK_HOME}}`（安裝時寫入；若路徑不存在，請使用者提供 AgentDeck 的位置）。

## 1. 決定工作位置

先判斷簡報要放哪裡，有疑問就問使用者：

| 情況 | 工作區 | 做法 |
| --- | --- | --- |
| 目前專案已有工作區（某層有 `agentdeck.json`） | 該工作區 | 直接使用 |
| 簡報要跟著目前專案版本控制 | 目前專案內新建，例如 `<repo>\slides` | 執行 `{{AGENTDECK_HOME}}\tools\workspace.cmd <路徑>` |
| 只是拿目前專案當素材 | AgentDeck 本體 | 在 `{{AGENTDECK_HOME}}\resources\<topic>\` 製作 |

以下的「工作區」指上表選定的資料夾。

## 2. 讀規則

依序讀工作區內的：

1. `AGENTS.md`：檔案所有權、建立主題的步驟、標記規範、不做的事。**全部照做**。
2. `docs/getting-started.md`：完整流程。
3. `assets/deck/components/CATALOG.md`：可用元件（基礎／特殊）與「依需求查找」。
4. 需要時再讀 `docs/guides/` 的寫作指引與個別元件的 `README.md`。

## 3. 流程

1. 複製工作區的 `templates/blank/` 為 `resources/<topic>/`（`<topic>` 用英文小寫與連字號）。
2. **先填 `resources/<topic>/plan.md`**：對象、目的、素材路徑、逐頁分鏡與選用元件。交給使用者確認後才寫程式。
3. 素材在其他專案時只讀不改；把內容摘錄進 `story.js`，不要讓簡報引用工作區以外的檔案（打包會失敗）。
4. 寫 `story.js`／`story.css`／`index.html`，元件依 CATALOG 引用。
5. 用瀏覽器開 `resources/<topic>/index.html` 檢查；告訴使用者可按頁首「✎ 編輯」現場修改並另存 `edits.js`。
6. 交付：`tools\pack.cmd resources\<topic>` 產生 `dist\<topic>-<時間>.zip`，對方解壓後雙擊最上層 `index.html`。

## 不要做

- 不改 `edits.js`、`assets/`、`templates/`、`tools/`、`vendor.json`（除非使用者明確要求）。
- 不引入建置流程、不走 CDN、不把 `vendor/`、`dist/` 加入 git。
- 不在 AgentDeck 本體以外另起一套簡報框架；需要的元件不存在時，依 `AGENTS.md` 在主題內自製。
