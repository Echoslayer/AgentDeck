# 0023. 以分頁檔平行製作，完成後以 join 併回單一 story.js

- 狀態：已接受
- 日期：2026-10-02

## 背景

製作時間主要花在逐頁產出 `story.js`：互動頁的 `art`、`mount`、`previewArt` 與自製樣式常有上百行。頁與頁之間除了順序幾乎互不依賴（`data-key`、互動狀態都以頁為範圍），宿主環境若能呼叫 subagent，本可一頁一個平行產出。

阻礙在於 `story.js` 是單一檔案、`pages` 是單一陣列：多個 subagent 同時寫一個檔案會衝突；若改成交草稿給主 agent 貼回，主 agent 要把每頁重新輸出一次，平行省下的時間又付回去。

## 決策

1. **分頁檔**：平行製作時，每頁寫成 `resources/<主題>/pages/<id>.js`（必要時加 `<id>.css`），內容是 `story.pages.splice(-1, 0, { … })`，插在結尾頁之前。`story.js` 保留 `resource()`、`title`、`label`、封面與結尾；入口在 `story.js` 之後、`edits.js` 之前依頁序逐行引用分頁檔，css 放在 `story.css` 之後。閱讀器最後才載入並檢查 `story.pages`，核心不需修改。
2. **分頁檔只用 `story.js` 的 `resource()`**，不自行讀 `document.currentScript`；css 的 `url()` 相對於 `pages/`。
3. **共用檔只由主 agent 寫**：`index.html`、`story.js`、`story.css`、`plan.md`、`agentdeck/` 內的一切（含 `add`）在分派前完成；subagent 只寫自己的分頁檔與 `resources/<主題>/<id>-*` 素材，需要新元件或套件時回報主 agent。
4. **`agentdeck join <主題>` 併回單一檔案**：依入口的引用順序把分頁檔原文串接到 `story.js`、`story.css` 尾端（css 的 `url()` 補上 `pages/` 前綴），移除入口引用與 `pages/`。純串接、不解析 JS；有未被引用或不存在的分頁檔就拒絕。分頁檔是平行製作期間的工作格式，交付前併回，下游的簡報與工具看到的仍是單一 `story.js`。
5. **哪些平行**：素材多時的閱讀摘錄、互動頁與自製頁、獨立的附件與候選版本、交付前的邏輯審查（由沒寫過這份的 subagent 做）、二次迭代的 `explain`／`speech`／`record`。企劃、整合播放與主控台檢查留在主 agent。簡單文字頁由主 agent 直接寫：subagent 每次從零讀規則，成本比自己寫高。

## 理由

- 平行的收益集中在輸出最多的頁面；分頁檔讓每個 subagent 寫自己的檔案，整合不必重新輸出內容。
- 實際作者是 LLM，製作期的檔案佈局可以為平行最佳化；併回由 CLI 機械完成，不耗 LLM 輸出，也不留兩種長期格式。
- `story.pages` 本來就在閱讀器載入時才讀，分頁檔只是同一個載入槽位內的多支 script，資料契約與 `CONTRACT` 不變。

## 後果

- 各 subagent 的樣式可能不一致；主 agent 須先在 `story.css` 定好共用 token 與版面 class，subagent 只使用、不新增全域樣式（分頁 css 用 `.<主題>-<id>-` 前綴）。
- 全部頁面到整合時才第一次一起播放，錯誤在主 agent 收斂。
- 沒有 `split`：改版已完成的簡報時若要平行，由主 agent 手動把要重寫的頁移到分頁檔。需求反覆出現再加指令。
- 頁數少時平行反而更慢、更貴；門檻寫在 `AGENTDECK.md`。
