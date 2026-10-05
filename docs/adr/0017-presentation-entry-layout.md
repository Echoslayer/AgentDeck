# 0017. 每個主題以獨立簡報單位保存，根入口直接播放，框架集中於 agentdeck/

- 狀態：已接受
- 日期：2026-10-02
- 修訂：[0016](0016-registry-copy-and-contract-version.md) 決策 2 的多主題工作區結構
- 被修訂：決策 6 由 [0032](0032-pages-site-unit.md) 加入上游 `site/`

## 背景

契約 1 將多個主題放在同一工作區的 `resources/`，共同依賴外層框架；交付根 `index.html` 只是跳轉頁。使用者要的單位是一個主題、一份 HTML PPT、一個可獨立搬移的資料夾。單純上移各入口仍會讓不同主題共用外層依賴，沒有解決交付與持有範圍。框架檔若與入口並列在第一層（`assets/`、`templates/`、`AGENTDECK.md`、`agentdeck.json`、`vendor.json`…），打開資料夾時 `index.html` 被淹沒，人找不到要點開的檔案。

## 決策

1. 契約升為 2。每個主題各自 `init <位置>/<topic>`，框架、品牌、元件、資料與素材都位於該簡報單位內。`new <topic>` 只用於下游，建立唯一根 `index.html` 與 `resources/<topic>/`；已有主入口時拒絕覆蓋。不同主題須另行 `init`。
2. 單位第一層只放人會直接打開或編輯的東西：入口 `index.html`、相關群組、`resources/`、`dist/`（與 `.gitignore`）。框架核心、品牌、元件副本、自製元件、套件、`AGENTDECK.md`、`agentdeck.json`、`vendor.json`、`templates/` 一律集中在 `agentdeck/`，下游路徑即上游 registry 路徑加上 `agentdeck/` 前綴。CLI 以 `agentdeck/agentdeck.json` 辨識工作區；根目錄的 `agentdeck.json` 視為契約 1 以前的佈局，須依遷移說明重建。資料夾名稱不以 `.`、`_` 開頭，避免靜態網站託管（如 GitHub Pages 的 Jekyll）略過。
3. 只有明確屬於同一主體的候選版本或附件可用 `new <name> --related <group>`，建立 `<group>/<name>/index.html` 與 `resources/<name>/`。群組是有效單層名稱，排除框架保留位置；`candidates`、`attachments` 是例子。探索可先建立候選，主入口稍後再定。
4. 根入口以 `agentdeck/assets/`、`resources/<topic>/` 引用；相關入口以 `../../agentdeck/assets/`、`../../resources/<name>/` 引用。主題 script 頂層從 `document.currentScript.getAttribute('src')` 捕捉相對資源前綴，供初始 HTML、縮圖與互動更新使用；CSS URL 仍相對於 CSS。所有播放依賴均在本單位內，不猜測或重寫任意 JS URL 字串。
5. `pack` 預設交付完整單位：根實際播放頁、單位資源、相關群組入口、`agentdeck/` 內的框架、自製元件與各入口引用套件；排除製作骨架、企劃、記錄與打包產物。不用跳轉或 `<base>`。`pack <入口資料夾>` 可選相關內容作交付首頁，一般交付用完整單位。
6. `templates/blank/` 保留可獨立預覽的 registry 骨架；`new` 生成入口引用。上游簡報試驗以 `init playground/<topic>` 建立被忽略的獨立單位，上游根與其他上游位置不得製作主題。
7. 既有多主題工作區依 [1-to-2](../migrations/1-to-2.md) 拆分；人工 `edits.js` 原始位元組、客製品牌與元件必須保留。`story`／元件 API 與人工修正格式不變。

## 後果

- 每份簡報可獨立搬移、版本控制與交付；修改某份簡報的品牌或元件不影響其他主題。
- 打開單位資料夾第一眼就是 `index.html`；框架檔不與入口混在一起，交付的 zip 第一層也只有入口、`resources/` 與 `agentdeck/`。
- 同一主體的候選與附件仍可共存；框架副本會重複，換得沒有跨單位的播放依賴。
- 舊工作區需拆分，驗證素材路徑、縮圖、互動、下載與人工修正。播放仍不需要工具、網路或上游。
