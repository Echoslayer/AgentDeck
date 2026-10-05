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

// Read-aloud script (browser voice) and actions synced to it, by page id. English sentences are split with <br>,
// because only 。！？!?；; and line breaks end a sentence; at counts sentences from 1.
const narration = {
  cover: {
    speech: 'Welcome to AgentDeck.<br>This website is itself an AgentDeck presentation, read aloud by the built-in voice of your browser.<br>Let us see what it does.',
    record: [{ at: 1, box: '.deck-cover [data-key=title]' }, { at: 3, clear: true }],
  },
  why: {
    speech: 'Ask an agent for slides today, and you usually get a binary file.<br>The agent edits it through a library, and every small fix goes back to the agent.<br>AgentDeck turns the deck into plain text, which is what agents write best.<br>The agent does the heavy writing, and you keep the last word.',
    record: [{ at: 1, box: '[data-key=why-1]' }, { at: 3, clear: true }, { box: '[data-key=why-2]' }, { at: 4, clear: true }],
  },
  workflow: {
    speech: 'It takes five steps.<br>Init creates a folder for one deck.<br>The agent plans the pages, then writes the storyboard with components.<br>You play it and fix things live.<br>Pack turns it into a zip you can send.',
    record: [
      { at: 2, box: '[data-key=flow-1]' },
      { at: 3, clear: true }, { box: '[data-key=flow-2]' }, { wait: 1500 }, { box: '[data-key=flow-3]' },
      { at: 4, clear: true }, { box: '[data-key=flow-4]' },
      { at: 5, clear: true }, { box: '[data-key=flow-5]' },
    ],
  },
  layers: {
    speech: 'Each layer has exactly one owner.<br>At the bottom, the theme holds your brand.<br>Above it sit the framework core and the components the deck uses.<br>The agent writes the storyboard.<br>And the top layer, edits.js, is yours alone, so regenerating the story never erases your fixes.',
    record: [
      { at: 1, drag: '[data-key=layers] .deck-canvas', by: [240, 0] },
      { at: 2, box: '[data-key=layers-5]' },
      { at: 3, clear: true }, { box: '[data-key=layers-4]' }, { box: '[data-key=layers-3]' },
      { at: 4, clear: true }, { box: '[data-key=layers-2]' },
      { at: 5, clear: true }, { box: '[data-key=layers-1]' },
    ],
  },
  contract: {
    speech: 'A whole deck is one plain JavaScript object.<br>Every page has a stable id, like this one.<br>Its content is built from components, called by name with a key.<br>That key is how your live edits find their target later.<br>The reader checks this structure on load, so mistakes fail loudly instead of quietly.',
    record: [
      { at: 2, box: '[data-key=story] code > span:nth-child(6)' },
      { at: 3, clear: true }, { box: '[data-key=story] code > span:nth-child(10)' },
      { at: 5, clear: true },
    ],
  },
  'live-edit': {
    speech: 'You can fix the deck while you present.<br>Press Edit in the header, and the text becomes editable.<br>You can retype a title, drag items on the cover, or hide a component that misbehaves.<br>Comments go in the panel on the right.<br>When you save, everything lands in one small file, edits.js, and the storyboard stays untouched.',
    record: [
      { at: 2, box: '[data-key=edit-1]' },
      { at: 3, clear: true }, { box: '[data-key=edit-2]' }, { box: '[data-key=edit-3]' },
      { at: 4, clear: true }, { box: '[data-key=edit-4]' },
      { at: 5, clear: true },
    ],
  },
  included: {
    speech: 'Here is what comes in the box.<br>Thirty-seven components, from simple lists to 3D charts.<br>Six interactive examples you can adapt.<br>And zero build steps: double-click index.html and it plays.',
    record: [
      { at: 2, box: '[data-key=count-1]' },
      { at: 3, clear: true }, { box: '[data-key=count-2]' },
      { at: 4, clear: true }, { box: '[data-key=count-3]' },
    ],
  },
  delivery: {
    speech: 'Here is a quick question.<br>You run pack and email the result.<br>What arrives in their inbox?<br>Take a second to guess.<br>The answer is a zip that plays offline.<br>Unzip it, double-click index.html, and it plays with no network and nothing to install.',
    record: [
      { at: 2, box: '[data-key=note]' },
      { at: 3, clear: true }, { box: '.choices' },
      { at: 5, clear: true }, { click: '[data-answer=zip]' }, { box: '[data-answer=zip]' },
    ],
  },
  start: {
    speech: 'Ready to try it?<br>In your own project, run init to create a deck folder.<br>Then run new to add the first deck.<br>From there, ask your coding agent to read the rules file and build it.<br>Everything else is on GitHub.',
    record: [
      { at: 2, box: '[data-key=cli] code > span:nth-child(1)' },
      { at: 3, clear: true }, { box: '[data-key=cli] code > span:nth-child(3)' },
      { at: 4, clear: true }, { box: '[data-key=cli] code > span:nth-child(4)' },
      { at: 5, clear: true },
    ],
  },
  thanks: {
    speech: 'Thanks for watching.<br>You will find the code, the docs, and this very deck on GitHub, under Echoslayer slash AgentDeck.',
  },
};
for (const p of story.pages) Object.assign(p, narration[p.id]);

// Keep the current page when switching language: both versions use the same page ids.
document.addEventListener('story:render', () => {
  document.getElementById('story-back').setAttribute('href', story.back.href + location.hash);
});
