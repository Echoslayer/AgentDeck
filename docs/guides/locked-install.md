# 多本書共用一個 AgentDeck 版本

在放置各本簡報的父資料夾建立一個 npm 專案。一次安裝供所有書重建，每棵樹仍在自己的資料夾播放，也可以獨立 `pack`。

## 設定宿主

將 AgentDeck 加入 `dependencies`，指向 GitHub 上指定 release 對應的完整 commit。例：

```sh
npm install --save-exact --omit=optional --ignore-scripts https://codeload.github.com/Echoslayer/AgentDeck/tar.gz/4e3f5f8307893c002cc68e012e052a4cc74995df
```

在 `package.json` 的 `scripts` 加入 `"deck:build": "node node_modules/agentdeck/templates/host/build.mjs"`。若鎖定的舊版尚未附腳本（包含上例），從本版複製 `templates/host/build.mjs` 到宿主根目錄一次，改用 `"deck:build": "node build.mjs"`。提交 `package.json`、`package-lock.json` 及使用的宿主腳本，並將 `/node_modules/` 加入宿主的 `.gitignore`。

## 接入一本書

使用同一個已安裝的 CLI 建立簡報（`npm exec --offline -- agentdeck init <書名>`），或從一份完整、版本相符的既有簡報開始。以下指令在包含 `package.json` 的目錄執行，請將 `<書名>` 換成簡報的資料夾名稱。先查看檔案差異，再產生這本書的排除清單。

```sh
npm run deck:build -- <書名> --inspect
npm run deck:build -- <書名> --adopt
```

指令比對核心、預設主題與該書登記的上游元件，只將內容相同的檔案逐一列入 `<書名>/agentdeck/.gitignore` 的 AgentDeck 區塊。區塊外可保留專案自己的規則。書的入口、章節內容、素材、人工編輯、客製主題、自製元件，以及 `agentdeck.json` 和 `vendor.json` 都由宿主保存。新增上游元件後，再執行一次 `--adopt`。

## 查哪些檔案可清、哪些元件可用

在有 Git 的宿主執行 `npm run deck:build -- <書名> --inspect`。第一次接入前也能查。報告逐檔顯示是否符合鎖版、是否已由 Git 追蹤，以及下一個可執行的動作。查宿主支援的操作可直接執行 `npm run deck:build`。查已安裝版本提供的元件、範例與指引，用 `npm exec --offline -- agentdeck catalog [關鍵字]`；查單一元件的引用方式，用 `npm exec --offline -- agentdeck docs <名稱>`。

| 目的 | 先預覽 | 確認後 |
| --- | --- | --- |
| 讓已進 Git 的原廠副本退出版本控制，本機繼續播放 | `npm run deck:build -- <書名> --untrack` | 在同一條指令末尾加 `--apply`，核對 `git diff --cached`，與排除清單、鎖檔和來源同次提交 |
| 清出本機可還原的框架副本 | `npm run deck:build -- <書名> --clean` | 在同一條指令末尾加 `--apply`。下次播放前執行 `npm run deck:build -- <書名>` |

兩個動作都逐檔核對清單、鎖版內容與實際 Git 排除規則。已暫存的修改會保留，清除本機檔案也會保留已追蹤的檔案。`init` 產生的簡報另有 `vendor/` 與 `dist/` 排除規則；清理時保留已下載的第三方套件與交付包。較舊的宿主腳本若只支援重建，可用本版的 `templates/host/build.mjs` 更新宿主副本。

例如，原廠閱讀器 `agentdeck/assets/story-reader/reader.js` 如果已進 Git，執行 `--adopt` 後仍會受追蹤。確認它出現在 `--untrack` 預覽，才加上 `--apply`。此時 `git diff --cached` 會列出刪除，本機檔案仍在，簡報可繼續播放。若報告顯示「保留差異」，先比對書內副本與鎖版來源，確認是要保存的客製內容，還是需要處理的版本差異。

## 在另一台電腦重建

```sh
npm ci --omit=optional --ignore-scripts
npm run deck:build -- <書名>
```

第一次需要連線取得鎖定的框架與該書的第三方套件。完成後直接開啟書的 `index.html`。檔案齊全時可離線重跑；`npm ci` 只在新環境或鎖檔變更時需要。要分發給讀者，在宿主執行 `npm exec --offline -- agentdeck pack --dir <書名>`。

## 客製與升版

若要就地修改原廠檔，可直接修改後執行 `--adopt`。它會保留修改、從受管理區塊移除該行。用 `--inspect` 確認專案的其他規則也允許 Git 收錄這份來源，再提交。平時重建遇到已修改的受管理檔會停下。預設主題以外的品牌主題由書保存。

發行時為測過的 AgentDeck commit 打版本標籤。宿主升版時在獨立分支先以舊鎖檔重建，再更新 npm 依賴的完整 commit 與鎖檔。依既有 CLI 更新流程審查核心和各書使用的元件，核對預設主題差異，並重新執行 `--adopt`。新版移除的路徑需從該書的清單移除。測試全新 checkout 的重建、翻頁與打包，再提交鎖檔和各書設定。工作區的 `contract` 表示檔案格式相容性，release 版本則指向本次採用的框架內容。
