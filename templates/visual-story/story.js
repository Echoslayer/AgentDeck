// AgentDeck 簡報範本（最小骨架）：封面 → 內容頁 → 結尾。
// 替換本檔的分鏡建立新主題；不要為了新主題修改 assets/。
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
      title: '每頁一個標題，只講一件事',
      lead: '引言交代這頁要回答的問題。',
      art: '<p class="example-note" data-key="note" data-edit>這裡放元件或自製內容。</p>',
      point: '內容太多就拆頁，不要縮小字體。',
    },
    deck.end(),
  ],
};