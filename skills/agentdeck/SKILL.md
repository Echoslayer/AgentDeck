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
| 目前專案某層已有 `agentdeck.json` | 用該資料夾；CLI 改用其中 `cli` 欄位的指令 |
| 簡報要跟著目前專案版本控制 | `<CLI> init <repo>/slides`（宿主有 `AGENTS.md` 時，問使用者是否加 `--agents-hint`） |
| 只拿目前專案當素材、簡報不需跟著它 | 問使用者放哪個資料夾，在那裡 `init` |
| 目前專案就是 AgentDeck 本身 | 讀其 `AGENTS.md`（上游只用於試做與驗證） |

位置有疑問就問使用者。舊版 `workspace.cmd` 建立的工作區（`agentdeck.json` 沒有 `contract`）：先執行 `status`，依 `docs 0-to-1` 轉換。

## 2. 照 AGENTDECK.md 做

讀工作區的 `AGENTDECK.md`，**全部照做**。重點：

1. 動工前 `status` 檢查契約版本；不一致時依遷移說明處理，無法遷移就停下來說明。
2. `new <topic>` 建立主題，先填 `plan.md` 交使用者確認，再寫程式。
3. `catalog [關鍵字]` 選表示方式，`docs <名稱>` 只讀選中的項目，`add <元件>` 取得元件。不整份讀取上游文件。
4. 素材在其他位置時只讀不改，內容摘錄進 `story.js`；簡報只引用工作區內的檔案。
5. 雙擊 `resources/<topic>/index.html` 檢查；交付用 `pack resources/<topic>`。

## 不要做

- 不改 `edits.js`、核心副本（`assets/deck/` 核心檔、`assets/story-reader/`、`templates/`、`AGENTDECK.md`）、`assets/theme/`、`agentdeck.json`（除非使用者明確要求）。
- 不引入建置流程、不走 CDN、不把 `vendor/`、`dist/` 加入 git。
- 不在工作區以外另起一套簡報框架；需要的元件不存在時，依 `AGENTDECK.md` 在主題內自製。