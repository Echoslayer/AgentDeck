# AgentDeck

由 LLM 撰寫、人在現場微調的網頁簡報框架。簡報是純文字的 HTML／CSS／JS：LLM 寫分鏡 `story.js`，按需引用元件；人在播放時直接修改文字、位置與顯示，存成 `edits.js`。

直接雙擊 `templates/blank/index.html` 即可預覽，無需安裝、建置或網路。

**從這裡開始：[`docs/getting-started.md`](docs/getting-started.md)**（完整流程、CLI，以及在其他專案中使用的方式）。

**看效果：[`元件與互動範例`](examples/index.html)**。現成元件讀 API 後使用；互動組合範例讀追加說明後在主題內改寫。頁面安排講解順序，一頁可承載完整的互動實驗。

專案目的與設計決策見 [`docs/adr/`](docs/adr/README.md)；製作簡報的規則見 [`AGENTDECK.md`](AGENTDECK.md)（上下游共用）；上游維護規則見 [`AGENTS.md`](AGENTS.md)；寫作方式的建議見 [`docs/guides/`](docs/guides/)。

## 目錄

```text
AgentDeck/
├── AGENTDECK.md             製作簡報的規則（init 時複製到下游工作區）
├── AGENTS.md                上游維護規則
├── package.json             CLI 套件描述（不發佈到 npm；以 npx github: 執行，見 docs/adr/0016）
├── cli/                     AgentDeck CLI：init、status、catalog、docs、add、diff、update、new、join、vendor、pack、export（check.mjs 為回歸測試；完整說明 node cli/agentdeck.mjs --help）
├── assets/
│   ├── story-reader/        閱讀器（本專案獨立維護，含放大播放，見 docs/adr/0006）
│   │   ├── reader.css
│   │   └── reader.js
│   ├── deck/
│       ├── deck.css         外殼層：預設 token、標題列、頁碼、封面／結尾版面、編輯層樣式
│       ├── deck-core.js     核心：頁型 cover／end、元件註冊與契約檢查、特殊元件的動態生命週期（見 docs/adr/0009、0013）
│       ├── deck-editor.js   編輯層：可編輯文字／拖曳、另存 edits.js
│       ├── components/      按需引用的元件，分基礎／特殊兩級（CATALOG.md 為目錄，index.html 為展示頁）
│       │   └── <name>/      <name>.js、<name>.css、README.md
│   └── theme/               品牌主題：換品牌只改這裡（見 docs/adr/0010）
│       ├── theme.css        覆寫 token、頁首 logo、封面／結尾底圖與版面
│       ├── theme.js         deck.theme({ cover, end })：封面／結尾的 logo
│       ├── README.md        品牌規則
│       └── img/             預設為自繪 SVG（CC0）
├── templates/blank/         空白骨架（封面、一頁內容、結尾）；只示範契約，不帶寫作風格
│   ├── index.html
│   ├── story.js
│   ├── edits.js             人工編輯結果（預設為空）
│   ├── story.css
│   └── plan.md              企劃範本（先填再動工；不打包）
├── docs/
│   ├── getting-started.md   入口：流程與在其他專案中使用（見 docs/adr/0014）
│   ├── adr/                 架構決策紀錄
│   ├── migrations/          契約版本的遷移說明（<n>-to-<m>.md）
│   └── guides/              寫作指引（建議，非強制），例如 visual-story.md
├── playground/              本機研究；試驗簡報各自 init 成獨立單位（不進 git）
├── examples/                互動組合範例（進 git、留在上游，以 cli docs --code 讀取；參考改寫，不是執行期依賴）
│   ├── index.html           現成元件與互動範例的展示入口
│   └── <name>/              每個範例一個資料夾；清單見 examples/README.md 或 cli catalog
├── vendor.json              第三方套件清單（版本、網址、SHA-256；見 docs/adr/0011）
├── vendor/                  套件本體，由 cli vendor 下載（不進 git）
├── skills/                  agentdeck 製作簡報、agentdeck-upgrade 更新既有簡報（tools\install-skill.cmd 安裝）
├── tools/                   install-skill.cmd 安裝 skill（下載套件、打包、建立工作區改用 cli）
└── dist/                    打包輸出的 zip（不進 git）
```

載入順序固定，見 [`AGENTDECK.md`](AGENTDECK.md#分鏡資料契約)「分鏡資料契約」最後一條。

## 可編輯層與鎖定層

內容分成兩類資源：

| 類型 | 來源 | 內容 | 修改方式 |
| --- | --- | --- | --- |
| 可人工編輯 | `edits.js` | 標記 `data-edit` 的文字、標記 `data-move` 的位置、頁首主題名稱、各頁 `section`／`title`／`lead`／`point`／`detail`、元件的顯示／隱藏、各頁註解 | 播放時按頁首「✎ 編輯」直接改；註解在右側「註解」分頁 |
| 鎖定（需改寫） | `story.js`、`assets/` | logo、底圖、顯示元件的內容與結構、題目、`mount` 互動 | 改程式碼 |

- 播放、編輯、快捷鍵與另存：[`getting-started.md`「播放與現場編輯」](docs/getting-started.md#播放與現場編輯)。
- 自製元件的 `data-key`／`data-edit`／`data-move`／`data-hide`／`data-canvas`：[`AGENTDECK.md`「標記規範」](AGENTDECK.md#標記規範自製元件)（[ADR 0005](docs/adr/0005-data-key-attribute-model.md)）。舊式 `data-edit="x"`／`data-move="x"` 的值仍視為 key。
- 口語稿朗讀、隨朗讀的講者動作與 PPT 匯出是內容確認後的進階內容：[`getting-started.md`「內容確認後的下一輪」](docs/getting-started.md#內容確認後的下一輪)。

## 建立新主題

流程、CLI 與在其他專案使用的方式見 [`docs/getting-started.md`](docs/getting-started.md)。在上游內只能以 `node cli/agentdeck.mjs init playground/<topic>` 建立試驗單位；正式簡報在目標專案以 `npx -y github:Echoslayer/AgentDeck init <位置>/<topic>` 建立（[ADR 0016](docs/adr/0016-registry-copy-and-contract-version.md)、[0017](docs/adr/0017-presentation-entry-layout.md)）。

## 分鏡資料契約

`story.js` 定義全域 `story`（`title`、`label`、`pages`：`id`、`section`、`title`、`lead`、`art`、`point`、`detail`，可選 `question`、`mount`、`previewArt`），閱讀器載入時會檢查，不符合就直接報錯。完整欄位、規則與載入順序見 [`AGENTDECK.md`](AGENTDECK.md#分鏡資料契約)；它屬於契約版本的涵蓋範圍，核心以 `deck.contract` 公開目前版本（[ADR 0016](docs/adr/0016-registry-copy-and-contract-version.md)）。外掛層（如編輯器）只透過 `window.storyReader` 與 `story:render` 事件取用閱讀器狀態（[ADR 0008](docs/adr/0008-decouple-editor-reader.md)）。

## 版面對照

| 版面 | 網頁做法 |
| --- | --- |
| 封面（logo + 標題 + 作者、日期） | 頁面直接寫 `deck.cover({ title, meta })` |
| 內容頁漸層標題列 + 右上 logo | 頁首 `header` 自動套用，不需寫在 story |
| 清單 ● / – / 1. / 1) | `deck.list(key, items)`（需引用 list 元件），項目為字串或 `{ text, items }`，最多四層 |
| 頁碼圓 | 底部導覽自動套用 |
| Thank You 結尾 | 頁面直接寫 `deck.end()` |

封面與結尾頁會自動隱藏 reader 的章節、標題、引言、重點；`title` 仍用於索引與縮圖。

## 元件（`assets/deck/components/`）

元件像擴充套件：範本不預載，用到才引用。清單與選用時機見 [`CATALOG.md`](assets/deck/components/CATALOG.md)，各元件 API 見其 `README.md`。雙擊 [`assets/deck/components/index.html`](assets/deck/components/index.html) 可預覽全部元件，點頁首「✎ 編輯」試用編輯。

| 分級 | 元件 | 特性 |
| --- | --- | --- |
| 基礎 | list、cards、steps、focus、compare、metrics、bars、trend、figure | 靜態 HTML／SVG／CSS，零依賴，任何簡報都能用 |
| 特殊 | surface、stack3d、globe（three.js）、cube（CSS 3D 動畫） | 動態內容或依賴 `vendor/` 套件；有靜態後備，只用在關鍵頁 |

呼叫方式一律為 `deck.<name>(key, …)`，第一個參數是 `data-key`；`deck-core.js` 在每次呼叫時檢查 key 格式、單一根元素與根元素 key。呼叫未引用的元件會直接報錯並提示路徑；引用 js 卻漏了 css 會在主控台報錯。特殊元件的動態內容由核心在頁面出現時啟動、換頁時釋放，主題不用寫 `mount`（[ADR 0013](docs/adr/0013-component-tiers.md)）。新增共用元件需經人同意（[ADR 0009](docs/adr/0009-components-as-extensions.md)）。

## 品牌主題（`assets/theme/`）
色票 token：`--deck-primary`（標題、強調文字）、`--deck-accent`（箭頭、橫條、頁碼）、`--deck-highlight`（突顯項目）、`--deck-gradient`（頁首與封面／結尾）。reader 的 `--accent` 對應 `--deck-primary`。預設值在 `deck.css`，品牌在 `assets/theme/theme.css` 覆寫；元件只使用這些 token。

封面／結尾的 logo 由 `assets/theme/theme.js` 以 `deck.theme({ cover: img => html, end: img => html })` 提供，每個裝飾需有 `data-key`，現場可逐一隱藏。預設圖片為自繪 SVG（CC0，見 `assets/theme/img/README.md`）。

要沿用指定模板時，`init --theme <主題資料夾>` 以該資料夾取代預設主題；PPT 模板依 [`docs/guides/theme-from-pptx.md`](docs/guides/theme-from-pptx.md) 先轉成主題資料夾，預設只取 logo 與背景，轉換只涵蓋主題層，不新增頁型（[ADR 0019](docs/adr/0019-theme-templates.md)）。

## 建立品牌版本（下游專案）

AgentDeck 是上游框架；每份簡報以 `npx -y github:Echoslayer/AgentDeck init <位置>/<topic>` 建立自己的下游單位。下游的框架副本都在單位的 `agentdeck/` 內（上游路徑加上 `agentdeck/` 前綴）。`agentdeck/assets/theme/`、`resources/` 歸下游所有，核心與元件是可比對的副本，以 `diff`、`update core` 跟進上游（[ADR 0010](docs/adr/0010-theme-layer-and-downstream.md)、[ADR 0016](docs/adr/0016-registry-copy-and-contract-version.md)、[ADR 0017](docs/adr/0017-presentation-entry-layout.md)）。既有品牌可複製到各單位，不作跨資料夾播放依賴。

## 第三方套件與交付

第三方套件（例如特殊元件用的 three.js）**不進 git**：`vendor.json` 記錄版本、網址與 SHA-256，本體下載到 `vendor/<name>/`；下游單位為 `agentdeck/vendor.json` 與 `agentdeck/vendor/<name>/`（[ADR 0011](docs/adr/0011-vendor-manifest-and-packing.md)）。

- **準備環境**：clone 後執行 `node cli/agentdeck.mjs vendor`（下游工作區用 `agentdeck vendor`），依清單下載並驗證雜湊；重跑會略過已就緒的檔案。加 `--check` 只檢查不下載。沒下載時，用到套件的元件顯示靜態後備。
- **引用**：下游根 `index.html` 以相對路徑引用，例如 `<script src="agentdeck/vendor/three/three.min.js"></script>`；相關入口改用 `../../agentdeck/vendor/`。只收能在 `file://` 下以 `<script>` 載入的檔案（UMD／IIFE、css、字型、圖片），不走 CDN。
- **新增套件**：經人同意後在 `vendor.json` 加一項；`sha256` 先留空，執行 `agentdeck vendor` 會印出實際雜湊，確認來源後填回。
- **交付給別人**：在簡報單位內 `agentdeck pack`，帶入根 `index.html`、單位資源、相關入口、`agentdeck/` 內的框架與引用的套件（含授權檔），缺少的套件會先下載；排除製作骨架、企劃、CLI 記錄與既有打包產物。解壓後第一層只有 `index.html`、`resources/`、`agentdeck/`（與相關群組），根頁直接播放，不使用跳轉或 `<base>`。`pack <入口資料夾>` 可選某個相關入口作交付首頁；通常打包完整單位。
- **輸出 PPT（可選，進階）**：內容確認後才用 `agentdeck export`，輸出 `dist/<名稱>.pptx`；需要 Chrome／Edge，錄影另需 ffmpeg。細節見 [`getting-started.md`「內容確認後的下一輪」](docs/getting-started.md#內容確認後的下一輪)（[ADR 0021](docs/adr/0021-pptx-export.md)、[0025](docs/adr/0025-native-pptx-annotations.md)）。

## 更新閱讀器

閱讀器由本專案獨立維護（[ADR 0006](docs/adr/0006-fork-story-reader.md)），不與外部專案同步；需要修改時經人同意後直接改 `assets/story-reader/`；外觀全部在 `deck.css` 與 `assets/theme/`，不受影響。修改時須保留對外介面 `window.storyReader` 與 `story:render` 事件，編輯層只依賴這兩者（[ADR 0008](docs/adr/0008-decouple-editor-reader.md)）。

每頁翻頁列右下角常駐一行小字「以 AgentDeck 製作」，連到本專案 GitHub；放在翻頁列內距中，不佔版面，放大播放時仍可見。由 `reader.js` 注入，既有簡報 `update core` 後即帶上；品牌若要隱藏，在 `theme.css` 加 `.made-with{display:none}`。

## 授權

框架（CLI、`assets/`、`templates/`、`examples/`、文件）以 [MIT](LICENSE) 授權：可自由使用、修改、fork、商用，唯一條件是副本保留 `LICENSE` 的版權與授權聲明。`init`／`update core` 會把它複製成下游的 `agentdeck/LICENSE`，`pack` 隨框架帶入交付包。

- **簡報內容不受此授權約束**：下游的 `index.html`、`resources/` 與素材歸作者所有，授權由作者自訂。
- **修改或 fork 框架**：自己的改動可用任何授權（包含不公開），但原有檔案的 MIT 聲明須保留。
- **第三方套件**依各自授權（見 `vendor.json` 的 `license`），授權檔隨套件下載與打包。
