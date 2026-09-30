# 架構決策紀錄（ADR）

格式：Nygard（背景／決策／後果）。新增時沿用下一個編號；推翻舊決策時新增一篇，並把舊篇狀態改為「已被 NNNN 取代」。

| 編號 | 標題 | 狀態 |
| --- | --- | --- |
| [0001](0001-llm-authored-web-slides.md) | 以 LLM 為主要作者的網頁簡報 | 已接受 |
| [0002](0002-content-layers.md) | 內容分層：story.js（LLM）與 edits.js（人工） | 已接受 |
| [0003](0003-hide-as-live-fallback.md) | 現場隱藏作為元件錯誤的容錯手段 | 已接受 |
| [0004](0004-component-template-strategy.md) | 元件模板策略：基本模板供參考，新元件先留在主題內 | 已接受 |
| [0005](0005-data-key-attribute-model.md) | 統一以 data-key 作為元件的穩定識別 | 已接受 |
| [0006](0006-fork-story-reader.md) | 閱讀器從 D:\book fork，獨立演進 | 已接受 |
| [0007](0007-builders-over-markup-rules.md) | 以產生函式固化標記規範，模板分三層 | 已接受（部分被 0009 取代） |
| [0008](0008-decouple-editor-reader.md) | 編輯層與閱讀器、元件解耦 | 已接受 |
| [0009](0009-components-as-extensions.md) | 元件改為按需引用的擴充，範本縮為最小骨架 | 已接受 |
