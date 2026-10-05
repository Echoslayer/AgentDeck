# 主題（theme）

品牌外觀全部集中在本資料夾。建立自己的品牌版本時只改這裡；下游工作區以 `agentdeck init` 取得一份後即歸下游所有，`update core` 不會覆蓋（ADR 0010、0016）。

| 檔案 | 內容 |
| --- | --- |
| `theme.css` | 覆寫色票 token（`--deck-primary`、`--deck-accent`、`--deck-highlight`、`--deck-gradient`）、字型、頁首 logo、頁碼、封面／結尾底圖與版面 |
| `theme.js` | `deck.theme({ cover, end })`：封面／結尾上的 logo 等裝飾 |
| `img/` | 圖片；預設為本專案自繪 SVG（CC0，見 `img/README.md`） |
| `README.md` | 本檔。下游品牌可在此寫品牌規則（色彩、用語、版權列），`AGENTDECK.md` 會要求 LLM 遵守 |

## 品牌規則

預設主題沒有額外規則。