// AgentDeck project site (English, main entry). The Chinese version is lang/zh/ with the same page ids.
const resourceDir = document.currentScript.getAttribute('src').replace(/[^/]*$/, '');
const resource = p => resourceDir + p;
const story = {
  title: 'AgentDeck — slides an LLM writes and you fine-tune live',
  label: 'AgentDeck',
  back: { href: resource('../../lang/zh/index.html'), label: '中文' },
  pages: [
    deck.cover({
      title: 'AgentDeck',
      meta: 'Slides an LLM writes and you fine-tune live<br>github.com/Echoslayer/AgentDeck',
      instruction: 'This page is itself an AgentDeck deck. Use → or the buttons below to move on; the header has the language switch and ✎ Edit.',
    }),
    {
      id: 'why',
      section: '01 / Why',
      title: 'Slides an AI can actually write',
      lead: 'Binary slide files fight the agent. Plain text does not.',
      art: deck.compare('why', [
        { title: 'Slide files today', body: 'A binary .pptx. The agent edits it through a library, layout drifts, and every small wording fix goes back to the agent.' },
        { title: 'AgentDeck', body: 'Plain HTML, CSS, and JS. The agent writes the storyboard; you fix wording and positions yourself, in the browser, while presenting.' },
      ]),
      point: 'The agent does the heavy writing; the human keeps the last word.',
      instruction: 'Start from the pain: asking an agent for slides usually means a binary file you cannot touch. Point at the right column: here the deck is text the agent is good at, and the final touches stay with you.',
    },
    {
      id: 'workflow',
      section: '02 / Workflow',
      title: 'From idea to delivered deck',
      lead: 'One CLI, five steps, no build.',
      art: deck.steps('flow', [
        '<code>init</code> a deck folder',
        'Plan the pages in <code>plan.md</code>',
        'Write <code>story.js</code> with components',
        'Play and edit live',
        '<code>pack</code> into a zip',
      ]),
      point: 'Every step leaves a plain file you can read, diff, and commit.',
      instruction: 'Walk left to right. Steps two and three are what the agent does; step four is yours. Stress that nothing is compiled: what you commit is what plays.',
    },
    {
      id: 'layers',
      section: '03 / Architecture',
      title: 'Each layer has one owner',
      lead: 'Edits never collide because nobody writes outside their layer.',
      art: deck.stack3d('layers', [
        { text: 'edits.js', note: 'Your live fixes and comments', highlight: true },
        { text: 'story.js', note: "The agent's storyboard" },
        { text: 'Components', note: 'Copied in only when a deck uses them' },
        { text: 'Core and reader', note: 'Framework, refreshed with update core' },
        { text: 'Theme', note: 'Brand colors and logos everything draws on' },
      ], { hint: 'Drag to rotate; hover an item on the right to lift its layer.' }),
      point: 'Upper layers depend on lower ones; the agent never overwrites your edits.',
      instruction: 'Drag the stack to rotate it, then hover each item on the right from top to bottom. The highlighted top layer is the human one: it is saved separately, so regenerating the story keeps your fixes.',
    },
    {
      id: 'contract',
      section: '04 / The contract',
      title: 'A deck is one plain object',
      lead: 'The reader checks it on load and fails loudly.',
      art: deck.code('story', `
const story = {
  title: 'Quarterly review',
  pages: [
    deck.cover({ title: 'Q3 Review', meta: 'Ops team' }),
    {
      id: 'yield',
      section: '01 / Results',
      title: 'Yield is up',
      lead: 'AOI pre-screening cut manual checks.',
      art: deck.metrics('kpi', [{ value: '97.4', unit: '%', label: 'Yield' }]),
      point: 'Same line, same month: up 5.3 points.',
    },
    deck.end(),
  ],
};`, { lang: 'js', lines: [6, 10], caption: 'Each page has a stable id; art holds components, called as deck.<name>(key, …).' }),
      point: 'A small, checked contract is what lets an agent write a whole deck in one pass.',
      instruction: 'Point at line 6, the id, then line 10, the component call. The key passed to each component is how live edits find their target later.',
    },
    {
      id: 'live-edit',
      section: '05 / Live editing',
      title: 'Fix it while you present',
      lead: 'Press ✎ Edit in the header and try it on this page.',
      art: deck.cards('edit', [
        { title: 'Edit text', text: 'Click any marked text and type.' },
        { title: 'Move', text: 'Drag positioned items on the cover and end pages.' },
        { title: 'Hide', text: 'Hide any component that misbehaves on stage.' },
        { title: 'Comment', text: 'Leave notes per page in the Comments tab.' },
      ]),
      point: 'Save writes edits.js; story.js is never touched.',
      instruction: 'Actually press ✎ Edit, change a card title, and hide one card. Then press Save to show that the result is a small edits.js file you drop next to the story.',
    },
    {
      id: 'included',
      section: '06 / What you get',
      title: 'Batteries included, nothing preloaded',
      lead: 'Components load only when a deck uses them.',
      art: deck.metrics('count', [
        { value: '37', unit: 'components', label: '16 basic, 21 special (3D, charts, code, math)' },
        { value: '6', unit: 'examples', label: 'Interactive patterns to adapt in your own deck' },
        { value: '0', unit: 'build steps', label: 'Double-click index.html to play', highlight: true },
      ]),
      point: 'Special components fall back to a static view when their package is missing.',
      instruction: 'Read the three numbers, ending on the zero. Mention that the component gallery on this site shows every one of them live.',
    },
    {
      id: 'delivery',
      section: '07 / Delivery',
      title: 'What does your audience receive?',
      lead: 'Guess before you read on.',
      art: '<p class="site-note" data-key="note" data-edit>You run <code>agentdeck pack</code> and email the result.</p>',
      question: {
        prompt: 'What arrives in their inbox?',
        choices: [
          { value: 'app', label: 'A link to a hosted web app', feedback: 'No. Nothing is hosted; you can still put it on a site like this one if you want.' },
          { value: 'zip', label: 'A zip that plays offline', feedback: 'Right. Unzip, double-click index.html, and it plays with no network or install.' },
          { value: 'pptx', label: 'A .pptx file', feedback: 'Not by default. agentdeck export can produce a .pptx, but pack ships the live HTML deck.' },
        ],
      },
      point: '',
      instruction: 'Let the audience vote before clicking. Then pick the zip answer and explain that pack bundles only what the deck references.',
    },
    {
      id: 'start',
      section: '08 / Get started',
      title: 'Try it in your own project',
      lead: 'Requires Node 18 or later. Playing a deck requires nothing.',
      art: deck.code('cli', `
$ npx -y github:Echoslayer/AgentDeck init slides/my-topic
$ cd slides/my-topic
$ npx -y github:Echoslayer/AgentDeck new my-topic
Then ask your coding agent to read agentdeck/AGENTDECK.md and build the deck.`, { prompt: '$ ', caption: 'init creates a self-contained folder; new adds the first deck in it.' }),
      point: 'Docs, design decisions, and examples: <a href="https://github.com/Echoslayer/AgentDeck" target="_blank" rel="noopener">github.com/Echoslayer/AgentDeck</a>',
      instruction: 'Run through the three commands, then the last line: from here the agent reads the rules file and writes the deck. Point at the GitHub link to close.',
    },
    deck.end({ instruction: 'Thank the audience and point them back to the GitHub link.' }),
  ],
};

// Keep the current page when switching language: both versions use the same page ids.
document.addEventListener('story:render', () => {
  document.getElementById('story-back').setAttribute('href', story.back.href + location.hash);
});
