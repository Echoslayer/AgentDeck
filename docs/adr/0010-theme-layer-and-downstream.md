# 0010. 品牌抽成主題層，品牌版本以下游 repo 維護

- 狀態：已接受（決策 4 下游取得與更新方式由 [0016](0016-registry-copy-and-contract-version.md) 修訂：以 `agentdeck init` 建立工作區，元件副本可修改）
- 日期：2026-09-30

## 背景

AgentDeck 是從公司簡報專案抽出的通用框架。原本品牌外觀散在 `deck.css` 上半部與 `deck-core.js` 的封面／結尾標記裡，品牌版本要改這兩個框架檔，之後合併框架更新必然衝突，兩邊只能各自手動維護。

## 決策

1. **主題層**：品牌外觀全部集中在 `assets/theme/`：
   - `theme.css`：覆寫 `--deck-*` 色票、字型、頁首 logo、頁碼、封面／結尾底圖與版面。載入於 `deck.css` 之後、元件 css 之前。
   - `theme.js`：呼叫 `deck.theme({ cover: img => html, end: img => html })` 提供封面／結尾的裝飾（logo 等）。載入於 `deck-core.js` 之後、元件 js 之前。`img` 是 `theme.js` 旁 `img/` 的網址。
   - `img/`：品牌圖片。
   - `README.md`：品牌規則，`AGENTS.md` 要求 LLM 閱讀。
2. **核心檢查主題裝飾**：每個第一層元素必須有 `data-key`，不可重複，也不可用頁型保留的 `title`、`cover-meta`；只能設定一次。裝飾是畫布內元件，現場可逐一隱藏（[0003](0003-hide-as-live-fallback.md)）。
3. `deck.css` 只留預設 token、外殼、頁型版面與編輯層，不含任何圖片；未載入主題時仍可正常播放。
4. **上下游**：AgentDeck 為上游，不含任何公司品牌。品牌版本（例如公司簡報）是下游 repo，以 `upstream` remote 追蹤 AgentDeck，只改 `assets/theme/` 與 `resources/`，框架更新以 `git merge upstream/main` 取得。
5. **回饋路徑**：下游主題內自製的元件先升級到下游的 `components/`；不含品牌、各處可用的元件與框架修正，回饋到上游。

## 後果

- 換品牌只動一個資料夾，框架更新可無衝突合併。
- 每個主題多引用 `theme.css`、`theme.js` 兩行（範本已內建）。
- 下游若修改了 `assets/deck/` 等框架檔，就得自行處理合併衝突；應改為回饋上游。
- 範本 `story.js` 的預設文字（如 `label`）屬於框架，下游在各主題內改寫即可，不改範本。