// Both entries use the same verified data and behavior.
const story = siteShowcase.create(true);
story.back = { href: '../../index.html', label: 'English' };
document.addEventListener('story:render', ({ detail: { page } }) => {
  document.getElementById('story-back').setAttribute('href', story.back.href + '#' + encodeURIComponent(page.id));
});
