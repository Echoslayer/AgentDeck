# AGENTS.md

本專案用 LLM 產出網頁簡報；人只做現場小修。背景與理由見 `docs/adr/`，完整流程與在其他專案中使用見 `docs/getting-started.md`，下列為執行規則。

## 頁面與元件

- 主題與頁面用來拆分內容、安排講解順序；一頁是一個講解情境，可以承載完整的互動實驗元件。不要因為使用翻頁形式，就把內容限制為靜態投影片或把每個操作狀態拆成一頁。
- 先安排講解順序，再找出需要操作才能理解的段落，最後查元件目錄、讀選中元件的 README。例：實驗範圍 → 互動結果展示 → 結果解讀；此順序是例子，不是所有主題的固定頁型。
- 頁面框架負責導覽與進出頁面的生命週期；元件負責內部版面、控制項、資料運算與視覺連動。元件可占滿內容區，須容納文字換行與不同可用寬度。
- 文件分兩個閱讀時機：選表示方式時讀 CATALOG 的關係與適用情境；實作選定元件時讀該元件的 `README.md` 及它列出的「實作前必讀」追加說明。追加說明隨元件放在同一資料夾，涵蓋該元件的資料語意、操作、限制與接入細節；簡短時可直接寫在 README，較長時連到 `IMPLEMENTATION.md` 等檔案。主題的資料、講解文字與結論留在主題。

## 檔案所有權

| 路徑 | 擁有者 | LLM 可否修改 |
| --- | --- | --- |
| `resources/<topic>/story.js`、`story.css`、`index.html` | LLM | 可，自由刪改（[0004](docs/adr/0004-component-template-strategy.md)） |
| `resources/<topic>/edits.js` | 人（現場修正） | **不可**；人明確指示時才吸收回 `story.js`（[0002](docs/adr/0002-content-layers.md)） |
| `assets/theme/` | 品牌（下游專案） | **不可**，除非人明確要求；品牌規則見 `assets/theme/README.md`（[0010](docs/adr/0010-theme-layer-and-downstream.md)） |
| `assets/deck/`（含 `components/`）、`assets/story-reader/`、`templates/` | 框架（上游） | **不可**，除非人明確要求（[0004](docs/adr/0004-component-template-strategy.md)、[0006](docs/adr/0006-fork-story-reader.md)） |
| `playground/` | LLM（候選元件研究） | 可，自由刪改；主題不得引用（見 `playground/README.md`） |
| `examples/` | 上游（互動組合範例） | 經人同意新增或修改；進 git、隨工作區交付。主題參考後自行改寫，不得執行期引用（[0015](docs/adr/0015-interactive-examples.md)） |
| `docs/guides/` | LLM（寫作指引） | 可，經人同意後新增或修改；指引是建議，不得與 ADR 或本檔衝突 |
| `resources/<topic>/plan.md` | LLM（企劃） | 可；動工前先填並交人確認（[0014](docs/adr/0014-portable-usage.md)） |
| `vendor.json`、`tools/`、`skills/` | 框架（上游） | **不可**，除非人明確要求；新增套件只提議，不自行加入（[0011](docs/adr/0011-vendor-manifest-and-packing.md)） |
| `vendor/`、`dist/` | 下載與打包產物 | 不手改、不 commit（已列入 `.gitignore`） |

## 建立或改版主題

1. 新主題：複製 `templates/blank/`（空白骨架：封面、一頁內容、結尾）為 `resources/<topic>/`，`edits.js` 保持 `window.storyEdits = {};`。
2. 先填 `plan.md`（對象、目的、素材、逐頁分鏡與元件），交人確認後再寫程式；素材在其他專案時只讀不改，內容摘錄進 `story.js`。分鏡：每頁要表達什麼關係。欄位規則見 `README.md`「分鏡資料契約」；互動頁需提供 `previewArt` 與清理函式。寫作方式依人指定的 `docs/guides/` 指引；未指定時，講解機制、因果類的簡報預設參考 `docs/guides/visual-story.md`，其他類型不必套用（[0012](docs/adr/0012-template-vs-writing-guide.md)）。
3. 頁型固定用核心：`deck.cover({ title, meta })`、`deck.end()`（`assets/deck/deck-core.js`）。
4. 內容元件**按需查找**（[0009](docs/adr/0009-components-as-extensions.md)、[0013](docs/adr/0013-component-tiers.md)）：目錄是 `assets/deck/components/CATALOG.md`，元件分基礎與特殊兩級。
   - **建立或改版主題時**：讀完 CATALOG（兩級都看），逐頁依「表達的關係」挑選；基礎元件能完整表達所需關係時優先用基礎。若理解依賴改變參數、追蹤中間狀態或比較即時結果，要選能支援該操作的元件，或在主題內自製。
   - **人提出特定需求時**（「放地圖」「做成 3D」「畫趨勢」）：先查 CATALOG「依需求查找」，包含特殊元件；找到就讀該元件 `README.md`，向人說明它能做到什麼、限制是什麼，再決定是否採用。
   - 有合適元件：讀該元件的 `README.md` 及其「實作前必讀」追加說明，確認資料與使用條件符合後，在主題 `index.html` 加 css 與 js 兩行引用，呼叫 `deck.<name>(key, …)`；守住 README「必須保留」的約束。不要只看 CATALOG 摘要或函式簽名就實作。標記由元件自動加上。
   - 用特殊元件：另守 CATALOG「特殊元件規則」（引用 `vendor/` 套件、每頁最多一個 three.js 元件、現場不依賴觀眾親自拖曳；互動可由講者操作）。
   - 需要組合互動：查 `examples/README.md` 的表示關係，選定後讀該範例 README 與追加說明，在主題 `story.js`／`story.css` 改寫並持有需要的資料。範例是實作參考，不是元件 API；不要直接引用 `examples/` 或 `playground/` 的程式、樣式或資料。
   - 組合範例只保留一般關係與最小人工資料；領域試驗留在 playground。先讀選用摘要，選定後只讀該範例的 README、必要的追加說明與程式，不掃描整個 examples。
   - 都沒有合適的：在主題 `story.js`／`story.css` 自製，class 加主題前綴，依下方「標記規範」手動加標記。不要硬套不合適的元件。
   - 同一種自製元件在第二個主題再次出現時，向人提議升級為共用元件（依 CATALOG「新增元件」）。
5. 每個獨立元件在 `art` 中做成**單一第一層元素**（畫布版面則為畫布內單一元素），出錯時才能在現場單獨隱藏（[0003](docs/adr/0003-hide-as-live-fallback.md)）。
6. 現場可能需要修改的文字（主題、姓名、日期、清單、卡片文字等）標為可編輯；封面／結尾的絕對定位元素可再開放拖曳。
7. 若主題的 `edits.js` 非空，改版時保留它引用到的元件 key，除非人要求吸收或捨棄。元件子項目 key 預設依序號產生，調整已被引用項目的順序時要給明確的 `key`。

## 標記規範（自製元件）

- `data-key="x"`：元件身分，每頁唯一。每個第一層元件（畫布版面為畫布內每個元件）都要加；`edits.js` 以此對應（[0005](docs/adr/0005-data-key-attribute-model.md)）。
- 開關不帶值：`data-edit` 可編輯文字；`data-move` 可拖曳（僅絕對定位版面）；`data-hide` 開放子元件單獨隱藏（例如單張卡片），該子元件也要加 `data-key`；`data-canvas` 加在絕對定位的畫布根元素上，讓畫布內元件可逐一隱藏（[0008](docs/adr/0008-decouple-editor-reader.md)）。
- key 取 `title` 等欄位名時，會同步改寫該頁欄位，例如封面標題 `<h2 data-key="title" data-edit data-move>`。
- 改版時不要更改既有 key；漏加 key 會退回位置 key，元件順序一變就會對錯。編輯模式下缺 key 或重複 key 的元件會顯示橘框。
- `mount` 內以 `root.querySelector('[data-key="x"]')` 取得元件。
- 元件的初始 HTML 與互動更新產生的 HTML 都要使用元件／主題前綴 class，不得借用閱讀器的 `.mini`、`.stage` 等外殼 class。須檢查掛載後及參數改變後的內容，不能只檢查初始字串。

## 不做的事

- 不修改或清空 `edits.js`、不自行合併現場修正。
- 不為單一主題修改 `assets/`、`templates/`。
- 不引入建置流程；必須維持雙擊 `index.html` 即可播放。
- 不走 CDN、不把第三方套件本體 commit 進 git；套件只能經 `vendor.json` 引入，用到套件的元件要有靜態後備（[0011](docs/adr/0011-vendor-manifest-and-packing.md)）。
