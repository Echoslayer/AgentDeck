// 元件展示頁：每個已註冊元件一頁，內容取自 deck.define 的 summary 與 demo。
// 供人審核元件外觀與編輯範圍；不是主題範本，不要複製到 resources/。
const story = {
  title: 'AgentDeck 元件庫',
  label: 'AgentDeck 元件庫 / 審核與預覽',
  pages: [
    deck.cover({ title: 'AgentDeck 元件庫', meta: '頁型 deck.cover()<br>元件目錄：CATALOG.md' }),
    ...deck.components().map(name => {
      const c = deck.info(name);
      return {
        id: name,
        section: `元件 / ${name}`,
        title: `deck.${name}`,
        lead: c.summary,
        art: c.demo ? c.demo() : '<p>此元件未提供 demo。</p>',
        point: `API、必須保留的約束與範例見 components/${name}/README.md。`,
      };
    }),
    deck.end({ title: 'deck.end()' }),
  ],
};
