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
   - 有 `record` 的頁：照步驟操作並錄影，裁成 `.stage` 大小後轉 mp4（H.264），以截圖作影片封面。錄影中加入模擬游標與點擊光圈，讓觀眾看得出操作位置。只有標註（`box`、`arrow`、`clear`）的 `record` 不錄影，改為原生圖形與出現動畫，見 [0025](0025-native-pptx-annotations.md)。
   - `instruction`、`explain` 寫進備忘稿；註解不帶出。
3. **頁面資料新增可選欄位 `record`**：`wait`、`click`、`set`、`drag` 四種步驟，選擇器限定在 `#page` 內。由作者（LLM）依 `instruction` 的操作順序撰寫，可重播，改版後重跑即更新影片；不由 agent 即時操作瀏覽器錄影。格式錯誤由 `deck-editor.js` 在載入時報錯；`export --check` 在簡報內執行時逐頁試跑步驟，回報找不到的選擇器。
   - 錄影期間 `.stage` 只增不縮，避免切換狀態後裁切框露出下方內容；作者也應讓互動切換時 `.stage` 高度不變。
   - 內容區縮到瀏覽器字級的 80% 以下時，匯出報告提示拆頁。
4. **閱讀器配合**：`window.storyReader` 新增 `go(i)` 直接跳頁（[0008](0008-decouple-editor-reader.md)），匯出不再模擬方向鍵；`reader.css` 的按鈕 hover 改為 `:where(button):hover`，不再蓋過主題或元件以類別設定的按鈕底色（原本自訂底色的白字按鈕在 hover 時看不見）。
5. **依賴**：`playwright`、`pptxgenjs` 列為 CLI 的 `optionalDependencies`，只在 `export` 動態載入。瀏覽器優先用系統的 Chrome、Edge，沒有才用 Playwright 下載的 Chromium。ffmpeg 由使用者環境提供（`--ffmpeg`、`FFMPEG_PATH`、`PATH`），找不到時互動頁降級為截圖並在備忘稿註明，不中止匯出。`export --check` 不輸出檔案，只回報環境（在簡報內另試跑 `record`）。
6. 相容新增，契約版本不遞增；`record` 不影響播放。

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
