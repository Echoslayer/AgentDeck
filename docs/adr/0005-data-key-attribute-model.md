# 0005. 統一以 data-key 作為元件的穩定識別

- 狀態：已接受（執行期警告部分由 [0007](0007-builders-over-markup-rules.md) 修訂）
- 日期：2026-09-30

## 背景

`edits.js` 需要對應到元素。目前的做法：

- key 分散在 `data-edit="x"`、`data-move="x"` 的值裡。
- 沒有標記的元件隱藏時，以位置記錄（例如 `@0.3`）。

LLM 會經常改寫 `story.js`。只要元件順序一變，位置 key 就會指到別的元件：現場藏掉的壞元件，可能變成藏掉正常的元件。

## 決策

- `data-key="x"` 作為元件唯一身分，每頁唯一。
- `data-edit`、`data-move`、`data-hide` 改為純開關，不再帶值：
  ```html
  <h2 class="deck-cover-title" data-key="title" data-edit data-move>主題名稱</h2>
  ```
- LLM 必須為每個第一層元件（畫布版面則為畫布內每個元件）加 `data-key`。
- 位置 key 只作為漏加 key 時的後援。
- key 等於 `section`／`title`／`lead`／`point`／`detail` 時，照舊同步改寫該頁欄位。
- **不提供驗證腳本，也不在執行期警告**，靠 `AGENTS.md` 規範 LLM 遵守。

## 後果

- 元件順序變動不會影響 `edits.js`，LLM 也比較容易遵守並自我檢查。
- 已遷移：`deck-editor.js` 的解析邏輯、`templates/visual-story/story.js` 的標記。既有 `edits.js` 不需改動（key 的值不變）；舊式 `data-edit="x"`／`data-move="x"` 的值仍視為 key，可相容。
- 已接受的風險：LLM 漏加 key 時退回位置 key，錯誤不會被主動發現。
