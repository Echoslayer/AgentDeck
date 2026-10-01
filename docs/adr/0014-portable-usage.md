# 0014. 從其他專案使用 AgentDeck：入口文件、企劃範本、工作區與 skill

- 狀態：已接受
- 日期：2026-10-01

## 背景

簡報常在其他專案的脈絡下產生：素材在別的 repo，或簡報本身要跟著那個 repo 版本控制，或使用者在別的專案裡直接叫 agent 做簡報。原本只有「在 AgentDeck 的 `resources/` 裡做」一條路，也沒有一份說明完整流程的入口；LLM 常在沒有確認方向前就直接寫 `story.js`。

## 決策

1. **入口文件** `docs/getting-started.md`：列出三種情境（A 素材在別處、B 簡報放在別的專案、C 在別的專案叫 agent）與共同流程。README 與 `AGENTS.md` 都從這裡導入。
2. **企劃範本** `templates/blank/plan.md`：隨骨架複製，LLM 先填對象、目的、素材、逐頁分鏡與元件，人確認後才動工。`tools/pack.ps1` 不打包 `plan.md`。
3. **工作區**（情境 B）`tools/workspace.cmd <路徑>`：把框架複製到目標資料夾，維持 `resources/<topic>/` 兩層深度與 `../../assets` 路徑，寫入 `agentdeck.json`（來源路徑、commit、時間）。不帶 `vendor/`、`dist/`、`playground/` 與本專案的簡報；`-Update` 整份換新框架，保留工作區的 `assets/theme/`、`resources/` 與自行新增的 `docs/` 檔案。工作區即為一份獨立可運作的 AgentDeck，打包、下載套件都在工作區內完成。
4. **可攜 skill**（情境 C）原始檔在 `skills/agentdeck/`，`tools/install-skill.cmd` 安裝到 `~/.copilot/skills/` 與 `~/.claude/skills/`，安裝時寫入本機 AgentDeck 路徑。skill 只負責找到框架、決定工作位置並導向 `AGENTS.md`，不重複規則。

## 理由

- 複製而非 submodule 或連結：雙擊即可播放、打包只看工作區內檔案，與 [0011](0011-vendor-manifest-and-packing.md) 一致；`agentdeck.json` 讓更新可追溯。
- skill 不複製規則，規則仍以 `AGENTS.md` 為唯一來源，避免兩份文件漂移。
- 企劃先行讓人在成本最低時修正方向；不打包是因為它是製作文件而非交付內容。

## 後果

- 工作區的框架是快照，需手動 `-Update`；工作區若改了框架檔，更新時會被覆蓋（框架本來就不該在下游修改，見 [0010](0010-theme-layer-and-downstream.md)）。
- AgentDeck 搬家後需重新執行 `install-skill`。