# 0011. 第三方套件以清單管理，下載不進 git，交付時打包

- 狀態：已接受
- 日期：2026-09-30
- 修訂：[0001](0001-llm-authored-web-slides.md)（「不需要安裝、建置或網路」改為指播放端）

## 背景

候選元件（`playground/`）開始使用 three.js 這類第三方套件。原則上要維持雙擊 `index.html` 離線播放（[0001](0001-llm-authored-web-slides.md)），所以不能走 CDN；但把套件本體 commit 進 git 會讓 repo 膨脹、diff 無法閱讀，升版時也看不出改了什麼。

另一方面，簡報做完要把整包交給別人，對方不會有 git，也不會執行任何腳本，拿到就要能播。

## 決策

1. **清單進 git，本體不進 git**：根目錄 `vendor.json` 列出每個套件的版本、授權、檔案網址與 SHA-256。套件下載到 `vendor/<name>/`，`vendor/` 列在 `.gitignore`。
2. **準備環境時下載**：`tools\setup.cmd`（雙擊；即 `tools\vendor.ps1`）依清單下載並驗證雜湊。已就緒的檔案會略過；雜湊不符就拒絕放入。只用 Windows 內建的 PowerShell 5.1，不需要 Node 或其他工具，也不算建置流程。
3. **交付時打包**：`tools\pack.cmd <簡報資料夾>` 依簡報 `index.html` 的引用，把簡報資料夾、`assets/` 與用到的 `vendor/<name>/`（含授權檔）複製成一份獨立目錄，最上層放一個跳轉用的 `index.html`，壓成 `dist/<name>-<時間>.zip`。缺少的套件會先下載。正式簡報引用 `playground/` 時直接報錯。
4. **引用方式**：頁面以相對路徑直接引用 `vendor/<name>/<file>`（主題為 `../../vendor/…`）。只收**不需建置、能在 `file://` 下以 `<script>` 載入**的檔案（UMD／IIFE、css、字型、圖片）。
5. **缺套件時降級**：用到套件的元件必須有靜態後備，套件沒載入時顯示後備並在主控台提示執行 `tools\setup.cmd`，不可讓整頁失效（[0003](0003-hide-as-live-fallback.md)）。
6. **新增套件需經人同意**：`vendor.json` 屬框架層。LLM 可提議，但不自行加入；`sha256` 留空時腳本會印出實際雜湊，由人確認來源後填回。正式元件（`assets/deck/components/`）使用套件前，另需人同意升級。

## 後果

- repo 只多一個小清單；升版在 diff 中就是版本與雜湊的變更。
- clone 後第一次要執行 `tools\setup.cmd` 才有套件；沒執行時，用到套件的元件顯示靜態後備。
- 打包的 zip 自帶全部依賴，接收者不需要網路、git 或任何工具。
- 依賴 unpkg 等來源在下載當下可用；來源失效時要換網址，雜湊保證內容不被偷換。
- 下游 repo（[0010](0010-theme-layer-and-downstream.md)）繼承 `vendor.json`；下游自行新增套件時直接在清單加一項，合併上游時可能要手動處理該檔衝突。
