# 元件目錄

元件分**基礎**與**特殊**兩級（[ADR 0013](../../../docs/adr/0013-component-tiers.md)）。LLM 做簡報時依下列時機查這份目錄：

- **建立或改版主題**：讀完本檔（兩級都要看），逐頁依「表達的關係」挑選。基礎元件能表達時優先用基礎。
- **人提出特定需求**（「放個地圖」「做成 3D」「畫趨勢圖」）：先查下方「依需求查找」，包含特殊元件。找到就讀該元件 `README.md`，確認「必須保留」守得住，並向人說明取捨（例如 `globe` 不是精確地圖）；找不到才自製。
- 選定元件後才讀它的 `README.md`；沒有合適的就在主題內自製（見 `AGENTS.md`「標記規範」），不要硬套。

## 基礎元件

靜態 HTML／SVG／CSS，零依賴；縮圖即本體；任何簡報都能用。

| 元件 | 表達的關係 | 用在 | 不要用在 |
| --- | --- | --- | --- |
| [list](list/README.md) | 條列、層次 | 重點條列，最多四層 | 項目要並排比較 → `cards`；有先後順序 → `steps` |
| [cards](cards/README.md) | 並列 | 同粒度的 2–4 個項目 | 項目有數值要比大小 → `bars`／`metrics` |
| [steps](steps/README.md) | 單向流程 | 先後順序、單一路徑 | 有分支、判斷、回圈 → 自製 |
| [focus](focus/README.md) | 單句結論 | 一頁只講一句話 | 多個重點 → `list` |
| [compare](compare/README.md) | 對照 | 改善前後、方案 A／B | 三個以上同類項目 → `cards` |
| [metrics](metrics/README.md) | 關鍵數字 | KPI、結果數字 | 多個數量要比長短 → `bars` |
| [bars](bars/README.md) | 數量比較 | 同單位數值比大小、分布 | 隨時間變化 → `trend` |
| [trend](trend/README.md) | 趨勢 | 時間序列、1–5 條線、事件標記 | 只比較單一時間點 → `bars` |
| [figure](figure/README.md) | 圖表外框 | 替 `bars`／`trend` 或自製圖加說明、圖例、資料來源 | 純文字內容 |

## 特殊元件

有動態內容（WebGL、自動動畫）或依賴 `vendor.json` 的套件。都有靜態後備，縮圖與載入失敗時顯示後備。使用成本較高，只在它**多表達一層資訊**或需要開場氣勢時用，並遵守下方「特殊元件規則」。

| 元件 | 表達的關係 | 技術 | 用在 | 不要用在 |
| --- | --- | --- | --- | --- |
| [surface](surface/README.md) | 兩因子 → 結果 | three.js | 製程窗口、參數掃描、DOE | 只有一個因子 → `trend`／`bars`；要讀精確數值 → 表格 |
| [stack3d](stack3d/README.md) | 分層依賴 | three.js | 系統架構、技術堆疊（2–6 層） | 只是條列層次 → `list` |
| [globe](globe/README.md) | 地點分布與流向 | three.js | 全球據點、供應鏈、跨區協作 | 需要精確地圖 → `figure` 包圖片 |
| [cube](cube/README.md) | 四個面向輪流揭露 | CSS 3D 動畫 | 開場／收尾的四面向總覽 | 要同時比較或逐一講解 → `cards` |

## 依需求查找

人用自己的話提需求時，先在這裡找；同一列有多個元件時，依上表「用在／不要用在」判斷。

| 人可能這樣說 | 元件 |
| --- | --- |
| 重點、條列、大綱、階層 | `list` |
| 三個方案、幾個面向、並列、卡片 | `cards`（要動態輪播 → `cube`） |
| 流程、步驟、SOP、先後順序 | `steps` |
| 一句話、結論、標語、金句 | `focus` |
| 前後對比、A／B、導入前後、優缺點 | `compare` |
| KPI、成果數字、大數字 | `metrics` |
| 長條圖、排名、各項比較、分布 | `bars` |
| 趨勢、走勢、折線圖、月報、時間序列 | `trend` |
| 圖表加註解、資料來源、圖例、放圖片 | `figure` |
| 3D 曲面、參數掃描、製程窗口、熱度圖、兩個變數的影響 | `surface` |
| 架構圖、技術堆疊、分層、3D 架構 | `stack3d`（平面即可 → `list`） |
| 地圖、地球、全球據點、供應鏈、跨國 | `globe` |
| 3D、酷一點、動態、開場效果 | 依內容選 `surface`／`stack3d`／`globe`／`cube`；內容不合適就說明並改用基礎元件 |

**還沒有元件的關係**，一律自製：判斷分支、時程／甘特、組織圖、數值區間、矩陣（2×2）。

## 引用方式

在主題的 `index.html` 加兩行（`<name>` 換成元件名）：

```html
<link rel="stylesheet" href="../../assets/deck/components/<name>/<name>.css">   <!-- theme.css 之後、story.css 之前 -->
<script src="../../assets/deck/components/<name>/<name>.js"></script>           <!-- theme.js 之後、story.js 之前 -->
```

呼叫一律是 `deck.<name>(key, …)`，第一個參數是 `data-key`（每頁唯一）。回傳 HTML 字串，可用 `+` 串接。忘了引用時，呼叫會直接報錯並提示路徑；只引用 js 沒引用 css，主控台會出錯誤訊息。

## 特殊元件規則

1. **套件**：用到套件的元件（表中「技術」為 three.js），先在元件 js 之前引用套件，每份簡報只引用一次：
   ```html
   <script src="../../vendor/three/three.min.js"></script>   <!-- theme.js 之後、元件 js 之前 -->
   ```
   `vendor/` 不進 git，第一次使用先雙擊 `tools\setup.cmd`；交付用 `tools\pack.cmd` 打包會自動帶上（[ADR 0011](../../../docs/adr/0011-vendor-manifest-and-packing.md)）。沒下載時顯示靜態後備，主控台提示。
2. **每頁最多一個 three.js 元件**；整份簡報的特殊元件控制在少數關鍵頁。
3. **不依賴互動**：投影時觀眾不能拖曳，講解內容要寫在清單、`point` 或講者口述裡，3D 只輔助。
4. 不用寫 `mount`／`previewArt`：核心在頁面出現時啟動動態內容、換頁時釋放；縮圖用靜態後備。

## 預覽

`index.html`（本資料夾）是元件展示頁，先列基礎元件、再列特殊元件，一頁一個，可直接雙擊開啟，也可點頁首「✎ 編輯」切到編輯模式檢查可編輯與可隱藏的範圍。特殊元件需先執行 `tools\setup.cmd`，否則顯示靜態後備。

## 新增元件（需經人同意，見 docs/adr/0009）

1. 建立 `<name>/`，內含 `<name>.js`、`<name>.css`、`README.md`。名稱為小寫英數。
2. `<name>.js` 以 `deck.define('<name>', (key, …) => html, { summary, demo, tier? })` 註冊。核心會檢查：key 格式正確、只產生單一根元素、根元素的 `data-key` 等於 key。
3. 編輯標記由元件自己加：現場要改的文字加 `data-edit`，可單獨隱藏的子項目加 `data-key` 與 `data-hide`，子項目 key 用 `deck.util.itemKey`。
4. `<name>.css` 的類別一律用 `.deck-<name>` 前綴，根元素 class 為 `.deck-<name>`；只用 `--deck-*`／`reader.css` 的色票 token，不寫死品牌色與圖片。
5. 元件之間不互相呼叫；需要組合時，讓使用者把其他元件的輸出當內容傳入（如 `compare` 欄內放 `metrics`）。
6. `README.md` 固定四段：用途、API、必須保留、範例。
7. **分級**：靜態、零依賴為 `tier: 'basic'`（預設）。有以下任一項為 `tier: 'special'`：
   - 動態內容：在 meta 加 `live: el => 清理函式`，`el` 是 `.deck-<name>` 根元素；產生函式要輸出 `.deck-view > .deck-fallback` 靜態後備。three.js 場景用 `deck.util.three(host, setup)`。
   - 用到套件：在 meta 加 `vendor: ['<vendor.json 名稱>']`，套件須經人同意加入 `vendor.json`。
   - 以自動動畫為主體（如 `cube`）。
8. 在上方對應的表與「依需求查找」各加一行，並在本資料夾 `index.html` 加上 css 與 js 兩行引用。