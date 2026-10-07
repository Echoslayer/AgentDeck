// Both entries use the same verified data and behavior.
const story = siteShowcase.create(false);
story.back = { href: 'lang/zh/index.html', label: '中文' };
story.attachments = [
  { label: 'Author', href: 'https://github.com/Echoslayer', note: 'GitHub' },
  { label: 'License', href: 'https://github.com/Echoslayer/AgentDeck/blob/main/LICENSE', note: 'MIT' },
];
document.addEventListener('story:render', ({ detail: { page } }) => {
  document.getElementById('story-back').setAttribute('href', story.back.href + '#' + encodeURIComponent(page.id));
});
