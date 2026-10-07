# AGENTDECK.md

用 AgentDeck 製作網頁簡報的規則：LLM 寫分鏡，人只做現場小修。一個主題就是一份 HTML PPT、一個可獨立搬移的資料夾（簡報單位）。不同主題各自 `init`，不共用資料夾外的框架或素材；只有明確屬於同一主體的候選版本、附件，以及明顯耦合的另一冊可共存。本檔位於單位內的 `agentdeck/AGENTDECK.md`；以下路徑都相對於單位根目錄（主入口 `index.html` 所在的資料夾）。上游 repo 內的框架直接放在根目錄，路徑去掉 `agentdeck/` 前綴。設計理由在上游 `docs/adr/`，文中以「ADR 編號」標示。

## 目的與取捨（ADR 0035）

降低製作與修改簡報的時間和成本，同時保留對專案的理解，以及最適合其內容的呈現與必要互動。先依專案目的、素材與證據決定要表達的關係及操作，再選元件；合用就重用，不合用就依下方規則修改下游副本或自製，不為套版或節省 token 犧牲必要內容、能力與驗收。元件用來減少重複實作，不限制表達，也不為客製而重寫合適的元件。

逐頁審查除了文字、版面與播放，也要確認專案需要的關係、證據與操作已被清楚表達。成本優化優先消除工具失敗、無理由重讀與重複實作，保留必要的理解、設計與驗收投入。

## 先對齊需求與資源（ADR 0036）

由正在與使用者對話的 agent 負責，不是 CLI 問卷。先在已授權範圍內初讀使用者提供的專案、文件、數據與參考素材，再判斷缺少什麼；不要求人重述檔案已有的資訊，也不為初讀而擴大資源範圍。

- **一次問必要問題**：只問會改變製作方向或可用資源、且尚未確定的事項；優先合併成一輪、至多三個主題：對象與目的／範圍與使用方式／資源與限制。已知或已授權的不重問，簡單且明確的改稿直接做。後續只有新發現的關鍵缺口才補問，不照固定清單逐題訪談。
- **附上可選答案**：每題給二到三個具體選項與簡短影響，根據已知素材標示建議，並允許自由回答或「照建議做」。無法從素材判斷的建議要標為暫定假設；預選不等於使用者已確認。需要回答的部分先等答覆，其餘已授權的閱讀與準備可繼續。
- **確認資源邊界**：缺少來源時請人提供路徑／連結。需要釐清時可提供「提供的資源與本機工具為主」「允許公開網路查證與補充」「另允許執行實驗或生成素材」等選項，依任務調整；記下適用的資料範圍、可用工具／服務、對外傳送限制與時間／費用上限。這些是討論選項，不是固定權限套餐；未涵蓋的付費、上傳、發布、修改來源專案或新增套件，不能視為一併獲准。來源素材仍依既有只讀規則處理。
- **授權自行決定就繼續**：人說「你決定／直接做」時，簡述採用的方向與假設，在既有資源授權內製作，不再要求逐項確認；不能據此擴張資料或服務授權。方向已明確後不另加企劃審批，除非人要求先看。
- **實作由 agent 決定**：依目的與素材從 catalog 選用相關指引，例如數據更新可讀 `agentdeck docs update-data`；不用人知道指引名稱，也不因「報給老闆」就固定套商業版型。依需求決定元件、客製與平行分工，在 `plan.md` 記下已知方向、假設、資源範圍及分工理由。

## 動工前

1. **找 CLI**：下游看 `agentdeck/agentdeck.json` 的 `cli` 欄位（例如 `npx -y github:Echoslayer/AgentDeck`）；上游內為 `node cli/agentdeck.mjs`。下文的 `agentdeck <指令>` 都以此執行。
2. **檢查契約版本**（ADR 0016）：執行 `agentdeck status`。
   - 一致：直接工作。
   - 工作區較舊：依序以 `agentdeck docs <n>-to-<n+1>` 讀遷移說明 → `agentdeck update core --migrate` → 依說明修改元件副本、`agentdeck/components/`、各簡報 → 逐份播放驗證。
   - 無法遷移（缺說明、說明與現況不符、工作區比 CLI 新）：停止，向人說明版本不符與需要的動作。
3. 只在要做的事需要時才讀上游文件；不要整份掃描元件、範例或指引（見「按需閱讀」）。

## 頁面與元件

- 一份主題簡報內用章節與頁面安排講解順序；一頁是一個講解情境，可以承載完整的互動實驗元件。不要因為使用翻頁形式，就把內容限制為靜態投影片或把每個操作狀態拆成一頁。
- 先安排講解順序，再找出需要操作才能理解的段落，最後查元件索引、讀選中元件的文件。例：實驗範圍 → 互動結果展示 → 結果解讀；此順序是例子，不是所有主題的固定頁型。
- 頁面框架負責導覽與進出頁面的生命週期；元件負責內部版面、控制項、資料運算與視覺連動。元件可占滿內容區，須容納文字換行與不同可用寬度。
- 主題的資料、講解文字與結論留在主題。

## 按需閱讀

文件分兩個閱讀時機，項目再多也只讀選中的：

1. **選表示方式**：`agentdeck catalog [關鍵字]` 輸出元件（基礎／特殊）、互動組合範例與寫作指引，每項一行；關鍵字會比對元件的關係、用途與人常用的說法（「地圖」「趨勢」「3D」）。上游內也可直接讀 `assets/deck/components/CATALOG.md`。
2. **實作選定項目**：`agentdeck docs <名稱>` 輸出該項目的 README、「實作前必讀」追加說明，元件另附引用方式與特殊元件規則。追加說明涵蓋資料語意、操作、限制與接入細節。不要只看索引或函式簽名就實作。

## 檔案所有權

| 路徑 | 擁有者 | 可否修改 |
| --- | --- | --- |
| `index.html`、`<group>/<name>/index.html`、`resources/<name>/story.js`、`story.css` 與素材 | LLM | 可，自由刪改（ADR 0004、0017） |
| `resources/<name>/plan.md` | LLM（企劃） | 可；動工前先填，人要求時才等確認（ADR 0014、0018） |
| `resources/<name>/edits.js` | 人（現場修正與註解） | **不可**；人明確指示時才吸收回 `story.js`（ADR 0002）。其中 `comments` 是人對各頁的註解，可讀取作為修改意見（ADR 0020） |
| `agentdeck/assets/deck/components/<name>/` | 下游：工作區的元件副本 | 下游可依主題需求修改；改過的檔案在 `diff` 顯示為「本地已改」。上游內**不可**，見 `AGENTS.md` |
| `agentdeck/components/<name>/` | 下游：工作區自製的共用元件 | 可（僅下游） |
| `agentdeck/assets/deck/` 的核心檔、`agentdeck/assets/story-reader/`、`agentdeck/templates/`、本檔、`agentdeck/LICENSE` | 框架核心副本 | **不可**；由 `update core` 整份覆蓋，要改行為回饋上游（ADR 0016）。`LICENSE` 是框架的 MIT 授權聲明，`pack` 會隨框架帶入，不得刪除 |
| `agentdeck/assets/theme/` | 品牌 | **不可**，除非人明確要求；品牌規則見 `agentdeck/assets/theme/README.md`（ADR 0010） |
| `agentdeck/vendor.json` | 套件清單 | 只經 `agentdeck add` 登記；其他套件只提議，經人同意才加入（ADR 0011） |
| `agentdeck/agentdeck.json` | CLI 記錄 | 不手改；由 `init`、`add`、`update core` 維護 |
| `agentdeck/vendor/`、`dist/` | 下載與打包產物 | 不手改；預設不 commit（`.gitignore`） |

## 建立或改版主題

1. 新主題：先以 `agentdeck init <位置>/<topic>` 建立獨立單位，再於該單位執行 `agentdeck new <topic>`（封面、一頁內容、結尾）。主入口是根 `index.html`；`resources/<topic>/` 保存 `story.js`、`story.css`、`edits.js`、`plan.md` 與素材（ADR 0017）。同一單位只能有一個主入口，已存在時 `new` 拒絕覆蓋；另一獨立主題須另行 `init`。新主題的 `edits.js` 保持 `window.storyEdits = {};`。名稱用英文小寫、數字與連字號。
2. 先填 `plan.md`（對象、目的、素材、逐頁分鏡與元件，並標明每頁放主線或附件），再寫程式；人要求先看企劃時才停下等確認。主線只留案例、結果與產物；讀懂結果以外的原理放附件，教學附件要接成邏輯鏈。實作後逐頁審查一次邏輯與文字，再交付（ADR 0018）。素材在其他位置時只讀不改，內容摘錄進 `story.js`，簡報不引用工作區以外的檔案。分鏡：每頁要表達什麼關係；欄位規則見下方「分鏡資料契約」，互動頁需提供 `previewArt` 與清理函式。寫作方式依人指定的指引；未指定時，講解機制、因果類的簡報預設參考 `agentdeck docs visual-story`，其他類型不必套用（ADR 0012）。工程可能性與 PoC 展示可參考 `agentdeck docs engineering-demo`。
3. 頁型固定用核心：`deck.cover({ title, meta })`、`deck.end()`。
4. 內容元件**按需查找**（ADR 0009、0013），元件分基礎與特殊兩級：
   - **建立或改版主題時**：讀 `agentdeck catalog` 完整索引（兩級都看），逐頁依「表達的關係」挑選；基礎元件能完整表達所需關係時優先用基礎。若理解依賴改變參數、追蹤中間狀態或比較即時結果，要選能支援該操作的元件，或在主題內自製。
   - **人提出特定需求時**（「放地圖」「做成 3D」「畫趨勢」）：`agentdeck catalog <關鍵字>`，包含特殊元件；找到就 `agentdeck docs <name>`，向人說明它能做到什麼、限制是什麼，再決定是否採用。
   - **有合適元件**：讀 `agentdeck docs <name>`，確認資料與使用條件符合後，下游以 `agentdeck add <name>` 取得副本（上游內已有）；依輸出在主題 `index.html` 加 css 與 js 兩行引用（用到套件時另加套件一行），呼叫 `deck.<name>(key, …)`；守住 README「必須保留」的約束。標記由元件自動加上。
   - **元件副本不完全合用**（僅下游）：可直接修改 `agentdeck/assets/deck/components/<name>/`，維持 `deck.define` 契約、`.deck-<name>` 前綴與「必須保留」；改了公開行為時同步改該元件的 README。改動只影響本工作區。
   - **用特殊元件**：另守 `docs` 輸出的「特殊元件規則」（引用 `agentdeck/vendor/` 套件、每頁最多一個 three.js 元件、現場不依賴觀眾親自拖曳；互動可由講者操作）。套件以 `agentdeck vendor` 下載；`pack` 也會自動下載。
   - **需要組合互動**：從索引的「互動組合範例」選定後，`agentdeck docs <範例> --code` 讀說明與程式，在主題 `story.js`／`story.css` 改寫並持有需要的資料。範例是實作參考，不是元件 API；不要以 script、stylesheet、圖片或其他方式引用範例或 `playground/`。
   - **都沒有合適的**：在主題 `story.js`／`story.css` 自製，class 加主題前綴，依下方「標記規範」手動加標記。不要硬套不合適的元件。
   - 同一種自製元件再次使用時：可整理為本單位的 `agentdeck/components/<name>/`（`<name>.js` 以 `deck.define` 註冊、`<name>.css` 用 `.deck-<name>` 前綴、附 README 的用途／API／必須保留／範例）。根入口以 `agentdeck/components/<name>/` 引用；另一獨立主題複製自己的副本，不引用其他單位；值得通用時向人提議回饋上游。
5. 每個獨立元件在 `art` 中做成**單一第一層元素**（畫布版面則為畫布內單一元素），出錯時才能在現場單獨隱藏（ADR 0003）。
6. 現場可能需要修改的文字（主題、姓名、日期、清單、卡片文字等）標為可編輯；封面／結尾的絕對定位元素可再開放拖曳。
7. 若主題的 `edits.js` 非空，改版時保留它引用到的元件 key，除非人要求吸收或捨棄。改版前先讀 `edits.js` 的 `comments`（人對各頁的註解），處理後回報每則怎麼處理；註解由人刪除，不自行清除。元件子項目 key 預設依序號產生，調整已被引用項目的順序時要給明確的 `key`。
8. 檢查：雙擊根 `index.html` 播放，主控台無錯誤；告訴人可按頁首「✎ 編輯」現場修改，右側「講稿」看講者動作與補充解釋（有口語稿時按 R 朗讀本頁、P 或頁首「⏵ 全部播放」逐頁播放，S 或 CC 開字幕）、「註解」留意見，「🎤 講者」開簡報者視窗；另存的 `edits.js` 放回對應 `resources/<name>/edits.js`。
9. 交付：於單位內執行 `agentdeck pack` 打包整個簡報單位；對方解壓後雙擊最上層 `index.html` 直接離線播放，入口不是跳轉頁。打包後也要驗證互動、附件、候選版本與素材連結。

## 臨時分享 PDF／PPTX

頁首「匯出」可直接下載整份靜態圖片版，不需要 `record`。先執行 `agentdeck vendor`（`pack` 亦會帶齊套件），以 HTTP／HTTPS 開啟簡報；本機可在簡報單位執行 `python3 -m http.server 8000`（Windows 的 `python3` 若是 Microsoft Store 轉址程式，執行後不會有反應，改用 `npx -y http-server -p 8000`），再開啟 `http://localhost:8000`。互動採用 `previewArt`／元件靜態後備，保留已套用的文字與隱藏修改，不含講稿、註解及即時互動狀態；PPTX 文字不可逐字編輯（ADR 0028）。

### 元件與嵌入內容的匯出規則

- 每頁整體轉成一張圖片，再放入 PDF／PPTX。PPTX 中可移動、縮放整張圖片，文字、圖表與元件無法分別編輯。
- 內建靜態元件保留靜態外觀；動態元件沿用縮圖呈現，例如 `surface` 使用熱度圖後備，`cube` 攤平成四個面。
- 內容區優先取該頁的 `previewArt`，未提供時取 `art`。有 `mount` 的頁面仍必須提供 `previewArt`；匯出不呼叫 `mount`，不執行 `record`，也不擷取讀者當下操作後的 DOM 或狀態。
- `iframe`、`object`、`embed`、`video`、`audio` 會從匯出副本移除，不會自動截取嵌入網頁或影片畫面。需要保留其重點時，在 `previewArt` 放已準備好的圖片或靜態摘要，圖片路徑依本檔「相對路徑」規則處理。
- `previewArt` 應能獨立閱讀，包含要分享的代表狀態與結論；分享前檢查匯出檔，確認動態內容的替代畫面完整。

## 進階內容（可選，另起一輪）

第一次製作只做到上面的步驟，每頁寫 `instruction` 與需要的 `explain`。以下兩項都要等內容經人播放確認、且人明確要求後，才在下一輪補上；即使人一開始就提到，也先完成內容。內容還在改時，句數、畫面與版面一變，這些就得重寫。

1. **語音與動作**：`speech`、`audio`、`cues`，以及帶 `at` 或標註的 `record`（格式見下方「進階欄位」；寫法建議 `agentdeck docs speech-actions`）。可用 `agentdeck speech build <narration.json> --page <id>` 製作或重建單頁音檔（macOS），再執行 `agentdeck check speech [入口資料夾]` 檢查音檔、時間點與動作；資料檢查不取代多語速實播。
2. **輸出 PPT**：先跑 `agentdeck export --check` 回報環境缺什麼，為需要示範的互動頁寫 `record`（見「進階欄位」），再以 `agentdeck export` 輸出 `dist/<名稱>.pptx`（ADR 0021）；匯出會列出內容區縮得過小的頁，依提示拆頁或降低高度，再逐頁檢查文字有無溢出。動作、標註與錄影怎麼轉進 PPT 仍是暫行做法：只有 `box`／`arrow`／`clear` 的頁改畫成 PPT 原生紅框與箭頭，按一下依序出現（ADR 0025）；含 `click`／`set`／`drag` 的頁照順序錄影、忽略 `at`，不帶朗讀時間。不要為了匯出而改寫播放用的步驟，也不要向人保證 PPT 會保留朗讀同步。

## 平行製作（環境支援 subagent 時）

企劃時評估是否有可獨立交付的重工作，例如多來源摘錄、複雜靜態圖解、自製互動頁或附件（ADR 0023、0036）。宿主支援且允許 subagent 時，適合平行的工作應分派，主 agent 同時處理其他不相依工作；只有簡單文字頁、工作高度相依或分工成本較高時自行完成，在 `plan.md` 簡記理由。頁數與是否互動不是唯一判準；不為湊數分工，也不預先宣稱必然加速。

subagent 繼承同一資料、工具與預算邊界；宿主內平行工作不代表可以把資料送到其他 CLI 或外部服務。若是否允許平行尚不清楚且影響製作，就在前述同一輪問題中一併確認；已有授權不重問。

1. **主 agent 先做完共用部分**：`status`、`init`／`new`、`plan.md`、所有 `add`、入口的元件引用、`story.js` 骨架（`resource()`、`title`、封面、結尾）與 `story.css` 的共用 token 和版面 class。這些檔案與 `agentdeck/` 內的一切只由主 agent 寫。
2. **分頁檔**：要分出去的頁寫成 `resources/<主題>/pages/<id>.js`，內容為 `story.pages.splice(-1, 0, { id: '<id>', … });`（插在結尾頁之前），樣式寫 `pages/<id>.css`，class 用 `<主題>-<id>-` 前綴。主 agent 在入口依頁序加引用：js 放 `story.js` 之後、`edits.js` 之前，css 放 `story.css` 之後。分頁檔用 `story.js` 的 `resource()` 取素材路徑，不自己讀 `document.currentScript`；css 的 `url()` 相對於 `pages/`。主 agent 自己寫的頁可以直接留在 `story.js`。
3. **交給 subagent 的資料**：`plan.md` 中該頁一列與前後頁標題、本檔「分鏡資料契約」與「標記規範」兩節（二次迭代寫 `speech`、`record` 時另附「進階欄位」）、選定的元件名稱（請它自己跑 `agentdeck docs <名稱>`）、`story.css` 可用的 class。寫入範圍只有自己的分頁檔與 `resources/<主題>/<id>-*` 素材；需要新元件、新套件或改共用檔時回報主 agent，不自己做。
4. **適合分出去的工作**：互動頁與自製頁；素材多時一個來源一份摘錄（附出處）；獨立的附件與候選版本（各自一個單位，整份交給一個 subagent）；交付前的邏輯審查（交給沒寫過這份的 subagent，只回報問題，由主 agent 修改）；二次迭代的 `explain`、`speech`、`record`（按頁分）。企劃與整合播放留在主 agent。
5. **整合**：全部回來後主 agent 播放、看主控台錯誤並修正，再執行 `agentdeck join <主題>`，依入口的引用順序把分頁檔併回 `story.js`、`story.css` 並移除 `pages/`；併回後再播放一次。交付與改版都以單一 `story.js` 為準。

## 簡報單位與相關內容

```text
<topic>/
  index.html                    主簡報入口（第一層只放入口、內容與打包產物）
  resources/<topic>/            story.js、story.css、edits.js、plan.md、素材
  candidates/<name>/index.html  明確屬於同一主體的候選版本（可選）
  attachments/<name>/index.html 同一主體的補充簡報（可選）
  resources/<name>/             候選版本或附件自己的內容與人工修正
  agentdeck/                    本單位的框架、品牌、元件、套件與記錄，平常不用打開
    AGENTDECK.md  agentdeck.json  vendor.json
    assets/  templates/  components/  vendor/
  dist/                         打包產物（不進 git）
```

第一層不放製作腳本、驗證工具或其他雜項；主題專屬的檢查腳本與資料放在 `resources/<name>/`。

只有明確相關的內容才用 `agentdeck new <name> --related <group>`；例如 `--related candidates` 或 `--related attachments`，群組可用其他有效名稱。它建立 `<group>/<name>/index.html` 與 `resources/<name>/`，不覆蓋主入口。候選探索可先建立相關內容，主入口稍後再定；不得用此選項把不同主題塞入同一單位。

| 要製作的內容 | 放置方式 |
| --- | --- |
| 另一份獨立 HTML PPT，即使討論同一技術 | 另行 `init`，各有根 `index.html` 與自己的資源 |
| 同一份簡報的幾個候選，供比較後挑選 | 同一單位的 `candidates/<name>/index.html` |
| 主簡報的實驗細節、補充結果等附件 | 同一單位的 `attachments/<name>/index.html`；從主簡報連入 |
| 可獨立閱讀、但與主簡報明顯耦合的另一冊（例：事實冊與問題冊） | 同一單位的 `<group>/<name>/index.html`，群組名表達關係（如 `issues`）；見下方「耦合的另一冊」 |

共存依據是刻意屬於同一份交付，而非題材相近。各候選與附件的 `<name>` 在單位內須唯一，因為內容都存於 `resources/<name>/`。

**耦合的另一冊**（ADR 0034）：題材相關的簡報預設各自 `init`。只有頁面互相引用、或要同步會變動的資料（例如問題清單與修正狀態），且刻意一起交付時，才放進同一單位；動工前在 `plan.md` 寫明耦合點。合併後：

- 耦合只經過一個共用資料檔，放在主入口的 `resources/<主題>/`，兩個入口都在 `story.js` 之前引用；共用檔以自己的 `document.currentScript.getAttribute('src')` 推算單位根目錄來產生連結。其餘內容各冊自己持有，不讀對方的 `story.js`。
- 跨入口連結用相對路徑加 `#頁面 id`，會開到指定頁；翻頁時網址跟著更新，瀏覽器的上一頁會回到點擊時的頁，不必另做返回機制。`story.back` 只回主入口。
- 主簡報要列出附件簡報或附帶檔案（PDF、資料檔）時，用 `story.attachments`，頁首會出現「📎 附件」清單；檔案放在 `resources/<主題>/` 內，不引用單位外的路徑。匯出圖片後連結失效，重要的附件仍要在頁面上以文字說明。
- 匯出成圖片後連結失效，連結文字要寫出目標冊與編號，例如「→ 問題冊 B4」。
- 改共用檔的欄位後，兩個入口都要播放驗證。

`pack` 預設帶入單位資源與相關入口，排除製作骨架、企劃與打包產物。`pack <入口資料夾>` 可只選某個相關入口作為交付首頁；一般交付仍用完整單位。

## 介面語言

閱讀器、編輯列、講稿與匯出的介面文字跟隨入口的 `<html lang>`：`zh` 開頭或未設定為中文，其餘為英文；朗讀語音也依同一屬性挑選。英文簡報把入口改成 `<html lang="en">`。元件內建的提示文字（例如 `stack3d` 的 `hint`）不隨之切換，英文簡報以參數傳入英文（ADR 0031）。

## 相對路徑

- 根 `index.html` 引用 `agentdeck/assets/`、`agentdeck/vendor/`、`agentdeck/components/` 與 `resources/<topic>/`；相關入口 `<group>/<name>/index.html` 引用 `../../agentdeck/assets/`、`../../resources/<name>/`。所有播放依賴必須位於本單位內。`agentdeck/templates/blank/index.html` 仍是可獨立預覽的 registry 範本，CLI 建立入口時換算引用。
- CSS 的 `url(...)` 相對於 CSS 檔案；`story.js` 產生的 HTML、`previewArt`、`mount` 更新及下載資料中的素材引用，應從載入該 script 的相對路徑取得資源前綴：

```js
const resourceDir = document.currentScript.getAttribute('src').replace(/[^/]*$/, '');
const resource = p => resourceDir + p;
// art: `<img src="${resource('img/sample.png')}" alt="樣本">`
```

- 在 `story.js` 頂層捕捉前綴，不能等事件回呼才讀 `currentScript`；使用 `getAttribute('src')` 保留相對路徑，不用會轉為絕對網址的 `.src`。
- `pack` 的主入口直接保留根 HTML；選相關入口時才換算它的本地 `src`／`href`。不靠 `<base>`，也不改寫任意 JS 字串。自製程式的導覽連結與資料內路徑須明確定義基準，並在原始入口及打包入口分別驗證。
- 選相關入口作交付首頁時，須另外檢查 `story.back` 等動態導航；它不會自動改成返回原主簡報，原主入口也不保證隨該選擇打包。

## 分鏡資料契約

`story.js` 定義全域 `story`，閱讀器載入時會檢查，不符合就直接報錯：

```js
const story = {
  title: '簡報名稱',                 // 瀏覽器標題
  label: '作者或單位 / 主題名稱',     // 頁首文字；省略時用 title，現場可編輯
  // 相關內容可返回主入口：back: { href: resource('../../index.html'), label: '返回主簡報' },
  // 可選：頁首「📎 附件」清單，note 省略時顯示副檔名：
  // attachments: [{ label: '實驗細節', href: resource('../../attachments/detail/index.html'), note: '附件簡報' }, { label: '原始資料', href: resource('data/results.csv') }],
  transition: 'slide',              // 可選：換頁轉場，見下方說明；省略為 slide
  pages: [{
    id: 'stable-id',                // 必填，整份唯一；重排時不要改，題目與互動狀態以它索引
    section: '01 / 章節',            // 以下四個欄位必須是字串（可為空字串）
    title: '頁面標題',
    lead: '引言',
    art: '<div class="topic-x" data-key="x">內容</div>',
    point: '重點',
    detail: '可選：前提、限制、來源',
    instruction: '講者動作：怎麼開口、指哪裡',  // 講稿不顯示在投影畫面，見下方說明
    speech: '可選，進階：要念出口的口語稿，內容確認後另一輪才寫',
    audio: '可選：口語稿音檔，resource(\'audio/<頁面 id>.mp3\')',
    cues: [0, 3.2, 7.8],            // 可選：音檔中每句口語稿的起始秒數
    explain: '可選：補充解釋，二次迭代才寫',
    transition: 'zoom',             // 可選：進入這一頁時改用的轉場
  }],
};
```

- `art` 不限內容：元件輸出、自製 HTML、SVG，或給 canvas／3D 用的容器。標記規則見下方「標記規範」。
- 文字欄位（`section`、`title`、`lead`、`point`、`detail`）同樣以 HTML 插入，不解析 Markdown：程式碼寫 `<code>`，字面的 `<`、`&` 要跳脫。
- HTML 字串只接受作者審查過的本地內容，不可塞入網址參數、讀者輸入或遠端文字。
- 縮圖以約 1000px 寬縮放同一份內容；超長頁面會被裁切，應拆頁。SVG 若用到 `id`，另提供沒有重複 id 的 `previewArt`。
- **講稿**：只顯示在右側「講稿」分頁與簡報者視窗，不出現在投影畫面（ADR 0020）。第一輪寫 `instruction`，二次迭代寫需要的 `explain`；`speech`、`audio`、`cues` 是進階欄位，格式見下方「進階欄位」，第一輪不讀也不寫。可用 `<b>`、`<br>`。封面與結尾以 `deck.cover({ …, instruction, speech, audio, cues, record, explain })`、`deck.end({ instruction, speech, audio, cues, record, explain })` 傳入。
  - `instruction`（講者動作）：實作時每頁都寫。用口語寫這頁怎麼開口、指哪裡、操作什麼、強調什麼、怎麼接到下一頁，不重複畫面上的文字；一頁約二到五句。
  - `explain`（補充解釋）：第一輪不寫，整份完成後的講稿二次迭代才寫，只寫需要的頁。內容是畫面簡化或省略了什麼（簡化模型、略過的前提、只是代表案例），以及聽眾可能追問的原因與答法，例如「為什麼模型會把這個數字判錯」。每個說法都要回到素材或實測資料查證；查不到的列進 `plan.md`「待確認」，不寫成定論。二次迭代可以和處理註解一起做。
- **換頁轉場（可選）**：`story.transition` 設整份的效果，頁面的 `transition` 只改「進入該頁」的效果（ADR 0033）。可用：`slide`（小幅滑動淡出，預設）、`fade`（淡入淡出）、`push`（整頁推移）、`zoom`（縮放）、`flip`（3D 翻牌）、`cover`（新頁覆蓋舊頁）、`wipe`（擦除顯現）、`rise`（上下推移）、`blur`（模糊）、`none`（不轉場）；其他值載入時報錯。依場合選一種用到底：正式報告用 `slide` 或 `fade`，故事、教學可用 `push`、`cover`；`flip`、`blur` 搶眼，少用。頁面層級只用在換章或揭曉等少數轉折，不要每頁不同。讀者可在「設定」關閉轉場，系統要求減少動態時也不轉場，所以內容不可依賴轉場傳達資訊。封面與結尾以 `deck.cover({ …, transition })`、`deck.end({ transition })` 傳入。
- **題目（可選）**：`question: { prompt, choices: [{ value, label, feedback }], hideFuturePreviews? }`。`value` 為唯一的英數、`_`、`-`；`hideFuturePreviews: true` 在作答前遮住後續縮圖（不阻止翻頁）。答案保留到重新整理。
- **互動（可選）**：`mount(root, state)` 在當頁渲染後呼叫，`root` 是主閱讀區，`state` 是此頁專用、保留到重新整理的物件；必須同步回傳清理函式或 `undefined`，換頁時先清理再移除舊內容。有 `mount` 的頁面必須提供靜態 `previewArt` 供縮圖與頁首「匯出」使用。切換狀態（換樣本、換方法）時 `.stage` 高度保持不變：以固定高度或預留最大內容的空間，避免現場版面跳動與錄影裁切錯位。
- **進階欄位（可選）**：`speech`、`audio`、`cues`、`record`，內容確認後另一輪才寫，格式見下方「進階欄位」。
- 外掛層（如編輯器）只透過 `window.storyReader` 與 `story:render` 事件取用閱讀器狀態（ADR 0008）。
- 載入順序固定：`reader.css` → `deck.css` → `theme.css` → 元件 css → `story.css` → `deck-core.js` → `theme.js` → 套件 js → 元件 js → `story.js` →（平行製作時的分頁檔，見「平行製作」）→ `edits.js` → `deck-editor.js` → `reader.js`。

## 標記規範（自製元件）

- `data-key="x"`：元件身分，每頁唯一。每個第一層元件（畫布版面為畫布內每個元件）都要加；`edits.js` 以此對應（ADR 0005）。
- 開關不帶值：`data-edit` 可編輯文字；`data-move` 可拖曳（僅絕對定位版面）；`data-hide` 開放子元件單獨隱藏（例如單張卡片），該子元件也要加 `data-key`；`data-canvas` 加在絕對定位的畫布根元素上，讓畫布內元件可逐一隱藏（ADR 0008）。
- key 取 `title` 等欄位名時，會同步改寫該頁欄位，例如封面標題 `<h2 data-key="title" data-edit data-move>`。
- 改版時不要更改既有 key；漏加 key 會退回位置 key，元件順序一變就會對錯。編輯模式下缺 key 或重複 key 的元件會顯示橘框。
- `mount` 內以 `root.querySelector('[data-key="x"]')` 取得元件。
- 計算或結果回放產生的值與解讀預設不加 `data-edit`。穩定的作者說明可編輯，放在互動更新不會替換的元素；`mount` 初次掛載與後續更新都不得以預設內容覆寫既有人工修正。
- 按案例變動的註記由主題以 `caseId` 保存；頁面 ID 加 `data-key` 只表示頁面內的元件身分，不代表案例範圍。需要保留註記時另設主題控制項，不借用同一個 `data-edit` 當不同案例的註記欄位。
- 元件的初始 HTML 與互動更新產生的 HTML 都要使用元件／主題前綴 class，不得借用閱讀器的 `.mini`、`.stage` 等外殼 class。須檢查掛載後及參數改變後的內容，不能只檢查初始字串。
- 互動頁驗收包含：修改固定說明後切換案例、換頁再返回，確認人工修正仍在且案例結果對應正確；有案例註記時確認不同案例不會互相覆蓋。

## 進階欄位（另一輪才讀）

以下欄位屬於「進階內容」：第一輪製作不讀也不寫，等人確認內容並明確要求後才用。寫法建議見 `agentdeck docs speech-actions`。

- **`speech`（口語稿）**：只寫講者實際說出口的話，照說的順序，不寫動作與括號提示（「指左邊」「停兩秒」留在 `instruction`）；數字、縮寫寫成念得順的樣子。右側「講稿」與簡報者視窗按口語稿旁的按鈕或 R 念本頁；P 或頁首「⏵ 全部播放」從目前這頁逐頁念完並自動翻頁（不執行互動；要畫面跟著動見下方「講者動作隨朗讀」），語速與音量可調；S 或 CC 按鈕開關朗讀時的半透明字幕，字幕比聲音早一點出現、最後一句念完多留一下（ADR 0022、0030）。
- **`audio`（口語稿音檔）**：人提供錄音或預先產生的語音時才填，檔案放 `resources/<name>/audio/`，以 `resource('audio/<頁面 id>.mp3')` 引用（mp3、m4a、wav、ogg 等瀏覽器能播的格式）。有音檔就播放音檔；沒有音檔或載入失敗時，以瀏覽器內建語音念 `speech`。有音檔時 `speech` 仍建議寫成音檔的逐字稿，供閱讀與匯出備忘稿。
- **`cues`（每句起始秒數）**：有音檔且要字幕或講者動作精準對齊時才填，一句一個秒數，句數與 `speech` 的斷句相同（句末 `。！？!?；;` 或 `<br>` 切開）。秒數由語音服務的時間資訊、Whisper 對齊或人工標記取得；沒有時依播放進度估算（ADR 0024）。
- **錄影步驟 `record`**：人要 PPT 或要畫面跟著朗讀時才寫。`record: [{ wait: 毫秒 }, { click: '選擇器' }, { set: '選擇器', value }, { drag: '選擇器', by: [dx, dy] }]`，給 `agentdeck export` 把這頁錄成影片放進 pptx（ADR 0021）。選擇器限定在 `#page` 內，優先用 `data-key`；`set` 用於 `<input>`、`<select>`，會觸發 `input` 與 `change`，拖曳滑桿就寫多個 `set` 漸進取值；`drag` 從元素中心按住移動 `by` 像素，用於旋轉 3D 等畫布。每步之間留 `wait` 讓結果看得清楚，全長約 5 到 10 秒，順序照 `instruction` 的操作。格式錯誤在載入時報錯；`agentdeck export --check` 會逐頁試跑，回報找不到的選擇器。沒有 `record` 的互動頁匯出為目前畫面的截圖。
- **講者動作隨朗讀**：口語稿定稿後，人要求無人播放、或要畫面跟著口語稿動時才寫。在 `record` 步驟加 `at: 第幾句`（1 起算），朗讀到那句時執行，其後沒有 `at` 的步驟屬於同一組，`wait` 依語速縮短；沒有任何 `at` 的 `record` 只用於匯出。另有標註步驟：`{ arrow: '選擇器', from: 'left'|'right'|'top'|'bottom', text }`、`{ box: '選擇器', text }`、`{ clear: true }`，紅色、不擋點擊，換頁或停止時移除。例：`record: [{ at: 2, box: '[data-key=a]', text: '先看這裡' }, { at: 3, clear: true }, { click: '[data-key=b] button' }, { wait: 800 }]`。動作照 `instruction` 的順序寫，標註要落在 `.stage` 內（匯出只錄這塊）；可重播的操作優先用 `set` 指定值，少用切換型的 `click`。標註依元素外框定位：指向窄的行內元素或帶 `data-key` 的小區塊，不指整段 `<p>` 等區塊元素（外框橫跨整欄，箭頭會落到畫面外）；`text` 畫在框的左上方，可能蓋住鄰近文字，相鄰的標註省略 `text` 或先 `clear` 再依序出現。下載、送出、開新頁等有副作用的操作不寫進有 `at` 的 `record`（每次朗讀都會執行），改用標註指出位置，由講者手動操作。同一份步驟匯出時依序執行、忽略 `at`（ADR 0024）。會自己播放的元件（`terminal`、`lottie`、`physics`、`mark`）翻頁就開始，要跟著句子動時設 `auto: false` 再以 `click` 觸發；`network` 以 `set` 聚焦節點，`sankey`／`treemap` 以 `[data-node="名稱"]` 指向，寫法見各元件 `agentdeck docs <名稱>` 的「隨朗讀」。

## 不做的事

- 不修改或清空 `edits.js`、不自行合併現場修正。
- 不修改核心副本（`agentdeck/assets/deck/` 核心檔、`agentdeck/assets/story-reader/`、`agentdeck/templates/`、本檔）與 `agentdeck/assets/theme/`；不手改 `agentdeck/agentdeck.json`。
- 不引入建置流程；必須維持雙擊 `index.html` 即可播放，播放時不讀取上游或網路。
- 不走 CDN、不把第三方套件本體 commit 進 git（除非 `init` 時選擇 commit `agentdeck/vendor/`）；套件只能經 `agentdeck/vendor.json` 引入，用到套件的元件要有靜態後備（ADR 0011）。
- 不在工作區以外另起一套簡報框架。
