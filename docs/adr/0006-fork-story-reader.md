# 0006. 閱讀器從 D:\book fork，獨立演進

- 狀態：已接受
- 日期：2026-09-30

## 背景

`assets/story-reader/` 原本是從 `D:\book\docs\assets\story-reader\` 原樣複製，README 要求以上游為準重新複製。之後在 `reader.js`／`reader.css` 加上了放大播放按鈕（全螢幕加內容放大）。如果再從上游同步，這些修改會被覆蓋。

## 決策

- 本專案的閱讀器正式 fork，獨立演進，不再從 `D:\book` 整份覆蓋同步。
- 上游若有需要的修正，由人挑選後手動移植。
- 依 [0004](0004-component-template-strategy.md)，閱讀器屬於預設層，LLM 不得擅自修改。

## 後果

- 可以依本專案簡報播放的需求自由調整閱讀器。
- 上游的改進不會自動帶入。README 已改寫為 fork 說明。
