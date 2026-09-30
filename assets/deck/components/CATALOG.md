# 元件目錄

做簡報時**只先讀這一份**。某頁要表達的關係有對應的元件時，才去讀該元件的 `README.md`；沒有就在主題內自己做（見 `AGENTS.md`「自製元件」）。

| 元件 | 表達的關係 | 用在 | 不要用在 |
| --- | --- | --- | --- |
| [list](list/README.md) | 條列、層次 | 重點條列，最多四層 | 項目要並排比較 → `cards`；有先後順序 → `steps` |
| [cards](cards/README.md) | 並列 | 同粒度的 2–4 個項目 | 項目有數值要比大小 → `bars`／`metrics` |
| [steps](steps/README.md) | 單向流程 | 先後順序、單一路徑 | 有分支、判斷、回圈 → 自製 |
| [focus](focus/README.md) | 單句結論 | 一頁只講一句話 | 多個重點 → `list` |
| [compare](compare/README.md) | 對照 | 改善前後、方案 A／B | 三個以上同類項目 → `cards` |
| [metrics](metrics/README.md) | 關鍵數字 | KPI、結果數字 | 多個數量要比長短 → `bars` |
| [bars](bars/README.md) | 數量比較 | 同單位數值比大小、分布 | 隨時間變化的趨勢 → 自製 |
| [figure](figure/README.md) | 圖表外框 | 替 `bars` 或自製圖加說明、圖例、資料來源 | 純文字內容 |

**還沒有元件的關係**，一律自製：判斷分支、時序／時程、分層結構、數值區間、趨勢線、組織圖。

## 引用方式

在主題的 `index.html` 加兩行（`<name>` 換成元件名）：

```html
<link rel="stylesheet" href="../../assets/deck/components/<name>/<name>.css">   <!-- deck.css 之後、story.css 之前 -->
<script src="../../assets/deck/components/<name>/<name>.js"></script>           <!-- deck-core.js 之後、story.js 之前 -->
```

呼叫一律是 `deck.<name>(key, …)`，第一個參數是 `data-key`（每頁唯一）。回傳 HTML 字串，可用 `+` 串接。忘了引用時，呼叫會直接報錯並提示路徑；只引用 js 沒引用 css，主控台會出錯誤訊息。

## 預覽

`index.html`（本資料夾）是元件展示頁，一頁一個元件，可直接雙擊開啟，也可切到編輯模式檢查可編輯與可隱藏的範圍。

## 新增元件（需經人同意，見 docs/adr/0009）

1. 建立 `<name>/`，內含 `<name>.js`、`<name>.css`、`README.md`。名稱為小寫英數。
2. `<name>.js` 以 `deck.define('<name>', (key, …) => html, { summary, demo })` 註冊。核心會檢查：key 格式正確、只產生單一根元素、根元素的 `data-key` 等於 key。
3. 編輯標記由元件自己加：現場要改的文字加 `data-edit`，可單獨隱藏的子項目加 `data-key` 與 `data-hide`，子項目 key 用 `deck.util.itemKey`。
4. `<name>.css` 的類別一律用 `.deck-<name>` 前綴，只用 `deck.css`／`reader.css` 的色票 token。
5. 元件之間不互相呼叫；需要組合時，讓使用者把其他元件的輸出當內容傳入（如 `compare` 欄內放 `metrics`）。
6. `README.md` 固定四段：用途、API、必須保留、範例。
7. 在上表加一行，並在本資料夾 `index.html` 加上 css 與 js 兩行引用。
