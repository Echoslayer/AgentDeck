# 0032. 專案網站是上游 `site/` 內的簡報單位，以 GitHub Pages 發佈

- 狀態：已接受
- 日期：2026-10-05
- 修訂：[0017](0017-presentation-entry-layout.md) 決策 6（上游內可製作主題的位置）

## 背景

專案需要一個對外的網站。AgentDeck 的簡報本來就是靜態檔、全用相對路徑、不用 `<base>`，`pack` 的產物可直接放上 GitHub Pages；網站本身用 AgentDeck 製作，也是最直接的示範。網址要沿用 `echoslayer.github.io/AgentDeck/`，簡報就得放在本 repo。0017 決策 6 規定上游只能在被忽略的 `playground/` 製作主題，無法進 git。

## 決策

1. 上游的 `site/` 是一個以 `init site` 建立、進 git 的獨立簡報單位，結構與下游單位相同：根 `index.html` 為英文主入口，`lang/zh/index.html` 為繁體中文相關入口（`new zh --related lang`），兩者頁面 id 相同。
2. `init` 在上游內只接受 `playground/` 與 `site/`；其他上游位置仍不得製作主題。`site/` 遵守 `AGENTDECK.md` 的檔案所有權，`site/agentdeck/` 的框架副本不手改。
3. 語言切換以 `story.back` 連到另一語言的入口，並在 `story:render` 時附上目前頁面的 hash，切換後停在同一頁。介面語言依 [0031](0031-ui-language.md) 跟隨各入口的 `<html lang>`。
4. `.github/workflows/pages.yml` 在推送到 `main` 時執行 `update core --dir site`、`pack --dir site`，解壓後部署到 Pages。網站一律使用該 commit 的框架核心；`site/agentdeck/vendor/` 與 `site/dist/` 不進 git。
5. 兩個語言的內容要同步維護；企劃在 `site/resources/agentdeck/plan.md`。

## 後果

- 網站展示的是正式的下游流程（`init`／`new`／`add`／`pack`），框架改壞時網站部署也會失敗。
- 框架核心與元件在 git 中多一份副本。核心由 CI 的 `update core` 跟上，元件副本則要在上游修改元件後手動 `add <元件> --force` 更新。
- 若 `site/` 有人手改核心副本，CI 的 `update core` 會拒絕覆蓋並讓部署失敗，避免靜默蓋掉修改。
- 啟用前須在 GitHub 的 Settings → Pages 將 Source 設為 GitHub Actions。
