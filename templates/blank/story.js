// AgentDeck 空白骨架：封面 → 內容頁 → 結尾。只示範資料契約與標記，不代表任何寫作風格。
// 替換本檔的分鏡建立新主題；不要為了新主題修改 assets/。欄位規則見 README「分鏡資料契約」，
//   寫作方式可參考 docs/guides/（例如 visual-story.md），非強制。
// 內容頁的 art 先查 assets/deck/components/CATALOG.md：有合適元件就在 index.html 引用並呼叫 deck.<name>(key, …)；
//   沒有就像下方 note 一樣在本檔寫 HTML、在 story.css 寫樣式（類別加主題前綴）。
// 自製元件的標記：每個第一層元件加 data-key="x"（每頁唯一），再依需要加開關 data-edit／data-move／data-hide。
// 未標記的元件與互動一律鎖定。人工修改存於 edits.js，不會改動本檔。
const story = {
  title: 'AgentDeck 簡報範本',
  label: '作者或單位 / 主題名稱',
  // back: { href: '../../index.html', label: '返回目錄' },
  pages: [
    deck.cover({ title: '主題名稱', meta: '姓名／單位<br>2026/9/30' }),
    {
      id: 'intro',
      section: '01 / 章節',
      title: '頁面標題',
      lead: '引言（可留空字串）。',
      art: '<p class="example-note" data-key="note" data-edit>這裡放元件或自製內容。</p>',
      point: '重點（可留空字串）。',
    },
    deck.end(),
  ],
};