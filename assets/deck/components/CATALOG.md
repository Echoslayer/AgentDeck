# 元件目錄

元件分**基礎**與**特殊**兩級（[ADR 0013](../../../docs/adr/0013-component-tiers.md)）。LLM 做簡報時依下列時機查這份目錄：

- **建立或改版主題**：讀完本檔（兩級都要看），逐頁依「表達的關係」挑選。基礎元件能表達時優先用基礎。
- **人提出特定需求**（「放個地圖」「做成 3D」「畫趨勢圖」）：先查下方「依需求查找」，包含特殊元件。找到就讀該元件 `README.md`，確認「必須保留」守得住，並向人說明取捨（例如 `globe` 不是精確地圖）；找不到才自製。
- 本目錄供 LLM **選擇表示方式**：比較關係、適用情境與限制。選定後，**實作前**讀該元件的 `README.md` 及其列出的追加說明；資料語意、操作設計與接入細節由元件自己的文件承載。沒有合適的就在主題內自製（見 `AGENTDECK.md`「標記規範」），不要硬套。

先安排頁面的講解順序，再決定內容元件；一個元件可以是占滿內容區的互動實驗。需要「改參數 → 觀察中間狀態與結果」時，靜態圖或旋轉展示未必足夠，應依操作需求選擇或自製。

## 互動組合範例（參考實作）

需要控制項、資料計算或已保存結果與多張圖表連動時，另查 [examples 目錄](../../../examples/README.md)，或開啟 [示範入口](../../../examples/index.html)。目前有解析度比較、門檻與共識、加權評分、同案例結果回放，皆使用最小人工資料。先看目錄摘要，選定後只讀該範例的 README、必要的追加說明與程式，不掃描全部範例，在主題內改寫；它們不屬於下列 `deck.*` 正式元件，主題不得執行期引用 examples。

## 基礎元件

靜態 HTML／SVG／CSS，零依賴；縮圖即本體；任何簡報都能用。

### 文字與結構

| 元件 | 表達的關係 | 用在 | 不要用在 |
| --- | --- | --- | --- |
| [list](list/README.md) | 條列、層次 | 重點條列，最多四層 | 項目要並排比較 → `cards`；有先後順序 → `steps` |
| [cards](cards/README.md) | 並列 | 同粒度的 2–4 個項目 | 項目有數值要比大小 → `bars`／`metrics` |
| [focus](focus/README.md) | 單句結論 | 一頁只講一句話 | 多個重點 → `list` |
| [compare](compare/README.md) | 對照 | 改善前後、方案 A／B 比較 | 三個以上同類項目 → `cards` |
| [matrix](matrix/README.md) | 兩軸四象限 | 2×2 分析：優先度、影響力／可行性 | 只有一個維度 → `bars`／`cards` |

### 順序與流程

| 元件 | 表達的關係 | 用在 | 不要用在 |
| --- | --- | --- | --- |
| [steps](steps/README.md) | 單向流程 | 先後順序、單一路徑 | 有分支、判斷、回圈 → `flow` |
| [flow](flow/README.md) | 分支流程 | 有判斷、分支、匯流或回圈的流程；小型樹狀（組織圖） | 單一路徑 → `steps`；超過約 12 個節點 → 拆頁或 `network` |
| [sequence](sequence/README.md) | 多方時序 | 請求／回覆、重試、逾時、訊息遺失（2–4 方） | 單方的步驟 → `steps`／`flow`；需要時間比例 → 自製 |
| [timeline](timeline/README.md) | 時程 | 有日期的里程碑、目前進度 | 只有先後沒有日期 → `steps`；需要時間比例（甘特）→ 自製 |

### 數量與數值

| 元件 | 表達的關係 | 用在 | 不要用在 |
| --- | --- | --- | --- |
| [metrics](metrics/README.md) | 關鍵數字 | KPI、結果數字 | 多個數量要比長短 → `bars` |
| [table](table/README.md) | 精確數值、多欄對照 | 規格表、比較表、要讀確切數字 | 要比大小或看趨勢 → `bars`／`trend` |
| [bars](bars/README.md) | 數量比較 | 同單位數值比大小、分布 | 隨時間變化 → `trend` |
| [split](split/README.md) | 總量拆分 | 分流、分類結果、成本或時間的去向（2–4 股） | 各項不屬於同一個總量 → `bars`；多層去向 → `sankey`；多層佔比 → `treemap` |
| [range](range/README.md) | 數值區間 | 規格上下限、預估範圍、實際值是否落在區間 | 只有單一數值 → `bars`／`metrics` |
| [trend](trend/README.md) | 趨勢 | 時間序列、1–5 條線、事件標記 | 只比較單一時間點 → `bars` |
| [figure](figure/README.md) | 圖表外框 | 替 `bars`／`trend` 或自製圖加說明、圖例、資料來源 | 純文字內容 |

## 特殊元件

有動態內容（WebGL、自動動畫、講者操作的控制項）或依賴 `vendor.json` 的套件。都有靜態後備，縮圖、匯出與載入失敗時顯示後備。使用成本較高，只在它**多表達一層資訊**或需要開場氣勢時用，並遵守下方「特殊元件規則」。

### 講解互動（講者操作）

| 元件 | 表達的關係 | 技術 | 用在 | 不要用在 |
| --- | --- | --- | --- | --- |
| [stepper](stepper/README.md) | 狀態逐步變化 | 零依賴，控制列 | 演算法每一輪、事件一步步發生、同一張圖換條件 | 只有前後兩個狀態 → `compare`／`slider`；要即時計算 → examples |
| [predict](predict/README.md) | 先猜再揭曉 | 零依賴，按鈕 | 教學提問、課程的「先預測再操作」 | 不需要觀眾先想 → `focus`／`list` |
| [slider](slider/README.md) | 同一畫面的前後差異 | 零依賴，拖曳 | 改善前後、良品與瑕疵的影像對照 | 不同取景或不是圖片 → `compare` |
| [evolution](evolution/README.md) | 能力逐階演進 | HTML／SVG，零依賴 | 專案如何因需求逐步長出功能 | 日期時程 → `timeline`；循環網路 → `network` |
| [physics](physics/README.md) | 物理現象、連鎖反應 | matter-js | 落下、彈跳、碰撞、擺錘的教學；骨牌式連鎖的比喻 | 要精確數值或公式 → `trend`／`math` |
| [celebrate](celebrate/README.md) | 值得慶祝的時刻 | canvas-confetti | 揭曉答案、宣布上線、達成目標時按按鈕噴彩帶 | 每一題、每一頁都用；沒有按鈕可按 |

### 內容呈現

| 元件 | 表達的關係 | 技術 | 用在 | 不要用在 |
| --- | --- | --- | --- | --- |
| [code](code/README.md) | 程式碼、兩版差異、終端機 | highlight.js | 技術簡報、教學、code review、版本演進 | 只是要顯示指令或檔名 → 行內文字 |
| [math](math/README.md) | 數學公式 | KaTeX（MathML） | 推導、更新規則、目標函式 | 只有一個簡單比例或單位 → 行內文字 |
| [terminal](terminal/README.md) | 終端機操作過程 | asciinema-player | CLI 教學、部署流程、agent 操作示範（逐字重播，可暫停） | 只要靜態列出指令與輸出 → `code` 的 `prompt` |
| [lottie](lottie/README.md) | 設計好的向量動畫 | lottie-web | LottieFiles／After Effects 匯出的圖示或流程動畫 | 只是文字出現、移動 → CSS；含點陣圖的動畫 |

### 關係與佔比（套件排版，產生時即完成）

| 元件 | 表達的關係 | 技術 | 用在 | 不要用在 |
| --- | --- | --- | --- | --- |
| [sankey](sankey/README.md) | 多層去向 | d3 + d3-sankey | 預算分配、流量去向、轉換漏斗；寬度即數量 | 一層 2–4 股 → `split`；有循環 → 自製 |
| [treemap](treemap/README.md) | 階層佔比 | d3 | 預算科目、程式碼大小、市場份額；面積即數量 | 一層、項目少 → `split`／`bars`；數量不可加總 → `bars` |
| [network](network/README.md) | 交錯的網路 | cytoscape | 模組相依、引用、課程先修（10–40 個節點）；講者點節點突顯鄰居 | 有判斷、明確流向且節點少 → `flow` |

### 手繪與強調

| 元件 | 表達的關係 | 技術 | 用在 | 不要用在 |
| --- | --- | --- | --- | --- |
| [mark](mark/README.md) | 文字中的關鍵詞 | rough-notation | 一段話裡依講述順序畫螢光筆、底線、圈選（1–3 處） | 一頁只有一句話 → `focus`；每個詞都標 |
| [sketch](sketch/README.md) | 未定案的草圖 | rough.js | 包住 `flow` 等 SVG 圖，表示提案還在討論 | 已定案的內容；需要精確對位的圖 |

### 3D 與動畫（開場或多一層空間資訊）

| 元件 | 表達的關係 | 技術 | 用在 | 不要用在 |
| --- | --- | --- | --- | --- |
| [surface](surface/README.md) | 兩因子 → 結果 | three.js | 製程窗口、參數掃描、DOE | 只有一個因子 → `trend`／`bars`；要讀精確數值 → `table` |
| [stack3d](stack3d/README.md) | 分層依賴 | three.js | 系統架構、技術堆疊（2–6 層） | 只是條列層次 → `list` |
| [globe](globe/README.md) | 地點分布與流向 | three.js | 全球據點、供應鏈、跨區協作 | 需要精確地圖 → `figure` 包圖片 |
| [cube](cube/README.md) | 四個面向輪流揭露 | CSS 3D 動畫 | 開場／收尾的四面向總覽 | 要同時比較或逐一講解 → `cards` |
| [model](model/README.md) | 簡單立體結構 | zdog | 方塊、圓柱、圓錐、球拼成的硬體構造或部署示意（不需 WebGL） | 分層架構 → `stack3d`；精確尺寸 → `figure` 放圖 |
| [backdrop](backdrop/README.md) | 開場氣勢 | vanta + three.js | 封面、章節頁的動態網點或波浪背景，標題疊在上面 | 內容頁；同頁已有 three.js 元件 |

## 依需求查找

人用自己的話提需求時，先在這裡找；同一列有多個元件時，依上表「用在／不要用在」判斷。

| 人可能這樣說 | 元件 |
| --- | --- |
| 重點、條列、大綱、階層 | `list` |
| 三個方案、幾個面向、並列、卡片 | `cards`（要動態輪播 → `cube`） |
| 一句話、結論、標語、金句 | `focus` |
| 前後對比、A／B、導入前後、優缺點 | `compare` |
| 2×2、四象限、矩陣、優先順序分析 | `matrix` |
| 流程、步驟、SOP、先後順序 | `steps` |
| 流程圖、判斷、分支、決策樹、回圈、組織圖 | `flow`（單一路徑 → `steps`） |
| 時序圖、請求回覆、重試、逾時、封包遺失、兩台機器 | `sequence` |
| 時程、里程碑、路線圖、進度 | `timeline`（無日期 → `steps`） |
| KPI、成果數字、大數字 | `metrics` |
| 表格、規格表、明細、精確數字 | `table` |
| 長條圖、排名、各項比較、分布 | `bars` |
| 分流、佔比、總量拆分、去向 | `split` |
| 區間、上下限、規格範圍、預估範圍、是否超標 | `range` |
| 趨勢、走勢、折線圖、月報、時間序列 | `trend` |
| 圖表加註解、資料來源、圖例、放圖片 | `figure` |
| 逐步、一輪一輪、播放、演算法過程、狀態變化 | `stepper` |
| 先猜、提問、測驗、揭曉、預測 | `predict` |
| 前後對照圖、拖曳比較、改善前後照片 | `slider`（文字對照 → `compare`） |
| 演進、逐步長出、漸進課程、專案成形 | `evolution` |
| 程式碼、code、語法上色、範例程式、改了哪幾行、diff、終端機、指令輸出 | `code` |
| 公式、數學、推導、方程式、TeX | `math` |
| 終端機錄影、指令示範、打字效果、asciinema、CLI 操作過程 | `terminal`（靜態指令 → `code`） |
| 動畫、Lottie、After Effects、動態圖示 | `lottie` |
| 桑基圖、流向、預算去向、轉換漏斗、從哪來到哪去 | `sankey`（一層 → `split`） |
| 樹狀圖、矩形樹圖、treemap、佔比、預算科目、組成 | `treemap` |
| 網路圖、關係圖、相依圖、知識圖譜、引用、先修關係 | `network`（有判斷的流程 → `flow`） |
| 物理、模擬、碰撞、重力、彈跳、擺錘、骨牌 | `physics` |
| 螢光筆、畫重點、圈起來、底線、手繪標註 | `mark` |
| 草圖、手繪風、草案、還在討論、白板風 | `sketch` |
| 慶祝、彩帶、灑花、上線了、答對了 | `celebrate` |
| 3D 曲面、參數掃描、製程窗口、熱度圖、兩個變數的影響 | `surface` |
| 架構圖、技術堆疊、分層、3D 架構 | `stack3d`（平面即可 → `list`） |
| 地圖、地球、全球據點、供應鏈、跨國 | `globe` |
| 立體示意、等角圖、硬體構造、伺服器機櫃 | `model`（分層 → `stack3d`） |
| 動態背景、封面背景、章節頁、粒子背景 | `backdrop` |
| 3D、酷一點、動態、開場效果 | 依內容選 `surface`／`stack3d`／`globe`／`cube`／`model`；封面或章節頁 → `backdrop`；內容不合適就說明並改用基礎元件 |

**還沒有元件的關係**，一律自製：甘特（依時間比例）。

## 引用方式

在獨立簡報單位的根 `index.html` 加兩行（`<name>` 換成元件名；`agentdeck add` 會印出這兩行）：

```html
<link rel="stylesheet" href="agentdeck/assets/deck/components/<name>/<name>.css">   <!-- theme.css 之後、story.css 之前 -->
<script src="agentdeck/assets/deck/components/<name>/<name>.js"></script>           <!-- theme.js 之後、story.js 之前 -->
```

相關入口 `<group>/<name>/index.html` 改以 `../../agentdeck/assets/` 引用同一單位內的副本；上游內框架在根目錄，去掉 `agentdeck/`。不同主題各自擁有副本，不跨單位引用。呼叫一律是 `deck.<name>(key, …)`，第一個參數是 `data-key`（每頁唯一）。回傳 HTML 字串，可用 `+` 串接。忘了引用時，呼叫會直接報錯並提示路徑；只引用 js 沒引用 css，主控台會出錯誤訊息。

## 特殊元件規則

1. **套件**：用到套件的元件（表中「技術」列出套件名稱，如 three.js、highlight.js、KaTeX），先在元件 js 之前引用套件，每份簡報只引用一次；同一套件有多個檔案時依 `agentdeck add` 印出的順序引用（例如 `d3.min.js` 在 `d3-sankey.min.js` 之前）：
   ```html
   <script src="agentdeck/vendor/three/three.min.js"></script>   <!-- theme.js 之後、元件 js 之前 -->
   ```
   `agentdeck/vendor/` 不進 git，第一次使用先執行 `agentdeck vendor`；交付用 `agentdeck pack` 打包會自動下載並帶上（ADR 0011）。沒下載時顯示靜態後備，主控台提示。
2. **每頁最多一個 three.js 元件**（`surface`、`stack3d`、`globe`、`backdrop`）；`physics`、`model`、`lottie` 等動畫元件也以每頁一個為原則。整份簡報的特殊元件控制在少數關鍵頁。
3. **現場可講解**：投影時不依賴觀眾親自拖曳；3D 展示的結論仍需清單、`point` 或口述輔助。互動實驗可由講者操作，須有起始情境、操作提示與靜態後備；會後讀者可自行探索。
4. 不用寫 `mount`／`previewArt`：核心在頁面出現時啟動動態內容、換頁時釋放；縮圖用靜態後備。
5. **匯出 pptx**：要在 PPT 裡呈現旋轉，在頁面加 `record` 拖曳畫布，例如 `record: [{ wait: 800 }, { drag: '[data-key=<key>] .deck-canvas', by: [360, 0] }, { wait: 1200 }]`；自動動畫（如 cube）只要寫 `wait`。沒有 `record` 時匯出靜止畫面（ADR 0021）。
6. **包裝型元件**（`sketch`、`celebrate`）：把其他元件的輸出當內容傳入，被包住的元件照常引用、照常可編輯。
7. **減少動態**：系統設定「減少動態」時，自動播放的元件（`terminal`、`lottie`、`physics`、`mark`、`model`、`backdrop`、`celebrate`）不播放或停在靜態畫面。
8. **隨朗讀**：會自己播放的元件（`terminal`、`lottie`、`physics`、`mark`）翻頁就開始，口語稿還沒講到就播完了；要跟著句子動時設 `auto: false`，再用 `record` 的 `at` 觸發。各元件的寫法見其 README「隨朗讀」，選法見 `agentdeck docs speech-actions`。

## 預覽

`index.html`（本資料夾）是元件展示頁：第 2 頁為全部元件的縮圖總覽，之後先列基礎元件、再列特殊元件，一頁一個。總覽與單頁都由 `deck.define` 的 `demo` 自動產生，新增元件只要在本資料夾 `index.html` 加引用，可直接雙擊開啟，也可點頁首「✎ 編輯」切到編輯模式檢查可編輯與可隱藏的範圍。特殊元件需先執行 `node cli/agentdeck.mjs vendor`，否則顯示靜態後備。

## 新增元件（需經人同意，見 docs/adr/0009）

1. 建立 `<name>/`，內含 `<name>.js`、`<name>.css`、`README.md`。名稱為小寫英數。
2. `<name>.js` 以 `deck.define('<name>', (key, …) => html, { summary, demo, tier? })` 註冊。核心會檢查：key 格式正確、只產生單一根元素、根元素的 `data-key` 等於 key。
3. 編輯標記由元件自己加：現場要改的文字加 `data-edit`，可單獨隱藏的子項目加 `data-key` 與 `data-hide`，子項目 key 用 `deck.util.itemKey`。
4. `<name>.css` 的類別一律用 `.deck-<name>` 前綴，根元素 class 為 `.deck-<name>`；只用 `--deck-*`／`reader.css` 的色票 token，不寫死品牌色與圖片。
5. 元件之間不互相呼叫；需要組合時，讓使用者把其他元件的輸出當內容傳入（如 `compare` 欄內放 `metrics`）。
6. `README.md` 固定四段：用途、API、必須保留、範例。元件專屬的追加說明放在元件資料夾，從 README 的「實作前必讀」連結：資料語意、操作與連動、解讀限制、嵌入方式、生命週期與驗收。短說明可直接放 README；較長可放 `IMPLEMENTATION.md`，需要術語表時可附 `glossary.md`。內容隨元件維護，目錄只放選用摘要與入口，不複製追加說明，也不要求每個簡單元件建立空白附檔。
7. **分級**：靜態、零依賴為 `tier: 'basic'`（預設）。有以下任一項為 `tier: 'special'`：
   - 動態內容：在 meta 加 `live: el => 清理函式`，`el` 是 `.deck-<name>` 根元素；產生函式要輸出 `.deck-view > .deck-fallback` 靜態後備。three.js 場景用 `deck.util.three(host, setup)`。
   - 用到套件：在 meta 加 `vendor: ['<vendor.json 名稱>']`，套件須經人同意加入 `vendor.json`。
   - 以自動動畫為主體（如 `cube`）。
8. 在上方對應的表與「依需求查找」各加一行，並在本資料夾 `index.html` 加上 css 與 js 兩行引用。
