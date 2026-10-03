# model（特殊：zdog）

## 用途
用方塊、圓柱、圓錐、球拼出扁平風格的 3D 示意圖，慢慢自轉、可拖曳旋轉：硬體構造、部署拓樸、簡單的立體結構。比 three.js 輕（約 30 KB），不需要 WebGL。分層架構用 `stack3d`；要曲面或大量資料點用 `surface`。

## API
`deck.model(key, parts, { caption?, hint? })`
- 座標：x 向右、y 向下、z 朝向觀眾；畫面約 400×300，原點在中央。
- `parts`：零件陣列，每個為
  - `shape`：`'box'`（`size: [寬, 高, 深]`）、`'cylinder'`／`'cone'`（`size: [直徑, 長度]`，預設直立，圓錐尖端朝上）、`'sphere'`（`size: [直徑]`）。
  - `at: [x, y, z]`：中心位置。
  - `rotate: [x, y, z]`：旋轉角度（度）。
  - `color`：`primary`／`accent`／`highlight`／`muted`，預設 `primary`；明暗面自動產生。
  - `label`：有標籤的零件列入右側圖例（可現場修改）。
- `caption` 可現場修改。
- 靜態畫面在產生時就用 zdog 畫成 SVG，縮圖與匯出使用。
- 需要套件 `zdog`：在元件 js 之前引用 `vendor/zdog/zdog.dist.min.js`。

## 必須保留
- 約 12 個零件以內；這是示意圖，不是 CAD。
- 標籤放在圖例，不畫在 3D 裡；每個有意義的零件都要有 `label` 或在 `point` 說明。
- 重疊的零件依中心深度排序，互相穿插時可能前後錯亂；零件之間留空隙。
- 「減少動態」設定下不自轉，仍可拖曳。

## 範例
```js
art: deck.model('rack', [
  { shape: 'box', at: [0, 40, 0], size: [220, 16, 140], color: 'muted' },
  { shape: 'box', at: [-55, -2, 0], size: [70, 68, 70], label: '應用伺服器' },
  { shape: 'cylinder', at: [55, 20, 0], size: [62, 18], color: 'accent', label: '資料庫' },
], { caption: '一台伺服器、一個資料庫。' }),
```
