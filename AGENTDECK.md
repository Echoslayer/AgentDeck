# AGENTDECK.md

用 AgentDeck 製作網頁簡報的規則：LLM 寫分鏡，人只做現場小修。本檔放在工作區根目錄，上游（AgentDeck 本身）與下游（其他專案內以 `init` 建立的工作區）共用；以下路徑都相對於工作區根目錄。設計理由在上游 `docs/adr/`，文中以「ADR 編號」標示。

## 動工前

1. **找 CLI**：下游看 `agentdeck.json` 的 `cli` 欄位（例如 `npx -y github:Echoslayer/AgentDeck`）；上游內為 `node cli/agentdeck.mjs`。下文的 `agentdeck <指令>` 都以此執行。
2. **檢查契約版本**（ADR 0016）：執行 `agentdeck status`。
   - 一致：直接工作。
   - 工作區較舊：依序以 `agentdeck docs <n>-to-<n+1>` 讀遷移說明 → `agentdeck update core --migrate` → 依說明修改元件副本、`components/`、各簡報 → 逐份播放驗證。
   - 無法遷移（缺說明、說明與現況不符、工作區比 CLI 新）：停止，向人說明版本不符與需要的動作。
3. 只在要做的事需要時才讀上游文件；不要整份掃描元件、範例或指引（見「按需閱讀」）。

## 頁面與元件

- 主題與頁面用來拆分內容、安排講解順序；一頁是一個講解情境，可以承載完整的互動實驗元件。不要因為使用翻頁形式，就把內容限制為靜態投影片或把每個操作狀態拆成一頁。
- 先安排講解順序，再找出需要操作才能理解的段落，最後查元件索引、讀選中元件的文件。例：實驗範圍 → 互動結果展示 → 結果解讀；此順序是例子，不是所有主題的固定頁型。
- 頁面框架負責導覽與進出頁面的生命週期；元件負責內部版面、控制項、資料運算與視覺連動。元件可占滿內容區，須容納文字換行與不同可用寬度。
- 主題的資料、講解文字與結論留在主題。

## 按需閱讀

文件分兩個閱讀時機，項目再多也只讀選中的：

1. **選表示方式**：`agentdeck catalog [關鍵字]` 輸出元件（基礎／特殊）、互動組合範例與寫作指引，每項一行；關鍵字會比對元件的關係、用途與人常用的說法（「地圖」「趨勢」「3D」）。上游內也可直接讀 `assets/deck/components/CATALOG.md`。
2. **實作選定項目**：`agentdeck docs <名稱>` 輸出該項目的 README、「實作前必讀」追加說明，元件另附引用方式與特殊元件規則。追加說明涵蓋資料語意、操作、限制與接入細節。不要只看索引或函式簽名就實作。

## 檔案所有權

| 路徑 | 擁有者 | 可否修改 |
| --- | --- | --- |
| `resources/<topic>/story.js`、`story.css`、`index.html` | LLM | 可，自由刪改（ADR 0004） |
| `resources/<topic>/plan.md` | LLM（企劃） | 可；動工前先填並交人確認（ADR 0014） |
| `resources/<topic>/edits.js` | 人（現場修正） | **不可**；人明確指示時才吸收回 `story.js`（ADR 0002） |
| `assets/deck/components/<name>/` | 下游：工作區的元件副本 | 下游可依主題需求修改；改過的檔案在 `diff` 顯示為「本地已改」。上游內**不可**，見 `AGENTS.md` |
| `components/<name>/` | 下游：工作區自製的共用元件 | 可（僅下游） |
| `assets/deck/` 的核心檔、`assets/story-reader/`、`templates/`、本檔 | 框架核心副本 | **不可**；由 `update core` 整份覆蓋，要改行為回饋上游（ADR 0016） |
| `assets/theme/` | 品牌 | **不可**，除非人明確要求；品牌規則見 `assets/theme/README.md`（ADR 0010） |
| `vendor.json` | 套件清單 | 只經 `agentdeck add` 登記；其他套件只提議，經人同意才加入（ADR 0011） |
| `agentdeck.json` | CLI 記錄 | 不手改；由 `init`、`add`、`update core` 維護 |
| `vendor/`、`dist/` | 下載與打包產物 | 不手改；預設不 commit（`.gitignore`） |

## 建立或改版主題

1. 新主題：`agentdeck new <topic>`（複製 `templates/blank/`：封面、一頁內容、結尾），`edits.js` 保持 `window.storyEdits = {};`。`<topic>` 用英文小寫與連字號。
2. 先填 `plan.md`（對象、目的、素材、逐頁分鏡與元件），交人確認後再寫程式。素材在其他位置時只讀不改，內容摘錄進 `story.js`，簡報不引用工作區以外的檔案。分鏡：每頁要表達什麼關係；欄位規則見下方「分鏡資料契約」，互動頁需提供 `previewArt` 與清理函式。寫作方式依人指定的指引；未指定時，講解機制、因果類的簡報預設參考 `agentdeck docs visual-story`，其他類型不必套用（ADR 0012）。
3. 頁型固定用核心：`deck.cover({ title, meta })`、`deck.end()`。
4. 內容元件**按需查找**（ADR 0009、0013），元件分基礎與特殊兩級：
   - **建立或改版主題時**：讀 `agentdeck catalog` 完整索引（兩級都看），逐頁依「表達的關係」挑選；基礎元件能完整表達所需關係時優先用基礎。若理解依賴改變參數、追蹤中間狀態或比較即時結果，要選能支援該操作的元件，或在主題內自製。
   - **人提出特定需求時**（「放地圖」「做成 3D」「畫趨勢」）：`agentdeck catalog <關鍵字>`，包含特殊元件；找到就 `agentdeck docs <name>`，向人說明它能做到什麼、限制是什麼，再決定是否採用。
   - **有合適元件**：讀 `agentdeck docs <name>`，確認資料與使用條件符合後，下游以 `agentdeck add <name>` 取得副本（上游內已有）；依輸出在主題 `index.html` 加 css 與 js 兩行引用（用到套件時另加套件一行），呼叫 `deck.<name>(key, …)`；守住 README「必須保留」的約束。標記由元件自動加上。
   - **元件副本不完全合用**（僅下游）：可直接修改 `assets/deck/components/<name>/`，維持 `deck.define` 契約、`.deck-<name>` 前綴與「必須保留」；改了公開行為時同步改該元件的 README。改動只影響本工作區。
   - **用特殊元件**：另守 `docs` 輸出的「特殊元件規則」（引用 `vendor/` 套件、每頁最多一個 three.js 元件、現場不依賴觀眾親自拖曳；互動可由講者操作）。套件以 `agentdeck vendor` 下載；`pack` 也會自動下載。
   - **需要組合互動**：從索引的「互動組合範例」選定後，`agentdeck docs <範例> --code` 讀說明與程式，在主題 `story.js`／`story.css` 改寫並持有需要的資料。範例是實作參考，不是元件 API；不要以 script、stylesheet、圖片或其他方式引用範例或 `playground/`。
   - **都沒有合適的**：在主題 `story.js`／`story.css` 自製，class 加主題前綴，依下方「標記規範」手動加標記。不要硬套不合適的元件。
   - 同一種自製元件在第二個主題再次出現時：下游可移到 `components/<name>/`（`<name>.js` 以 `deck.define` 註冊、`<name>.css` 用 `.deck-<name>` 前綴、附 README 的用途／API／必須保留／範例），主題以 `../../components/<name>/` 引用；值得通用時向人提議回饋上游。
5. 每個獨立元件在 `art` 中做成**單一第一層元素**（畫布版面則為畫布內單一元素），出錯時才能在現場單獨隱藏（ADR 0003）。
6. 現場可能需要修改的文字（主題、姓名、日期、清單、卡片文字等）標為可編輯；封面／結尾的絕對定位元素可再開放拖曳。
7. 若主題的 `edits.js` 非空，改版時保留它引用到的元件 key，除非人要求吸收或捨棄。元件子項目 key 預設依序號產生，調整已被引用項目的順序時要給明確的 `key`。
8. 檢查：雙擊 `resources/<topic>/index.html` 播放，主控台無錯誤；告訴人可按頁首「✎ 編輯」現場修改並另存 `edits.js`。
9. 交付：`agentdeck pack resources/<topic>` 產生 `dist/<topic>-<時間>.zip`，對方解壓後雙擊最上層 `index.html` 即可離線播放。

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

- `art` 不限內容：元件輸出、自製 HTML、SVG，或給 canvas／3D 用的容器。標記規則見下方「標記規範」。
- HTML 字串只接受作者審查過的本地內容，不可塞入網址參數、讀者輸入或遠端文字。
- 縮圖以約 1000px 寬縮放同一份內容；超長頁面會被裁切，應拆頁。SVG 若用到 `id`，另提供沒有重複 id 的 `previewArt`。
- **題目（可選）**：`question: { prompt, choices: [{ value, label, feedback }], hideFuturePreviews? }`。`value` 為唯一的英數、`_`、`-`；`hideFuturePreviews: true` 在作答前遮住後續縮圖（不阻止翻頁）。答案保留到重新整理。
- **互動（可選）**：`mount(root, state)` 在當頁渲染後呼叫，`root` 是主閱讀區，`state` 是此頁專用、保留到重新整理的物件；必須同步回傳清理函式或 `undefined`，換頁時先清理再移除舊內容。有 `mount` 的頁面必須提供靜態 `previewArt` 供縮圖使用。
- 外掛層（如編輯器）只透過 `window.storyReader` 與 `story:render` 事件取用閱讀器狀態（ADR 0008）。
- 載入順序固定：`reader.css` → `deck.css` → `theme.css` → 元件 css → `story.css` → `deck-core.js` → `theme.js` → 套件 js → 元件 js → `story.js` → `edits.js` → `deck-editor.js` → `reader.js`。

## 標記規範（自製元件）

- `data-key="x"`：元件身分，每頁唯一。每個第一層元件（畫布版面為畫布內每個元件）都要加；`edits.js` 以此對應（ADR 0005）。
- 開關不帶值：`data-edit` 可編輯文字；`data-move` 可拖曳（僅絕對定位版面）；`data-hide` 開放子元件單獨隱藏（例如單張卡片），該子元件也要加 `data-key`；`data-canvas` 加在絕對定位的畫布根元素上，讓畫布內元件可逐一隱藏（ADR 0008）。
- key 取 `title` 等欄位名時，會同步改寫該頁欄位，例如封面標題 `<h2 data-key="title" data-edit data-move>`。
- 改版時不要更改既有 key；漏加 key 會退回位置 key，元件順序一變就會對錯。編輯模式下缺 key 或重複 key 的元件會顯示橘框。
- `mount` 內以 `root.querySelector('[data-key="x"]')` 取得元件。
- 元件的初始 HTML 與互動更新產生的 HTML 都要使用元件／主題前綴 class，不得借用閱讀器的 `.mini`、`.stage` 等外殼 class。須檢查掛載後及參數改變後的內容，不能只檢查初始字串。

## 不做的事

- 不修改或清空 `edits.js`、不自行合併現場修正。
- 不修改核心副本（`assets/deck/` 核心檔、`assets/story-reader/`、`templates/`、本檔）與 `assets/theme/`；不手改 `agentdeck.json`。
- 不引入建置流程；必須維持雙擊 `index.html` 即可播放，播放時不讀取上游或網路。
- 不走 CDN、不把第三方套件本體 commit 進 git（除非 `init` 時選擇 commit `vendor/`）；套件只能經 `vendor.json` 引入，用到套件的元件要有靜態後備（ADR 0011）。
- 不在工作區以外另起一套簡報框架。
