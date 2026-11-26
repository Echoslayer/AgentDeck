# 0042. 從書的目錄啟動全域指令，使用宿主鎖定的 AgentDeck

狀態：已接受

## 背景

MIT 9.35 與其他書共用 `presentations/package-lock.json`。目前製作者要切換到父目錄並輸入書名才能重建。每台電腦可以共用一個指令入口，每個宿主仍需要重現自己的框架版本（0041）。

## 決策

提供 `agentdeck build` 與 `agentdeck inspect`。製作者在書的目錄或分支下啟動。入口向上找含 `agentdeck/agentdeck.json` 的簡報單位，在其父目錄確認 npm 宿主及鎖檔，再由宿主安裝的 AgentDeck 執行既有重建或檢查腳本。重建成功後顯示該書的入口路徑。

首次重建在宿主缺少 `node_modules/` 時執行 `npm ci --omit=optional --ignore-scripts --no-audit --no-fund`。沿用安裝時，核對 npm v3 鎖檔中的 AgentDeck 完整 commit 封存網址、完整性值，以及安裝目錄中 npm 對這兩個值的紀錄。已存在但不符的安裝交由製作者在宿主重裝。檢查維持唯讀。既有 CLI 指令與 npm script 繼續可用。

## 實作前審閱

透過 `claude -p --model claude-opus-5-5` 審閱設計摘要。採納三項建議：明確定義鎖版比對、Windows 啟動 npm 時將路徑與命令分開、確認書的 `index.html` 存在才顯示入口。launcher 使用宿主套件內的固定腳本路徑；執行時保留子程序的結束碼。

## 結果與驗收

- 乾淨 checkout 的 MIT 9.35 能從書內重建。第二次沿用宿主安裝，Git 保持乾淨。
- 兩個宿主可由同一個入口執行各自鎖定的版本。Windows 含空白路徑可用，子程序失敗時呼叫端收到非零結束碼。
- 此次沿用 npm 鎖檔。讀者仍可直接開啟已重建的 HTML。
