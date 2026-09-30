// 品牌主題：載入於 deck-core.js 之後、元件與 story.js 之前（docs/adr/0010）。
// 提供封面／結尾的品牌裝飾。img 是本檔旁 img/ 的網址；每個第一層元素需有 data-key（不可用 title、cover-meta），
// 現場可在編輯模式逐一隱藏。沒有裝飾時回傳空字串。
deck.theme({
  cover: img => `<img class="theme-cover-logo" data-key="logo" src="${img}logo-white.svg" alt="AgentDeck">`,
  end: img => `<img class="theme-end-logo" data-key="logo" src="${img}logo-white.svg" alt="AgentDeck">`,
});