# PPT 模板轉主題指引（建議）

適合必須沿用公司或客戶 .pptx／.potx 外觀的簡報：把模板的 logo 與背景轉成簡報單位的主題（`agentdeck/assets/theme/`）。這是寫作建議，主題的檔案分工與載入順序仍依 `AGENTDECK.md` 與 ADR 0010；轉換範圍見 ADR 0019。

## 先決定主題從哪裡來

| 情況 | 做法 |
| --- | --- |
| 已有轉好的主題資料夾 | `agentdeck init <位置> --theme <主題資料夾>`，不必再轉換 |
| 只有 PPT 模板 | 照下方步驟轉成主題資料夾，存在單位以外（例如團隊的主題 repo），再以 `--theme` 建立單位 |
| 單位已建立 | 以轉好的主題資料夾整份覆蓋 `agentdeck/assets/theme/` |

修改 `agentdeck/assets/theme/` 必須經人明確要求；替人轉換模板本身就是這個要求。原始模板是素材，只讀不改，在 `plan.md` 的「素材」與「4. 特殊需求 → 品牌或主題」記下路徑，不要複製進簡報單位。

## 預設只取 logo 與背景

大多數情況只要 logo 與背景，不必解析整份母片。色票、字型、母片版面等人提出需求再做（見下方「進一步需求」）。

.pptx／.potx 是 zip。複製一份到暫存資料夾再解開，例如 `tar -xf template.pptx -C <暫存資料夾>`（Windows 10 以上內建 `tar`），圖片都在 `ppt/media/`：

- **logo**：通常是有透明背景的小圖。頁首用白色或淺色版本，封面與結尾依底色選擇。
- **背景**：通常是最大的幾張圖，用作封面與結尾的底圖。

分不出哪張是哪張時，列出候選檔名與尺寸給人選，不要逐一翻母片 XML。

從上游預設主題 `assets/theme/` 複製一份作為起點，只換圖片與對應的引用：

- `img/`：放入 logo 與背景。`.emf`／`.wmf` 瀏覽器無法顯示，轉成 SVG 或 PNG，轉不了就請人提供原始檔。
- `theme.css`：頁首 logo、`.deck-cover`／`.deck-end` 的底圖改指向新圖。
- `theme.js`：封面與結尾的 logo，每個裝飾都要有 `data-key`。
- `README.md`：註明來自哪份模板與版本。

## 進一步需求

人要求配色、字型或版面也要一致時再處理：

| 需求 | 讀模板內的檔案 | 對應到主題 |
| --- | --- | --- |
| 配色 | `ppt/theme/theme1.xml` 的 `a:clrScheme`（`dk1`／`lt1`、`dk2`／`lt2`、`accent1`–`accent6`） | 四個 `--deck-*` token；主色多為 `dk2` 或 `accent1` |
| 字型 | 同檔的 `a:fontScheme`：`a:majorFont`（標題）、`a:minorFont`（內文），中文取 `a:ea` | `theme.css` 的 `font-family` |
| 封面版面 | `ppt/slideLayouts/` 中 `type="title"` 的版型；位置換算依 `ppt/presentation.xml` 的 `p:sldSz`（EMU，914400 = 1 英吋） | `.deck-cover` 標題位置 |
| 頁首、頁碼 | `ppt/slideMasters/slideMaster1.xml` | 頁首、頁碼樣式 |

顏色寫成 `a:schemeClr val="accent1"` 時回到 `clrScheme` 查色碼。

字型預設不用處理：`deck.css` 已用系統字型並有備用字型。品牌規定字型時：

- 播放端都已安裝（例如公司電腦）：`theme.css` 只寫 `body{font-family:"品牌字型", <deck.css 原本的備用字型>}`，不帶字型檔。
- 不確定播放端有沒有、或要寄給外部：把 `.woff2` 放進主題的 `fonts/`，`theme.css` 以 `@font-face{font-family:"品牌字型";src:url(fonts/x.woff2) format("woff2")}` 引用；`pack` 會隨主題資料夾帶入，離線可用。
- 先確認字型授權允許隨簡報散布，不允許就只寫 `font-family`。中文字型一個字重常有數 MB，只帶需要的字重，能做子集就做。不用 Google Fonts 等線上字型，離線開啟會載不到。

## 做不到的部分

AgentDeck 的內頁是閱讀器裡的網頁，不是 16:9 的投影片；只有封面與結尾是固定比例的畫布。模板的內容版型（兩欄、章節頁、圖文版）不會變成新頁型，需要時在 `story.css` 或既有元件中近似；動畫、轉場與 SmartArt 不轉換。

## 驗收

1. 在閱讀器內看封面、一般內頁與結尾：文字在底圖上清楚可讀，頁首 logo 沒有被裁切。
2. 現場編輯可以隱藏每個封面與結尾裝飾。
3. 以 `agentdeck pack` 打包後離線開啟，圖片與字型都載入得到。
