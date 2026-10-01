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
// 總覽：所有元件的縮圖，自動取自 demo；新增元件不需改這裡。
// 縮圖沿用閱讀器的 .mini-page（特殊元件不啟動動態內容），並移除編輯標記，避免與單頁的 key 重複。
const strip = html => html.replace(/\sdata-(key|edit|move|hide|canvas)(="[^"]*")?/g, '');
const overview = tier => deck.components().filter(n => deck.info(n).tier === tier).map(name => {
  const c = deck.info(name);
  return `<li><div class="deck-gallery-thumb"><div class="mini-page"><section class="stage">${c.demo ? strip(c.demo()) : ''}</section></div></div>`
    + `<b>${name}</b><small>${tech(c)}</small></li>`;
}).join('');
const story = {
  title: 'AgentDeck 元件庫',
  label: 'AgentDeck 元件庫 / 審核與預覽',
  pages: [
    deck.cover({ title: 'AgentDeck 元件庫', meta: '基礎元件 → 特殊元件<br>目錄與選用規則：CATALOG.md' }),
    {
      id: 'overview',
      section: '總覽',
      title: '全部元件',
      lead: '縮圖為靜態預覽；實際尺寸、動態效果與編輯範圍請翻到各元件的單頁，或從左上「元件」索引跳過去。',
      art: `<div class="deck-gallery" data-key="overview"><h3>${TIER.basic}</h3><ul>${overview('basic')}</ul>`
        + `<h3>${TIER.special}</h3><ul>${overview('special')}</ul></div>`,
      point: '選用時機見 CATALOG.md。',
    },
    ...byTier('basic'),
    ...byTier('special'),
    deck.end({ title: 'deck.end()' }),
  ],
};