# 簡報企劃：agentdeck（GitHub Pages 專案網站，英文主入口）

> 中文版在 `lang/zh/`（`resources/zh/`），頁面 id 與本份相同，內容逐頁對譯；改一邊時同步另一邊。單位放在上游 `site/` 的理由見 ADR 0032。

## 1. 對象與目的

| 項目 | 內容 |
| --- | --- |
| 聽眾 | 從 GitHub 或連結來到專案網站的開發者；知道 LLM agent，不認識 AgentDeck |
| 目的 | 看懂 AgentDeck 解決什麼、怎麼運作，並在自己的專案試用 |
| 一句話主旨 | LLM 寫分鏡、人在現場微調，交付的是一個能離線播放的資料夾 |
| 時間與頁數 | 自行閱讀約 3 分鐘，10 頁 |
| 場合 | 會後自行閱讀（網站）；也可現場投影 |
| 寫作指引 | 無 |

## 2. 素材

| 來源 | 路徑或連結 | 要取用什麼 |
| --- | --- | --- |
| 上游 README | `../README.md` | 流程、分層、元件數量、交付方式 |
| 元件目錄 | `agentdeck catalog` | 元件 37 個（基礎 16、特殊 21）、互動範例 6 個 |

## 3. 分鏡

| # | 放置 | id | 標題 | 要表達的關係 | 留下的缺口 | 內容重點 | 元件 | 備註 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 主線 | cover | AgentDeck | — | | 一句話主旨、GitHub | `deck.cover` | |
| 1 | 主線 | why | Slides an AI can actually write | 現行 → 提案 | | 二進位檔 vs 純文字 | compare | |
| 2 | 主線 | workflow | From idea to delivered deck | 先後順序 | | init → plan → story → 播放修改 → pack | steps | |
| 3 | 主線 | layers | Each layer has one owner | 上層依賴下層 | | edits / story / 元件 / 核心 / 主題 | stack3d | 本站唯一 three.js 頁 |
| 4 | 主線 | contract | A deck is one plain object | 程式碼重點行 | | id 與元件呼叫 | code | |
| 5 | 主線 | live-edit | Fix it while you present | 四個並列操作 | | 改字、移動、隱藏、註解 | cards | 邀請讀者實際按編輯 |
| 6 | 主線 | included | Batteries included | 關鍵數字 | | 37 元件、6 範例、0 建置 | metrics | |
| 7 | 主線 | delivery | What does your audience receive? | 先猜再揭曉 | | pack 產出離線 zip | 內建 question | |
| 8 | 主線 | start | Try it in your own project | 指令 | | init、new、交給 agent | code（prompt） | |
| n | 主線 | thanks | Thank You | — | | | `deck.end` | |

## 4. 特殊需求

- 特殊元件：stack3d（three.js）展示分層；code（highlight.js）上色。缺套件時為靜態後備。
- 語言切換用 `story.back` 連到另一語言入口，並在 `story:render` 時附上目前頁面的 hash。
- 朗讀與動作（第二輪）：`story.js` 末端的 `narration` 依頁面 id 補上 `speech` 與帶 `at` 的 `record`，用瀏覽器內建語音、不做音檔。英文句子以 `<br>` 分句（英文句號不算句末）。改口語稿時重數句子並同步 `at`，兩個語言一起改，再跑 `check speech` 與 `check speech lang/zh`。

## 5. 交付

- GitHub Actions 在上游 `.github/workflows/pages.yml` 執行 `pack` 後部署；網站可連網，套件由 `pack` 帶入。

## 6. 待確認

- [ ] 元件與範例數量變動時更新 included 頁
