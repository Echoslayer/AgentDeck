# AgentDeck

由 LLM 撰寫、人在現場微調的網頁簡報框架。簡報是純文字的 HTML／CSS／JS：LLM 寫分鏡 `story.js`，按需引用元件；人在播放時直接修改文字、位置與顯示，存成 `edits.js`。閱讀器架構取自 `D:\book\templates\visual-story`。

直接雙擊 `templates/visual-story/index.html` 即可預覽，無需安裝、建置或網路。

專案目的與設計決策見 [`docs/adr/`](docs/adr/README.md)；LLM agent 的執行規則見 [`AGENTS.md`](AGENTS.md)。

## 目錄

```text
AgentDeck/
├── assets/
│   ├── story-reader/        閱讀器（fork 自 D:\book\docs\assets\story-reader，已加入放大播放，見 docs/adr/0006）
│   │   ├── reader.css
│   │   └── reader.js
│   ├── deck/
│       ├── deck.css         外殼層：預設 token、標題列、頁碼、封面／結尾版面、編輯層樣式
│       ├── deck-core.js     核心：頁型 cover／end、元件註冊與契約檢查（見 docs/adr/0009）
│       ├── deck-editor.js   編輯層：可編輯文字／拖曳、另存 edits.js
│       ├── components/      按需引用的元件，一個資料夾一個（CATALOG.md 為目錄，index.html 為展示頁）
│       │   └── <name>/      <name>.js、<name>.css、README.md
│   └── theme/               品牌主題：換品牌只改這裡（見 docs/adr/0010）
│       ├── theme.css        覆寫 token、頁首 logo、封面／結尾底圖與版面
│       ├── theme.js         deck.theme({ cover, end })：封面／結尾的 logo
│       ├── README.md        品牌規則
│       └── img/             預設為自繪 SVG（CC0）
├── templates/visual-story/  編寫起點（最小骨架：封面、一頁內容、結尾）
│   ├── index.html
│   ├── story.js
│   ├── edits.js             人工編輯結果（預設為空）
│   └── story.css
├── playground/              候選元件研究（three.js 與零依賴對照，主題不得引用，見 playground/README.md）
└── resources/<topic>/       正式主題放這裡
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

1. 複製 `templates/visual-story/` 為 `resources/<topic>/`。兩者同為兩層深度，`../../assets/...` 路徑不用改。
2. 改 `story.js` 的 `title`、`label`、封面文字與分鏡，並改 HTML `<title>`。
3. 需要元件時查 [`assets/deck/components/CATALOG.md`](assets/deck/components/CATALOG.md)，在 `index.html` 的註解處引用；沒有合適的就在 `story.js`／`story.css` 自製，class 加主題前綴。不要改 `assets/`。

分鏡資料契約（`id`、`section`、`title`、`lead`、`art`、`point`、`detail`、`question`、`mount`／`previewArt`）與原範本完全相同，詳見 `D:\book\templates\visual-story\README.md`。

## 版面對照

| 版面 | 網頁做法 |
| --- | --- |
| 封面（logo + 標題 + 作者、日期） | 頁面直接寫 `deck.cover({ title, meta })` |
| 內容頁漸層標題列 + 右上 logo | 頁首 `header` 自動套用，不需寫在 story |
| 清單 ● / – / 1. / 1) | `deck.list(key, items)`（需引用 list 元件），項目為字串或 `{ text, items }`，最多四層 |
| 頁碼圓 | 底部導覽自動套用 |
| Thank You 結尾 | 頁面直接寫 `deck.end()` |

封面與結尾頁會自動隱藏 reader 的章節、標題、引言、重點；`title` 仍用於索引與縮圖。

## 頁面模式

範本只留最小骨架，以下模式需要時再加入分鏡（`deck.focus` 需引用 focus 元件，也可換成自製元素）。

預測題：先讓讀者預測，再揭曉。

```js
{
  id: 'predict', section: '04 / 想一想', title: '先讓讀者預測，再揭曉',
  lead: '預測題不是考試，而是讓讀者發現自己尚未掌握的關係。',
  art: deck.focus('focus', '看見現象 → 理解原因'),
  question: {
    prompt: '只有結論，足以理解中間的過程嗎？',
    hideFuturePreviews: true,
    choices: [
      { value: 'steps', label: '還需要中間步驟', feedback: '對，把省略的變化拆開，讀者才有機會跟上。' },
      { value: 'more', label: '再加一些專有名詞', feedback: '名詞能命名概念，但不能代替原因與過程。' },
    ],
  },
},
```

互動頁：`mount` 綁定互動並回傳清理函式，`previewArt` 供縮圖使用。

```js
{
  id: 'try', section: '05 / 自己試一次', title: '一次只揭露一個變化',
  art: deck.focus('result', '', { edit: false }) + '<button data-key="advance">看下一個變化</button>',
  previewArt: '<p>觀察 → 原因 → 結果</p>',
  mount(root, state) {
    const steps = ['先觀察現象', '補上造成變化的原因', '現在可以解釋結果'];
    state.step ??= 0;
    const output = root.querySelector('[data-key="result"]');
    const button = root.querySelector('[data-key="advance"]');
    const render = () => { output.textContent = steps[state.step]; };
    const advance = () => { state.step = (state.step + 1) % steps.length; render(); };
    button.addEventListener('click', advance);
    render();
    return () => button.removeEventListener('click', advance);
  },
},
```

## 元件（`assets/deck/components/`）

元件像擴充套件：範本不預載，用到才引用。清單與選用時機見 [`CATALOG.md`](assets/deck/components/CATALOG.md)，各元件 API 見其 `README.md`。雙擊 [`assets/deck/components/index.html`](assets/deck/components/index.html) 可預覽全部元件並試用編輯。

呼叫方式一律為 `deck.<name>(key, …)`，第一個參數是 `data-key`；`deck-core.js` 在每次呼叫時檢查 key 格式、單一根元素與根元素 key。呼叫未引用的元件會直接報錯並提示路徑；引用 js 卻漏了 css 會在主控台報錯。新增共用元件需經人同意（[ADR 0009](docs/adr/0009-components-as-extensions.md)）。

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

## 更新閱讀器

閱讀器已從 `D:\book\docs\assets\story-reader\` fork（[ADR 0006](docs/adr/0006-fork-story-reader.md)），**不要整份重新複製**，否則會覆蓋放大播放等本地修改。上游有需要的修正時，由人挑選後手動移植到 `assets/story-reader/`；外觀全部在 `deck.css` 與 `assets/theme/`，不受影響。移植時須保留對外介面 `window.storyReader` 與 `story:render` 事件，編輯層只依賴這兩者（[ADR 0008](docs/adr/0008-decouple-editor-reader.md)）。
