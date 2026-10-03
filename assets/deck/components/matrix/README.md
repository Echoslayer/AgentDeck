# matrix

## 用途
兩個軸切出四個象限（優先度、影響力／可行性、SWOT 等 2×2 分析）。

## API
`deck.matrix(key, quads, { x?, y? })`
- `quads`：恰好 4 個 `{ title, text?, key?, highlight? }`，順序為左上、右上、左下、右下。
- `x`、`y`：軸名稱，代表往右、往上為「高」；縱軸直排、由上往下讀。
- 每個象限 key 預設為 `key-序號`，可單獨隱藏；標題、說明與軸名稱可在現場修改。

## 必須保留
- 右上象限代表兩軸皆高；象限順序與軸方向一致，不要為了排版對調。
- 每格只放一個標題與一句說明；要放多個項目時改用 `list` 傳入或拆頁。
- 一頁一個重點象限（`highlight`）。

## 範例
```js
art: deck.matrix('priority', [
  { title: '排程', text: '重要但不急' },
  { title: '立刻做', text: '重要且急迫', highlight: true },
  { title: '刪除', text: '不重要也不急' },
  { title: '委派', text: '急迫但不重要' },
], { x: '急迫性', y: '重要性' }),
```
