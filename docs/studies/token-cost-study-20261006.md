# HTML PPT token 優化實驗：2026-10-06

後續已完成[第二輪：無損文件去重對照](token-docs-study-20261006.md)。下文保留第一輪當時的結論與量測。

## 判斷

首輪不支持「提示 agent 精簡輸出／合併查詢，就能降低整體 token」的結論。兩組都完成相同六頁簡報與資料更新，但精簡組第一次交付的總 token 較高，且需要追加截圖驗收。這不是 AgentDeck 與 PPTX 的比較，也不是模型間比較。

可落地的小改善：把選定元件文件的**相同共用引用規則只呈現一次**。已在 playground 實作無損合併工具，五份文件由 6,415 降至 4,202 字元（少 2,213，34.5%），並以 assertion 驗證每份原文可逐字還原。這是文件字元數的改善，**尚未實測它讓完整任務省下多少 token**。未改上游 CLI、核心、品牌或必讀規則。

## 實驗設計

- 兩個 fresh subagent，模型皆為實際 telemetry 記錄的 `gpt-6-astra`、`low`。不繼承父對話歷史；與前一天 medium 的實驗不直接比較。
- 同一合成素材：資料檢核試驗，六頁為封面／流程／分工／結果／下一步／結尾。兩組均使用 flow、table、bars、steps，並自行選用 figure 外框。
- V1：A60、B75、C90，C 最高；V2：B 改為95，圖表、結論與講稿同步改為 B 最高。
- baseline 正常依規則實作；compact 額外要求合併獨立查詢、完整必讀文件只讀一次、測試詳情存檔只回摘要。沒有要求 baseline 刻意多讀、多印或多呼叫。
- 兩版皆須 Chrome 實播、六頁導覽、數值與講稿檢查、結果頁截圖；V2 ZIP 解壓後阻擋 HTTP(S)，從 file:// 再驗證。
- 每組一個樣本，提示影響、agent 自主選擇、快取命中與失敗重試不能分離。它是探索性測試，不是穩定節省率或速度排名。

## 最終交付成本（含驗收修正）

| 指標 | baseline | compact |
|---|---:|---:|
| 未快取輸入 token | 71,171 | 52,946 |
| 快取輸入 token | 1,003,392 | 1,802,752 |
| 輸出 token | 7,096 | 7,809 |
| 合計 token | 1,081,659 | 1,863,507 |
| 起始至最後完成秒數 | 314.140 | 404.186 |
| 各 agent turn 時間加總（秒） | 314.435 | 392.056 |
| 工具呼叫 | 18 | 28 |

compact 總 token 比 baseline 多72.3%。它的總時間包含首次交付後等待父代理 review／啟動修正的空檔；turn 時間加總列為補充。兩組最終均通過共同檢查。這次提示方案不採納為「已證實節省」；不能把失敗重試後的數字外推成格式或模型的一般表現。

父代理研究成本另計：截至 `2026-10-06T01:36:45.285Z`（UTC）快照，未快取103,261、快取3,408,640、輸出14,058，合計3,525,959 token，經過581.056秒；**不含之後收尾與最終回覆**。包括既有紀錄稽核、工具撰寫、驗收與報告，也包括父代理最初讀檔亂碼重讀、誤把大型 results.json 回傳後截斷的浪費。本研究本身不是淨節省；沒有把研究成本藏進任一子組。

## 首次交付的量測（尚未計入父代理指出的截圖修正）

| 指標 | baseline | compact |
|---|---:|---:|
| 未快取輸入 token | 71,171 | 47,819 |
| 快取輸入 token | 1,003,392 | 1,238,912 |
| 輸出 token | 7,096 | 6,618 |
| 合計 token | 1,081,659 | 1,293,349 |
| elapsed 秒 | 314.140 | 301.554 |
| usage 事件 | 19 | 23 |
| 工具呼叫 | 18 | 22 |
| 工具文字回傳字元 | 56,574 | 56,014 |

工具文字只少約1%，總 token 卻多約19.6%；不能只看未快取輸入就宣布成功。快取與未快取的單價不同，未使用費率計算金額。工具呼叫包含 orchestrator 外層呼叫，不等於 shell 命令數；usage 事件也不保證等於付費請求數。

input 已包含 cached；表內 uncached = input − cached。reasoning 是 output 子集合，沒有再加一次。數字來自 session 累積 telemetry，不是以字元估算。

## 品質與重試

兩組都有真實環境重試：PowerShell 預設編碼造成中文亂碼而重讀、同路徑 delete/add patch 被拒、打包下載在受限網路失敗後核准重試、解壓入口誤判為根目錄（實際多一層 ZIP 包裝資料夾）。baseline 另補強圖表比例檢查，重跑兩版與打包。

父代理看到 compact 的結果頁截圖有缺字與半透明圖表，判斷是在 CSS 進場尚未完成時截圖，要求用真實時間等待後重新驗收。更正後父代理已看到完整的 B 最高標題與三條數值圖表。這項成本必須納入最終交付，不可把首次自報 PASS 當作完整品質證據。

版面品質門檻限桌面 1440×1000 與本合成案例；並非手機、所有元件、互動／語音或完整 Siguard 的驗證。

## 下一次可直接使用的工作方式

1. 中文讀檔明示 `Get-Content -Encoding UTF8`；先確認 ZIP 的實際入口再做離線測試；截圖使用真實等待，避免重做驗收。
2. 必讀規則與選中元件文件完整讀取；同一上下文不用無理由重讀。先搜尋精準範圍，再讀必要原始碼。
3. 詳細 QA 保存檔案，回傳關鍵值、錯誤與產物位置；失敗時再展開診斷。摘要本身不是省 token 的保證。
4. 更新時沿用已驗證的檢查與版面，只改相關資料／文字／講稿；不要重新探索既有框架。
5. 下一個值得隔離驗證的變因是「原始 docs vs 無損去重 docs」，其餘任務、環境與驗收固定，再反轉執行順序重複。現階段不把試用提示升格為上游政策。

## 重現與保存

完整實驗位於 `playground/token-opt-20261006/`：TASK.md、PROTOCOL.md、WORKFLOW.md、prior-audit.json、doc-sizes.json、docs-bundle-result.json、usage-before-review.json、usage.json、parent-usage.json，以及兩組 result.json。`baseline/`、`compact/` 是 CLI init 的獨立單位；各自 resources/bench 保存快照、檢查與截圖，dist 保存 ZIP。

在 repo 根目錄執行：

```powershell
node playground/token-opt-20261006/docs-bundle.cjs flow table bars steps figure
Get-Content -Encoding UTF8 playground/token-opt-20261006/docs-bundle.txt
node playground/token-opt-20261006/measure.cjs
```

合併工具呼叫現有 CLI，只有所有尾段完全相同才去重，否則原樣保留；不增依賴。measure.cjs 限本次 session ID／日期；新實驗須更新識別，不可直接把舊數字當成新任務。

playground 被 git 忽略，產物與量測腳本只在本機。此文件放在 docs 供版控保存，但尚未 commit。沒有複製原始 session 對話到 repo。

最終入口：[baseline](../../playground/token-opt-20261006/baseline/index.html)、[compact](../../playground/token-opt-20261006/compact/index.html)。交付 ZIP 分別為 `baseline/dist/baseline-20261006-0933.zip` 與 `compact/dist/compact-20261006-0935.zip`。原始聚合：[usage.json](../../playground/token-opt-20261006/usage.json)；可試用的[工作指示](../../playground/token-opt-20261006/WORKFLOW.md)及[文件去重工具](../../playground/token-opt-20261006/docs-bundle.cjs)。
