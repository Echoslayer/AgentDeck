# 開始製作簡報

這是用 AgentDeck 做簡報的入口：先選情境，再照共同流程走。製作規則在 [`AGENTDECK.md`](../AGENTDECK.md)，上游維護規則在 [`AGENTS.md`](../AGENTS.md)，設計理由在 [`adr/`](adr/README.md)（工作區與更新方式見 [ADR 0016](adr/0016-registry-copy-and-contract-version.md)）。

## 選情境

| 情境 | 簡報放在哪 | 第一步 |
| --- | --- | --- |
| A. 簡報跟著其他專案一起版本控制 | `<其他專案>/slides/resources/<topic>/` | `npx -y github:Echoslayer/AgentDeck init <其他專案>/slides` |
| B. 在其他專案裡直接叫 agent 做簡報 | 由 agent 找到或建立工作區 | 先安裝 skill：`tools\install-skill.cmd` |
| C. 試做或驗證框架本身 | `AgentDeck/resources/<topic>/`（不進 git） | 在 AgentDeck 開 agent |

- **A**：`init` 只複製播放必需的核心（`assets/deck` 核心檔、`assets/story-reader/`、`templates/blank/`）、品牌 `assets/theme/`、`AGENTDECK.md` 與 `vendor.json`，並寫入 `agentdeck.json`（契約版本、來源、每個副本的上游 commit 與雜湊）。元件、範例、指引留在上游，用到才取。`vendor/`、`dist/` 預設列入 `.gitignore`。需要 Node.js 18 以上；播放與交付的 zip 不需要。
- **B**：skill 原始檔在 [`skills/agentdeck/`](../skills/agentdeck/SKILL.md)，安裝到 `~\.copilot\skills\` 與 `~\.claude\skills\`，並寫入本機 AgentDeck 位置，讓 agent 可改用本機 CLI。只想給單一專案用，可加 `-Dest <repo>\.github\skills`。agent 被要求做簡報時會讀到它，找到 `agentdeck.json` 或照 A 建立工作區。
- **C**：上游本身也可直接當工作區；`add`、`diff`、`update` 在上游內不適用。
- 舊版以 `workspace.cmd`（已移除）建立的工作區，轉換方式見 [`migrations/0-to-1.md`](migrations/0-to-1.md)。

## CLI

以下 `<CLI>` 為 `npx -y github:Echoslayer/AgentDeck`，或本機的 `node <AgentDeck>/cli/agentdeck.mjs`；工作區的 `agentdeck.json` 的 `cli` 欄位會記錄要用哪一個。在工作區任一層執行即可，也可用 `--dir` 指定。

| 指令 | 用途 |
| --- | --- |
| `init [資料夾]` | 建立工作區（`--commit-vendor` 讓套件進 git；`--agents-hint` 在宿主 `AGENTS.md` 加一行指引） |
| `status` | 契約版本、副本與上游的差異摘要、套件狀態；動工前先跑 |
| `catalog [關鍵字]` | 元件、互動範例、寫作指引的一行索引 |
| `docs <名稱> [--code]` | 只讀選中項目的 README 與追加說明；範例加 `--code` 連同程式 |
| `add <元件…>` | 複製元件到 `assets/deck/components/<name>/`，登記到 `agentdeck.json` |
| `new <topic>` | 由 `templates/blank/` 建立 `resources/<topic>/` |
| `vendor` | 依 `vendor.json` 下載並驗證套件（`--check` 只檢查） |
| `pack <簡報資料夾>` | 打包成可離線播放的 zip（預設輸出到 `dist/`） |
| `diff [core\|<元件>]` | 副本相對於取得時與上游最新版的差異；`--patch` 顯示內容 |
| `update core` | 以上游核心覆蓋副本；有本地修改需 `--force`，跨契約版本需 `--migrate` |

## 更新與版本

- 副本取得後歸工作區所有，不會自動更新。想跟進上游時先 `diff`，再決定 `update core`、`add <元件> --force`，或手動挑選修改。
- 核心公開 `deck.contract`（契約版本）。上游改動分鏡資料契約、`deck.*` API、標記規範或工作區結構時遞增版本，並在 [`migrations/`](migrations/README.md) 寫遷移說明。
- 工作區與上游契約版本不同時，`add` 會拒絕；`status` 會列出需讀的遷移說明，讀完以 `update core --migrate` 升級，再依說明修改元件副本與簡報。無法遷移時，改用對應版本的來源（例如 tag `contract-<n>`）。

## 共同流程

1. **建立主題**：`<CLI> new <topic>`。
2. **企劃**：填 `resources/<topic>/plan.md`（對象、目的、素材、逐頁分鏡、元件、交付方式），人確認後再動工。`plan.md` 不會被打包。
3. **選呈現方式**：`<CLI> catalog` 看索引（上游可開 [`元件與互動範例`](../examples/index.html)）。現成元件以 `docs <name>` 讀 README 與追加說明，`add <name>` 取得後按 API 引用；互動組合以 `docs <範例> --code` 讀說明與程式後在主題內改寫。主題不得執行期引用 examples 或 playground。
4. **製作**：寫 `story.js`／`story.css`／`index.html`。寫作方式可參考 `catalog` 列出的指引。
5. **檢查與現場修正**：雙擊 `resources/<topic>/index.html` 播放；頁首「✎ 編輯」可改文字、拖曳、隱藏元件，按「另存」輸出 `edits.js` 覆蓋主題內的同名檔。
6. **交付**：`<CLI> pack resources/<topic>` 產生 `dist/<topic>-<時間>.zip`，對方解壓後雙擊最上層 `index.html` 即可離線播放。用到特殊元件（three.js 等）時，缺少的套件會自動下載。

## 給 agent 的開場白範例

```text
用 AgentDeck 做一份簡報：主題是 <…>，聽眾是 <…>，約 <N> 分鐘。
素材在 <路徑>。先填 plan.md 給我確認，再開始寫。
```