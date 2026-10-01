# 遷移說明

`deck.contract`（`assets/deck/deck-core.js` 的 `CONTRACT`）遞增時，必須在這裡新增 `<n>-to-<n+1>.md`（[ADR 0016](../adr/0016-registry-copy-and-contract-version.md)）。缺遷移說明的不相容變更不得合併。

讀者是下游工作區的 agent：它以 `agentdeck docs <n>-to-<n+1>` 讀取，再執行 `agentdeck update core --migrate`，依說明修改元件副本、自製元件與簡報。

## 契約涵蓋

頁面資料契約（`art`、`mount`、清理函式、`previewArt`）、`deck.<name>(key, …)` 呼叫慣例、`data-*` 標記模型、`edits.js` 格式、工作區路徑結構。相容的新增與修正不遞增。

## 格式

```markdown
# 契約 <n> → <n+1>

## 變更
一段話說明改了什麼、為什麼（連到 ADR）。

## 逐項改法
1. 適用對象（元件副本／自製元件／簡報 story.js／index.html／edits.js）：舊寫法 → 新寫法，附最小範例。
2. …

## 驗證
- 可搜尋的殘留特徵（例如舊 API 名稱）應為 0 筆。
- 逐份雙擊播放：主控台無錯誤、縮圖正常、edits.js 的修正仍套用。
```

## 歷史

| 版本 | 說明 |
| --- | --- |
| 0 | `tools\workspace.cmd` 建立的舊版工作區（無 `contract` 欄位）；轉換見 [0-to-1](0-to-1.md)。 |
| 1 | 初始契約（ADR 0016）。 |
