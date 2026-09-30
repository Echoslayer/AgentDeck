/* 編輯層：把「可人工編輯」與「需改寫程式」的內容分開。
   - story.js（作者／程式維護）：顯示元件、互動 mount 的內容一律鎖定。
   - edits.js（人工編輯）：只存文字、位置與隱藏狀態，由頁首「另存」產生。
   識別：data-key="x" 為元件身分（每頁唯一），edits.js 以此對應（docs/adr/0005）。
        漏加時退回位置 key（@序號），調整 art 順序後需重新檢查。舊式 data-edit="x"／data-move="x" 的值仍視為 key。
   開關（不帶值）：data-edit 可編輯文字（允許粗體、斜體、換行、清單）；
        data-move 可拖曳，僅建議用在絕對定位版面（封面、結尾）；
        data-hide 開放子元件單獨隱藏（第一層元件預設即可隱藏）。
   隱藏：編輯模式下，欄位、舞台第一層元件（標記 data-canvas 的畫布版面以畫布內元件為單位）與 data-hide 元件都可隱藏。
   缺 data-key（退回位置 key）或 key 重複的元件，在編輯模式下以橘框標示（docs/adr/0007）。
   key 為 section／title／lead／point／detail 時，同時改寫該頁欄位，索引與縮圖文字會同步。
   預設不保存：未另存的修改在重新整理後消失。
   與閱讀器只透過 window.storyReader 與 story:render 事件溝通（docs/adr/0008）。
   載入順序：deck-core.js → [元件 js] → story.js → edits.js → deck-editor.js → reader.js */
'use strict';
(() => {
  const FIELDS = { section: '.chapter', title: 'h1', lead: '.lead', point: '.point', detail: '.detail' };
  const CANVAS = '[data-canvas]';
  const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'BR', 'UL', 'OL', 'LI', 'DIV', 'P', 'SPAN', 'SUB', 'SUP']);
  const DROPPED = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'IMG', 'SVG', 'VIDEO', 'AUDIO']);
  const FIELD_MARK = '<span data-field-hidden></span>';
  const edits = structuredClone(window.storyEdits || {});
  edits.pages ??= {};
  let dirty = false;
  let editing = false;
  let targets = [];
  const keyOf = new WeakMap();

  // 僅保留簡單格式標籤並移除所有屬性，避免人工內容夾帶樣式、事件或破壞版面。
  function sanitize(html) {
    const t = document.createElement('template');
    t.innerHTML = html;
    const walk = node => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) continue;
        if (child.nodeType !== Node.ELEMENT_NODE || child.hasAttribute('data-editor-ui') || child.hasAttribute('data-field-hidden') || DROPPED.has(child.tagName)) { child.remove(); continue; }
        walk(child);
        if (!ALLOWED.has(child.tagName)) { child.replaceWith(...child.childNodes); continue; }
        for (const a of [...child.attributes]) child.removeAttribute(a.name);
      }
    };
    walk(t.content);
    return t.innerHTML.trim();
  }

  // data-key 優先；舊式 data-edit="x"／data-move="x" 的值作為相容後援。
  const keyAttr = el => el.dataset.key || el.dataset.edit || el.dataset.move || '';

  // 位置 key：從舞台（art 根）起算的子元素序號鏈，例如 @0.3 或 @1.2.0。
  function pathOf(el, stage) {
    const idx = [];
    for (let n = el; n && n !== stage; n = n.parentElement) idx.unshift([...n.parentElement.children].indexOf(n));
    return `@${idx.join('.')}`;
  }

  function findIn(content, key, allowPath) {
    if (key.startsWith('@')) {
      if (!allowPath) return [];
      let el = content;
      for (const i of key.slice(1).split('.').map(Number)) el = el?.children[i];
      return el && el !== content ? [el] : [];
    }
    return [...content.querySelectorAll('[data-key],[data-edit],[data-move]')].filter(el => keyAttr(el) === key);
  }

  function patchHtml(html, key, ov, allowPath) {
    if (typeof html !== 'string') return html;
    const t = document.createElement('template');
    t.innerHTML = html;
    const found = findIn(t.content, key, allowPath);
    for (const el of found) {
      if (ov.html !== undefined && el.hasAttribute('data-edit')) el.innerHTML = ov.html;
      if (ov.x !== undefined && el.hasAttribute('data-move')) el.style.translate = `${ov.x}cqw ${ov.y}cqw`;
      el.toggleAttribute('data-hidden', !!ov.hidden);
    }
    return found.length ? t.innerHTML : html;
  }

  const original = new Map();
  for (const p of story.pages) for (const f in FIELDS) original.set(`${p.id}|${f}`, p[f]);

  function applyPage(p, key, ov) {
    if (key in FIELDS) {
      const base = ov.html ?? original.get(`${p.id}|${key}`);
      // 欄位由 reader 產生，無法加屬性；以開頭的標記 span 讓 CSS 隱藏整個欄位。
      if (typeof base === 'string') p[key] = (ov.hidden ? FIELD_MARK : '') + base;
    }
    p.art = patchHtml(p.art, key, ov, true);
    // previewArt 結構與 art 不同，位置 key 不適用。
    if (p.previewArt !== undefined) p.previewArt = patchHtml(p.previewArt, key, ov, false);
  }

  // 在 reader 渲染前套用 edits.js，縮圖與索引因此也看得到人工修改。
  if (typeof edits.label === 'string') story.label = edits.label;
  for (const p of story.pages) {
    for (const [key, ov] of Object.entries(edits.pages[p.id] || {})) applyPage(p, key, ov);
  }

  // window.storyReader 由稍後載入的 reader.js 提供，只在事件發生時取用。
  const currentPage = () => window.storyReader.page;
  const refreshPreviews = () => window.storyReader.refresh();
  const overrideOf = key => edits.pages[currentPage().id]?.[key] || {};

  function record(key, patch) {
    const p = currentPage();
    const pageEdits = edits.pages[p.id] ??= {};
    const ov = pageEdits[key] ??= {};
    Object.assign(ov, patch);
    applyPage(p, key, ov);
    setDirty(true);
  }

  function setDirty(value) {
    dirty = value;
    document.getElementById('edit-save').textContent = dirty ? '另存 ●' : '另存';
    syncBar();
  }

  function syncBar() {
    document.getElementById('edit-save').hidden = !(editing || dirty);
    document.getElementById('edit-discard').hidden = !dirty;
  }

  function positionAnchor(el) {
    if (getComputedStyle(el).position === 'static') el.classList.add('deck-rel');
  }

  // 收集本頁可隱藏元件：[元素, key, 是否欄位, 是否可編輯文字]。
  function collectTargets(root) {
    const list = [];
    for (const [key, sel] of Object.entries(FIELDS)) {
      const el = root.querySelector(`:scope>${sel}`);
      if (el && getComputedStyle(el).display !== 'none') list.push({ el, key, field: true, text: true });
    }
    const stage = root.querySelector(':scope>.stage');
    const t = document.createElement('template');
    t.innerHTML = currentPage().art;
    const artCount = t.content.children.length;
    [...(stage?.children || [])].slice(0, artCount).forEach((top, i) => {
      const items = top.matches(CANVAS) ? [...top.children].map((c, j) => [c, `@${i}.${j}`]) : [[top, `@${i}`]];
      for (const [el, path] of items) {
        if (el.hasAttribute('data-editor-ui')) continue;
        list.push({ el, key: keyAttr(el) || path, field: false, text: el.hasAttribute('data-edit') });
      }
    });
    stage?.querySelectorAll('[data-edit],[data-move],[data-hide]').forEach(el => {
      if (list.some(x => x.el === el)) return;
      list.push({ el, key: keyAttr(el) || pathOf(el, stage), field: false, text: el.hasAttribute('data-edit'), noHide: !el.hasAttribute('data-hide') });
    });
    markKeyProblems(list);
    return list;
  }

  // 位置 key 在元件順序變動後會對錯，重複 key 會讓修正套到多個元件；只在編輯模式標示，不影響播放。
  function markKeyProblems(list) {
    const count = new Map();
    for (const t of list) if (!t.field) count.set(t.key, (count.get(t.key) || 0) + 1);
    for (const t of list) {
      if (t.field) continue;
      if (t.key.startsWith('@')) t.warn = `缺少 data-key，以位置 ${t.key} 記錄；元件順序變動後可能對錯`;
      else if (count.get(t.key) > 1) t.warn = `data-key="${t.key}" 在本頁重複`;
      if (t.warn) t.el.classList.add('deck-keywarn');
    }
  }

  function decorate() {
    undecorate();
    const root = document.getElementById('page');
    targets = collectTargets(root);
    for (const t of targets) {
      if (t.text) {
        keyOf.set(t.el, t.key);
        t.el.contentEditable = 'true';
        t.el.classList.add('deck-editable');
      }
    }
    ensureUi();
    const label = document.getElementById('story-label');
    label.contentEditable = 'true';
    label.classList.add('deck-editable');
  }

  function undecorate() {
    document.querySelectorAll('.deck-editable').forEach(el => { el.removeAttribute('contenteditable'); el.classList.remove('deck-editable'); });
    document.querySelectorAll('[data-editor-ui]').forEach(h => h.remove());
    document.querySelectorAll('.deck-rel').forEach(el => el.classList.remove('deck-rel'));
    document.querySelectorAll('.deck-keywarn').forEach(el => el.classList.remove('deck-keywarn'));
    targets = [];
  }

  // 編輯按鈕可能被全選改寫或 mount 重繪刪掉，每次 DOM 變動後補回。
  function ensureUi() {
    for (const t of targets) {
      if (!t.el.isConnected) continue;
      if (!t.noHide && !(t.toggle?.isConnected)) t.toggle = addHideToggle(t);
      if (t.el.hasAttribute('data-move') && !(t.handle?.isConnected)) t.handle = addHandle(t.el, t.key);
    }
    const placed = [];
    for (const t of targets) if (t.toggle?.isConnected) placeToggle(t, placed);
  }

  function addHideToggle(t) {
    // 用 span 而非 button：可編輯區內含 <button> 時，Chromium 的 Ctrl+A 會失效。
    const btn = document.createElement('span');
    btn.setAttribute('role', 'button');
    btn.tabIndex = 0;
    btn.className = 'deck-hide-toggle';
    btn.dataset.editorUi = '';
    btn.dataset.for = t.key;
    btn.contentEditable = 'false';
    const sync = () => {
      const hidden = !!overrideOf(t.key).hidden;
      btn.textContent = hidden ? '⊘' : '👁';
      btn.title = (hidden ? '顯示此元件' : '隱藏此元件') + (t.warn ? `\n⚠ ${t.warn}` : '');
      btn.classList.toggle('deck-keywarn-toggle', !!t.warn);
      btn.setAttribute('aria-pressed', String(hidden));
    };
    sync();
    btn.addEventListener('pointerdown', e => e.preventDefault());
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); btn.click(); } });
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const hidden = !overrideOf(t.key).hidden;
      record(t.key, { hidden });
      for (const other of targets.filter(x => x.key === t.key)) {
        if (other.field) {
          const mark = other.el.querySelector(':scope>[data-field-hidden]');
          if (hidden && !mark) other.el.insertAdjacentHTML('afterbegin', FIELD_MARK);
          if (!hidden) mark?.remove();
        } else other.el.toggleAttribute('data-hidden', hidden);
      }
      sync();
      refreshPreviews();
    });
    // 按鈕一律放在父層：不改動元件自身的子元素（避免破壞 :last-child 等樣式，也不會被 mount 重繪刪掉）。
    const parent = t.el.parentElement;
    positionAnchor(parent);
    parent.append(btn);
    return btn;
  }

  // 以百分比對齊元件右上角，並夾在父層範圍內，避免被 overflow:hidden 裁掉；與已放置的按鈕重疊時往左讓位。
  function placeToggle(t, placed) {
    const parent = t.toggle.parentElement;
    const pr = parent.getBoundingClientRect(), r = t.el.getBoundingClientRect();
    if (!pr.width || !pr.height) return;
    let x = Math.min(Math.max(r.right - pr.left, 14), pr.width - 14);
    const y = Math.min(Math.max(r.top - pr.top, 14), pr.height - 14);
    while (x > 14 && placed.some(q => Math.abs(q.x - (pr.left + x)) < 26 && Math.abs(q.y - (pr.top + y)) < 26)) x -= 28;
    placed.push({ x: pr.left + x, y: pr.top + y });
    t.toggle.style.left = `${x / pr.width * 100}%`;
    t.toggle.style.top = `${y / pr.height * 100}%`;
  }

  function addHandle(el, key) {
    positionAnchor(el);
    const handle = document.createElement('span');
    handle.className = 'deck-move-handle';
    handle.dataset.editorUi = '';
    handle.contentEditable = 'false';
    handle.title = '拖曳移動';
    handle.textContent = '✥';
    el.append(handle);
    handle.addEventListener('pointerdown', e => {
      e.preventDefault();
      const width = (el.closest('.stage') || el.parentElement).getBoundingClientRect().width;
      const prev = overrideOf(key);
      const x0 = prev.x ?? 0, y0 = prev.y ?? 0, sx = e.clientX, sy = e.clientY;
      let x = x0, y = y0;
      const round = n => Math.round(n * 100) / 100;
      const move = ev => {
        // 以舞台寬度的百分比（cqw）保存，縮放、全螢幕與縮圖都維持相對位置。
        x = round(x0 + (ev.clientX - sx) / width * 100);
        y = round(y0 + (ev.clientY - sy) / width * 100);
        el.style.translate = `${x}cqw ${y}cqw`;
        ensureUi();
      };
      const end = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        if (x !== x0 || y !== y0) { record(key, { x, y }); refreshPreviews(); }
      };
      handle.setPointerCapture(e.pointerId);
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    });
    return handle;
  }

  function setEditing(on) {
    editing = on;
    document.body.classList.toggle('is-editing', on);
    const toggle = document.getElementById('edit-toggle');
    toggle.setAttribute('aria-pressed', String(on));
    toggle.textContent = on ? '✓ 完成' : '✎ 編輯';
    if (on) decorate(); else { document.activeElement?.blur(); undecorate(); }
    syncBar();
  }

  function setBarHidden(hidden) {
    if (hidden && editing) setEditing(false);
    document.body.classList.toggle('deck-bar-hidden', hidden);
  }

  async function save() {
    const text = '// 人工編輯層：由頁首「另存」產生，放在 story.js 旁並命名為 edits.js 即可套用。\n'
      + '// 只包含文字、位置與隱藏狀態；元件內容與互動仍由 story.js 決定。\n'
      + `window.storyEdits = ${JSON.stringify(edits, null, 2)};\n`;
    const blob = new Blob([text], { type: 'text/javascript' });
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: 'edits.js', types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }] });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setDirty(false);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'edits.js';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setDirty(false);
  }

  document.addEventListener('story:render', () => { if (editing) decorate(); });

  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.className = 'deck-edit-bar';
    bar.innerHTML = '<button type="button" id="edit-toggle" aria-pressed="false" title="編輯文字、位置與顯示">✎ 編輯</button>'
      + '<button type="button" id="edit-save" title="另存全部修改為 edits.js（Ctrl+S）" hidden>另存</button>'
      + '<button type="button" id="edit-discard" title="捨棄未另存的修改" hidden>捨棄</button>'
      + '<button type="button" id="edit-hide" title="隱藏編輯列（按 E 重新顯示）" aria-label="隱藏編輯列">✕</button>';
    document.querySelector('body>header').append(bar);
    document.getElementById('edit-toggle').onclick = () => setEditing(!editing);
    document.getElementById('edit-save').onclick = save;
    document.getElementById('edit-discard').onclick = () => {
      if (!confirm('捨棄所有未另存的修改？')) return;
      dirty = false;
      location.reload();
    };
    document.getElementById('edit-hide').onclick = () => setBarHidden(true);

    const root = document.getElementById('page');
    // 換頁重繪由 story:render 重新布置；頁內變動（mount 重繪、全選改寫）只需補回按鈕。
    new MutationObserver(() => { if (editing) ensureUi(); }).observe(root, { childList: true, subtree: true });
    root.addEventListener('input', e => {
      const key = keyOf.get(e.target);
      if (key) record(key, { html: sanitize(e.target.innerHTML) });
      ensureUi();
    });
    window.addEventListener('resize', () => { if (editing) ensureUi(); });
    root.addEventListener('focusout', e => { if (keyOf.has(e.target)) refreshPreviews(); });

    const label = document.getElementById('story-label');
    label.addEventListener('input', () => {
      edits.label = label.textContent.trim();
      story.label = edits.label;
      setDirty(true);
    });
    label.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });

    // 貼上一律轉純文字，避免帶入 Word／網頁格式；粗體等格式用 Ctrl+B／I／U。
    document.addEventListener('paste', e => {
      if (!editing || !e.target.closest?.('.deck-editable')) return;
      e.preventDefault();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
      const typing = e.target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName);
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'e') {
        setBarHidden(!document.body.classList.contains('deck-bar-hidden'));
      }
    });
    window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  });
})();
