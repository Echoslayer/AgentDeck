# 0001. 以 LLM 為主要作者的網頁簡報

- 狀態：已接受（品牌外觀由 [0010](0010-theme-layer-and-downstream.md) 移到 `assets/theme/`；第三方套件與交付由 [0011](0011-vendor-manifest-and-packing.md) 補充）
- 日期：2026-09-30

## 背景

簡報的內容、排版、功能與元件，預計大部分交由 LLM agent 產出與改版，人只負責審閱與現場小修。

`.pptx` 是壓縮的 XML 套件，LLM 難以精準編輯，差異也無法直接閱讀；版面由絕對座標構成，改一處常牽動整頁。LLM 最擅長讀寫的是純文字的 HTML／CSS／JS。

## 決策

- 簡報以靜態網頁產出，不使用 `.pptx`。雙擊 `index.html` 即可播放，播放端不需要安裝、建置或網路（第三方套件在準備環境時下載、交付時打包，見 [0011](0011-vendor-manifest-and-packing.md)）。
- 每個主題是 `resources/<topic>/` 裡的一組純文字檔：`index.html`、`story.js`（分鏡資料）、`story.css`（主題樣式）、`edits.js`（人工現場修正，見 [0002](0002-content-layers.md)）。
- 共用外觀（標題列、logo、頁碼、封面與結尾）集中在 `assets/deck/deck.css`，品牌部分（色票、logo、底圖）集中在 `assets/theme/`，主題不重做外觀；換品牌只改 `assets/theme/`（[0010](0010-theme-layer-and-downstream.md)）。
- 所有結構都以「LLM 容易讀、容易改、差異容易看」為優先考量。

## 後果

- 好處：LLM 可以直接改檔案，git diff 看得懂，改版成本低。
- 代價：無法用 PowerPoint 開啟；若需要交付 `.pptx`，要另外轉換。播放需要現代瀏覽器（Edge／Chrome）。
- LLM 產出的元件可能到現場才發現問題，而現場無法改程式。因此需要人工修正層與隱藏機制，見 [0002](0002-content-layers.md)、[0003](0003-hide-as-live-fallback.md)。
