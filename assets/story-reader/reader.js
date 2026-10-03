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

const preferences = createPreferences();
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
  if (e.composedPath().some(el => el.matches?.('button, a, .progress'))) return;
  const r = e.currentTarget.getBoundingClientRect();
  document.getElementById(e.clientX < r.left + r.width / 2 ? 'prev' : 'next').click();
};

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
  const delta = preferences.navigationDelta(e);
  if (delta) { e.preventDefault(); move(delta); }
});
show();

// 設定模組：封裝對話框、草稿、驗證與翻頁鍵；不依賴編輯器的 DOM 或狀態。
// 留在同一支交付檔內，讓既有簡報更新核心後不必修改 script 清單。
function createPreferences() {
  const storageKey = 'agentdeck-navigation-keys';
  const keys = { prev: 'a', next: 'd' };
  const validKeys = value => value && /^[a-z]$/.test(value.prev) && /^[a-z]$/.test(value.next)
    && value.prev !== value.next && !/[encrps]/.test(value.prev + value.next);
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (validKeys(saved)) Object.assign(keys, saved);
  } catch { /* 無法讀取時採用預設值 */ }

  const dialog = document.createElement('dialog');
  dialog.id = 'reader-settings';
  dialog.setAttribute('aria-labelledby', 'reader-settings-title');
  dialog.innerHTML = `<form method="dialog">
    <div class="reader-settings-heading"><h2 id="reader-settings-title">設定</h2>
    <p>個人偏好儲存在此瀏覽器。</p></div>
    <div class="reader-settings-content">
    <fieldset><legend>基本操作</legend><p>翻頁快捷鍵</p>
      <label>上一頁 <input name="prev" maxlength="1" pattern="[a-zA-Z]" required></label>
      <label>下一頁 <input name="next" maxlength="1" pattern="[a-zA-Z]" required></label>
      <p>←／→ 固定保留。字母不可重複；E、N、C、R、P、S 為保留鍵。</p>
    </fieldset>
    <details id="reader-personal-settings" hidden><summary>個人客製</summary>
      <p>調整朗讀、字幕與講者視窗。</p>
    </details>
    </div>
    <div class="reader-settings-footer"><p role="status"></p>
    <div class="reader-settings-actions"><button type="button" data-reset title="將所有設定填回預設值，儲存後套用">恢復預設</button>
      <button type="button" data-cancel>取消</button><button type="submit">儲存</button></div></div>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[role="status"]');
  const personal = dialog.querySelector('details');
  const controls = [];
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '設定';
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
    status.textContent = '已填入預設值，儲存後套用。';
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
      status.textContent = '請使用不同且未保留的英文字母。';
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
      status.textContent = '已套用；部分設定無法儲存，重新整理後可能恢復原值。';
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
  ink.setAttribute('aria-label', '現場標示');
  const laser = document.createElement('div');
  laser.id = 'reader-laser';
  laser.setAttribute('aria-hidden', 'true');
  const bar = document.createElement('div');
  bar.id = 'reader-drawing';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', '播放標示工具');
  const icon = paths => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  bar.innerHTML = `<div class="reader-drawing-tools">
    <button type="button" data-mode="normal" aria-label="一般操作" title="一般操作（Esc）" aria-pressed="true">${icon('<path d="m5 3 14 10-7 1-3 7z"/>')}<span>游標</span></button>
    <button type="button" data-mode="pen" aria-label="畫筆" title="畫筆" aria-pressed="false">${icon('<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/>')}<span>畫筆</span></button>
    <button type="button" data-mode="text" aria-label="文字框" title="文字框：點選位置新增，雙擊既有文字修改" aria-pressed="false">${icon('<path d="M5 5h14M12 5v14M8 19h8M5 5v3m14-3v3"/>')}<span>文字</span></button>
    <button type="button" data-mode="laser" aria-label="雷射筆" title="雷射筆" aria-pressed="false">${icon('<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>')}<span>雷射</span></button>
    <span class="reader-tool-divider" aria-hidden="true"></span>
    <details class="reader-pen-options"><summary aria-label="畫筆選項" title="畫筆顏色與粗細">${icon('<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>')}</summary>
      <div class="reader-pen-panel"><strong>畫筆選項</strong>
        <label>顏色 <select aria-label="畫筆顏色"><option value="#dc2626">紅色</option><option value="#2563eb">藍色</option><option value="#15803d">綠色</option></select></label>
        <label>粗細 <select aria-label="畫筆粗細"><option value="3">細</option><option value="6" selected>中</option><option value="10">粗</option></select></label>
        <small>筆跡按頁暫存，重新整理後清空。</small>
      </div>
    </details>
    <button type="button" data-undo aria-label="復原上一筆" title="移除最後新增的筆跡或文字框" disabled>${icon('<path d="m8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12h-3"/>')}</button>
    <button type="button" data-clear aria-label="清除本頁" title="清除本頁筆跡與文字框" disabled>${icon('<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>')}</button>
    </div><span role="status" aria-live="polite"></span>`;
  const launcher = document.createElement('details');
  launcher.id = 'reader-tools-menu';
  launcher.innerHTML = `<summary aria-label="標示工具" title="標示工具">${icon('<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/>')}</summary>`;
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
  selection.innerHTML = '<button type="button" aria-label="調整文字框寬度" title="拖曳調整寬度；方向鍵微調">↔</button>';
  const textTools = document.createElement('div');
  textTools.id = 'reader-text-tools';
  textTools.hidden = true;
  textTools.setAttribute('role', 'group');
  textTools.setAttribute('aria-label', '文字框編輯');
  textTools.innerHTML = `<label>字級 <input type="number" aria-label="文字框字級" min="12" max="64" step="1" value="22"></label>
    <select aria-label="文字框顏色"><option value="">預設色</option><option value="#dc2626">紅色</option><option value="#2563eb">藍色</option><option value="#15803d">綠色</option></select>
    <button type="button" data-bold aria-label="文字框粗體" aria-pressed="false"><b>B</b></button>
    <button type="button" data-edit-text>修改</button><button type="button" data-delete-text>刪除</button>`;
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
  textDialog.innerHTML = `<form method="dialog"><h2 id="reader-text-title">文字框</h2><textarea aria-label="文字框內容" rows="4" maxlength="1000" placeholder="輸入要標示的文字…" required></textarea><p>雙擊投影片上的文字框可再次修改。重新整理後清空。</p><div><button value="cancel" formnovalidate>取消</button><button value="save">完成</button></div></form>`;
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
      box.setAttribute('aria-label', `文字框：${textInput.value.trim()}`);
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
    launcher.querySelector('summary').title = `標示工具（${{ normal: '游標', pen: '畫筆', text: '文字框', laser: '雷射' }[mode]}）`;
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
      status.textContent = '版面已重新排列，已清除本頁標示。';
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
  new MutationObserver(schedule).observe(document.getElementById('index'), { attributes: true, subtree: true, attributeFilter: ['open', 'aria-pressed'] });
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
