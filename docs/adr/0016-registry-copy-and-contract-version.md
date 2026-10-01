# 0016. 其他專案改以「複製即擁有」取用框架，契約以版本號與遷移說明管理

- 狀態：已接受
- 日期：2026-10-01
- 修訂：[0014](0014-portable-usage.md)（決策 3 工作區）、[0011](0011-vendor-manifest-and-packing.md)（決策 2「不需要 Node」改為僅指播放端）、[0010](0010-theme-layer-and-downstream.md)（下游可修改自己的元件副本）

## 背景

情境 B（簡報跟著其他專案版本控制）目前以 `tools\workspace.cmd` 把整份框架複製進目標資料夾，`-Update` 整份覆蓋。實際使用的問題：

1. **製作工具與播放所需混在一起**：`docs/`、`examples/`、`tools/`、`AGENTS.md`、CATALOG 只在製作時需要，卻全部進入宿主 repo；`AGENTS.md`、`README.md`、`.gitignore` 還可能與宿主既有檔案衝突。
2. **一個工作區只有一個框架版本**：`-Update` 同時影響所有簡報，而且會覆蓋下游對元件的任何修改。
3. **更新依賴本機路徑**：`agentdeck.json` 記錄的是作者本機的 AgentDeck 位置，其他人 clone 後無從更新。
4. **只支援 Windows**：工具全是 PowerShell。

同時，本專案的前提是 LLM agent 主導製作：在各專案中依需求客製元件與操作是預期行為，資料夾結構只要寫成契約 agent 就能遵守。真正要避免的是**成品被框架訂死**——簡報產出後必須能被自由修改，不因上游演進而失效或被強迫升級。

## 決策

採用 shadcn 式「registry + 複製即擁有」：AgentDeck 是來源，不是執行期依賴。

### 1. 上游（AgentDeck）是 registry

- 核心（`deck-core`、`deck-editor`、`deck.css`、`story-reader`）、元件（`assets/deck/components/<name>/`）、主題範本（`assets/theme/`）、主題骨架（`templates/blank/`）是可被複製的來源。
- 元件 manifest **自動推導**，不手寫：元件資料夾內的檔案全部收錄；套件依賴由掃描 `vendor/<name>/` 引用得出。
- CATALOG、`examples/`、`docs/guides/`、ADR 留在上游，不整份複製到下游。
- **按需閱讀**：agent 不整份讀取上游文件，分兩段取用（沿用 [0015](0015-interactive-examples.md) 決策 4）：
  1. **索引**：元件與範例各一行（名稱、表示關係、級別、套件依賴），由 CLI 從 CATALOG 與 `examples/README.md` 產生；項目變多時可依需求或關係篩選。選表示方式時只讀索引。
  2. **細節**：選定後才取該項目的 README 與「實作前必讀」。元件以 `add` 複製進下游（文件隨元件走）；範例只讀不複製，主題自行改寫。
- `playground/` 是上游的本機試驗區，不進索引、不提供給下游。

### 2. 下游（宿主專案）擁有副本

```text
<宿主>/slides/                 位置可自訂
  agentdeck.json               契約版本、上游來源與每個副本的來源版本
  AGENTDECK.md                 製作規則副本（見決策 7）
  assets/
    deck/                      核心副本
    deck/components/<name>/    以 add 取得的元件副本（含 README 與追加說明）
    theme/                     品牌，下游擁有
  components/<name>/           下游自製元件
  resources/<topic>/           簡報
  vendor.json                  僅列出已取得元件用到的套件
```

- **核心**：不承諾下游修改後可合併；`update core` 直接覆蓋。下游要改核心行為應回饋上游。
- **元件**：取得後歸下游所有，agent 可依主題需求修改。上游的修正不會自動傳入，需以 `diff` 比對後由 agent 決定是否吸收。
- **簡報**：只引用 `slides/` 內的檔案，雙擊即可播放；不在執行期讀取上游或網路。

### 3. 契約版本

- `deck-core.js` 公開 `deck.contract`（整數，從 `1` 起）。涵蓋：頁面資料契約（`art`、`mount`、清理函式、`previewArt`）、`deck.<name>(key, …)` 呼叫慣例、`data-*` 標記模型、`edits.js` 格式、路徑結構。
- 只有不相容變更才遞增；相容的新增與修正不遞增。
- **不相容變更必須附遷移說明** `docs/migrations/<n>-to-<n+1>.md`，寫給 agent：變更內容、逐項改法、驗證方式。缺遷移說明的不相容變更不得合併。
- 契約可以照常大改；版本號與遷移說明是唯一的成本，不以凍結 API 換取穩定。

### 4. `agentdeck.json`

```json
{
  "contract": 1,
  "source": "github:Echoslayer/AgentDeck",
  "core": { "commit": "abc1234" },
  "components": { "globe": { "commit": "abc1234" } }
}
```

- `source` 可為 GitHub 或本機路徑；不得只依賴作者本機路徑。
- 來源版本一律記錄 commit，`diff` 以此為基準。契約遞增時在上游打 tag（例如 `contract-2`），僅供人閱讀與指定，不取代 commit。
- agent 在下游動工前先比對 `contract`：
  - 與上游相同：直接工作。
  - 下游較舊：讀遷移說明自行升級（先核心、再元件、再簡報），完成後更新記錄。
  - 無法遷移：停止並向人說明版本不符與所需動作。

### 5. CLI

- 以 Node 撰寫、跨平台，**只用於製作端**；播放與交付的 zip 仍不需要任何工具（[0001](0001-llm-authored-web-slides.md) 不變）。
- 前期不發佈 npm：上游根目錄放 `package.json`（`bin`），以 `npx github:Echoslayer/AgentDeck <指令>` 或本機路徑執行。契約穩定一段時間後再評估發佈。
- 第一階段只做：
  - `init`：建立下游結構、核心副本、主題範本、`agentdeck.json`、`AGENTDECK.md`。
  - `catalog [關鍵字]`：輸出元件與範例的一行索引。
  - `docs <name>`：輸出指定元件或範例的 README 與實作前必讀，不複製檔案。
  - `add <component>`：複製元件並把用到的套件寫入下游 `vendor.json`。
  - `diff [core|<component>]`：顯示下游副本相對於記錄來源版本與上游最新版的差異。
- 後續視需要再加：`new <topic>`、`update core`、`pack`、`vendor`（取代對應 `.ps1`）。CLI 穩定前，現有 `.ps1` 工具保留。
- CLI 只做複製與記錄，不做自動合併或版本解析；合併由 agent 依 `diff` 處理。

### 6. 第三方套件

沿用 [0011](0011-vendor-manifest-and-packing.md)：清單進 git、本體下載。下游預設把 `vendor/` 列入 `.gitignore`；`init` 可選擇改為 commit，讓 clone 後不必下載即可播放。

### 7. 規則文件拆分

- **`AGENTDECK.md`**（新）：製作簡報的規則——頁面與元件、標記規範、建立或改版主題、不做的事、契約版本檢查。上下游共用，`init` 複製到下游、`update core` 一併覆蓋。檔名刻意不同於 `AGENTS.md`，不與宿主既有檔案衝突。
- **上游 `AGENTS.md`**：只寫維護 AgentDeck 本身的規則（檔案所有權、registry、契約遞增與遷移說明、ADR），並要求製作簡報時先讀 `AGENTDECK.md`。
- **下游入口**：skill 指向 `AGENTDECK.md`；`init` 詢問是否在宿主 `AGENTS.md` 加一行指引，宿主沒有時不建立。
- 檔案所有權表依上下游分寫：上游禁止修改元件，下游元件副本可修改、核心副本不修改。

## 後果

- 宿主 repo 只多出播放與客製所需的檔案，不再帶入上游文件與工具。
- 下游可以自由客製元件，成品不被上游版本訂死；舊簡報不會因上游更新而被動改變。
- 上游可以持續做不相容變更，代價是每次遞增版本並撰寫遷移說明。
- 上游修正不會自動傳到下游，回饋改為人或 agent 主動以 `diff` 比對；元件副本可能逐漸分歧。
- 新增 Node 製作端工具需維護；`.ps1` 與 CLI 會並存一段時間。
- `workspace.cmd` 在 CLI 可用後標為淘汰；既有工作區以 `init` 加遷移說明轉換。

## 上游內的製作

情境 A（在 AgentDeck 內製作）保留給上游自身：試做元件、整理 examples、驗證契約變更。其他專案的正式簡報一律走 `init`；素材只在別處、簡報不需跟隨宿主版本控制時，也可在任意資料夾 `init` 一份。
