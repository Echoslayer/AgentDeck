// AgentDeck 專案網站（繁體中文，相關入口 lang/zh/）。頁面 id 與英文主入口相同。
const resourceDir = document.currentScript.getAttribute('src').replace(/[^/]*$/, '');
const resource = p => resourceDir + p;
const story = {
  title: 'AgentDeck — LLM 撰寫、人在現場微調的網頁簡報',
  label: 'AgentDeck',
  back: { href: resource('../../index.html'), label: 'English' },
  pages: [
    deck.cover({
      title: 'AgentDeck',
      meta: 'LLM 撰寫、人在現場微調的網頁簡報<br>github.com/Echoslayer/AgentDeck',
      instruction: '這一頁本身就是用 AgentDeck 做的簡報。按 → 或下方按鈕往下；頁首有語言切換與「✎ 編輯」。',
    }),
    {
      id: 'why',
      section: '01 / 為什麼',
      title: 'AI 真的寫得出來的簡報',
      lead: '二進位的簡報檔跟 agent 作對，純文字不會。',
      art: deck.compare('why', [
        { title: '現在的簡報檔', body: '二進位的 .pptx。agent 透過函式庫修改，版面容易跑掉，改一個字也得再請 agent 動手。' },
        { title: 'AgentDeck', body: '純文字的 HTML、CSS、JS。agent 寫分鏡；措辭與位置由你在瀏覽器裡、播放時直接修改。' },
      ]),
      point: '繁重的撰寫交給 agent，最後的決定留給人。',
      instruction: '從痛點開始：請 agent 做簡報，通常拿到一份自己改不動的檔案。指向右欄：這裡的簡報是 agent 擅長的文字，最後的修飾留在你手上。',
    },
    {
      id: 'workflow',
      section: '02 / 流程',
      title: '從構想到交付',
      lead: '一個 CLI、五個步驟、不用建置。',
      art: deck.steps('flow', [
        '<code>init</code> 建立簡報資料夾',
        '在 <code>plan.md</code> 安排頁面',
        '用元件寫 <code>story.js</code>',
        '播放並現場修改',
        '<code>pack</code> 打包成 zip',
      ]),
      point: '每一步都留下可讀、可比對、可 commit 的純文字檔。',
      instruction: '由左往右講。第二、三步是 agent 做的事，第四步是你的。強調沒有編譯：commit 的就是播放的。',
    },
    {
      id: 'layers',
      section: '03 / 架構',
      title: '每一層只有一個擁有者',
      lead: '沒有人寫到別人那層，修改就不會互相覆蓋。',
      art: deck.stack3d('layers', [
        { text: 'edits.js', note: '你在現場的修正與註解', highlight: true },
        { text: 'story.js', note: 'agent 寫的分鏡' },
        { text: '元件', note: '簡報用到才複製進來' },
        { text: '核心與閱讀器', note: '框架，以 update core 更新' },
        { text: '主題', note: '各層共用的品牌色票與 logo' },
      ], { hint: '拖曳可旋轉；滑過右側項目會抬起該層。' }),
      point: '上層依賴下層；agent 不會覆蓋你的修改。',
      instruction: '拖曳堆疊旋轉，再由上往下滑過右側每一項。突顯的最上層屬於人：它另外存檔，所以重新產生分鏡也會保留你的修正。',
    },
    {
      id: 'contract',
      section: '04 / 資料契約',
      title: '一份簡報就是一個物件',
      lead: '閱讀器載入時檢查，不符合就直接報錯。',
      art: deck.code('story', `
const story = {
  title: '季度回顧',
  pages: [
    deck.cover({ title: 'Q3 回顧', meta: '營運團隊' }),
    {
      id: 'yield',
      section: '01 / 成果',
      title: '良率提升',
      lead: 'AOI 初篩減少了人工檢查。',
      art: deck.metrics('kpi', [{ value: '97.4', unit: '%', label: '良率' }]),
      point: '同一條線、同一個月：提升 5.3 個百分點。',
    },
    deck.end(),
  ],
};`, { lang: 'js', lines: [6, 10], caption: '每頁有固定的 id；art 放元件，呼叫方式為 deck.<name>(key, …)。' }),
      point: '精簡且有檢查的契約，讓 agent 能一次寫完整份簡報。',
      instruction: '先指第 6 行的 id，再指第 10 行的元件呼叫。傳給元件的 key，就是之後現場修改找到目標的依據。',
    },
    {
      id: 'live-edit',
      section: '05 / 現場編輯',
      title: '邊講邊改',
      lead: '按頁首的「✎ 編輯」，就在這頁試試。',
      art: deck.cards('edit', [
        { title: '改文字', text: '點選標記過的文字直接輸入。' },
        { title: '移動', text: '拖曳封面與結尾頁的定位元素。' },
        { title: '隱藏', text: '台上出問題的元件可以先藏起來。' },
        { title: '註解', text: '在「註解」分頁逐頁留下意見。' },
      ]),
      point: '另存產生 edits.js；story.js 完全不動。',
      instruction: '實際按「✎ 編輯」，改一張卡片標題、隱藏一張卡片。再按「另存」，說明結果是一個放在分鏡旁邊的小檔案 edits.js。',
    },
    {
      id: 'included',
      section: '06 / 內容',
      title: '應有盡有，用到才載入',
      lead: '元件只在簡報用到時載入。',
      art: deck.metrics('count', [
        { value: '37', unit: '個元件', label: '基礎 16、特殊 21（3D、圖表、程式碼、數學）' },
        { value: '6', unit: '個範例', label: '可改寫進自己簡報的互動組合' },
        { value: '0', unit: '個建置步驟', label: '雙擊 index.html 即可播放', highlight: true },
      ]),
      point: '特殊元件缺少套件時，會改顯示靜態後備。',
      instruction: '念出三個數字，停在零。提一下本站的元件展示頁，每一個元件都能即時操作。',
    },
    {
      id: 'delivery',
      section: '07 / 交付',
      title: '聽眾會收到什麼？',
      lead: '先猜再往下看。',
      art: '<p class="site-note" data-key="note" data-edit>你執行 <code>agentdeck pack</code>，把結果寄出去。</p>',
      question: {
        prompt: '對方信箱裡會收到什麼？',
        choices: [
          { value: 'app', label: '一個網頁應用的連結', feedback: '不是。不需要架站；想放上像本站這樣的網站也可以。' },
          { value: 'zip', label: '一個可離線播放的 zip', feedback: '對。解壓後雙擊 index.html，不用網路也不用安裝就能播放。' },
          { value: 'pptx', label: '一份 .pptx 檔', feedback: '預設不是。agentdeck export 可以輸出 .pptx，但 pack 交付的是可互動的 HTML 簡報。' },
        ],
      },
      point: '',
      instruction: '點選前先讓聽眾表決。再選 zip，說明 pack 只帶入簡報實際引用的檔案。',
    },
    {
      id: 'start',
      section: '08 / 開始使用',
      title: '在自己的專案試試',
      lead: '需要 Node 18 以上；播放簡報什麼都不需要。',
      art: deck.code('cli', `
$ npx -y github:Echoslayer/AgentDeck init slides/my-topic
$ cd slides/my-topic
$ npx -y github:Echoslayer/AgentDeck new my-topic
接著請你的 coding agent 讀 agentdeck/AGENTDECK.md，開始製作簡報。`, { prompt: '$ ', caption: 'init 建立獨立的資料夾；new 在其中建立第一份簡報。' }),
      point: '文件、設計決策與範例：<a href="https://github.com/Echoslayer/AgentDeck" target="_blank" rel="noopener">github.com/Echoslayer/AgentDeck</a>',
      instruction: '帶過三個指令，再講最後一行：之後由 agent 讀規則檔、寫簡報。最後指向 GitHub 連結收尾。',
    },
    deck.end({ instruction: '感謝聽眾，再次指向 GitHub 連結。' }),
  ],
};

// 口語稿（瀏覽器內建語音）與隨朗讀的動作，依頁面 id 對應；at 從第 1 句起算。動作與英文版相同。
const narration = {
  cover: {
    speech: '歡迎來到 AgentDeck。這個網站本身就是一份 AgentDeck 簡報，現在由瀏覽器內建的語音朗讀。我們來看看它能做什麼。',
    record: [{ at: 1, box: '.deck-cover [data-key=title]' }, { at: 3, clear: true }],
  },
  why: {
    speech: '請 agent 做簡報，通常會拿到一份二進位檔。agent 得透過函式庫修改，改一個字也要再請它動手。AgentDeck 把簡報變成純文字，這正是 agent 最擅長寫的東西。繁重的撰寫交給 agent，最後的決定留給你。',
    record: [{ at: 1, box: '[data-key=why-1]' }, { at: 3, clear: true }, { box: '[data-key=why-2]' }, { at: 4, clear: true }],
  },
  workflow: {
    speech: '整個流程有五步。init 建立一份簡報的資料夾。agent 先安排頁面，再用元件寫出分鏡。你播放簡報，現場修改。最後用 pack 打包成可以寄出的 zip。',
    record: [
      { at: 2, box: '[data-key=flow-1]' },
      { at: 3, clear: true }, { box: '[data-key=flow-2]' }, { wait: 1500 }, { box: '[data-key=flow-3]' },
      { at: 4, clear: true }, { box: '[data-key=flow-4]' },
      { at: 5, clear: true }, { box: '[data-key=flow-5]' },
    ],
  },
  layers: {
    speech: '每一層只有一個擁有者。最底層是主題，放你的品牌。往上是框架核心，以及這份簡報用到的元件。agent 負責寫分鏡。最上層的 edits.js 只屬於你，所以重新產生分鏡也不會蓋掉你的修正。',
    record: [
      { at: 1, drag: '[data-key=layers] .deck-canvas', by: [240, 0] },
      { at: 2, box: '[data-key=layers-5]' },
      { at: 3, clear: true }, { box: '[data-key=layers-4]' }, { box: '[data-key=layers-3]' },
      { at: 4, clear: true }, { box: '[data-key=layers-2]' },
      { at: 5, clear: true }, { box: '[data-key=layers-1]' },
    ],
  },
  contract: {
    speech: '一整份簡報就是一個 JavaScript 物件。每一頁都有固定的 id，就像這一行。內容由元件組成，以名稱和 key 呼叫。之後的現場修改，就是靠這個 key 找到目標。閱讀器載入時會檢查這個結構，寫錯會直接報錯，不會默默出錯。',
    record: [
      { at: 2, box: '[data-key=story] code > span:nth-child(6)' },
      { at: 3, clear: true }, { box: '[data-key=story] code > span:nth-child(10)' },
      { at: 5, clear: true },
    ],
  },
  'live-edit': {
    speech: '你可以邊講邊改簡報。按頁首的編輯，文字就變成可以修改。你可以重打標題、拖曳封面上的元素，或隱藏出問題的元件。意見寫在右側的註解分頁。另存之後，所有修改都在一個小檔案 edits.js 裡，分鏡完全不動。',
    record: [
      { at: 2, box: '[data-key=edit-1]' },
      { at: 3, clear: true }, { box: '[data-key=edit-2]' }, { box: '[data-key=edit-3]' },
      { at: 4, clear: true }, { box: '[data-key=edit-4]' },
      { at: 5, clear: true },
    ],
  },
  included: {
    speech: '來看看裡面有什麼。三十七個元件，從簡單的條列到 3D 圖表。六個可以改寫的互動範例。還有零個建置步驟：雙擊 index.html 就能播放。',
    record: [
      { at: 2, box: '[data-key=count-1]' },
      { at: 3, clear: true }, { box: '[data-key=count-2]' },
      { at: 4, clear: true }, { box: '[data-key=count-3]' },
    ],
  },
  delivery: {
    speech: '來個小問題。你執行 pack，把結果寄出去。對方信箱裡會收到什麼？先花一秒猜猜看。答案是一個可以離線播放的 zip。解壓後雙擊 index.html，不用網路、不用安裝就能播放。',
    record: [
      { at: 2, box: '[data-key=note]' },
      { at: 3, clear: true }, { box: '.choices' },
      { at: 5, clear: true }, { click: '[data-answer=zip]' }, { box: '[data-answer=zip]' },
    ],
  },
  start: {
    speech: '想試試看嗎？在你的專案裡，執行 init 建立簡報資料夾。接著執行 new，建立第一份簡報。之後請你的 coding agent 讀規則檔，開始製作。其餘的一切都在 GitHub 上。',
    record: [
      { at: 2, box: '[data-key=cli] code > span:nth-child(1)' },
      { at: 3, clear: true }, { box: '[data-key=cli] code > span:nth-child(3)' },
      { at: 4, clear: true }, { box: '[data-key=cli] code > span:nth-child(4)' },
      { at: 5, clear: true },
    ],
  },
  thanks: {
    speech: '感謝觀看。程式碼、文件和這份簡報，都在 GitHub 的 Echoslayer 斜線 AgentDeck。',
  },
};
for (const p of story.pages) Object.assign(p, narration[p.id]);

// 切換語言時停在同一頁：兩個版本的頁面 id 相同。
document.addEventListener('story:render', () => {
  document.getElementById('story-back').setAttribute('href', story.back.href + location.hash);
});
