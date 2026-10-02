# 0021. 匯出 pptx：外框文字可編輯，內容區截圖，互動頁照腳本錄影

- 狀態：已接受
- 日期：2026-10-02

## 背景

有些場合只收 PowerPoint：會議系統要上傳 pptx、對方要在簡報裡加自己的頁、或現場電腦不能開本機 HTML。AgentDeck 的頁面是 HTML，元件可以操作，直接轉成 PPT 圖形會走樣，互動也無法保留。曾在 playground 試作：以無頭瀏覽器播放簡報，逐頁組成 pptx，互動頁錄成影片。

## 決策

1. **CLI 新增 `agentdeck export [入口資料夾]`**，以無頭瀏覽器實際播放簡報後輸出 `dist/<名稱>.pptx`，因此 `edits.js` 的人工修改、主題與元件都照播放畫面輸出。
2. **每頁的輸出方式**：
   - 封面、結尾：整頁截圖。
   - 內容頁：頁首橫幅截圖；章節、標題、引言、重點用 PPT 原生文字框，可在 PowerPoint 修改；`art` 所在的 `.stage` 截圖。不把任意 HTML／CSS 重建成 PPT 圖形。
   - 有 `record` 的頁：照步驟操作並錄影，裁成 `.stage` 大小後轉 mp4（H.264），以截圖作影片封面。錄影中加入模擬游標與點擊光圈，讓觀眾看得出操作位置。
   - `instruction`、`explain` 寫進備忘稿；註解不帶出。
3. **頁面資料新增可選欄位 `record`**：`wait`、`click`、`set` 三種步驟，選擇器限定在 `#page` 內。由作者（LLM）依 `instruction` 的操作順序撰寫，可重播，改版後重跑即更新影片；不由 agent 即時操作瀏覽器錄影。
4. **依賴**：`playwright`、`pptxgenjs` 列為 CLI 的 `optionalDependencies`，只在 `export` 動態載入。瀏覽器優先用系統的 Chrome、Edge，沒有才用 Playwright 下載的 Chromium。ffmpeg 由使用者環境提供（`--ffmpeg`、`FFMPEG_PATH`、`PATH`），找不到時互動頁降級為截圖並在備忘稿註明，不中止匯出。`export --check` 只回報環境。
5. 相容新增，契約版本不遞增；`record` 不影響播放。

## 理由

- 截圖保證外觀與播放一致；外框文字可編輯，已涵蓋收件人最常改的部分。
- 寫成腳本的錄影可重現、可審查，也能進版本控制；即時操作每次結果不同，改一個字就得重錄。
- 互動的價值是現場操作；影片是讓沒有 HTML 的場合仍看得到過程，所以影片以 `.stage` 為範圍、不帶聲音、由講者點播。
- Playwright 與 pptxgenjs 都是純 npm 套件，不需要系統依賴；ffmpeg 不一定有，所以設計成可降級。列為選用依賴，不影響只用 `init`、`pack` 的人。

## 後果

- `npx github:` 執行 CLI 時會一併安裝兩個選用依賴（約十數 MB）；安裝失敗時其他指令照常可用，只有 `export` 提示缺套件。
- 網頁可捲動的高內容區在 PPT 中只能縮小，字可能過小；需要時拆頁。
- 頁首標籤在橫幅截圖內，不能在 PPT 修改；PPT 模板的母片不會沿用，只保留截圖中的 logo 與背景（[0019](0019-theme-templates.md)）。
- 影片不含即時互動；講者若要讓觀眾自己操作，仍需 HTML 版。
- pptxgenjs 依賴的 image-size 有解析 JXL、HEIF、ICNS 的 DoS 公告；匯出只餵自產的 PNG，暫不處理，上游修正後跟進。
- 講稿欄位見 [0020](0020-instructions-and-comments.md)。
