// Both entries use the same verified data and behavior.
const story = siteShowcase.create(true);
story.back = { href: '../../index.html', label: 'English' };
story.glossary = {
  '體積資料': '排在三維格點上的數值，像一疊切片影像，而不是一張平面表格。',
  'key': '每個元件在頁面內的名稱（<code>data-key</code>）。來源更新後，已保存的修正靠它找回同一個元件。',
  'HTML 單位': '一個自成一體的資料夾，包含入口頁、閱讀器、資料與素材；解壓後雙擊即可開啟，離線也能用。',
};
story.attachments = [
  { label: '作者', href: 'https://github.com/Echoslayer', note: 'GitHub' },
  { label: '授權', href: 'https://github.com/Echoslayer/AgentDeck/blob/main/LICENSE', note: 'MIT' },
];
document.addEventListener('story:render', ({ detail: { page } }) => {
  document.getElementById('story-back').setAttribute('href', story.back.href + '#' + encodeURIComponent(page.id));
});
