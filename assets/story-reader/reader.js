/* 共用閱讀器：只處理呈現、翻頁、預覽、索引與頁面生命週期。 */
'use strict';
// 介面語言跟隨 <html lang>：zh 開頭或未設定為中文，其餘為英文（docs/adr/0031）。
const uiZh = /^zh/i.test(document.documentElement.lang || 'zh');
const uiText = (zh, en) => uiZh ? zh : en;
const pages = story.pages;
if (!Array.isArray(pages) || !pages.length) throw new Error('story.pages 至少需要一頁');
// 換頁轉場效果（docs/adr/0033），樣式在 reader.css。
const TRANSITIONS = ['slide', 'fade', 'push', 'zoom', 'flip', 'cover', 'wipe', 'rise', 'blur', 'none'];
const checkTransition = (value, where) => {
  if (value !== undefined && !TRANSITIONS.includes(value)) throw new Error(`${where}: transition 需為 ${TRANSITIONS.join('、')} 之一，收到 ${value}`);
};
checkTransition(story.transition, 'story');
const ids = new Set();
for (const p of pages) {
  checkTransition(p.transition, p.id);
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
// 舊版入口 HTML 的左側投影片窗格（<details id="index">）已由縮圖總覽取代；入口不必改，載入時移除。
document.getElementById('index')?.remove();
document.title = story.title;
document.getElementById('story-label').textContent = story.label || story.title;
const back = document.getElementById('story-back');
back.hidden = !story.back;
if (story.back) { back.textContent = story.back.label; back.setAttribute('href', story.back.href); }
document.getElementById('progress').max = pages.length;
// 附件：story.attachments = [{ label, href, note? }]，頁首「📎 附件」展開清單，點選開啟。
// 相關入口（attachments/<name>/）、PDF、資料檔都可；href 相對於入口 HTML，以 story.js 的 resource() 換算。
const readerAttachments = story.attachments ?? [];
if (!Array.isArray(readerAttachments) || !readerAttachments.every(a => a && typeof a.label === 'string' && typeof a.href === 'string' && (a.note === undefined || typeof a.note === 'string'))) {
  throw new Error('story.attachments 需為 [{ label, href, note? }] 陣列');
}
if (readerAttachments.length) {
  const box = document.createElement('details');
  box.className = 'reader-attach';
  box.innerHTML = `<summary>📎 ${uiText('附件', 'Attachments')} <b>${readerAttachments.length}</b></summary><ul></ul>`;
  const list = box.querySelector('ul');
  for (const a of readerAttachments) {
    const link = Object.assign(document.createElement('a'), { href: a.href });
    // 沒有 note 時以副檔名提示類型（PDF、CSV…）；label、note 與其他文字欄位一樣是作者的 HTML。
    const kind = a.note ?? (new URL(a.href, location.href).pathname.match(/\.([a-z0-9]{1,5})$/i)?.[1].toUpperCase() ?? '');
    link.innerHTML = `<strong>${a.label}</strong>${kind ? `<small>${kind}</small>` : ''}`;
    const item = document.createElement('li');
    item.append(link);
    list.append(item);
  }
  document.querySelector('body>header').append(box);
  // 點外面或 Esc 收起。
  document.addEventListener('click', e => { if (box.open && !box.contains(e.target)) box.open = false; });
  box.addEventListener('keydown', e => { if (e.key === 'Escape' && box.open) { box.open = false; box.querySelector('summary').focus(); } });
}
// 入口 HTML 的靜態介面文字以中文寫成，英文介面在此替換。
if (!uiZh) {
  const set = (sel, attr, text) => { const el = document.querySelector(sel); if (el) attr ? el.setAttribute(attr, text) : el.textContent = text; };
  set('body>nav', 'aria-label', 'Slide navigation');
  set('#zoom', 'title', 'Enlarge slides');
}

// 製作署名：常駐在翻頁列右下角的內距內，每頁可見、不佔版面。
document.querySelector('body>nav')?.insertAdjacentHTML('beforeend', `<a class="made-with" href="https://github.com/Echoslayer/AgentDeck" target="_blank" rel="noopener" title="${uiText('本簡報以 AgentDeck 製作', 'This presentation was made with AgentDeck')}">${uiText('以 AgentDeck 製作', 'Made with AgentDeck')}</a>`);

const preferences = createPreferences();
const transitionsKey = 'agentdeck-transitions';
let transitionsOn = true;
try { transitionsOn = localStorage.getItem(transitionsKey) !== 'off'; } catch { /* 無法讀取時採用預設值 */ }
preferences.register({
  title: uiText('換頁', 'Page turns'),
  fields: [{
    label: uiText('換頁轉場', 'Page transitions'), type: 'checkbox', default: true, get: () => transitionsOn,
    set(value) {
      transitionsOn = value;
      try { localStorage.setItem(transitionsKey, value ? 'on' : 'off'); return true; } catch { return false; }
    },
  }],
  help: uiText('系統設定「減少動態效果」時一律不轉場。', 'Transitions are always off when the system asks for reduced motion.'),
});
// 分享匯出獨立交付；重型套件由 export.js 在使用時載入。
const exportScript = document.createElement('script');
exportScript.src = new URL('export.js', document.currentScript.src).href;
document.head.append(exportScript);
const annotations = createAnnotations();
// 外殼高度隨工具列換行與導覽尺寸更新，內容保留實際所需空間。
const shellObserver = new ResizeObserver(entries => {
  for (const { target } of entries) {
    document.body.style.setProperty(`--reader-${target.tagName.toLowerCase()}-height`, `${target.getBoundingClientRect().height}px`);
  }
});
for (const element of document.querySelectorAll('body>header, body>nav')) shellObserver.observe(element);

// 網址 #頁面id 指向該頁：可分享單頁連結、重新整理停在原頁；不符的 hash（頁內錨點）不影響翻頁。
const pageFromHash = () => {
  let id = location.hash.slice(1);
  try { id = decodeURIComponent(id); } catch { /* 非法編碼視為不符 */ }
  return pages.findIndex(p => p.id === id);
};
let current = Math.max(0, pageFromHash());
const answers = new Map();
const states = new Map();
let cleanup;
// 對外介面：外掛層（如 deck-editor.js）只透過這裡與 story:render 事件取用閱讀器狀態，不直接讀內部變數。
window.storyReader = Object.freeze({
  get index() { return current; },
  get page() { return pages[current]; },
  refresh: () => renderPreviews(),
  snapshot: () => ({ title: document.title, pages: pages.map(p => ({ id: p.id, html: previewMarkup(p) })) }),
  preferences,
  annotations: Object.freeze({ setEditing: annotations.setEditing }),
  navigationDelta: preferences.navigationDelta,
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
    : `<button data-answer="${c.value}">${c.label}</button>`).join('')}</div><div class="feedback" ${preview ? '' : 'id="feedback"'}>${uiText('選一個答案，查看解說。', 'Pick an answer to see the explanation.')}</div>` : '';
  return `<div class="chapter">${p.section}</div><h1>${p.title}</h1><p class="lead">${p.lead}</p><section class="stage" aria-label="${uiText('圖解', 'Illustration')}">${preview ? (p.previewArt ?? p.art) : p.art}${question}</section><p class="point">${p.point}</p>${p.detail ? `<p class="detail">${p.detail}</p>` : ''}`;
}
function previewMarkup(p) {
  // ponytail: 限作者受信任的靜態 HTML；非 HTML sanitizer。複雜互動必須提供靜態 previewArt。
  return pageMarkup(p, true).replace(/\s+id="[^"]*"/g, '')
    .replace(/<button\b[^>]*>/g, '<span class="choice-copy">').replace(/<\/button>/g, '</span>')
    .replace(/<a\b[^>]*>/g, '<span>').replace(/<\/a>/g, '</span>');
}
// 題目頁設定 hideFuturePreviews 且尚未作答時，後面頁面的縮圖與標題以「?」代替。
const futureHidden = () => pages[current].question?.hideFuturePreviews && !answers.has(pages[current].id);
// 上一步／下一步只放文字；各頁縮圖由翻頁列頂端的拖動軸提供（createScrubber）。
function renderPreviews() {
  const hideFuture = futureHidden();
  readerScrubber.sync(); // 換頁、作答、edits 修改都經過這裡
  for (const [id, index, label] of [['prev', current - 1, uiText('← 上一步', '← Previous')], ['next', current === pages.length - 1 ? 0 : current + 1, current === pages.length - 1 ? uiText('↺ 重新看一次', '↺ Start over') : uiText('下一步 →', 'Next →')]]) {
    const button = document.getElementById(id), hidden = id === 'next' && hideFuture && index > current;
    const title = index < 0 ? uiText('從這裡開始', 'Start here') : hidden ? uiText('看看接下來發生什麼', 'See what happens next') : pages[index].title;
    button.className = 'preview';
    button.innerHTML = `<span class="preview-copy"><small>${label}</small><strong>${title}</strong></span>`;
  }
  readerOverview.refresh();
}
function feedback() {
  const p = pages[current], el = document.getElementById('feedback');
  const choice = p.question?.choices.find(c => c.value === answers.get(p.id));
  if (el && choice) el.textContent = choice.feedback;
  renderPreviews();
}
// 換頁轉場：效果取自進入頁的 transition，否則 story.transition，預設 slide。首次載入、同頁重繪、
// 瀏覽器不支援 View Transitions、讀者在設定關閉或系統要求減少動態時直接換頁。
// ponytail: 方向只比頁序，最後一頁按「重新看一次」回到首頁會以上一頁方向滑動。
let shown = -1;
function show() {
  const from = shown, effect = pages[current].transition ?? story.transition ?? 'slide';
  shown = current;
  if (from < 0 || from === current || effect === 'none' || !transitionsOn || !document.startViewTransition
    || matchMedia('(prefers-reduced-motion: reduce)').matches) return render();
  document.documentElement.dataset.transition = effect;
  document.documentElement.dataset.turn = current > from ? 'next' : 'prev';
  // 連續翻頁時前一個轉場被略過，ready 會 reject；畫面已由 render 更新，忽略即可。
  document.startViewTransition(render).ready.catch(() => {});
}
function render() {
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
  annotations.render(p.id);
  // replaceState：翻頁不堆進瀏覽器歷史，上一頁鍵仍回到前一個網站
  if (pageFromHash() !== current) try { history.replaceState(history.state, '', `#${encodeURIComponent(p.id)}`); } catch { /* 沙箱或不允許改網址時略過 */ }
}
window.addEventListener('hashchange', () => {
  const i = pageFromHash();
  if (i >= 0 && i !== current) { current = i; show(); window.scrollTo(0, 0); }
});
function move(delta) {
  current = delta > 0 && current === pages.length - 1 ? 0 : Math.max(0, Math.min(pages.length - 1, current + delta));
  show();
  window.scrollTo(0, 0);
}
document.getElementById('prev').onclick = () => move(-1);
document.getElementById('next').onclick = () => move(1);
// 導覽列空白處分左右兩半：左半上一頁、右半下一頁；按鈕與連結照常。
document.querySelector('body>nav').onclick = e => {
  // 用派送時的路徑判斷：按鈕翻頁後會重繪內容，e.target 已脫離 DOM。
  if (e.composedPath().some(el => el.matches?.('button, a, .progress, .scrub'))) return;
  const r = e.currentTarget.getBoundingClientRect();
  document.getElementById(e.clientX < r.left + r.width / 2 ? 'prev' : 'next').click();
};

// 放大播放：全螢幕 + 內容放大同時生效，離開全螢幕（含按 Esc）時自動還原。
const zoomButton = document.getElementById('zoom');
function setZoomed(on) {
  document.body.classList.toggle('is-zoomed', on);
  zoomButton.setAttribute('aria-pressed', String(on));
  zoomButton.textContent = on ? '🔎' : '🔍';
  zoomButton.title = on ? uiText('還原大小', 'Restore size') : uiText('放大投影片', 'Enlarge slides');
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

document.addEventListener('keydown', e => {
  const delta = preferences.navigationDelta(e);
  if (delta) { e.preventDefault(); move(delta); }
});
const readerScrubber = createScrubber();
const readerOverview = createOverview();
show();

// 拖動軸（YouTube 式）：翻頁列頂端一條分段軸，每頁一格，章節換段處間隔較寬。
// 滑過任一格顯示該頁縮圖與標題；按住拖曳時縮圖跟著格子，放開才跳頁（拖曳中不連續換頁與轉場）。
// 焦點在軸上時方向鍵、Home／End 跳頁。
function createScrubber() {
  const N = pages.length, plain = h => h.replace(/<[^>]*>/g, '');
  const bar = document.createElement('div');
  bar.className = 'scrub';
  bar.tabIndex = 0;
  bar.setAttribute('role', 'slider');
  bar.setAttribute('aria-label', uiText('頁面進度：拖曳或用方向鍵跳頁', 'Page progress: drag or use arrow keys to jump'));
  bar.setAttribute('aria-valuemin', '1');
  bar.setAttribute('aria-valuemax', String(N));
  bar.innerHTML = `<div class="scrub-track">${pages.map((p, i) => `<span class="scrub-seg${i && p.section !== pages[i - 1].section ? ' scrub-chapter' : ''}"></span>`).join('')}</div>`
    + '<div class="scrub-head" aria-hidden="true"></div>'
    + '<div class="scrub-tip" aria-hidden="true" hidden><div class="scrub-thumb"></div><div class="scrub-caption"><small></small><strong></strong></div></div>';
  document.querySelector('body>nav').prepend(bar);
  const segs = [...bar.querySelectorAll('.scrub-seg')], head = bar.querySelector('.scrub-head'), tip = bar.querySelector('.scrub-tip');
  // 先取好：縮圖內的頁面內容也可能有 small／strong。
  const thumb = tip.querySelector('.scrub-thumb'), meta = tip.querySelector('.scrub-caption small'), name = tip.querySelector('.scrub-caption strong');

  // 第 i 格中心（相對於軸的 px）；最近的一格（格子間距不等，不能用寬度平均換算）。
  const center = i => { const r = segs[i].getBoundingClientRect(); return r.left - bar.getBoundingClientRect().left + r.width / 2; };
  const indexAt = x => {
    const rel = x - bar.getBoundingClientRect().left;
    let best = 0;
    for (let i = 1; i < N; i++) if (Math.abs(center(i) - rel) < Math.abs(center(best) - rel)) best = i;
    return best;
  };
  const jump = i => { if (i !== current) { current = i; show(); window.scrollTo(0, 0); } };

  let dragging = false, target = -1, shownTip = -1;
  function sync() {
    segs.forEach((s, i) => { s.classList.toggle('is-past', i < current); s.classList.toggle('is-current', i === current); });
    if (!dragging) head.style.left = `${center(current)}px`;
    bar.setAttribute('aria-valuenow', String(current + 1));
    bar.setAttribute('aria-valuetext', `${current + 1} / ${N}：${plain(pages[current].title)}`);
    shownTip = -1; // 作答或 edits 改變後，下次重繪縮圖
  }
  function showTip(i) {
    segs.forEach((s, k) => s.classList.toggle('is-hover', k === i));
    if (i !== shownTip || tip.hidden) {
      shownTip = i;
      const p = pages[i], secret = i > current && futureHidden();
      thumb.innerHTML = secret ? '<span class="mini-placeholder">?</span>' : `<div class="mini-page">${previewMarkup(p)}</div>`;
      meta.textContent = `${i + 1} / ${N}${p.section && !secret ? ` · ${plain(p.section)}` : ''}`;
      name.innerHTML = secret ? uiText('繼續閱讀後揭曉', 'Revealed as you read on') : p.title;
      tip.hidden = false;
    }
    // 縮圖置中於該格，夾在軸的範圍內。
    tip.style.left = `${Math.max(0, Math.min(bar.clientWidth - tip.offsetWidth, center(i) - tip.offsetWidth / 2))}px`;
  }
  function hideTip() {
    tip.hidden = true;
    segs.forEach(s => s.classList.remove('is-hover'));
  }
  function drag(e) {
    const b = bar.getBoundingClientRect();
    target = indexAt(e.clientX);
    head.style.left = `${Math.max(0, Math.min(b.width, e.clientX - b.left))}px`;
    showTip(target);
  }
  bar.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    bar.setPointerCapture(e.pointerId);
    dragging = true;
    bar.classList.add('is-dragging');
    drag(e);
  });
  bar.addEventListener('pointermove', e => { if (dragging) drag(e); else if (e.pointerType === 'mouse') showTip(indexAt(e.clientX)); });
  const release = go => () => {
    if (!dragging) return;
    dragging = false;
    bar.classList.remove('is-dragging');
    if (go) jump(target);
    sync();
    if (!bar.matches(':hover')) hideTip();
  };
  bar.addEventListener('pointerup', release(true));
  bar.addEventListener('pointercancel', release(false));
  bar.addEventListener('pointerleave', () => { if (!dragging) hideTip(); });
  // 攔下方向鍵，避免文件層的翻頁鍵再翻一次。
  bar.addEventListener('keydown', e => {
    const to = { ArrowLeft: -1, ArrowDown: -1, PageUp: -1, ArrowRight: 1, ArrowUp: 1, PageDown: 1, Home: -N, End: N }[e.key];
    if (!to) return;
    e.preventDefault();
    e.stopPropagation();
    const i = Math.max(0, Math.min(N - 1, current + to));
    jump(i);
    showTip(i);
  });
  bar.addEventListener('blur', hideTip);
  new ResizeObserver(() => sync()).observe(bar);
  return { sync };
}

// 縮圖總覽：翻頁列的總覽鈕或 G 開啟全畫面縮圖格，點一下跳頁；Esc、✕ 或點遮罩關閉。
// 一個連續的格子，每章第一張上方標章節名稱。清單 #index-list 常駐，編輯層在項目上補註解數（deck-editor.js）。
function createOverview() {
  const plain = h => h.replace(/<[^>]*>/g, '');
  const button = Object.assign(document.createElement('button'), { type: 'button', className: 'reader-overview-toggle' });
  button.title = uiText('投影片總覽（G）', 'Slide overview (G)');
  button.setAttribute('aria-label', uiText('投影片總覽', 'Slide overview'));
  button.setAttribute('aria-haspopup', 'dialog');
  button.innerHTML = '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><rect x="2.5" y="2.5" width="15" height="9.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>'
    + '<rect x="2.5" y="14" width="4" height="3.5" rx="1" fill="currentColor"/><rect x="8" y="14" width="4" height="3.5" rx="1" fill="currentColor"/><rect x="13.5" y="14" width="4" height="3.5" rx="1" fill="currentColor"/></svg>';
  document.querySelector('.reader-playback-tools').append(button);

  const dialog = document.createElement('dialog');
  dialog.id = 'reader-overview';
  dialog.setAttribute('aria-labelledby', 'reader-overview-title');
  dialog.innerHTML = `<header><h2 id="reader-overview-title">${uiText('投影片總覽', 'Slide overview')}<small>${pages.length} ${uiText('頁', 'slides')}</small></h2>`
    + `<button type="button" data-close aria-label="${uiText('關閉', 'Close')}">✕</button></header>`
    + `<div class="reader-overview-body"><ol id="index-list" aria-label="${uiText('所有頁面', 'All pages')}"></ol></div>`;
  document.body.append(dialog);
  const list = dialog.querySelector('ol');

  // 每次開啟（與開著時作答、edits 修改）重畫，縮圖反映目前狀態；答題前後面的頁面以「?」代替。
  function render() {
    const hideFuture = futureHidden();
    list.innerHTML = pages.map((p, i) => {
      const hidden = hideFuture && i > current, chapter = (!i || p.section !== pages[i - 1].section) && !hidden ? p.section : '';
      const title = hidden ? uiText('繼續閱讀後揭曉', 'Revealed as you read on') : p.title;
      return `<li><span class="reader-overview-chapter">${chapter}</span>`
        + `<button type="button" class="reader-overview-item" data-page="${i}" ${i === current ? 'aria-current="page"' : ''} aria-label="${i + 1}：${plain(title)}">`
        + `<span class="reader-overview-thumb" aria-hidden="true">${hidden ? '<span class="mini-placeholder">?</span>' : `<span class="mini-page">${previewMarkup(p)}</span>`}</span>`
        + `<span class="reader-overview-meta"><b>${i + 1}</b>${title}</span></button></li>`;
    }).join('');
  }
  function open() {
    render();
    dialog.showModal();
    const cur = list.querySelector('[aria-current]');
    cur.scrollIntoView({ block: 'center' });
    cur.focus();
  }
  dialog.addEventListener('click', e => {
    const item = e.target.closest('[data-page]');
    if (item) {
      dialog.close();
      current = Number(item.dataset.page);
      show();
      window.scrollTo(0, 0);
      return;
    }
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
  });
  // 總覽內的按鍵不往文件層傳，避免背後的閱讀器跟著翻頁。
  dialog.addEventListener('keydown', e => e.stopPropagation());
  dialog.addEventListener('close', () => button.focus());
  button.addEventListener('click', open);
  document.addEventListener('keydown', e => {
    const typing = e.target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName);
    if (e.key.toLowerCase() === 'g' && !typing && !e.isComposing && !e.ctrlKey && !e.metaKey && !e.altKey && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      open();
    }
  });
  return { refresh: () => { if (dialog.open) render(); } };
}

// 設定模組：封裝對話框、草稿、驗證與翻頁鍵；不依賴編輯器的 DOM 或狀態。
// 留在同一支交付檔內，讓既有簡報更新核心後不必修改 script 清單。
function createPreferences() {
  const storageKey = 'agentdeck-navigation-keys';
  const keys = { prev: 'a', next: 'd' };
  const validKeys = value => value && /^[a-z]$/.test(value.prev) && /^[a-z]$/.test(value.next)
    && value.prev !== value.next && !/[encrpsg]/.test(value.prev + value.next);
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (validKeys(saved)) Object.assign(keys, saved);
  } catch { /* 無法讀取時採用預設值 */ }

  const dialog = document.createElement('dialog');
  dialog.id = 'reader-settings';
  dialog.setAttribute('aria-labelledby', 'reader-settings-title');
  dialog.innerHTML = `<form method="dialog">
    <div class="reader-settings-heading"><h2 id="reader-settings-title">${uiText('設定', 'Settings')}</h2>
    <p>${uiText('個人偏好儲存在此瀏覽器。', 'Preferences are saved in this browser.')}</p></div>
    <div class="reader-settings-content">
    <fieldset><legend>${uiText('基本操作', 'Basics')}</legend><p>${uiText('翻頁快捷鍵', 'Page-turn shortcuts')}</p>
      <label>${uiText('上一頁', 'Previous')} <input name="prev" maxlength="1" pattern="[a-zA-Z]" required></label>
      <label>${uiText('下一頁', 'Next')} <input name="next" maxlength="1" pattern="[a-zA-Z]" required></label>
      <p>${uiText('←／→ 固定保留。字母不可重複；E、N、C、R、P、S、G 為保留鍵。', '← / → always work. Letters must differ; E, N, C, R, P, S, G are reserved.')}</p>
    </fieldset>
    <details id="reader-personal-settings" hidden><summary>${uiText('個人客製', 'Personal')}</summary>
      <p>${uiText('調整換頁、朗讀、字幕與講者視窗。', 'Adjust page turns, read-aloud, captions, and the presenter window.')}</p>
    </details>
    </div>
    <div class="reader-settings-footer"><p role="status"></p>
    <div class="reader-settings-actions"><button type="button" data-reset title="${uiText('將所有設定填回預設值，儲存後套用', 'Fill in all defaults; applied when saved')}">${uiText('恢復預設', 'Reset')}</button>
      <button type="button" data-cancel>${uiText('取消', 'Cancel')}</button><button type="submit">${uiText('儲存', 'Save')}</button></div></div>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[role="status"]');
  const personal = dialog.querySelector('details');
  const controls = [];
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = uiText('設定', 'Settings');
  button.className = 'reader-settings-toggle';
  button.setAttribute('aria-haspopup', 'dialog');
  button.onclick = () => {
    for (const name of ['prev', 'next']) form.elements[name].value = keys[name];
    for (const { field, input } of controls) fill(input, field.get());
    status.textContent = '';
    dialog.showModal();
  };
  document.querySelector('body>header').append(button);
  dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
  dialog.querySelector('[data-reset]').onclick = () => {
    form.elements.prev.value = 'a';
    form.elements.next.value = 'd';
    for (const { field, input } of controls) fill(input, field.default);
    status.textContent = uiText('已填入預設值，儲存後套用。', 'Defaults filled in; applied when saved.');
  };
  function fill(input, value) {
    if (input.type === 'checkbox') input.checked = value;
    else input.value = String(value);
  }
  function read(input) {
    return input.type === 'checkbox' ? input.checked : Number(input.value);
  }
  form.onsubmit = e => {
    e.preventDefault();
    const value = { prev: form.elements.prev.value.toLowerCase(), next: form.elements.next.value.toLowerCase() };
    if (!validKeys(value)) {
      status.textContent = uiText('請使用不同且未保留的英文字母。', 'Use two different letters that are not reserved.');
      return;
    }
    // 所有欄位先驗證再套用，取消與恢復預設都只影響草稿。
    if (!form.reportValidity()) return;
    const values = controls.map(({ input }) => read(input));
    if (controls.some(({ field }, i) => field.options ? !field.options.includes(values[i])
      : field.type === 'number' && (!Number.isFinite(values[i]) || values[i] < field.min || values[i] > field.max))) return;
    Object.assign(keys, value);
    let persisted = true;
    try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch { persisted = false; }
    controls.forEach(({ field }, i) => { if (field.set(values[i]) === false) persisted = false; });
    if (!persisted) {
      status.textContent = uiText('已套用；部分設定無法儲存，重新整理後可能恢復原值。', 'Applied, but some settings could not be saved and may reset on reload.');
      return;
    }
    dialog.close();
  };

  return Object.freeze({
    get isOpen() { return dialog.open; },
    // 擴充功能只提供標籤、欄位與讀寫行為，不需操作設定視窗。
    // set 回傳 false 表示本次已套用，但持久儲存失敗。
    register({ title, fields, help }) {
      const group = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.textContent = title;
      group.append(legend);
      for (const field of fields) {
        const label = document.createElement('label');
        label.append(field.label);
        const input = document.createElement(field.options ? 'select' : 'input');
        input.setAttribute('aria-label', field.label);
        if (field.options) {
          for (const value of field.options) input.add(new Option(`${value}×`, String(value)));
        } else {
          input.type = field.type;
          if (field.type === 'number') { input.min = field.min; input.max = field.max; input.required = true; }
        }
        fill(input, field.get());
        label.append(input);
        group.append(label);
        controls.push({ field, input });
      }
      if (help) { const p = document.createElement('p'); p.textContent = help; group.append(p); }
      personal.append(group);
      personal.hidden = false;
    },
    navigationDelta(e) {
      if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || dialog.open
        || e.target.isContentEditable || e.target.closest?.('input, select, textarea, [role="slider"], [role="textbox"]')) return 0;
      const key = e.key.toLowerCase();
      if (key === keys.prev) return -1;
      if (key === keys.next) return 1;
      if (e.target.closest?.('button, a, summary')) return 0;
      return e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    },
  });
}

// 現場標示隨既有 reader.js 交付；不寫入 story、edits 或瀏覽器儲存。
function createAnnotations() {
  const root = document.getElementById('page');
  const ns = 'http://www.w3.org/2000/svg';
  const ink = document.createElementNS(ns, 'svg');
  ink.id = 'reader-ink';
  ink.setAttribute('aria-label', uiText('現場標示', 'Live annotations'));
  const laser = document.createElement('div');
  laser.id = 'reader-laser';
  laser.setAttribute('aria-hidden', 'true');
  const bar = document.createElement('div');
  bar.id = 'reader-drawing';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', uiText('播放標示工具', 'Annotation tools'));
  const icon = paths => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  bar.innerHTML = `<div class="reader-drawing-tools">
    <button type="button" data-mode="normal" aria-label="${uiText('一般操作', 'Pointer')}" title="${uiText('一般操作（Esc）', 'Pointer (Esc)')}" aria-pressed="true">${icon('<path d="m5 3 14 10-7 1-3 7z"/>')}<span>${uiText('游標', 'Pointer')}</span></button>
    <button type="button" data-mode="pen" aria-label="${uiText('畫筆', 'Pen')}" title="${uiText('畫筆', 'Pen')}" aria-pressed="false">${icon('<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/>')}<span>${uiText('畫筆', 'Pen')}</span></button>
    <button type="button" data-mode="text" aria-label="${uiText('文字框', 'Text box')}" title="${uiText('文字框：點選位置新增，雙擊既有文字修改', 'Text box: click to add, double-click existing text to edit')}" aria-pressed="false">${icon('<path d="M5 5h14M12 5v14M8 19h8M5 5v3m14-3v3"/>')}<span>${uiText('文字', 'Text')}</span></button>
    <button type="button" data-mode="laser" aria-label="${uiText('雷射筆', 'Laser pointer')}" title="${uiText('雷射筆', 'Laser pointer')}" aria-pressed="false">${icon('<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>')}<span>${uiText('雷射', 'Laser')}</span></button>
    <span class="reader-tool-divider" aria-hidden="true"></span>
    <details class="reader-pen-options"><summary aria-label="${uiText('畫筆選項', 'Pen options')}" title="${uiText('畫筆顏色與粗細', 'Pen color and width')}">${icon('<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>')}</summary>
      <div class="reader-pen-panel"><strong>${uiText('畫筆選項', 'Pen options')}</strong>
        <label>${uiText('顏色', 'Color')} <select aria-label="${uiText('畫筆顏色', 'Pen color')}"><option value="#dc2626">${uiText('紅色', 'Red')}</option><option value="#2563eb">${uiText('藍色', 'Blue')}</option><option value="#15803d">${uiText('綠色', 'Green')}</option></select></label>
        <label>${uiText('粗細', 'Width')} <select aria-label="${uiText('畫筆粗細', 'Pen width')}"><option value="3">${uiText('細', 'Thin')}</option><option value="6" selected>${uiText('中', 'Medium')}</option><option value="10">${uiText('粗', 'Thick')}</option></select></label>
        <small>${uiText('筆跡按頁暫存，重新整理後清空。', 'Ink is kept per page and cleared on reload.')}</small>
      </div>
    </details>
    <button type="button" data-undo aria-label="${uiText('復原上一筆', 'Undo')}" title="${uiText('移除最後新增的筆跡或文字框', 'Remove the last stroke or text box')}" disabled>${icon('<path d="m8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12h-3"/>')}</button>
    <button type="button" data-clear aria-label="${uiText('清除本頁', 'Clear page')}" title="${uiText('清除本頁筆跡與文字框', 'Clear ink and text boxes on this page')}" disabled>${icon('<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>')}</button>
    </div><span role="status" aria-live="polite"></span>`;
  const launcher = document.createElement('details');
  launcher.id = 'reader-tools-menu';
  launcher.innerHTML = `<summary aria-label="${uiText('標示工具', 'Annotation tools')}" title="${uiText('標示工具', 'Annotation tools')}">${icon('<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/>')}</summary>`;
  launcher.append(bar);
  const playbackTools = document.createElement('div');
  playbackTools.className = 'reader-playback-tools';
  const playback = document.getElementById('zoom');
  playback.replaceWith(playbackTools);
  playbackTools.append(playback, launcher);
  launcher.addEventListener('click', e => e.stopPropagation());
  launcher.addEventListener('keydown', e => {
    if (e.key === 'Escape') { launcher.open = false; launcher.querySelector('summary').focus(); }
  });
  document.body.append(ink, laser);
  // 工具列的空白、標籤與選單不觸發導覽列的左右翻頁。
  bar.addEventListener('click', e => e.stopPropagation());
  const status = bar.querySelector('[role=status]');
  const undo = bar.querySelector('[data-undo]'), clear = bar.querySelector('[data-clear]');
  const [color, width] = bar.querySelectorAll('select');
  const options = bar.querySelector('details');
  const sheets = new Map();
  let selected;
  const selection = document.createElement('div');
  selection.id = 'reader-text-selection';
  selection.hidden = true;
  selection.innerHTML = `<button type="button" aria-label="${uiText('調整文字框寬度', 'Resize text box')}" title="${uiText('拖曳調整寬度；方向鍵微調', 'Drag to resize; arrow keys to nudge')}">↔</button>`;
  const textTools = document.createElement('div');
  textTools.id = 'reader-text-tools';
  textTools.hidden = true;
  textTools.setAttribute('role', 'group');
  textTools.setAttribute('aria-label', uiText('文字框編輯', 'Text box editing'));
  textTools.innerHTML = `<label>${uiText('字級', 'Size')} <input type="number" aria-label="${uiText('文字框字級', 'Text box font size')}" min="12" max="64" step="1" value="22"></label>
    <select aria-label="${uiText('文字框顏色', 'Text box color')}"><option value="">${uiText('預設色', 'Default')}</option><option value="#dc2626">${uiText('紅色', 'Red')}</option><option value="#2563eb">${uiText('藍色', 'Blue')}</option><option value="#15803d">${uiText('綠色', 'Green')}</option></select>
    <button type="button" data-bold aria-label="${uiText('文字框粗體', 'Bold text')}" aria-pressed="false"><b>B</b></button>
    <button type="button" data-edit-text>${uiText('修改', 'Edit')}</button><button type="button" data-delete-text>${uiText('刪除', 'Delete')}</button>`;
  document.body.append(selection, textTools);
  const sizeInput = textTools.querySelector('input');
  const textColor = textTools.querySelector('select');
  const bold = textTools.querySelector('[data-bold]');
  function positionSelection() {
    if (!selected?.isConnected) { selectText(null); return; }
    const r = selected.getBoundingClientRect();
    Object.assign(selection.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    const w = textTools.offsetWidth, h = textTools.offsetHeight;
    const navTop = document.querySelector('body>nav').getBoundingClientRect().top;
    Object.assign(textTools.style, { left: `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`, top: `${Math.max(8, Math.min(r.top - h - 8, navTop - h - 8))}px` });
  }
  function selectText(box) {
    selected = box;
    selection.hidden = textTools.hidden = !box;
    if (!box) return;
    const style = box.firstElementChild.style;
    sizeInput.value = parseFloat(style.fontSize) || 22;
    textColor.value = box.dataset.color || '';
    bold.setAttribute('aria-pressed', String(style.fontWeight === '700'));
    positionSelection();
  }
  function fitText(box) {
    box.firstElementChild.style.maxHeight = `${Math.min(360, root.offsetHeight - 24)}px`;
    const height = box.firstElementChild.offsetHeight;
    box.setAttribute('height', height);
    box.setAttribute('y', Math.max(0, Math.min(Number(box.getAttribute('y')), root.offsetHeight - height - 12)));
    if (selected === box) positionSelection();
  }
  function editText(box, x, y) {
    textTarget = { x, y, box, page: pageId };
    textInput.value = box?.textContent || '';
    textDialog.returnValue = '';
    textDialog.showModal();
    textInput.focus();
  }
  function deleteText() {
    if (!selected) return;
    end();
    sheet().strokes = sheet().strokes.filter(item => item !== selected);
    selected.remove();
    selectText(null);
    controls();
  }
  sizeInput.onchange = () => {
    if (!selected) return;
    const value = sizeInput.valueAsNumber;
    if (!Number.isFinite(value) || value < 12 || value > 64) { sizeInput.value = parseFloat(selected.firstElementChild.style.fontSize) || 22; return; }
    selected.firstElementChild.style.fontSize = `${value}px`;
    fitText(selected);
  };
  textColor.onchange = () => {
    if (!selected) return;
    selected.dataset.color = textColor.value;
    selected.firstElementChild.style.color = textColor.value;
  };
  bold.onclick = () => {
    if (!selected) return;
    const on = bold.getAttribute('aria-pressed') !== 'true';
    selected.firstElementChild.style.fontWeight = on ? '700' : '400';
    bold.setAttribute('aria-pressed', String(on));
    fitText(selected);
  };
  textTools.querySelector('[data-edit-text]').onclick = () => { if (selected) editText(selected); };
  textTools.querySelector('[data-delete-text]').onclick = deleteText;
  function startTextDrag(e, box, resize = false) {
    if (editing || !['normal', 'text'].includes(mode) || active || !e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    selectText(box);
    box.focus({ preventScroll: true });
    const [px, py] = point(e).split(',').map(Number);
    active = { id: e.pointerId, box, resize, px, py, x: Number(box.getAttribute('x')), y: Number(box.getAttribute('y')), width: Number(box.getAttribute('width')) };
    if (resize) ink.setPointerCapture(e.pointerId);
  }
  selection.querySelector('button').onpointerdown = e => { if (selected) startTextDrag(e, selected, true); };
  selection.querySelector('button').onkeydown = e => {
    if (!selected || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    selected.setAttribute('width', Math.max(100, Math.min(root.offsetWidth - Number(selected.getAttribute('x')), Number(selected.getAttribute('width')) + (e.key === 'ArrowRight' ? 10 : -10))));
    fitText(selected);
  };
  ink.addEventListener('focusin', e => {
    if (e.target.matches?.('.reader-text-box') && !editing && ['normal', 'text'].includes(mode)) selectText(e.target);
  });
  ink.addEventListener('keydown', e => {
    if (!selected || e.target !== selected || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); editText(selected); }
  });
  ink.addEventListener('dblclick', e => {
    const box = e.target.closest?.('.reader-text-box');
    if (box && !editing && ['normal', 'text'].includes(mode)) { e.preventDefault(); end(); editText(box); }
  });

  let textTarget;
  const textDialog = document.createElement('dialog');
  textDialog.id = 'reader-text-dialog';
  textDialog.setAttribute('aria-labelledby', 'reader-text-title');
  textDialog.innerHTML = `<form method="dialog"><h2 id="reader-text-title">${uiText('文字框', 'Text box')}</h2><textarea aria-label="${uiText('文字框內容', 'Text box content')}" rows="4" maxlength="1000" placeholder="${uiText('輸入要標示的文字…', 'Type your note…')}" required></textarea><p>${uiText('雙擊投影片上的文字框可再次修改。重新整理後清空。', 'Double-click a text box on the slide to edit it again. Cleared on reload.')}</p><div><button value="cancel" formnovalidate>${uiText('取消', 'Cancel')}</button><button value="save">${uiText('完成', 'Done')}</button></div></form>`;
  document.body.append(textDialog);
  const textInput = textDialog.querySelector('textarea');
  textDialog.addEventListener('keydown', e => e.stopPropagation());
  textDialog.addEventListener('close', () => {
    if (textDialog.returnValue === 'save' && textInput.value.trim() && textTarget?.page === pageId) {
      const box = textTarget.box || document.createElementNS(ns, 'foreignObject');
      if (!textTarget.box) {
        box.classList.add('reader-text-box');
        box.setAttribute('tabindex', '0');
        box.setAttribute('role', 'group');
        const boxWidth = Math.min(260, root.offsetWidth - 24);
        box.setAttribute('x', Math.max(0, Math.min(textTarget.x, root.offsetWidth - boxWidth)));
        box.setAttribute('y', Math.max(0, Math.min(textTarget.y, root.offsetHeight - 60)));
        box.setAttribute('width', boxWidth);
        box.setAttribute('height', 1);
        const content = document.createElement('div');
        box.append(content);
        ink.append(box);
        sheet().strokes.push(box);
      }
      box.firstElementChild.textContent = textInput.value.trim();
      box.setAttribute('aria-label', `${uiText('文字框：', 'Text box: ')}${textInput.value.trim()}`);
      fitText(box);
      selectText(box);
      controls();
    }
    textTarget = undefined;
  });
  let pageId, mode = 'normal', editing = false, active, frame, noticeTimer;
  const buttons = [...bar.querySelectorAll('[data-mode]')];
  const sheet = () => sheets.get(pageId);
  function controls() {
    undo.disabled = clear.disabled = editing || !sheet()?.strokes.length;
  }
  function end() {
    if (!active) return;
    const id = active.id;
    active = undefined;
    if (ink.hasPointerCapture(id)) ink.releasePointerCapture(id);
    controls();
  }
  function hideLaser() { laser.replaceChildren(); }
  function setMode(next) {
    end();
    hideLaser();
    selectText(null);
    mode = editing ? 'normal' : next;
    launcher.dataset.activeMode = mode;
    launcher.querySelector('summary').title = uiZh ? `標示工具（${{ normal: '游標', pen: '畫筆', text: '文字框', laser: '雷射' }[mode]}）` : `Annotation tools (${{ normal: 'pointer', pen: 'pen', text: 'text box', laser: 'laser' }[mode]})`;
    ink.classList.toggle('is-drawing', mode === 'pen' || mode === 'text');
    ink.classList.toggle('is-text', mode === 'text');
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    if (mode !== 'pen') options.open = false;
    clearTimeout(noticeTimer);
    status.textContent = '';
  }
  options.addEventListener('toggle', () => { if (options.open) setMode('pen'); });
  setMode('normal');
  for (const button of buttons) button.onclick = () => setMode(button.dataset.mode);
  undo.onclick = () => { end(); const removed = sheet().strokes.pop(); removed?.remove(); if (selected === removed) selectText(null); controls(); };
  clear.onclick = () => { end(); selectText(null); sheet().strokes.length = 0; ink.replaceChildren(); controls(); };
  function layout() {
    frame = undefined;
    if (!sheet()) return;
    const rect = root.getBoundingClientRect();
    const w = root.offsetWidth, h = root.offsetHeight;
    // ponytail: 追蹤內容區尺寸與字級；不追蹤任意動畫或同尺寸元件內部重排。
    const signature = [w, h, ...[...root.children].flatMap(el => {
      const sameParent = el.offsetParent === root.offsetParent;
      return [el.offsetLeft - (sameParent ? root.offsetLeft : 0), el.offsetTop - (sameParent ? root.offsetTop : 0), el.offsetWidth, el.offsetHeight, parseFloat(getComputedStyle(el).fontSize)];
    })];
    const previous = sheet().signature;
    if (previous && (previous.length !== signature.length || signature.some((n, i) => Math.abs(n - previous[i]) > 1)) && sheet().strokes.length) {
      end();
      selectText(null);
      if (textDialog.open) textDialog.close('cancel');
      sheet().strokes.length = 0;
      ink.replaceChildren();
      options.open = false;
      clearTimeout(noticeTimer);
      status.textContent = uiText('版面已重新排列，已清除本頁標示。', 'Layout changed; annotations on this page were cleared.');
      noticeTimer = setTimeout(() => { status.textContent = ''; }, 4000);
      controls();
    }
    sheet().signature = signature;
    ink.setAttribute('viewBox', `0 0 ${w || 1} ${h || 1}`);
    Object.assign(ink.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    if (selected) positionSelection();
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(layout); }
  new ResizeObserver(schedule).observe(root);
  window.addEventListener('resize', () => { hideLaser(); schedule(); });
  window.addEventListener('scroll', () => { hideLaser(); schedule(); }, true);
  document.addEventListener('fullscreenchange', () => { hideLaser(); schedule(); });
  // zoom 與側欄可只改變視覺座標，不一定觸發內容尺寸 observer。
  new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
  function point(e) {
    const r = ink.getBoundingClientRect();
    return `${Math.max(0, Math.min(root.offsetWidth, (e.clientX - r.left) * root.offsetWidth / r.width)).toFixed(2)},${Math.max(0, Math.min(root.offsetHeight, (e.clientY - r.top) * root.offsetHeight / r.height)).toFixed(2)}`;
  }
  ink.addEventListener('pointerdown', e => {
    const hit = e.target.closest?.('.reader-text-box');
    if (hit && ['normal', 'text'].includes(mode)) { startTextDrag(e, hit); return; }
    if (!['pen', 'text'].includes(mode) || active || !e.isPrimary || e.button !== 0) return;
    layout();
    e.preventDefault();
    if (mode === 'text') {
      const [x, y] = point(e).split(',').map(Number);
      selectText(null);
      editText(null, x, y);
      return;
    }
    const line = document.createElementNS(ns, 'polyline');
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', color.value);
    line.setAttribute('stroke-width', width.value);
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');
    const start = point(e);
    line.setAttribute('points', `${start} ${start}`);
    ink.append(line);
    sheet().strokes.push(line);
    active = { id: e.pointerId, line };
    ink.setPointerCapture(e.pointerId);
    controls();
  });
  ink.addEventListener('pointermove', e => {
    if (!active || e.pointerId !== active.id) return;
    if (active.box) {
      const [px, py] = point(e).split(',').map(Number);
      const { box, x, y } = active;
      if (!ink.hasPointerCapture(e.pointerId)) {
        if (Math.hypot(px - active.px, py - active.py) < 3) return;
        ink.setPointerCapture(e.pointerId);
      }
      if (active.resize) box.setAttribute('width', Math.max(100, Math.min(root.offsetWidth - x, active.width + px - active.px)));
      else {
        box.setAttribute('x', Math.max(0, Math.min(root.offsetWidth - Number(box.getAttribute('width')), x + px - active.px)));
        box.setAttribute('y', Math.max(0, Math.min(root.offsetHeight - Number(box.getAttribute('height')), y + py - active.py)));
      }
      fitText(box);
      return;
    }
    const points = (e.getCoalescedEvents?.() || []);
    if (!points.length) points.push(e);
    active.line.setAttribute('points', `${active.line.getAttribute('points')} ${points.map(point).join(' ')}`);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) ink.addEventListener(event, e => { if (active?.id === e.pointerId) end(); });
  document.addEventListener('pointermove', e => {
    if (mode !== 'laser' || preferences.isOpen || !e.isPrimary || (!root.contains(e.target) && !ink.contains(e.target))) { hideLaser(); return; }
    let head = laser.querySelector('b');
    if (!head) { head = document.createElement('b'); laser.append(head); }
    Object.assign(head.style, { left: `${e.clientX}px`, top: `${e.clientY}px` });
  });
  document.addEventListener('pointerdown', e => {
    if (!options.contains(e.target)) options.open = false;
    if (selected && !selected.contains(e.target) && !selection.contains(e.target) && !textTools.contains(e.target) && !textDialog.contains(e.target)) selectText(null);
  });
  document.documentElement.addEventListener('pointerleave', hideLaser);
  window.addEventListener('blur', () => { end(); hideLaser(); });
  document.addEventListener('visibilitychange', () => { end(); hideLaser(); });
  document.addEventListener('keydown', e => {
    const typing = e.target.isContentEditable || e.target.closest?.('input, select, textarea');
    if (selected && !typing && !e.isComposing && !e.ctrlKey && !e.metaKey && !e.altKey && !preferences.isOpen && ['Delete', 'Backspace'].includes(e.key)) { e.preventDefault(); deleteText(); return; }
    if (e.key === 'Escape' && selected && !e.isComposing && !preferences.isOpen) { e.preventDefault(); selectText(null); }
    if (e.key === 'Escape' && !e.isComposing && !preferences.isOpen && mode !== 'normal') {
      e.preventDefault();
      setMode('normal');
    }
  });
  return {
    render(id) {
      end(); hideLaser(); selectText(null);
      if (textDialog.open) textDialog.close('cancel');
      pageId = id;
      if (!sheet()) sheets.set(id, { strokes: [] });
      ink.replaceChildren(...sheet().strokes);
      layout();
      controls();
    },
    setEditing(on) {
      editing = on;
      if (on) setMode('normal');
      options.hidden = on;
      for (const button of buttons) button.disabled = on && button.dataset.mode !== 'normal';
      controls();
    },
  };
}
