# AGENTS.md

本檔是**維護 AgentDeck 上游**（框架、元件、範例、CLI）的規則。背景與理由見 `docs/adr/`，使用流程見 `docs/getting-started.md`。

**製作或修改簡報時，先讀 [`AGENTDECK.md`](AGENTDECK.md) 並全部照做**；本檔只補充上游特有的部分。每份正式簡報一律以 `agentdeck init <位置>/<topic>` 建立獨立下游單位。上游的簡報試驗在被忽略的 `playground/<topic>/` 以 `init` 建立；專案網站是進 git 的 `site/` 單位（英文主入口、`lang/zh/` 中文），由 `.github/workflows/pages.yml` 打包部署到 GitHub Pages；兩個語言要同步改。除此之外，不得以上游根目錄或其他上游資料夾作為簡報單位（[0017](docs/adr/0017-presentation-entry-layout.md)、[0032](docs/adr/0032-pages-site-unit.md)）。

## 檔案所有權（上游）

| 路徑 | 擁有者 | LLM 可否修改 |
| --- | --- | --- |
| `playground/<topic>/` 的獨立簡報單位 | 同 `AGENTDECK.md` | 同 `AGENTDECK.md`；`edits.js` **不可** |
| `site/`（專案網站的簡報單位） | 同 `AGENTDECK.md` | 同 `AGENTDECK.md`；`edits.js`、`site/agentdeck/` 內的副本**不可**；上游元件改動後以 `add <元件> --force --dir site` 更新副本（[0032](docs/adr/0032-pages-site-unit.md)） |
| `.github/workflows/` | 框架（上游） | **不可**，除非人明確要求 |
| `assets/theme/` | 品牌（下游專案） | **不可**，除非人明確要求；品牌規則見 `assets/theme/README.md`（[0010](docs/adr/0010-theme-layer-and-downstream.md)） |
| `assets/deck/`（含 `components/`）、`assets/story-reader/`、`templates/`、`AGENTDECK.md` | 框架（上游，registry 來源） | **不可**，除非人明確要求（[0004](docs/adr/0004-component-template-strategy.md)、[0006](docs/adr/0006-fork-story-reader.md)、[0016](docs/adr/0016-registry-copy-and-contract-version.md)）。上游元件不因單一主題修改；下游副本可改 |
| `cli/`、`package.json`、`vendor.json`、`tools/`、`skills/`、`LICENSE` | 框架（上游） | **不可**，除非人明確要求；新增套件只提議，不自行加入（[0011](docs/adr/0011-vendor-manifest-and-packing.md)） |
| `playground/` | LLM（候選元件研究） | 可，自由刪改；不進 git、不進索引、主題不得引用（見 `playground/README.md`） |
| `examples/` | 上游（互動組合範例） | 經人同意新增或修改；只讀提供給下游，不複製（[0015](docs/adr/0015-interactive-examples.md)） |
| `docs/guides/` | LLM（寫作指引） | 可，經人同意後新增或修改；指引是建議，不得與 ADR 或 `AGENTDECK.md` 衝突 |
| `docs/migrations/` | 上游 | 契約遞增時必寫，見下方「契約版本」 |
| `vendor/`、`dist/` | 下載與打包產物 | 不手改、不 commit（已列入 `.gitignore`） |

## Registry（[0016](docs/adr/0016-registry-copy-and-contract-version.md)）

- 下游經 CLI 取得：核心（`LICENSE`、`AGENTDECK.md`、`assets/deck/` 的 `deck-core.js`／`deck-editor.js`／`deck.css`、`assets/story-reader/`、`templates/blank/`）、主題範本 `assets/theme/`（僅 `init`）、元件 `assets/deck/components/<name>/`（`add`）。下游一律放在簡報單位的 `agentdeck/` 內（同一路徑加上前綴，`vendor.json`、`agentdeck.json`、`vendor/`、自製 `components/` 亦同），第一層只留入口與 `resources/`（[0017](docs/adr/0017-presentation-entry-layout.md)）。改動這些路徑的結構時同步改 `cli/lib/registry.mjs`、`cli/lib/util.mjs` 的 `FW`。
- 元件 manifest 自動推導：資料夾內檔案全收；套件依賴取自 `deck.define` 的 `vendor: [...]` 與 `vendor/<name>/` 引用。元件需要的檔案都放在自己的資料夾內，不引用其他元件。
- 索引由 CLI 解析：`CATALOG.md` 的「基礎元件」「特殊元件」「依需求查找」表格（第一欄連到 `<名稱>/README.md`），`examples/README.md`「選擇表示方式」表格（第二欄連到 `<名稱>/index.html`），`docs/guides/*.md` 的第一個標題。修改這些表格時保持欄位順序。
- `docs <名稱>` 輸出 README 與它連到的同資料夾 `.md`，元件另附 CATALOG「引用方式」與「特殊元件規則」。追加說明一律從 README 連結，否則下游讀不到。
- `AGENTDECK.md` 會複製到下游：不得連結只在上游的檔案，改寫成 CLI 指令或「ADR 編號」純文字。

## 契約版本

- `deck-core.js` 的 `const CONTRACT`（`deck.contract`）涵蓋：頁面資料契約（`art`、`mount`、清理函式、`previewArt`）、`deck.<name>(key, …)` 呼叫慣例、`data-*` 標記模型、`edits.js` 格式、工作區路徑結構。
- 只有不相容變更才遞增；相容的新增與修正不遞增。遞增時同一個 commit 內：改 `CONTRACT`、新增 `docs/migrations/<n>-to-<n+1>.md`（格式見 [`docs/migrations/README.md`](docs/migrations/README.md)）、更新其「歷史」表；合併後打 tag `contract-<n+1>`。缺遷移說明的不相容變更不得合併。
- 契約可以照常大改，不以凍結 API 換取穩定；成本只有版本號與遷移說明。

## 新增或修改元件與範例

- 元件：依 `assets/deck/components/CATALOG.md`「新增元件」，需經人同意（[0009](docs/adr/0009-components-as-extensions.md)、[0013](docs/adr/0013-component-tiers.md)）。
- 範例：依 `examples/README.md`「新增與維護」（[0015](docs/adr/0015-interactive-examples.md)）。
- ADR 用 Nygard 格式，編號接續 `docs/adr/README.md` 的最後一號。

## 檢查

- `node cli/check.mjs`：在暫存資料夾跑 `init`／`new`／`add`／`catalog`／`docs`／`diff`／`status`／`update core`／`pack`，驗證下游工作區只引用自身檔案，完成後清理。
- `node examples/check.cjs`：互動組合範例的運算與本機引用。
- **瀏覽器驗證**（元件外觀、動態內容、朗讀）以 Chrome headless 截圖時：
  - 視窗最小寬度約 500px，`--window-size` 小於此值時以 500 排版再裁切，看起來像溢出；手機寬度要在真實瀏覽器或裝置模擬確認。
  - `--virtual-time-budget` 會快轉計時器，但 `requestAnimationFrame` 與 CSS 動畫不跟著前進；驗證動畫、物理模擬或朗讀動作要用真實時間等待後再截圖（例如以 DevTools Protocol 的 `Page.captureScreenshot`）。
  - 預設擋自動播放，測音檔加 `--autoplay-policy=no-user-gesture-required`。不出聲測朗讀時，在 `deck-editor.js` 之前以計時器替換 `window.speechSynthesis`（`speak` 依序呼叫 `onstart`、`onend`）。
  - 測試頁放在 `playground/<topic>/`，不進 git。
- **Windows 上的輔助腳本**：
  - `python`／`python3` 可能是 Microsoft Store 的轉址程式：從 Git Bash 呼叫時不執行腳本、也不報錯，修改會靜默略過。先用 `which python` 確認；處理檔案改用 node（本專案必有）。
  - 經 Bash heredoc（`cat > x.cjs <<'EOF'`）寫出的腳本，反斜線跳脫可能遺失，例如正規式的 `[\s\S]` 變成 `[sS]`。含反斜線的腳本用檔案寫入工具直接寫，或改用 `indexOf` 等不需跳脫的寫法；改完以 `node --check` 與實際輸出確認。

## Commit

- 不加 `Co-authored-by: Copilot` trailer；作者只有 repo 擁有者。
