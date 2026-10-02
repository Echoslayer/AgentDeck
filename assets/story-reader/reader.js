/* 共用閱讀器：只處理呈現、翻頁、預覽、索引與頁面生命週期。 */
'use strict';
const pages = story.pages;
if (!Array.isArray(pages) || !pages.length) throw new Error('story.pages 至少需要一頁');
const ids = new Set();
for (const p of pages) {
  if (!p.id || ids.has(p.id)) throw new Error('每頁需要唯一 id');
  ids.add(p.id);
  for (const field of ['section', 'title', 'lead', 'art', 'point']) {
    if (typeof p[field] !== 'string') throw new Error(`${p.id}: 缺少字串欄位 ${field}`);
  }
  if (p.mount && typeof p.previewArt !== 'string') throw new Error(`${p.id}: 互動頁需要 previewArt`);
  if (p.question) {
    const values = new Set();
    if (!p.question.choices?.length) throw new Error(`${p.id}: 題目需要選項`);
    for (const c of p.question.choices) {
      if (!/^[\w-]+$/.test(c.value) || values.has(c.value) || typeof c.label !== 'string' || typeof c.feedback !== 'string') {
        throw new Error(`${p.id}: 選項需要唯一 value、label、feedback`);
      }
      values.add(c.value);
    }
  }
}
document.title = story.title;
document.getElementById('story-label').textContent = story.label || story.title;
const back = document.getElementById('story-back');
back.hidden = !story.back;
if (story.back) { back.textContent = story.back.label; back.setAttribute('href', story.back.href); }
document.getElementById('progress').max = pages.length;

// 製作署名：常駐在翻頁列右下角的內距內，每頁可見、不佔版面。
document.querySelector('body>nav')?.insertAdjacentHTML('beforeend', '<a class="made-with" href="https://github.com/Echoslayer/AgentDeck" target="_blank" rel="noopener" title="本簡報以 AgentDeck 製作">以 AgentDeck 製作</a>');

let current = 0;
const answers = new Map();
const states = new Map();
let cleanup;
// 對外介面：外掛層（如 deck-editor.js）只透過這裡與 story:render 事件取用閱讀器狀態，不直接讀內部變數。
window.storyReader = Object.freeze({
  get index() { return current; },
  get page() { return pages[current]; },
  refresh: () => renderPreviews(),
  go(i) {
    if (!Number.isInteger(i) || i < 0 || i >= pages.length) throw new Error(`storyReader.go: 頁序需為 0–${pages.length - 1}，收到 ${i}`);
    current = i;
    show();
  },
});

// HTML 僅接受作者維護的本地內容，不能傳入讀者輸入或未清理的外部資料。
function pageMarkup(p, preview = false) {
  const q = p.question;
  const question = q ? `<p class="question">${q.prompt}</p><div class="choices">${q.choices.map(c => preview
    ? `<span class="choice-copy">${c.label}</span>`
    : `<button data-answer="${c.value}">${c.label}</button>`).join('')}</div><div class="feedback" ${preview ? '' : 'id="feedback"'}>選一個答案，查看解說。</div>` : '';
  return `<div class="chapter">${p.section}</div><h1>${p.title}</h1><p class="lead">${p.lead}</p><section class="stage" aria-label="圖解">${preview ? (p.previewArt ?? p.art) : p.art}${question}</section><p class="point">${p.point}</p>${p.detail ? `<p class="detail">${p.detail}</p>` : ''}`;
}
function previewMarkup(p) {
  // ponytail: 限作者受信任的靜態 HTML；非 HTML sanitizer。複雜互動必須提供靜態 previewArt。
  return pageMarkup(p, true).replace(/\s+id="[^"]*"/g, '')
    .replace(/<button\b[^>]*>/g, '<span class="choice-copy">').replace(/<\/button>/g, '</span>')
    .replace(/<a\b[^>]*>/g, '<span>').replace(/<\/a>/g, '</span>');
}
function renderPreviews() {
  const hideFuture = pages[current].question?.hideFuturePreviews && !answers.has(pages[current].id);
  for (const [id, index, label] of [['prev', current - 1, '← 上一步'], ['next', current === pages.length - 1 ? 0 : current + 1, current === pages.length - 1 ? '↺ 重新看一次' : '下一步 →']]) {
    const button = document.getElementById(id), hidden = id === 'next' && hideFuture && index > current;
    const title = index < 0 ? '從這裡開始' : hidden ? '看看接下來發生什麼' : pages[index].title;
    const miniature = index < 0 ? '<span class="mini-placeholder">起點</span>' : hidden ? '<span class="mini-placeholder">?</span>' : `<div class="mini-page">${previewMarkup(pages[index])}</div>`;
    button.className = 'preview';
    button.innerHTML = `<div class="mini" aria-hidden="true">${miniature}</div><span class="preview-copy"><small>${label}</small><strong>${title}</strong></span>`;
  }
  document.getElementById('index-list').innerHTML = pages.map((p, i) => {
    const hidden = hideFuture && i > current;
    return `<button class="index-item" data-page="${i}" ${i === current ? 'aria-current="step"' : ''}><div class="mini" aria-hidden="true">${hidden ? '<span class="mini-placeholder">?</span>' : `<div class="mini-page">${previewMarkup(p)}</div>`}</div><span><small>${i + 1}</small><strong>${hidden ? '繼續閱讀後揭曉' : p.title}</strong></span></button>`;
  }).join('');
}
function feedback() {
  const p = pages[current], el = document.getElementById('feedback');
  const choice = p.question?.choices.find(c => c.value === answers.get(p.id));
  if (el && choice) el.textContent = choice.feedback;
  renderPreviews();
}
function show() {
  if (cleanup) { cleanup(); cleanup = undefined; }
  const p = pages[current], root = document.getElementById('page');
  root.innerHTML = pageMarkup(p);
  document.getElementById('position').textContent = `${current + 1} / ${pages.length}`;
  document.getElementById('progress').value = current + 1;
  document.getElementById('prev').disabled = current === 0;
  document.querySelectorAll('#page [data-answer]').forEach(b => b.onclick = () => {
    answers.set(p.id, b.dataset.answer);
    feedback();
  });
  feedback();
  if (p.mount) {
    if (!states.has(p.id)) states.set(p.id, {});
    cleanup = p.mount(root, states.get(p.id));
    if (cleanup !== undefined && typeof cleanup !== 'function') throw new Error(`${p.id}: mount 必須回傳清理函式或 undefined`);
  }
  document.dispatchEvent(new CustomEvent('story:render', { detail: { page: p, root } }));
}
function move(delta) {
  current = delta > 0 && current === pages.length - 1 ? 0 : Math.max(0, Math.min(pages.length - 1, current + delta));
  show();
  window.scrollTo(0, 0);
}
document.getElementById('prev').onclick = () => move(-1);
document.getElementById('next').onclick = () => move(1);

// 放大播放：全螢幕 + 內容放大同時生效，離開全螢幕（含按 Esc）時自動還原。
const zoomButton = document.getElementById('zoom');
function setZoomed(on) {
  document.body.classList.toggle('is-zoomed', on);
  zoomButton.setAttribute('aria-pressed', String(on));
  zoomButton.textContent = on ? '🔎' : '🔍';
  zoomButton.title = on ? '還原大小' : '放大投影片';
}
zoomButton.onclick = async () => {
  const zooming = !document.body.classList.contains('is-zoomed');
  if (zooming && document.documentElement.requestFullscreen) {
    try { await document.documentElement.requestFullscreen(); } catch { /* 使用者拒絕或環境不支援時仍套用內容放大 */ }
  } else if (!zooming && document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch { /* 忽略無法離開全螢幕的環境 */ }
  }
  setZoomed(zooming);
};
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) setZoomed(false); });

// 索引窗格：hover 暫開、點標籤釘選，佔位由 CSS 處理。
const indexPanel = document.getElementById('index');
let pinned = false;
function setPinned(value) {
  pinned = value;
  const pin = document.getElementById('pin');
  pin.setAttribute('aria-pressed', String(pinned));
  pin.textContent = pinned ? '解除釘選' : '釘選';
  indexPanel.open = true;
}
document.getElementById('pin').onclick = () => setPinned(!pinned);
indexPanel.onclick = e => { if (e.target.closest('summary')) { e.preventDefault(); setPinned(true); } };
indexPanel.ontoggle = () => { if (pinned && !indexPanel.open) indexPanel.open = true; };
indexPanel.onpointerenter = e => { if (e.pointerType === 'mouse') indexPanel.open = true; };
indexPanel.onpointerleave = e => { if (!pinned && e.pointerType === 'mouse' && !indexPanel.matches(':has(:focus-visible)')) indexPanel.open = false; };
indexPanel.onkeydown = e => { if (e.key === 'Escape' && !pinned) { indexPanel.open = false; indexPanel.querySelector('summary').focus(); } };
document.getElementById('index-list').onclick = e => {
  const button = e.target.closest('[data-page]');
  if (!button) return;
  const index = Number(button.dataset.page);
  if (!Number.isInteger(index) || index < 0 || index >= pages.length) return;
  current = index;
  if (!pinned) indexPanel.open = false;
  show();
  document.getElementById('next').focus();
  window.scrollTo(0, 0);
};
document.addEventListener('keydown', e => {
  if (e.target.isContentEditable || ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'].includes(e.target.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
});
show();
