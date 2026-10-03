# 開始製作簡報

這是用 AgentDeck 做簡報的入口：先選情境，再照共同流程走。製作規則在 [`AGENTDECK.md`](../AGENTDECK.md)，上游維護規則在 [`AGENTS.md`](../AGENTS.md)，設計理由在 [`adr/`](adr/README.md)（工作區與更新方式見 [ADR 0016](adr/0016-registry-copy-and-contract-version.md)）。

## 選情境

| 情境 | 簡報放在哪 | 第一步 |
| --- | --- | --- |
| A. 簡報跟著其他專案一起版本控制 | `<其他專案>/slides/<topic>/index.html`；該資料夾是完整獨立單位 | `npx -y github:Echoslayer/AgentDeck init <其他專案>/slides/<topic>` |
| B. 在其他專案裡直接叫 agent 做簡報 | 由 agent 找到或建立工作區 | 先安裝 skill：`tools\install-skill.cmd` |
| C. 試做或驗證框架本身 | `AgentDeck/playground/<topic>/index.html`；該資料夾是獨立試驗單位 | `node cli/agentdeck.mjs init playground/<topic>` |

- **A**：`init` 只複製播放必需的核心（`assets/deck` 核心檔、`assets/story-reader/`、`templates/blank/`）、品牌 `assets/theme/`、`AGENTDECK.md`、`LICENSE`（框架 MIT 授權聲明）與 `vendor.json`，全部放進單位內的 `agentdeck/`，並寫入 `agentdeck/agentdeck.json`（契約版本、來源、每個副本的上游 commit 與雜湊）。元件、範例、指引留在上游，用到才取。`agentdeck/vendor/`、`dist/` 預設列入 `.gitignore`。需要 Node.js 18 以上；播放與交付的 zip 不需要。要沿用指定模板時加 `--theme <主題資料夾>` 取代預設主題；只有 PPT 模板時先依 `agentdeck docs theme-from-pptx` 轉成主題資料夾（[ADR 0019](adr/0019-theme-templates.md)）。
- **B**：skill 原始檔在 [`skills/agentdeck/`](../skills/agentdeck/SKILL.md)，安裝到 `~\.copilot\skills\` 與 `~\.claude\skills\`，並寫入本機 AgentDeck 位置，讓 agent 可改用本機 CLI。只想給單一專案用，可加 `-Dest <repo>\.github\skills`。agent 被要求做簡報時會讀到它，找到 `agentdeck/agentdeck.json` 或照 A 建立工作區。
- **C**：`init` 只允許上游內被忽略的 `playground/` 作試驗單位；上游根與其他上游資料夾不能用來製作主題。Registry 的 `templates/blank/`、元件展示與 examples 仍可直接預覽。
- 舊版以 `workspace.cmd`（已移除）建立的工作區，轉換方式見 [`migrations/0-to-1.md`](migrations/0-to-1.md)。

例如在 AgentDeck 上游試做一份簡報，從上游根目錄執行：

```powershell
node cli/agentdeck.mjs init playground/demo
node cli/agentdeck.mjs new demo --dir playground/demo
```

只有刻意屬於這份簡報的候選或附件，才接著建立：

```powershell
node cli/agentdeck.mjs new draft-a --related candidates --dir playground/demo
node cli/agentdeck.mjs new experiment --related attachments --dir playground/demo
```

主入口是 `playground/demo/index.html`。完成內容後，以 `node cli/agentdeck.mjs pack --dir playground/demo` 打包整份交付。另一份獨立 HTML PPT 另行 `init`，即使題材相近也不放進 `demo`；一般下游專案改用情境 A 的 CLI 與目的路徑。

單位的第一層只放人會打開的東西，框架都收在 `agentdeck/`：

```text
demo/
  index.html          主簡報（雙擊播放）
  resources/demo/     story.js、story.css、edits.js、plan.md、素材
  candidates/…        同主體的候選或附件（可選）
  agentdeck/          框架、品牌、元件、套件、AGENTDECK.md 與 CLI 記錄
  dist/               打包產物（不進 git）
```

## CLI

以下 `<CLI>` 為 `npx -y github:Echoslayer/AgentDeck`，或本機的 `node <AgentDeck>/cli/agentdeck.mjs`；工作區的 `agentdeck/agentdeck.json` 的 `cli` 欄位會記錄要用哪一個。在工作區任一層執行即可，也可用 `--dir` 指定。

| 指令 | 用途 |
| --- | --- |
| `init [資料夾]` | 建立一份簡報的獨立單位（`--commit-vendor` 讓套件進 git；`--agents-hint` 在宿主 `AGENTS.md` 加一行指引） |
| `status` | 契約版本、副本與上游的差異摘要、套件狀態；動工前先跑 |
| `catalog [關鍵字]` | 元件、互動範例、寫作指引的一行索引 |
| `docs <名稱> [--code]` | 只讀選中項目的 README 與追加說明；範例加 `--code` 連同程式 |
| `add <元件…>` | 複製元件到 `agentdeck/assets/deck/components/<name>/`，登記到 `agentdeck/agentdeck.json`，並印出要加到 `index.html` 的引用行 |
| `new <topic>` | 在單位內建立唯一根 `index.html` 與 `resources/<topic>/`；已存在主入口時拒絕 |
| `new <name> --related <group>` | 明確同主體的候選／附件入口 `<group>/<name>/index.html`，內容在 `resources/<name>/` |
| `join <topic>` | 平行製作後，把 `resources/<topic>/pages/` 依入口引用順序併回 `story.js`、`story.css`（[ADR 0023](adr/0023-parallel-pages-and-join.md)） |
| `vendor` | 依 `agentdeck/vendor.json` 下載並驗證套件（`--check` 只檢查） |
| `pack [入口資料夾]` | 預設打包完整單位；可選相關入口作首頁（輸出到 `dist/`） |
| `export [入口資料夾]` | 可選進階，內容確認後才用。輸出 `dist/<名稱>.pptx`：外框文字可編輯、內容區截圖、有 `record` 的頁錄成 mp4（只有紅框／箭頭的頁改為 PPT 原生標註與出現動畫）、講稿進備忘稿；`--check` 只檢查環境（[ADR 0021](adr/0021-pptx-export.md)、[0025](adr/0025-native-pptx-annotations.md)） |
| `diff [core\|<元件>]` | 副本相對於取得時與上游最新版的差異；`--patch` 顯示內容 |
| `update core --check` | 唯讀預檢來源、契約、實際差異與本地衝突；可更新回傳 0，受阻回傳非 0 |
| `update core` | 自動備份完整單位後，只覆蓋有差異的核心；本地修改需 `--force`，跨契約需 `--migrate` |

## 更新與版本

- 安裝 skills 後，可直接對 agent 說「把這份簡報升到最新 AgentDeck，保留客製內容」，或「只補上新版字幕功能」。[agentdeck-upgrade](../skills/agentdeck-upgrade/SKILL.md) 會確認目標來源、備份、更新核心、整合客製元件、調整必要接入並驗證打包結果；最新版不代表替每頁新增所有可選內容。`tools\install-skill.cmd` 會一併安裝製作與更新 skills，已安裝者重新執行即可。
- 先執行 `update core --check`，相容且無衝突時直接 `update core`；只有衝突才讀 `diff core --patch`。來源是執行中 CLI 所在的 checkout／套件，預檢不會下載或確認遠端最新版。
- 寫入前自動把完整單位備份到系統暫存目錄 `agentdeck-update-*/backup/`，印出絕對路徑；需要長期保留時請移到自己的備份位置。更新後核對核心雜湊及非核心一般檔案的原始 SHA-256，包含內容、主題、元件和人工修正。完全一致時不寫入、不備份。失敗會保留備份並回報；還原時先比對，避免覆蓋更新期間新增的工作。
- `update core` 只更新核心與 CLI 記錄；契約一致不代表簡報內容已完成遷移。完整更新須驗證既有互動、人工修正及搬移後的離線播放；未完成的驗證應明確回報。
- 副本取得後歸工作區所有，不會自動更新。想跟進上游時先 `diff`，再決定 `update core`、`add <元件> --force`，或手動挑選修改。
- 核心公開 `deck.contract`（契約版本）。上游改動分鏡資料契約、`deck.*` API、標記規範或工作區結構時遞增版本，並在 [`migrations/`](migrations/README.md) 寫遷移說明。
- 工作區與上游契約版本不同時，`add`、`new`、`pack` 會拒絕；`status` 會列出需讀的遷移說明，讀完以 `update core --migrate` 升級，再依說明修改元件副本與簡報。契約 2 的入口結構見 [1-to-2](migrations/1-to-2.md)。無法遷移時，改用對應版本的來源（例如 tag `contract-<n>`）。

## 共同流程

1. **建立主題**：`<CLI> init <位置>/<topic>` 後，於該單位 `<CLI> new <topic>`。另一獨立主題另行 `init`，不能放在此單位內共用框架；只有同一主體的候選／附件才用 `--related`，群組可用 `candidates`、`attachments` 或其他有效名稱。探索可先建立候選，主入口稍後再定。
2. **企劃**：填 `resources/<topic>/plan.md`（對象、目的、素材、逐頁分鏡、元件、交付方式），標明每頁放主線或附件；人要求時先確認再動工（ADR 0018）。`plan.md` 不會被打包。
3. **選呈現方式**：`<CLI> catalog` 看索引（上游可開 [`元件與互動範例`](../examples/index.html)）。現成元件以 `docs <name>` 讀 README 與追加說明，`add <name>` 取得後按 API 引用；互動組合以 `docs <範例> --code` 讀說明與程式後在主題內改寫。主題不得執行期引用 examples 或 playground。
4. **製作**：主入口是根 `index.html`；內容、CSS、資料、圖片與人工修改放 `resources/<topic>/`。根入口引用 `agentdeck/assets/`、`resources/<topic>/`；動態素材依 [`AGENTDECK.md`](../AGENTDECK.md#相對路徑) 取得 story script 前綴。所有播放依賴位於同一單位內。
5. **檢查與現場修正**：雙擊根 `index.html` 播放，頁首「✎ 編輯」改文字、拖曳、隱藏元件，在「註解」留意見（見下方「播放與現場編輯」）。按「另存」輸出 `edits.js` 覆蓋對應 `resources/<name>/edits.js`；下一輪修改時 agent 會讀註解。口語稿、朗讀動作與 PPT 不在第一輪產生，見「內容確認後的下一輪」。
6. **交付**：`<CLI> pack` 打包完整單位，解壓後最上層 `index.html` 是實際播放頁。逐頁驗證主簡報、相關內容與素材連結；缺少的引用套件會自動下載。將整個資料夾移至別處再驗證，確認沒有依賴其他主題。

若以 `pack <group>/<name>` 選相關入口作交付首頁，僅靜態 HTML 引用會換算；另外檢查 `story.back` 與動態連結，原主簡報不保證一併帶入。完整交付優先用無參數的 `pack`。

## 播放與現場編輯

| 按鍵 | 作用 |
| --- | --- |
| ← → / PageUp PageDown | 翻頁 |
| N | 右側「講稿」分頁：講者動作、補充解釋、口語稿 |
| C | 右側「註解」分頁：留給下一輪的修改意見（Ctrl+Enter 送出） |
| E | 收起／顯示編輯列 |
| Ctrl+S | 另存 `edits.js` |
| R | 朗讀本頁（有口語稿或音檔時） |
| P | 從本頁逐頁朗讀並自動翻頁（同頁首「⏵ 全部播放」） |
| S | 開關朗讀字幕（同「CC」） |
| Esc | 收起側欄、離開放大播放 |

- **編輯**：頁首「✎ 編輯」後直接改標記為可編輯的文字（Ctrl+B／I／U，貼上一律轉純文字），封面／結尾的元素可拖曳。元件右上角 👁 切換顯示，隱藏的元件播放與縮圖時不出現。缺 key 或 key 重複的元件會以橘框標示，回報給 agent 修正。
- **保存**：預設不保存，重新整理即還原。「另存」（Ctrl+S）輸出完整的 `edits.js`，覆蓋 `resources/<name>/edits.js` 才會永久套用；「捨棄」丟棄未另存的修改。
- **講稿與註解**：側欄滑鼠移上去暫開，點標籤釘選；索引縮圖標出註解數。頁首「🎤 講者」另開簡報者視窗（計時、講稿、下一頁、註解，字級可調），適合雙螢幕上台（[ADR 0020](adr/0020-instructions-and-comments.md)）。
- **放大播放**：底部導覽的 🔍 切換全螢幕並放大內容。
- 朗讀語速可在 0.75×–2× 切換；有音檔播音檔，沒有就用瀏覽器內建語音（[ADR 0022](adr/0022-speech-read-aloud.md)）。

## 內容確認後的下一輪

第一輪只做內容與每頁的講者動作（`instruction`）。播放確認、內容不再大改後，再依需要提出下列要求；內容還在改時先不要做，句數與版面一變就得重寫。

| 想要的結果 | 對 agent 說 | agent 會做 |
| --- | --- | --- |
| 講者能回答追問 | 「補充解釋」 | 為需要的頁寫 `explain`，查不到的列進 `plan.md`「待確認」 |
| 照稿念或無人播放 | 「補逐字稿」 | 寫 `speech`，可按 R／P 朗讀 |
| 用真人錄音 | 「用這些音檔」並提供檔案 | 放進 `resources/<name>/audio/`，填 `audio`；要精準對齊再填 `cues` |
| 畫面跟著念（紅框、箭頭、操作元件） | 「畫面跟著念」 | 在 `record` 加 `at`（寫法見 `agentdeck docs speech-actions`，[ADR 0024](adr/0024-speech-synced-actions.md)） |
| PowerPoint 檔 | 「輸出 PPT」 | 先 `export --check`，再 `export` 到 `dist/<名稱>.pptx`（[ADR 0021](adr/0021-pptx-export.md)、[0025](adr/0025-native-pptx-annotations.md)） |

PPT 不保留朗讀同步：只有紅框／箭頭的頁會變成 PPT 原生標註，按一下依序出現；有點擊、拖曳等操作的頁則錄成影片。

## 給 agent 的開場白範例

```text
用 AgentDeck 做一份簡報：主題是 <…>，聽眾是 <…>，約 <N> 分鐘。
素材在 <路徑>。先填 plan.md 給我確認，再開始寫。
```

內容確認後的下一輪：

```text
內容定了。補逐字稿，讓畫面跟著念：第 3、5 頁用紅框指出重點。
```
