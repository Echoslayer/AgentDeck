# code

## 用途
程式碼片段：標出要講的那幾行、比較兩個版本改了什麼，或呈現終端機指令與輸出（技術簡報、教學、code review）。

## API
`deck.code(key, source, { lang?, lines?, diff?, prompt?, caption? })`
- `source`：程式碼字串，首尾空行自動去除；HTML 字元自動轉義。
- `lang`：highlight.js 的語言名稱（`js`、`python`、`cpp`、`sql`…）；省略或不認得時不上色。
- 三種模式擇一：
  - `lines`：要強調的行號（1 起算）；其他行淡化。
  - `diff`：舊版原始碼；逐行比對，刪除行（−、刪除線）在前、新增行（+）在後，未變的行照常顯示。
  - `prompt`：提示字串（如 `'$ '`、`'PS> '`）；以它開頭的行是指令（粗體），其餘是輸出（淡色），不上色。
- `caption`：說明，可在現場修改。程式碼本身**不開放現場編輯**，要改請改 `story.js`。
- 上色需要 `vendor/highlight/highlight.min.js`（vendor.json 的 `highlight`），且須在本元件 js **之前**引用：程式碼在產生時就上色，縮圖與匯出也有顏色。未載入時為純文字，強調、差異與終端機樣式照常顯示。

## 必須保留
- 約 15 行以內；只留要講的部分，其餘以 `// …` 省略。
- 用 `lines` 或 `diff` 指出重點，並在 `caption` 或 `point` 說明那幾行在做什麼。
- `diff` 是逐行比對：只改空白或縮排也算整行修改；比較前先統一縮排。
- 色彩來自色票 token，不另引用 highlight.js 的佈景主題 css。

## 範例
```js
art: deck.code('g03', `
std::unordered_set<std::string> seen;
for (const auto& row : rows) {
  if (!seen.insert(row.id).second) return reject(row);
}`, { lang: 'cpp', caption: 'G02 → G03：查重改成集合。', diff: `
for (size_t i = 0; i < rows.size(); ++i) {
  for (size_t j = 0; j < i; ++j)
    if (rows[j].id == rows[i].id) return reject(rows[i]);
}` }),
```
