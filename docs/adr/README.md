# 架構決策紀錄（ADR）

格式：Nygard（背景／決策／後果）。新增時沿用下一個編號；推翻舊決策時新增一篇，並把舊篇狀態改為「已被 NNNN 取代」。

| 編號 | 標題 | 狀態 |
| --- | --- | --- |
| [0001](0001-llm-authored-web-slides.md) | 以 LLM 為主要作者的網頁簡報 | 已接受（0010 移出品牌外觀；0011 補充套件與交付） |
| [0002](0002-content-layers.md) | 內容分層：story.js（LLM）與 edits.js（人工） | 已接受（載入順序被 0007、0009、0010 補充） |
| [0003](0003-hide-as-live-fallback.md) | 現場隱藏作為元件錯誤的容錯手段 | 已接受（畫布判定被 0008 修訂） |
| [0004](0004-component-template-strategy.md) | 元件模板策略：基本模板供參考，新元件先留在主題內 | 已接受（範本路徑被 0012 修訂） |
| [0005](0005-data-key-attribute-model.md) | 統一以 data-key 作為元件的穩定識別 | 已接受（執行期警告被 0007 修訂） |
| [0006](0006-fork-story-reader.md) | 閱讀器 fork 自外部專案，獨立演進 | 已接受 |
| [0007](0007-builders-over-markup-rules.md) | 以產生函式固化標記規範，模板分三層 | 已接受（部分被 0009 取代） |
| [0008](0008-decouple-editor-reader.md) | 編輯層與閱讀器、元件解耦 | 已接受（storyReader 介面由 0021、0026 擴充） |
| [0009](0009-components-as-extensions.md) | 元件改為按需引用的擴充，範本縮為最小骨架 | 已接受（被 0012、0013 修訂） |
| [0010](0010-theme-layer-and-downstream.md) | 品牌抽成主題層，品牌版本以下游 repo 維護 | 已接受（部分被 0016 修訂） |
| [0011](0011-vendor-manifest-and-packing.md) | 第三方套件以清單管理，下載不進 git，交付時打包 | 已接受（0016 補充 CLI） |
| [0012](0012-template-vs-writing-guide.md) | 範本只留空白骨架，寫作方式改為建議指引 | 已接受 |
| [0013](0013-component-tiers.md) | 元件分為基礎與特殊兩級，候選元件升級 | 已接受 |
| [0014](0014-portable-usage.md) | 從其他專案使用：入口文件、企劃範本、工作區與 skill | 已接受（工作區被 0016 取代；企劃確認被 0018 修訂） |
| [0015](0015-interactive-examples.md) | 互動組合範例隨專案交付，與正式元件分開 | 已接受（交付方式被 0016 修訂） |
| [0016](0016-registry-copy-and-contract-version.md) | 其他專案改以「複製即擁有」取用框架，契約以版本號與遷移說明管理 | 已接受（簡報單位與入口結構被 0017 修訂） |
| [0017](0017-presentation-entry-layout.md) | 每個主題以獨立簡報單位保存，根入口直接播放，框架集中於 agentdeck/ | 已接受 |
| [0018](0018-plan-to-build-and-teaching-attachments.md) | 企劃到實作可一次完成；主線與教學附件分工 | 已接受 |
| [0019](0019-theme-templates.md) | 簡報以既有模板為主題：init 選主題，PPT 模板經指引轉成主題 | 已接受 |
| [0020](0020-instructions-and-comments.md) | 每頁的口頭說明與註解：作者寫進 story.js，人寫進 edits.js | 已接受 |
| [0021](0021-pptx-export.md) | 匯出 pptx：外框文字可編輯，內容區截圖，互動頁照腳本錄影 | 已接受（標註頁被 0025 修訂） |
| [0022](0022-speech-read-aloud.md) | 口語稿與朗讀：選填 speech 與 audio，有音檔播音檔，否則以瀏覽器內建語音念出，可全部播放、調語速、開字幕 | 已接受（0024 補充） |
| [0023](0023-parallel-pages-and-join.md) | 以分頁檔平行製作，完成後以 join 併回單一 story.js | 已接受 |
| [0024](0024-speech-synced-actions.md) | 講者動作隨朗讀執行：record 步驟加 at，新增 arrow、box、clear 與 cues | 已接受（決策 6 標註部分被 0025 取代） |
| [0025](0025-native-pptx-annotations.md) | 匯出 pptx：只有標註的 record 改為原生圖形與出現動畫 | 已接受 |
| [0026](0026-reader-personal-preferences.md) | 基本閱讀與個人偏好分層，朗讀與講者功能自行提供設定 | 已接受 |
| [0027](0027-record-semantics-not-shared.md) | record 步驟的播放與匯出各自實作，不抽共用 module | 已接受 |
| [0028](0028-browser-share-export.md) | 瀏覽器端以靜態圖片匯出 PDF 與 PPTX | 已接受 |

## 依主題閱讀

同一主題的 ADR 依序修訂彼此；現行規格以 `AGENTDECK.md` 為準，ADR 保留當時的理由。

| 主題 | ADR（依序） |
| --- | --- |
| 元件與範本 | 0004 → 0007 → 0009 → 0012 → 0013 |
| 下游取用與工作區 | 0010 → 0011 → 0014 → 0015 → 0016 → 0017 → 0019 |
| 頁面標記與編輯 | 0002 → 0003 → 0005 → 0008 → 0020 |
| 閱讀器介面 | 0006 → 0008 → 0026 → 0028 |
| 朗讀、講者動作與匯出 | 0021 → 0022 → 0024 → 0025 → 0027 → 0028 |
