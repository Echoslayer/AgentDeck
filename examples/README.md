# 互動組合範例

這裡進 git，留在上游；下游工作區不複製，以 `agentdeck docs <名稱> --code` 讀取（[ADR 0016](../docs/adr/0016-registry-copy-and-contract-version.md)）。範例提供可執行程式與實作追加說明，讓 LLM 依主題改寫；不是穩定的共用 API。決策見 [ADR 0015](../docs/adr/0015-interactive-examples.md)。

## 選擇表示方式

| 需要表達 | 試玩 | 實作前必讀 |
| --- | --- | --- |
| 聚合尺度如何改變空間細節 | [解析度比較](resolution-comparison/index.html) | [資料與改寫方式](resolution-comparison/IMPLEMENTATION.md) |
| 多組數值如何經門檻與投票形成結果 | [門檻與共識](threshold-consensus/index.html) | [投票與對齊條件](threshold-consensus/IMPLEMENTATION.md) |
| 分項、權重與排名的關係 | [加權評分](weighted-ranking/index.html) | [計分與尺度假設](weighted-ranking/IMPLEMENTATION.md) |

三份組合都用小型人工資料，各自有 `compute.js`（計算）、`demo.js`（資料與畫面）、README 與實作追加說明；不依賴任何 XAI 檔案。抽象的是關係與更新流程，示範仍保留可驗證的具體數字。

人可雙擊 [展示入口](index.html)。需要現成函式時，使用 [正式元件目錄](../assets/deck/components/CATALOG.md)。

## 使用方式

1. 先讀上方選用摘要，選定後只讀該範例的 README、必要的追加說明與程式；不要掃描整個 examples 或預先載入所有範例。
2. 在 `resources/<topic>/` 裡改寫需要的 HTML、CSS、JS 與資料，保留來源說明及語意限制。從 `templates/blank/` 建立主題；不要把範例整包當成正式主題骨架。
3. 主題不得以 script、stylesheet、圖片或其他執行期方式引用 `examples/` 或 `playground/`。範例之間可共用檔案，正式主題必須自行持有需要的實作。
4. 檢查掛載後與互動更新後的結果、文字換行、窄版面、返回狀態與靜態預覽。

## 新增與維護

- 每份組合以表示關係命名，附 README、追加說明、可離線執行的最小資料與運算檢查。領域專屬試驗留在不進 git 的 playground，examples 只保留最小人工資料與一般組合。
- README 標明適用關係、操作、限制、需要改寫的部分及驗收方式；較長細節放同目錄 `IMPLEMENTATION.md`，必要時附術語表。
- 在本表與展示入口新增連結。現成元件與參考範例保持標示清楚。
- 出現第二個實際主題後，再判斷哪些不變部分適合抽成正式元件；升級仍需人同意。
- 本表由 `agentdeck catalog` 解析：維持「需要表達｜範例連結（指向 `<名稱>/index.html`）｜實作前必讀」的欄位順序。實作前必讀須從範例 README 連結，`docs` 才會輸出。

## 檢查與交付

`node examples/check.cjs` 執行三種組合檢查，確認範例的本機引用。這不是瀏覽器排版驗收。

`node cli/check.mjs` 驗證下游工作區不帶入 examples、`docs` 能輸出範例說明與程式、examples 打包後引用完整，以及主題引用 examples 時 pack 會拒絕。若要寄送示範，使用 `node cli/agentdeck.mjs pack examples` 打包整個展示入口。
