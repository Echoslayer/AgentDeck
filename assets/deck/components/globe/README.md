# globe（特殊：three.js）

## 用途
地點分布與地點之間的流向：全球據點、供應鏈、跨區協作。流向動畫有移動感，適合開場或總覽頁。

## API
`deck.globe(key, [{ label, lat, lon, note?, key?, highlight? }], { links?, hint? })`
- `lat` −90～90、`lon` −180～180。
- `links`：`[[from, to], …]`，元素為地點序號或地點 key；參照不存在會直接報錯。
- 每個地點 key 預設 `key-序號`，可單獨隱藏（標記與相關連線同步隱藏）；`label`、`note` 可現場編輯。
- 引用方式見 `CATALOG.md`「特殊元件」：需先引用 `vendor/three/three.min.js`。

## 必須保留
- 地球是抽象點雲，沒有國界與海岸線，**不能用來表達精確地理位置**；需要地圖精度時改用圖片（`figure`）。
- 開場時所有地點的重心會轉到正面；地點分散在兩個半球時，部分地點會在背面，清單仍需列出全部地點。
- 靜態後備（正射投影 SVG）不可移除。

## 範例
```js
art: deck.globe('sites', [
  { label: '新竹', lat: 24.8, lon: 121.0, highlight: true },
  { label: '亞利桑那', lat: 33.4, lon: -112.0 },
], { links: [[0, 1]] }),
```