# physics（特殊：matter-js）

## 用途
2D 物理模擬：落下、彈跳、碰撞、擺錘、堆疊倒塌。講者按「重來」重播，觀眾或講者可拖曳物體丟出去。適合物理、工程直覺的教學，或用「骨牌倒下」比喻連鎖反應。要精確數值或公式推導時用 `trend`／`math`。

## API
`deck.physics(key, bodies, { gravity?, auto?, caption?, hint? })`
- 世界大小固定 100×60，左上為原點、y 向下。
- `bodies`：物體陣列，每個為
  - `shape`：`'ball'`（圓，`r` 半徑，預設 3）或 `'box'`（矩形，`size: [寬, 高]`，可加 `angle` 度數）。
  - `at: [x, y]`：中心位置。
  - `v: [vx, vy]`：初速度（靜態畫面以虛線箭頭表示）。
  - `fixed: true`：固定不動（地面、牆、斜坡）。
  - `pin: [x, y]`：用繩子掛在此點（擺錘）。
  - `bounce`：彈性 0–1，預設 0.4。
  - `color`：`primary`／`accent`／`highlight`／`muted`；固定物預設 `muted`，其餘預設 `primary`。
  - `label`：物體上方的短標籤。
- `gravity`：重力倍數，預設 1；0 為無重力（只看碰撞）。
- `auto`：預設 `true`，翻頁就開始，按鈕為「重來」。`false` 時只畫初始狀態，按鈕為「開始」。兩者按下都從初始狀態重跑（重播安全）。
- **隨朗讀**：`auto: false` 加上 `record: [{ at: 2, click: '[data-key=k] .deck-physics-bar button' }]`，講到那句才開始。
- `caption` 可現場修改；物體設定**不開放現場編輯**。
- 靜態後備為初始狀態（含初速度箭頭與繩子），縮圖與匯出使用。
- 需要套件 `matter`：在元件 js 之前引用 `vendor/matter/matter.min.js`。

## 必須保留
- 地面要自己放（一個 `fixed` 的 box）；世界左右與上方有隱形牆，下方沒有。
- 物體約 15 個以內；模擬會因初始條件細微差異而不同，不保證每次結果完全一樣，不能拿來當精確實驗。
- 「減少動態」設定下不自動播放，按「重來」才開始。
- 每頁一個。

## 範例
```js
art: deck.physics('bounce', [
  { shape: 'box', at: [50, 58], size: [100, 4], fixed: true },
  { shape: 'ball', at: [30, 10], bounce: 0.9, label: '橡膠球' },
  { shape: 'ball', at: [70, 10], bounce: 0.1, color: 'muted', label: '黏土球' },
], { caption: '同樣高度落下，彈性決定能彈回多高。' }),
```
