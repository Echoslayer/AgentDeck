// 元件展示頁：先列基礎元件、再列特殊元件，每個元件一頁，內容取自 deck.define 的 summary 與 demo。
// 供人審核元件外觀與編輯範圍；不是主題範本，不要複製到 resources/。
const TIER = { basic: '基礎元件', special: '特殊元件' };
const tech = c => (c.vendor.length ? `需要 ${c.vendor.join('、')}（vendor.json）` : c.tier === 'special' ? '零依賴，動態' : '零依賴，靜態');
const page = name => {
  const c = deck.info(name);
  return {
    id: name,
    section: `${TIER[c.tier]} / ${tech(c)}`,
    title: `deck.${name}`,
    lead: c.summary,
    art: c.demo ? c.demo() : '<p>此元件未提供 demo。</p>',
    point: `API、必須保留的約束與範例見 components/${name}/README.md。`,
  };
};
const byTier = tier => deck.components().filter(n => deck.info(n).tier === tier).map(page);
const story = {
  title: 'AgentDeck 元件庫',
  label: 'AgentDeck 元件庫 / 審核與預覽',
  pages: [
    deck.cover({ title: 'AgentDeck 元件庫', meta: '基礎元件 → 特殊元件<br>目錄與選用規則：CATALOG.md' }),
    ...byTier('basic'),
    ...byTier('special'),
    deck.end({ title: 'deck.end()' }),
  ],
};