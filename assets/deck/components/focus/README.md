# focus

## 用途
一頁只講一句的結論或重點，大字置中。

## API
`deck.focus(key, html, { edit? })`
- 預設可編輯。互動頁由 `mount` 填內容時設 `{ edit: false }`，再以 `root.querySelector('[data-key="…"]')` 取得元素。

## 必須保留
- 一句話；需要多個重點時改用 `list`。

## 範例
```js
art: deck.focus('msg', '先找出瓶頸，再談自動化'),
```
