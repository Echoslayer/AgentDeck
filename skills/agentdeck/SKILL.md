---
name: agentdeck
description: Make web slide decks (簡報、投影片、deck、presentation、slides、分享會、報告) with the AgentDeck framework — offline HTML decks played by double-clicking index.html, with live editing and zip delivery. Use this whenever the user wants to create, revise or package a presentation, turn notes/docs/code from the current project into slides, or mentions AgentDeck, even if they don't name the framework but are asking for slides and no other slide tool is specified.
---

# AgentDeck 簡報

AgentDeck 由 LLM 寫分鏡、人在播放時微調。規則的唯一來源是工作區內的 `AGENTDECK.md`；這份 skill 只負責找到或建立工作區（ADR 0016）。

AgentDeck CLI（製作端用，播放不需要）：

- 預設：`npx -y github:Echoslayer/AgentDeck <指令>`
- 本機有 AgentDeck 時：`node "{{AGENTDECK_HOME}}/cli/agentdeck.mjs" <指令>`（安裝 skill 時寫入；路徑不存在就用預設）

## 1. 決定工作區

| 情況 | 做法 |
| --- | --- |
| 找到的 `agentdeck/agentdeck.json` 屬於這次要改版的簡報，或其明確候選／附件 | 沿用該單位；CLI 改用其中 `cli` 欄位的指令 |
| 找到的單位屬於另一份獨立簡報 | 在另一個資料夾 `init`，不因已有 `agentdeck/agentdeck.json` 而共用 |
| 簡報要跟著目前專案版本控制 | `<CLI> init <repo>/slides/<topic>`；每個主題各一個獨立單位（宿主有 `AGENTS.md` 時依既有授權決定 `--agents-hint`） |
| 只拿目前專案當素材、簡報不需跟著它 | 問使用者放哪個資料夾，在那裡 `init` |
| 目前專案就是 AgentDeck 本身 | 讀其 `AGENTS.md`；試驗以 `init playground/<topic>` 建立獨立單位，不在上游根 `new` |

位置有疑問就問使用者。根目錄直接有 `agentdeck.json` 的是舊版工作區（契約 1 以前，或 `workspace.cmd` 建立而沒有 `contract`）：先執行 `status`，依它列出的遷移說明（`docs 0-to-1`、`docs 1-to-2`）轉換。

## 2. 照 AGENTDECK.md 做

讀工作區的 `agentdeck/AGENTDECK.md`，**全部照做**。重點：

1. 動工前 `status` 檢查契約版本；不一致時依遷移說明處理，無法遷移就停下來說明。
2. 在已 `init` 的獨立單位中 `new <topic>` 建立唯一根 `index.html` 與 `resources/<topic>/`，先填後者的 `plan.md` 交使用者確認，再寫程式。另一獨立主題須另行 `init`；只有同一主體的候選／附件使用 `new <name> --related <group>`，入口在 `<group>/<name>/index.html`。
3. `catalog [關鍵字]` 選表示方式，`docs <名稱>` 只讀選中的項目，`add <元件>` 取得元件。不整份讀取上游文件。
4. 素材在其他位置時只讀不改，內容摘錄進 `story.js`；簡報只引用工作區內的檔案。
5. 雙擊根 `index.html` 檢查；另存的人工修正放回對應 `resources/<name>/edits.js`。交付用 `pack` 打包完整單位，zip 根 `index.html` 直接播放。入口、相關內容與素材都引用本單位內的相對路徑，整個資料夾可獨立搬移。第一層只放入口、`resources/`、`agentdeck/`、`dist/`；主題的腳本與資料放進 `resources/<topic>/`。

## 不要做

- 不改 `edits.js`、核心副本（`agentdeck/` 下的 `assets/deck/` 核心檔、`assets/story-reader/`、`templates/`、`AGENTDECK.md`）、`agentdeck/assets/theme/`、`agentdeck/agentdeck.json`（除非使用者明確要求）。
- 不引入建置流程、不走 CDN、不把 `agentdeck/vendor/`、`dist/` 加入 git。
- 不在工作區以外另起一套簡報框架；需要的元件不存在時，依 `AGENTDECK.md` 在主題內自製。
