// Both entries use the same verified data and behavior.
const story = siteShowcase.create(true);
story.back = { href: '../../index.html', label: 'English' };
story.attachments = [
  { label: '作者', href: 'https://github.com/Echoslayer', note: 'GitHub' },
  { label: '授權', href: 'https://github.com/Echoslayer/AgentDeck/blob/main/LICENSE', note: 'MIT' },
];
document.addEventListener('story:render', ({ detail: { page } }) => {
  document.getElementById('story-back').setAttribute('href', story.back.href + '#' + encodeURIComponent(page.id));
});
