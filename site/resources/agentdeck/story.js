// Both entries use the same verified data and behavior.
const story = siteShowcase.create(false);
story.back = { href: 'lang/zh/index.html', label: '中文' };
story.glossary = {
  'volume dataset': 'Values on a 3D grid, like a stack of image slices, rather than a flat table.',
  'key': 'The name each component carries on its slide (<code>data-key</code>). Saved edits use it to find the same element after the source changes.',
  'HTML unit': 'One self-contained folder with the entry page, reader, data and resources. Unzip it and double-click to open, even offline.',
};
story.attachments = [
  { label: 'Author', href: 'https://github.com/Echoslayer', note: 'GitHub' },
  { label: 'License', href: 'https://github.com/Echoslayer/AgentDeck/blob/main/LICENSE', note: 'MIT' },
];
document.addEventListener('story:render', ({ detail: { page } }) => {
  document.getElementById('story-back').setAttribute('href', story.back.href + '#' + encodeURIComponent(page.id));
});
