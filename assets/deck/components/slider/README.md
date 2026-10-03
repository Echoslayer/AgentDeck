# slider

## 用途
同一畫面的前後對照（改善前後、良品與瑕疵、兩個版本）：兩張圖疊在一起，拖曳分隔線切換，比左右並排更容易看出同一位置的差異。

## API
`deck.slider(key, before, after, { at?, hint? })`
- `before`、`after`：`{ src, label?, alt? }`。兩張圖須同尺寸、同取景，否則疊起來沒有意義。
- `at`：分隔線起始位置（0–100，預設 50）。`hint` 為操作提示，傳空字串可省略。
- 分隔線是原生 range 控制項：滑鼠、觸控、鍵盤方向鍵都能操作。
- 靜態後備為左右並排：縮圖、編輯模式、動態未啟動時顯示。標籤（`<key>-before`、`<key>-after`）可在現場修改。

## 必須保留
- 圖片放在 `resources/<topic>/`；兩張圖的差異要能用一句話說出（寫在 `point` 或 `label`）。
- 現場可講解：講者拖曳示範，或把 `at` 設在差異最明顯的位置。
- 匯出 pptx 是靜止畫面（分隔線停在 `at`）。

## 範例
```js
art: deck.slider('surface', 
  { src: 'resources/demo/before.jpg', label: '改善前' },
  { src: 'resources/demo/after.jpg', label: '改善後' },
  { at: 40 }),
```
