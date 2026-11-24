# 內容頁的焦點與視覺引導：框該框住什麼

日期：2026-11-24。實作基準：`d02faec`。狀態：研究完成，方向已與使用者對齊，尚未決定實作方式，未寫成 ADR。

## 問題

內容頁由上而下是章節、標題、引言（`lead`）、元件區（`.stage`）、重點（`point`）、補充（`detail`），原本只有 `.stage` 有框。使用者指出：框有集中視野的作用，但讀圖要用的文字落在框外，視線沒有被正確引導。

觀察頁面：Siguard 事實冊第 4 頁（`#commands`）。表格在框內，1001 那一列以橘色標示；重點「追單片晶圓有沒有判完，跟著 1001 這一列走」在框外、字級較小、排在框之後。視線停在表格裡，讀圖的那句話被切出了這一組。

## 已排除的做法：整頁一個框

曾試把框移到整頁（章節到補充都在框內，`.stage` 不加框），並更新到 site 與 Siguard 三個單位（未 commit）。使用者否決：大標題可以放框外，頁面上的補充也可以，要看內容本身。

排除理由：框是分組工具。整頁一起框，等於所有東西都同一組，框就不再分組，只是換了背景。

## 研究結論

以下來自搜尋摘要與二手整理，原文未逐篇讀完。

1. **框是最強的分組線索，不是聚焦工具。** Gestalt 共同區域：同一個邊界裡的元素被看成一組；包圍的效果能蓋過相似、鄰近與連線（Nature Methods）。因此框只用在真正同組的內容上，否則讀者會讀出不存在的關聯（NN/g、Laws of UX）。
2. **說明圖的文字要貼著圖。** Mayer 的空間鄰近原則：印出的文字放在對應圖形旁邊，學習效果較好；其整理中 9 個實驗有 9 個支持。教學資源把它直接套用到投影片。
3. **焦點靠圖內強調，不靠框。** Mayer 的提示原則、Knaflic 的「眼睛先被吸到哪裡」、Duarte 的 3 秒瞥視測試：顏色、大小、對比決定第一眼看哪裡；直接在圖上標註，不要讓讀者對圖例。
4. **大標題是入口，宜寫成主張。** Alley 的主張－證據模式：標題寫成一整句結論，下方放視覺證據，有研究支持理解與記憶較好；Farkas 批評其對照組設計，並質疑每頁都要有圖。Borkin 等人發現讀者常在看完圖中心內容後回頭看標題。標題在框外合理。
5. **框本身也可能是雜訊。** Tufte 一系與 Knaflic 認為圖表外框通常不必要，用留白隔開即可；Kosara 等人提醒不要矯枉過正。框可以保留，理由是分組，不是顯得重要。

## 套用到 AgentDeck

| 內容 | 依據 | 位置 |
| --- | --- | --- |
| 章節、大標題 | 入口；主張－證據 | 框外 |
| 元件（`art`） | 證據 | 框內 |
| 指向圖中某處的句子（常是 `point`，有時是 `lead`） | 空間鄰近、共同區域 | 框內，緊貼圖 |
| 這頁的焦點 | 提示原則、前注意屬性 | 圖內的強調與標註 |
| 來源、限制、延伸連結（`detail`） | 附註 | 框外，降低對比 |

判斷問題：**這句話會不會讓讀者回頭看圖？** 會就進框，不會就留在框外。這是「要看內容本身」的具體化。

## 試點

Siguard 事實冊第 4 頁先把讀圖的話標在列上，使用者仍覺得引導不足；問題在內容：標題問三個命令、五列等重、四處強調三處同色、`detail` 講另一件事。改成結論標題、只留三列、單一強調、刪去重複的 `lead` 後，第一眼從標題直接落到 1001。做法已補進 `docs/guides/visual-focus.md`「先修內容」。

## 未決

1. 「讀圖的話」怎麼進框：每頁標記哪些欄位進框，或由作者寫進 `art`。研究偏向前者，因為那句話要能貼近圖，最好能標在圖上。
2. 沒有讀圖的話的頁面，框要不要保留（第 5 點）。
3. 標題要不要改寫成主張句：與 `docs/guides/visual-story.md` 以問句為標題的寫法有關，未討論。
4. `.stage` 最小高度 300px：內容變短時框內上下留白，尚未決定是否調整。

## 來源

- [Penn State — Scientific Presentations (Alley)](https://writing.engr.psu.edu/research.html)
- [ASEE — Assertion-evidence slides and comprehension](https://peer.asee.org/assertion-evidence-slides-appear-to-lead-to-better-comprehension-and-recall-of-more-complex-concepts.pdf)
- [Farkas — Assessment of Alley's slide design](https://faculty.washington.edu/farkas/dfpubs/Farkas-Assessment%20Of%20Alleys%20Slide%20Design.pdf)
- [Mayer — Research-based principles (UNH)](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-research-based-principles-for-designing-multimedia-instruction-mayer.pdf)
- [Cambridge — Spatial contiguity principle](https://www.cambridge.org/core/books/multimedia-learning/spatial-contiguity-principle/0824E3ABE3556D77AADBE7714EFA7BCD)
- [Dartmouth — Mayer's 12 principles](https://services.dartmouth.edu/TDClient/1806/Portal/KB/PrintArticle?ID=171655)
- [Nature Methods — Gestalt principles](https://www.nature.com/nmeth/journal/v7/n11/full/nmeth1110-863.html)
- [Laws of UX — Common Region](https://lawsofux.com/law-of-common-region/index.md)
- [NN/g — Common Region](https://www.nngroup.com/videos/common-region-gestalt/)
- [Duarte — The Glance Test](https://www.duarte.com/resources/guides-tools/the-glance-test/)
- [Tableau — Where are your eyes drawn?](https://www.tableau.com/blog/where-are-your-eyes-drawn-45392)
- [Storytelling with Data — Annotate with text](https://www.storytellingwithdata.com/blog/2015/02/annotate-with-text)
- [data.europa.eu — Importance of visualisation titles](https://data.europa.eu/apps/data-visualisation-guide/the-importance-of-visualisation-titles)
- [NSF PAR — Visual annotation study](https://par.nsf.gov/servlets/purl/10515218)
- [Stephanie Evergreen — Marry Your Graph](https://stephanieevergreen.com/marry-your-graph)
- [NN/g — Clutter in charts](https://www.nngroup.com/articles/clutter-charts/)
