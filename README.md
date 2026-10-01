# AgentDeck

由 LLM 撰寫、人在現場微調的網頁簡報框架。簡報是純文字的 HTML／CSS／JS：LLM 寫分鏡 `story.js`，按需引用元件；人在播放時直接修改文字、位置與顯示，存成 `edits.js`。閱讀器 fork 自 `D:\book` 的書籍視覺解說。

直接雙擊 `templates/blank/index.html` 即可預覽，無需安裝、建置或網路。

專案目的與設計決策見 [`docs/adr/`](docs/adr/README.md)；LLM agent 的執行規則見 [`AGENTS.md`](AGENTS.md)；寫作方式的建議見 [`docs/guides/`](docs/guides/)。

## 目錄

```text
AgentDeck/
├── assets/
│   ├── story-reader/        閱讀器（fork 自 D:\book\docs\assets\story-reader，已加入放大播放，見 docs/adr/0006）
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
│   └── story.css
├── docs/
│   ├── adr/                 架構決策紀錄
│   └── guides/              寫作指引（建議，非強制），例如 visual-story.md
├── playground/              候選元件研究（本機試驗，不進 git；主題不得引用）
├── resources/<topic>/       正式主題放這裡
├── vendor.json              第三方套件清單（版本、網址、SHA-256；見 docs/adr/0011）
├── vendor/                  套件本體，由 tools\setup.cmd 下載（不進 git）
├── tools/                   setup.cmd 下載套件、pack.cmd 打包交付
└── dist/                    打包輸出的 zip（不進 git）
```

載入順序固定：`reader.css` → `deck.css` → `theme.css` → 元件 css → `story.css` → `deck-core.js` → `theme.js` → 元件 js → `story.js` → `edits.js` → `deck-editor.js` → `reader.js`。

## 可編輯層與鎖定層

內容分成兩類資源：

| 類型 | 來源 | 內容 | 修改方式 |
| --- | --- | --- | --- |
| 可人工編輯 | `edits.js` | 標記 `data-edit` 的文字、標記 `data-move` 的位置、頁首主題名稱、各頁 `section`／`title`／`lead`／`point`／`detail`、元件的顯示／隱藏 | 播放時按頁首「✎ 編輯」直接改 |
| 鎖定（需改寫） | `story.js`、`assets/` | logo、底圖、顯示元件的內容與結構、題目、`mount` 互動 | 改程式碼 |

- **識別**：`deck.*` 元件會自動加上 key 與開關；以下規則只在主題自製元件時需要。每個第一層元件（畫布版面為畫布內每個元件）加 `data-key="x"`（每頁唯一），`edits.js` 以 key 對應，調整元件順序不受影響。漏加時退回位置 key（如 `@0.3`），編輯模式下以橘框標示（key 重複也會標示）。`key` 用 `title` 等欄位名時會同步索引與縮圖標題。
- **開關**（不帶值）：`data-edit` 可編輯文字；`data-move` 可拖曳（位置以舞台寬度百分比保存，放大、全螢幕、縮圖都一致），只建議用在封面／結尾等絕對定位元素；`data-hide` 開放子元件單獨隱藏；`data-canvas` 標示絕對定位畫布，畫布內元件可逐一隱藏。範例：`<h2 data-key="title" data-edit data-move>`。
- 舊式 `data-edit="x"`／`data-move="x"` 的值仍視為 key，可相容。
- 編輯支援 Ctrl+B／I／U 與清單換行；貼上一律轉純文字，存檔前會移除所有屬性與非格式標籤。
- **隱藏元件**：編輯模式下，欄位、舞台第一層元件（封面／結尾則是畫布內的 logo、標題、說明等）與標記 `data-hide` 的子元件（如單張卡片）右上角有 👁，點一下切換顯示。隱藏的元件在編輯時半透明、播放與縮圖時不顯示；鎖定元件（如 logo）也能隱藏，但不能改內容。
- **隱藏編輯列**：編輯列的 ✕ 收起整組按鈕，按 `E` 重新顯示（Ctrl+S 仍可另存）。
- **預設不保存**：重新整理即還原。按「另存」（或 Ctrl+S）把全部修改輸出為 `edits.js`，覆蓋主題資料夾內的同名檔即可永久套用；「捨棄」丟棄未另存的修改。

底部導覽的 🔍 按鈕切換放大播放（全螢幕 + 內容放大），按 Esc 或再按一次還原。

## 建立新主題

1. 複製 `templates/blank/` 為 `resources/<topic>/`。兩者同為兩層深度，`../../assets/...` 路徑不用改。
2. 改 `story.js` 的 `title`、`label`、封面文字與分鏡，並改 HTML `<title>`。寫作方式可參考 [`docs/guides/`](docs/guides/)，例如講解機制時用 [visual-story](docs/guides/visual-story.md)。
3. 需要元件時查 [`assets/deck/components/CATALOG.md`](assets/deck/components/CATALOG.md)，在 `index.html` 的註解處引用；沒有合適的就在 `story.js`／`story.css` 自製，class 加主題前綴。不要改 `assets/`。

## 分鏡資料契約

`story.js` 定義全域 `story`，閱讀器載入時會檢查，不符合就直接報錯：

```js
const story = {
  title: '簡報名稱',                 // 瀏覽器標題
  label: '作者或單位 / 主題名稱',     // 頁首文字；省略時用 title，現場可編輯
  // back: { href: '../../index.html', label: '返回目錄' },
  pages: [{
    id: 'stable-id',                // 必填，整份唯一；重排時不要改，題目與互動狀態以它索引
    section: '01 / 章節',            // 以下四個欄位必須是字串（可為空字串）
    title: '頁面標題',
    lead: '引言',
    art: '<div class="topic-x" data-key="x">內容</div>',
    point: '重點',
    detail: '可選：前提、限制、來源',
  }],
};
```

- `art` 不限內容：元件輸出、自製 HTML、SVG，或給 canvas／3D 用的容器。標記規則見上方「可編輯層與鎖定層」。
- HTML 字串只接受作者審查過的本地內容，不可塞入網址參數、讀者輸入或遠端文字。
- 縮圖以約 1000px 寬縮放同一份內容；超長頁面會被裁切，應拆頁。SVG 若用到 `id`，另提供沒有重複 id 的 `previewArt`。
- **題目（可選）**：`question: { prompt, choices: [{ value, label, feedback }], hideFuturePreviews? }`。`value` 為唯一的英數、`_`、`-`；`hideFuturePreviews: true` 在作答前遮住後續縮圖（不阻止翻頁）。答案保留到重新整理。
- **互動（可選）**：`mount(root, state)` 在當頁渲染後呼叫，`root` 是主閱讀區，`state` 是此頁專用、保留到重新整理的物件；必須同步回傳清理函式或 `undefined`，換頁時先清理再移除舊內容。有 `mount` 的頁面必須提供靜態 `previewArt` 供縮圖使用。範例見 [visual-story 指引](docs/guides/visual-story.md#頁面模式)。
- 外掛層（如編輯器）只透過 `window.storyReader` 與 `story:render` 事件取用閱讀器狀態（[ADR 0008](docs/adr/0008-decouple-editor-reader.md)）。

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

## 建立品牌版本（下游專案）

AgentDeck 是上游框架；公司或個人的品牌版本以下游 repo 維護，只改 `assets/theme/` 與 `resources/`：

```bash
git clone https://github.com/Echoslayer/AgentDeck.git MyDeck
cd MyDeck
git remote rename origin upstream
git remote add origin <你的私有 repo>
# 修改 assets/theme/（theme.css、theme.js、img/、README.md 的品牌規則）
```

框架更新：`git fetch upstream && git merge upstream/main`。只要沒改 `assets/deck/`、`assets/story-reader/`、`templates/`，合併不會衝突。下游做出的通用元件或修正，回饋到上游（[ADR 0010](docs/adr/0010-theme-layer-and-downstream.md)）。

## 第三方套件與交付

第三方套件（例如特殊元件用的 three.js）**不進 git**：`vendor.json` 記錄版本、網址與 SHA-256，本體下載到 `vendor/<name>/`（[ADR 0011](docs/adr/0011-vendor-manifest-and-packing.md)）。

- **準備環境**：clone 後雙擊 `tools\setup.cmd`，依清單下載並驗證雜湊；重跑會略過已就緒的檔案。`tools\setup.cmd -Check` 只檢查不下載。沒下載時，用到套件的元件顯示靜態後備。
- **引用**：頁面直接以相對路徑引用，例如主題 `index.html` 的 `<script src="../../vendor/three/three.min.js"></script>`。只收能在 `file://` 下以 `<script>` 載入的檔案（UMD／IIFE、css、字型、圖片），不走 CDN。
- **新增套件**：經人同意後在 `vendor.json` 加一項；`sha256` 先留空，執行 `tools\setup.cmd` 會印出實際雜湊，確認來源後填回。
- **交付給別人**：`tools\pack.cmd resources\<topic>` 產生 `dist\<topic>-<時間>.zip`，內含簡報資料夾、`assets/` 與該簡報引用到的 `vendor/<name>/`（含授權檔），缺少的套件會先下載。對方解壓縮後雙擊最上層的 `index.html` 即可播放，不需要網路或任何工具。不帶參數執行會列出 `resources\` 下的簡報供選擇。

## 更新閱讀器

閱讀器已從 `D:\book\docs\assets\story-reader\` fork（[ADR 0006](docs/adr/0006-fork-story-reader.md)），**不要整份重新複製**，否則會覆蓋放大播放等本地修改。上游有需要的修正時，由人挑選後手動移植到 `assets/story-reader/`；外觀全部在 `deck.css` 與 `assets/theme/`，不受影響。移植時須保留對外介面 `window.storyReader` 與 `story:render` 事件，編輯層只依賴這兩者（[ADR 0008](docs/adr/0008-decouple-editor-reader.md)）。
