# 開始製作簡報

這是用 AgentDeck 做簡報的入口：先選情境，再照共同流程走。規則細節在 [`AGENTS.md`](../AGENTS.md)，設計理由在 [`adr/`](adr/README.md)。

## 選情境

| 情境 | 簡報放在哪 | 第一步 |
| --- | --- | --- |
| A. 在 AgentDeck 裡做，素材來自其他專案 | `AgentDeck\resources\<topic>\` | 在 AgentDeck 開 agent，把素材路徑寫進 `plan.md` |
| B. 簡報跟著其他專案一起版本控制 | `<其他專案>\slides\resources\<topic>\` | `tools\workspace.cmd D:\其他專案\slides` 建立工作區 |
| C. 在其他專案裡直接叫 agent 做簡報 | 由 agent 依 A／B 判斷 | 先安裝 skill：`tools\install-skill.cmd` |

- **A** 最單純：素材只讀不改，內容摘錄進 `story.js`，簡報不引用 AgentDeck 以外的檔案。
- **B** 會把框架（`assets/`、`templates/`、`examples/`、`tools/`、`docs/`、`AGENTS.md` 等）複製一份到目標資料夾，並寫入 `agentdeck.json` 記錄來源與版本。`vendor/`、`dist/` 已列入工作區的 `.gitignore`。AgentDeck 更新後執行 `tools\workspace.cmd <路徑> -Update`：框架與 examples 整份換新，保留工作區的 `assets/theme/`（品牌）、`resources/`（簡報）與自行新增的 `docs/` 檔案。
- **C** 的 skill 原始檔在 [`skills/agentdeck/`](../skills/agentdeck/SKILL.md)，安裝到 `~\.copilot\skills\` 與 `~\.claude\skills\` 並寫入本機 AgentDeck 位置；AgentDeck 搬家或 skill 更新後重新執行。只想給單一專案用，可加 `-Dest <repo>\.github\skills`。agent 被要求做簡報時會讀到它，再依上表決定走 A 或 B。

## 共同流程

1. **建立主題**：複製 `templates/blank/` 為 `resources/<topic>/`。
2. **企劃**：填 `resources/<topic>/plan.md`（對象、目的、素材、逐頁分鏡、元件、交付方式），人確認後再動工。`plan.md` 不會被打包。
3. **選呈現方式**：開啟 [`元件與互動範例`](../examples/index.html)。現成元件查 [`CATALOG`](../assets/deck/components/CATALOG.md)，選定後讀 README 與追加說明，再按 API 引用；互動組合查 [`examples 目錄`](../examples/README.md)，讀說明與程式後在主題內改寫。主題不得執行期引用 examples 或 playground。
4. **製作**：寫 `story.js`／`story.css`／`index.html`。寫作方式可參考 [`guides/`](guides/)。
5. **檢查與現場修正**：雙擊 `resources/<topic>/index.html` 播放；頁首「✎ 編輯」可改文字、拖曳、隱藏元件，按「另存」輸出 `edits.js` 覆蓋主題內的同名檔。
6. **交付**：`tools\pack.cmd resources\<topic>` 產生 `dist\<topic>-<時間>.zip`，對方解壓後雙擊最上層 `index.html` 即可離線播放。用到特殊元件（three.js 等）時，缺少的套件會自動下載。

## 給 agent 的開場白範例

```text
用 AgentDeck 做一份簡報：主題是 <…>，聽眾是 <…>，約 <N> 分鐘。
素材在 <路徑>。先填 plan.md 給我確認，再開始寫。
```
