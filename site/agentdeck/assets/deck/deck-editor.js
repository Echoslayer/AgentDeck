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
   講稿與註解：右側「講稿」（N）顯示 page.instruction、page.speech 與 page.explain，「註解」（C）顯示 edits.comments；頁首「🎤 講者」開簡報者視窗（docs/adr/0020）。
   朗讀：R 或口語稿旁的按鈕播放 page.audio；沒有音檔或載入失敗時以瀏覽器內建語音念 page.speech。
        P 或頁首「⏵ 全部播放」逐頁播放並自動翻頁；語速按鈕切換 0.75×–2×；S 或 CC 按鈕在朗讀時顯示半透明字幕（docs/adr/0022）。
   預設不保存：未另存的修改在重新整理後消失。
   與閱讀器只透過 window.storyReader 與 story:render 事件溝通（docs/adr/0008）。
   載入順序：deck-core.js → theme.js → [元件 js] → story.js → edits.js → deck-editor.js → reader.js */
'use strict';
(() => {
  // 介面語言跟隨 <html lang>：zh 開頭或未設定為中文，其餘為英文（docs/adr/0031）。
  const uiZh = /^zh/i.test(document.documentElement.lang || 'zh');
  const uiText = (zh, en) => uiZh ? zh : en;
  const FIELDS = { section: '.chapter', title: 'h1', lead: '.lead', point: '.point', detail: '.detail' };
  const CANVAS = '[data-canvas]';
  const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'BR', 'UL', 'OL', 'LI', 'DIV', 'P', 'SPAN', 'SUB', 'SUP']);
  const DROPPED = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'IMG', 'SVG', 'VIDEO', 'AUDIO']);
  const FIELD_MARK = '<span data-field-hidden></span>';
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

  // ── edits 模型（edits.js 格式屬於契約，docs/adr/0005）：讀入 window.storyEdits、套用到 story、輸出 edits.js 文字。
  //    編輯 UI 只經由這個 interface 讀寫；不碰畫面，可直接測試（window.deckEdits）。
  function createEdits(story, initial) {
    const data = structuredClone(initial || {});
    data.pages ??= {};
    const original = new Map();
    for (const p of story.pages) for (const f in FIELDS) original.set(`${p.id}|${f}`, p[f]);
    function apply(p, key, ov) {
      if (key in FIELDS) {
        const base = ov.html ?? original.get(`${p.id}|${key}`);
        // 欄位由 reader 產生，無法加屬性；以開頭的標記 span 讓 CSS 隱藏整個欄位。
        if (typeof base === 'string') p[key] = (ov.hidden ? FIELD_MARK : '') + base;
      }
      p.art = patchHtml(p.art, key, ov, true);
      // previewArt 結構與 art 不同，位置 key 不適用。
      if (p.previewArt !== undefined) p.previewArt = patchHtml(p.previewArt, key, ov, false);
    }
    // 在 reader 渲染前套用，縮圖與索引因此也看得到人工修改。
    if (typeof data.label === 'string') story.label = data.label;
    for (const p of story.pages) {
      for (const [key, ov] of Object.entries(data.pages[p.id] || {})) apply(p, key, ov);
    }
    return Object.freeze({
      get: (id, key) => data.pages[id]?.[key] || {},
      // patch：{ html }（一律 sanitize）、{ x, y }（cqw）或 { hidden }。
      set(p, key, patch) {
        if (patch.html !== undefined) patch = { ...patch, html: sanitize(patch.html) };
        const ov = (data.pages[p.id] ??= {})[key] ??= {};
        Object.assign(ov, patch);
        apply(p, key, ov);
      },
      setLabel(text) { story.label = data.label = text; },
      comments: id => data.comments?.[id] || [],
      addComment(id, text) {
        text = text.trim();
        if (!text) return false;
        const now = new Date();
        const at = new Date(now - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 19); // 本地時間
        ((data.comments ??= {})[id] ??= []).push({ text, at });
        return true;
      },
      removeComment(id, i) {
        const list = data.comments[id];
        list.splice(i, 1);
        if (!list.length) delete data.comments[id];
        if (!Object.keys(data.comments).length) delete data.comments;
      },
      text: () => '// 人工編輯層：由頁首「另存」產生，放在 story.js 旁並命名為 edits.js 即可套用。\n'
        + '// 只包含文字、位置、隱藏狀態與各頁註解；元件內容、互動與口頭說明仍由 story.js 決定。\n'
        + `window.storyEdits = ${JSON.stringify(data, null, 2)};\n`,
    });
  }
  const edits = window.deckEdits = createEdits(story, window.storyEdits);

  // window.storyReader 由稍後載入的 reader.js 提供，只在事件發生時取用。
  const currentPage = () => window.storyReader.page;
  const refreshPreviews = () => window.storyReader.refresh();
  const overrideOf = key => edits.get(currentPage().id, key);

  function record(key, patch) {
    edits.set(currentPage(), key, patch);
    setDirty(true);
  }

  function setDirty(value) {
    dirty = value;
    document.getElementById('edit-save').textContent = dirty ? uiText('另存 ●', 'Save ●') : uiText('另存', 'Save');
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
      if (t.key.startsWith('@')) t.warn = uiZh ? `缺少 data-key，以位置 ${t.key} 記錄；元件順序變動後可能對錯` : `Missing data-key; recorded by position ${t.key}, which can mismatch if components are reordered`;
      else if (count.get(t.key) > 1) t.warn = uiZh ? `data-key="${t.key}" 在本頁重複` : `data-key="${t.key}" is duplicated on this page`;
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
      btn.title = (hidden ? uiText('顯示此元件', 'Show this component') : uiText('隱藏此元件', 'Hide this component')) + (t.warn ? `\n⚠ ${t.warn}` : '');
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
    handle.title = uiText('拖曳移動', 'Drag to move');
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

  // ── 講稿與註解（docs/adr/0020）：page.instruction 是講者動作（怎麼開口、指哪裡），page.explain 是補充解釋
  //    （簡化了什麼、被追問時怎麼答），兩者都是作者寫的受信任 HTML；
  //    edits.comments[頁面 id] 是人留下的註解（純文字，一律跳脫），隨「另存」寫進 edits.js。
  //    右側欄給審閱，簡報者視窗給雙螢幕上台；投影畫面本身不顯示兩者。
  const plain = h => { const d = document.createElement('div'); d.innerHTML = h.replace(/<br\s*\/?>/gi, '\n'); return d.textContent; };
  // 口語稿斷句：句末標點（。！？!?；;）或換行（<br>）後切開；cues 與 at 的「第幾句」都照這個算。
  const sentences = p => p.speech ? plain(p.speech).split(/(?<=[。！？!?；;\n])/).map(s => s.trim()).filter(Boolean) : [];
  const ARROW_FROM = ['left', 'right', 'top', 'bottom'];
  // 拖曳節奏：DRAG.steps 步、每步 DRAG.ms 毫秒（約 1 秒）；agentdeck export 錄影照同樣節奏。
  const DRAG = Object.freeze({ steps: 25, ms: 40 });
  const stepOk = s => s && (Number.isFinite(s.wait) || typeof s.click === 'string' || (typeof s.set === 'string' && 'value' in s)
    || (typeof s.drag === 'string' && Array.isArray(s.by) && s.by.length === 2 && s.by.every(Number.isFinite))
    || typeof s.box === 'string' || (typeof s.arrow === 'string' && (s.from === undefined || ARROW_FROM.includes(s.from)))
    || s.clear === true)
    && (s.at === undefined || (Number.isInteger(s.at) && s.at >= 1))
    && (s.text === undefined || typeof s.text === 'string');
  // 口語稿、cues（音檔裡每句的起始秒數，docs/adr/0024）與 record（docs/adr/0021）的規則；agentdeck check speech 也呼叫這裡。
  // errors：資料結構錯誤，載入時就丟出。warnings：同步可能不準，載入時只警告，check speech 一律算錯。
  // duration 是音檔秒數，只有 check speech 量得到。
  function speechProblems(p, duration) {
    const errors = [], warnings = [];
    for (const f of ['instruction', 'explain', 'speech', 'audio']) if (p[f] !== undefined && typeof p[f] !== 'string') errors.push(`${f} 必須是字串`);
    if (errors.length) return { errors, warnings };
    const n = sentences(p).length, cues = p.cues;
    if (p.audio && !n) warnings.push('有音檔但沒有口語稿，無法核對逐句同步');
    if (cues !== undefined) {
      if (!Array.isArray(cues) || !cues.every((t, i) => Number.isFinite(t) && t >= 0 && (!i || t >= cues[i - 1]))) errors.push('cues 必須是由小到大的非負秒數陣列');
      else {
        if (cues.some((t, i) => i && t === cues[i - 1])) warnings.push('cues 有重複的時間點，應嚴格遞增');
        if (cues.length !== n) warnings.push(`cues 有 ${cues.length} 個時間點，口語稿有 ${n} 句`);
        if (Number.isFinite(duration) && cues.some(t => t >= duration)) warnings.push('cues 超過音檔時長');
      }
    }
    if (p.record === undefined) return { errors, warnings };
    if (!Array.isArray(p.record)) return { errors: [...errors, 'record 必須是步驟陣列'], warnings };
    let at = 1, elapsed = 0;
    p.record.forEach((s, i) => {
      if (!stepOk(s)) return errors.push(`record 第 ${i + 1} 步格式錯誤：${JSON.stringify(s)}（可用 wait、click、set+value、drag+by、arrow(+from)、box、clear，可加 at、text）`);
      if (s.at !== undefined) {
        if (s.at < at || s.at > n) warnings.push(`record 第 ${i + 1} 步 at 超出句數或順序倒退`);
        if (s.at !== at) elapsed = 0;
        at = s.at;
      }
      if (s.wait < 0) warnings.push(`record 第 ${i + 1} 步 wait 必須是非負毫秒數`);
      elapsed += (Number.isFinite(s.wait) ? s.wait / 1000 : 0) + (s.drag ? DRAG.steps * DRAG.ms / 1000 : 0);
      const end = Array.isArray(cues) && (cues[at] ?? duration);
      if (Number.isFinite(cues?.[at - 1]) && Number.isFinite(end) && elapsed >= end - cues[at - 1]) warnings.push(`第 ${at} 句的等待／拖曳時間超過句子時段`);
    });
    return { errors, warnings: [...new Set(warnings)] };
  }
  window.deckSpeech = Object.freeze({ sentences, problems: speechProblems });
  for (const p of story.pages) {
    const { errors, warnings } = speechProblems(p);
    if (errors.length) throw new Error(`${p.id}: ${errors.join('；')}`);
    for (const w of warnings) console.warn(`${p.id}: ${w}`);
  }
  const esc = s => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
  const commentsOf = id => edits.comments(id);
  let presenter, started;

  function addComment(text) {
    if (edits.addComment(currentPage().id, text)) notesChanged();
  }
  function removeComment(i) {
    edits.removeComment(currentPage().id, i);
    notesChanged();
  }
  function notesChanged() { setDirty(true); renderNotes(); }

  const instructionHtml = p => p.instruction || `<span class="deck-notes-empty">${uiText('本頁沒有講者動作。', 'No presenter actions on this page.')}</span>`;
  const explainHtml = p => p.explain ? `<h3>📖 ${uiText('補充解釋', 'Further explanation')}</h3><div class="deck-explain">${p.explain}</div>` : '';
  const speakLabel = p => speaking && !auto ? uiText('■ 停止', '■ Stop') : p.audio ? uiText('▶ 播放', '▶ Play') : uiText('▶ 朗讀', '▶ Read aloud');
  const canSpeak = p => !!(p.audio || (tts && p.speech));
  const controlsHtml = () => `<button type="button" data-autoplay aria-pressed="${auto}" title="${uiText('從這頁開始逐頁播放口語稿，念完自動翻頁（P）', 'Play the script page by page from here, turning pages automatically (P)')}">${auto ? uiText('■ 停止播放', '■ Stop playing') : uiText('⏵ 全部播放', '⏵ Play all')}</button>`
    + `<button type="button" data-rate title="${uiText('語速（點擊切換）', 'Speed (click to change)')}">${rate}×</button>`
    + `<label class="deck-volume" title="${uiText('朗讀音量', 'Read-aloud volume')}">🔊<input type="range" data-volume min="0" max="100" step="5" value="${volume}" aria-label="${uiText('朗讀音量', 'Read-aloud volume')}"></label>`
    + `<button type="button" data-cc aria-pressed="${cc}" title="${uiText('朗讀時在畫面下方顯示字幕（S）', 'Show captions while reading aloud (S)')}">CC</button>`;
  const speechHtml = p => p.speech || p.audio
    ? `<h3>🗣 ${uiText('口語稿', 'Script')}${canSpeak(p) ? ` <button type="button" data-speak aria-pressed="${speaking && !auto}" title="${p.audio ? uiText('播放音檔', 'Play audio') : uiText('朗讀口語稿', 'Read the script aloud')} (R)">${speakLabel(p)}</button>${controlsHtml()}` : ''}</h3>`
      + `<div class="deck-speech">${p.speech || `<span class="deck-notes-empty">${uiText('本頁以音檔播放。', 'This page plays an audio file.')}</span>`}</div>`
    : '';

  // ── 口語稿發聲：有 page.audio 就播放音檔；沒有音檔、或音檔載入失敗時，把 page.speech 交給瀏覽器內建的
  //    speechSynthesis。兩者都不需套件。只念口語稿，不念畫面與講者動作，也不執行頁面互動。
  //    單頁朗讀（R）在換頁時停止；全部播放（P）念完自動翻到下一頁，沒有口語稿的頁停留 AUTO_DWELL 毫秒，到最後一頁結束。
  //    語速與音量存在講者本機，套用到音檔與內建語音（內建語音從下一句生效）。
  const tts = window.speechSynthesis;
  const RATES = [0.75, 1, 1.25, 1.5, 2], RATE_KEY = 'agentdeck-speech-rate', VOLUME_KEY = 'agentdeck-speech-volume', CC_KEY = 'agentdeck-captions', AUTO_DWELL = 2000, AUTO_GAP = 600;
  // 字幕時間（毫秒）：比聲音早 CC_LEAD 出現；最後一句念完多留 CC_LINGER；上一句顯示未滿 CC_MIN 時，下一句不提早，等聲音開始才換。
  const CC_LEAD = 300, CC_LINGER = 1500, CC_MIN = 1000;
  let speaking = false, auto = false, speakRun = 0, speakPage = -1, player = null, autoTimer;
  let rate = 1;
  try { rate = RATES.includes(Number(localStorage.getItem(RATE_KEY))) ? Number(localStorage.getItem(RATE_KEY)) : 1; } catch { /* 用預設語速 */ }
  let volume = 100; // 0–100
  try { const v = localStorage.getItem(VOLUME_KEY); if (v !== null && Number(v) >= 0 && Number(v) <= 100) volume = Number(v); } catch { /* 用預設音量 */ }
  tts?.getVoices(); // 部分瀏覽器第一次呼叫才開始載入語音清單
  let cc = false, ccBox = null, ccText = '', ccSince = 0, ccTimer;
  try { cc = localStorage.getItem(CC_KEY) === '1'; } catch { /* 預設不顯示字幕 */ }
  // 字幕：朗讀中在畫面下方顯示目前這句。內建語音逐句同步；音檔有 cues 時照秒數，沒有時依播放進度按句子字數比例估算。
  //   字幕比聲音早 CC_LEAD 出現（內建語音：先顯示字幕再開口；音檔：提早換句），講者動作仍在聲音開始時執行。
  function caption(text = '') {
    clearTimeout(ccTimer);
    if (text !== ccText) ccSince = performance.now();
    ccText = text;
    if (!ccBox) {
      ccBox = document.createElement('div');
      ccBox.className = 'deck-cc';
      ccBox.setAttribute('aria-live', 'polite');
      document.body.append(ccBox);
    }
    ccBox.textContent = text;
    ccBox.hidden = !(cc && text);
  }
  function setCc(value) {
    cc = value;
    caption(ccText);
    syncSpeak();
    return persist(CC_KEY, cc ? '1' : '0');
  }
  const toggleCc = () => setCc(!cc);

  // ── 講者動作（docs/adr/0024）：record 步驟帶 at（第幾句，1 起算）時，朗讀到那句就執行；其後沒有 at 的步驟
  //    屬於同一組依序執行，wait 依語速縮短。沒有任何 at 的 record 只給匯出錄影，播放不執行。
  //    arrow／box 是疊在畫面上的標註，換頁、停止或 clear 時移除；click／set／drag 以合成事件操作 #page 內的元件。
  let layer = null, marks = [];
  const pageEl = sel => {
    const el = document.querySelector(`#page ${sel}`);
    if (!el) throw new Error(`${currentPage().id}: 講者動作找不到元素：${sel}`);
    return el;
  };
  // 標註幾何（CSS px）：r 為目標矩形 { x, y, w, h }，lw／lh 為標籤尺寸。回傳 box 外框，或 arrow 的尾端 t、尖端 h 與方向 d，
  // 以及標籤左上角。畫面上由 drawMarks 畫成 SVG，agentdeck export 畫成 PPT 原生圖形（docs/adr/0025）。
  function markGeometry(s, r, lw = 0, lh = 0) {
    if (s.box) return { box: { x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 }, label: { x: r.x - 6, y: r.y - 10 - lh } };
    const from = s.from ?? 'left', L = 90, G = 10, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const [hx, hy, dx, dy] = { left: [r.x - G, cy, -1, 0], right: [r.x + r.w + G, cy, 1, 0], top: [cx, r.y - G, 0, -1], bottom: [cx, r.y + r.h + G, 0, 1] }[from];
    const tx = hx + dx * L, ty = hy + dy * L;
    const [x, y] = { left: [tx - lw, ty - lh / 2], right: [tx, ty - lh / 2], top: [tx - lw / 2, ty - lh], bottom: [tx - lw / 2, ty] }[from];
    return { arrow: { tx, ty, hx, hy, dx, dy }, label: { x, y } };
  }
  function drawMarks() {
    if (!marks.length) return;
    const svg = layer.querySelector('svg');
    svg.innerHTML = '';
    for (const m of marks) {
      const r = m.el.getBoundingClientRect();
      const g = markGeometry(m.step, { x: r.left, y: r.top, w: r.width, h: r.height }, m.label?.offsetWidth, m.label?.offsetHeight);
      if (m.label) Object.assign(m.label.style, { left: `${g.label.x}px`, top: `${g.label.y}px` });
      if (g.box) {
        Object.assign(m.box.style, { left: `${g.box.x}px`, top: `${g.box.y}px`, width: `${g.box.w}px`, height: `${g.box.h}px` });
        continue;
      }
      const { tx, ty, hx, hy, dx, dy } = g.arrow;
      svg.insertAdjacentHTML('beforeend', `<line x1="${tx}" y1="${ty}" x2="${hx + dx * 12}" y2="${hy + dy * 12}"/>`
        + `<polygon points="${hx},${hy} ${hx + dx * 18 - dy * 10},${hy + dy * 18 + dx * 10} ${hx + dx * 18 + dy * 10},${hy + dy * 18 - dx * 10}"/>`);
    }
  }
  function annotate(s) {
    if (s.clear) return clearMarks();
    const el = pageEl(s.arrow ?? s.box);
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'deck-marks';
      layer.innerHTML = '<svg aria-hidden="true"></svg>';
      document.body.append(layer);
      addEventListener('resize', drawMarks);
    }
    const m = { el, step: s };
    if (s.box) layer.append(m.box = Object.assign(document.createElement('div'), { className: 'deck-mark-box' }));
    if (s.text) layer.append(m.label = Object.assign(document.createElement('div'), { className: 'deck-mark-label', textContent: s.text }));
    marks.push(m);
    drawMarks();
  }
  function clearMarks() {
    marks = [];
    layer?.querySelectorAll('.deck-mark-box, .deck-mark-label').forEach(e => e.remove());
    if (layer) layer.querySelector('svg').innerHTML = '';
  }
  function ripple(x, y) {
    const d = Object.assign(document.createElement('div'), { className: 'deck-mark-ripple' });
    Object.assign(d.style, { left: `${x}px`, top: `${y}px` });
    document.body.append(d);
    d.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.4)', opacity: 0 }], { duration: 450 }).onfinish = () => d.remove();
  }
  // 步驟的目標點：range 取該值的滑桿位置，其餘取元素中心（agentdeck export 的游標也用這個）。
  function point(el, value) {
    const r = el.getBoundingClientRect(), y = r.top + r.height / 2;
    if (el.type === 'range' && value !== undefined) return { x: r.left + (value - (el.min || 0)) / ((el.max || 100) - (el.min || 0)) * r.width, y };
    return { x: r.left + r.width / 2, y };
  }
  const pause = ms => new Promise(r => setTimeout(r, ms / rate));
  async function act(s, run) {
    if (s.wait !== undefined) return pause(s.wait);
    if (s.arrow || s.box || s.clear) return annotate(s);
    const el = pageEl(s.click ?? s.set ?? s.drag), { x, y } = point(el, s.set ? s.value : undefined);
    ripple(x, y);
    if (s.click) return el.click();
    if (s.set) {
      el.value = String(s.value);
      for (const t of ['input', 'change']) el.dispatchEvent(new Event(t, { bubbles: true }));
      return;
    }
    // drag：合成指標事件從元素中心移動 by=[dx, dy]。合成事件沒有真的指標，setPointerCapture 會丟例外，拖曳期間略過。
    const fire = (type, px, py) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: px, clientY: py, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: type === 'pointerup' ? 0 : 1 }));
    const proto = Element.prototype, cap = proto.setPointerCapture, rel = proto.releasePointerCapture;
    proto.setPointerCapture = proto.releasePointerCapture = function () {};
    try {
      fire('pointerdown', x, y);
      for (let k = 1; k <= DRAG.steps && run === speakRun; k++) {
        await pause(DRAG.ms);
        fire('pointermove', x + s.by[0] * k / DRAG.steps, y + s.by[1] * k / DRAG.steps);
      }
      fire('pointerup', x + s.by[0], y + s.by[1]);
    } finally {
      proto.setPointerCapture = cap;
      proto.releasePointerCapture = rel;
    }
  }
  // 依 at 分組；沒有任何 at 時回傳 null（只給匯出用）。
  function cueGroups(p) {
    if (!p.record?.some(s => s.at)) return null;
    const groups = new Map();
    let at = 1;
    for (const s of p.record) {
      if (s.at) at = s.at;
      if (!groups.has(at)) groups.set(at, []);
      groups.get(at).push(s);
    }
    return groups;
  }
  // 聲音進到第 i 句（0 起算）時呼叫：依序執行 at ≤ i+1 且尚未執行的組（估算跳句時不漏）。字幕另由 caption 控制。
  function cueSentence(run, p, i) {
    if (run !== speakRun) return;
    const st = cueState;
    if (!st || st.run !== run) return;
    for (const [at, steps] of st.groups) {
      if (at > i + 1 || st.fired.has(at)) continue;
      st.fired.add(at);
      st.chain = st.chain.then(async () => {
        for (const s of steps) {
          if (run !== speakRun) return;
          await act(s, run);
        }
      }).catch(e => console.error(e));
    }
  }
  let cueState = null;
  // 給 agentdeck export 錄影與 check speech 用（cli/lib/export.mjs）：標註、目標點、拖曳節奏與標註幾何。
  window.deckActions = Object.freeze({ annotate, clear: clearMarks, point, drag: DRAG, geometry: markGeometry });
  function pickVoice() {
    const lang = (document.documentElement.lang || 'zh-TW').toLowerCase();
    const want = { 'zh-hant': ['zh-tw', 'zh-hk'], 'zh-hans': ['zh-cn'], zh: ['zh-tw', 'zh-cn'] }[lang] || [lang];
    const voices = tts.getVoices(), norm = v => v.lang.replace('_', '-').toLowerCase();
    let pool = [];
    for (const w of want) if (!pool.length) pool = voices.filter(v => norm(v) === w);
    if (!pool.length) pool = voices.filter(v => norm(v).startsWith(lang.split('-')[0]));
    return { lang: want[0], voice: pool.find(v => /natural/i.test(v.name)) || pool[0] };
  }
  function finished(run) {
    if (run !== speakRun) return;
    speaking = false;
    player = null;
    ccTimer = setTimeout(() => { if (run === speakRun) caption(); }, CC_LINGER); // 念完多留一下再收
    const i = window.storyReader.index;
    if (auto && i < story.pages.length - 1) {
      // 本頁的講者動作做完才翻頁，避免最後一句觸發的操作被切掉。
      (cueState?.run === run ? cueState.chain : Promise.resolve()).then(() => {
        if (run === speakRun && auto) autoTimer = setTimeout(() => { if (run === speakRun && auto) window.storyReader.go(i + 1); }, AUTO_GAP);
      });
    } else auto = false;
    syncSpeak();
  }
  function playAudio(run, p) {
    const audio = player = new Audio(p.audio);
    player.playbackRate = rate;
    player.volume = volume / 100;
    player.onended = () => finished(run);
    // 目前句子：有 cues 照秒數；沒有就依播放進度按字數比例估算。currentTime 是音檔本身的秒數，不受語速影響。
    const parts = sentences(p), lens = parts.map(s => s.length), total = lens.reduce((a, b) => a + b, 0);
    const starts = () => p.cues ?? (player.duration > 0 ? lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0) / total * player.duration) : null);
    let last = -1, lastCc = -1;
    const tick = () => {
      if (run !== speakRun || !player) return;
      const at = starts(), t = player.currentTime, lead = CC_LEAD / 1000 * rate; // 換算成音檔秒數
      let i = 0, ci = 0;
      if (at) while (i + 1 < at.length && at[i + 1] <= t) i++;
      if (at) while (ci + 1 < at.length && at[ci + 1] - lead <= t) ci++;
      if ((at || !parts.length) && i !== last) { last = i; cueSentence(run, p, i); }
      // 字幕提早換句；上一句顯示未滿 CC_MIN 就等到聲音真的開始（ci === i）
      if ((at || !parts.length) && ci !== lastCc && (ci === i || performance.now() - ccSince >= CC_MIN)) { lastCc = ci; caption(parts[ci] ?? ''); }
      requestAnimationFrame(tick);
    };
    const fallback = () => {
      if (run !== speakRun || player !== audio) return;
      console.warn(`${p.id}: 音檔無法播放（${p.audio}），改用內建語音`);
      audio.pause();
      player = null;
      if (!sayText(run, p)) playbackError(run, uiText('音檔無法播放，也沒有可用的內建語音。', 'The audio cannot play and no built-in voice is available.'));
    };
    audio.onerror = fallback;
    audio.play().then(() => { if (run === speakRun && player === audio && last < 0) tick(); }, error => {
      if (run !== speakRun || player !== audio) return; // 停止或換頁造成的舊請求不影響新播放
      if (error?.name === 'NotSupportedError') return fallback();
      playbackError(run, error?.name === 'NotAllowedError'
        ? uiText('瀏覽器未允許播放音訊，請按播放按鈕或 R 重試。', 'The browser blocked audio. Press Play or R to retry.')
        : uiText('音訊播放中斷，請按播放按鈕或 R 重試。', 'Audio playback stopped. Press Play or R to retry.'));
    });
    return true;
  }
  function playbackError(run, message) {
    if (run !== speakRun) return;
    speak(false);
    let status = document.getElementById('deck-speech-error');
    if (!status) {
      status = document.createElement('p');
      status.id = 'deck-speech-error';
      status.setAttribute('role', 'status');
      document.querySelector('body>header').after(status);
    }
    status.textContent = message;
  }
  function sayText(run, p) {
    // 逐句念：長段落在部分瀏覽器會中途被截斷，且改語速能從下一句生效。
    const parts = tts ? sentences(p) : [];
    if (!parts.length) return false;
    const { lang, voice } = pickVoice();
    const say = i => {
      if (run !== speakRun) return;
      if (i >= parts.length) return finished(run);
      const u = new SpeechSynthesisUtterance(parts[i]);
      u.lang = voice?.lang || lang;
      if (voice) u.voice = voice;
      u.rate = rate;
      u.volume = volume / 100;
      u.onstart = () => cueSentence(run, p, i);
      u.onend = () => say(i + 1);
      u.onerror = e => { if (!['interrupted', 'canceled'].includes(e.error)) finished(run); };
      // 先出字幕再開口；字幕關閉時不等
      caption(parts[i]);
      if (cc) setTimeout(() => { if (run === speakRun) tts.speak(u); }, CC_LEAD);
      else tts.speak(u);
    };
    say(0);
    return true;
  }
  function speak(on = !(speaking || auto)) {
    document.getElementById('deck-speech-error')?.remove();
    const run = ++speakRun, p = currentPage();
    clearTimeout(autoTimer);
    tts?.cancel();
    player?.pause();
    player = null;
    caption();
    clearMarks();
    if (!on) auto = false;
    const groups = on ? cueGroups(p) : null;
    cueState = groups && { run, groups, fired: new Set(), chain: Promise.resolve() };
    speaking = on && canSpeak(p) && (p.audio ? playAudio(run, p) : sayText(run, p));
    if (on && auto && !speaking) { speaking = true; autoTimer = setTimeout(() => finished(run), AUTO_DWELL); }
    speakPage = window.storyReader.index;
    syncSpeak();
  }
  function playAll() {
    if (auto) return speak(false);
    auto = true;
    speak(true);
  }
  function setRate(value) {
    rate = RATES.includes(value) ? value : 1;
    if (player) player.playbackRate = rate;
    syncSpeak();
    return persist(RATE_KEY, String(rate));
  }
  const cycleRate = () => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length]);
  function setVolume(value) {
    volume = Math.max(0, Math.min(100, Math.round(Number(value)) || 0));
    if (player) player.volume = volume / 100;
    syncSpeak();
    return persist(VOLUME_KEY, String(volume));
  }
  function syncSpeak() {
    const p = currentPage();
    for (const doc of [document, presenter && !presenter.closed && presenter.document]) {
      if (!doc) continue;
      doc.querySelectorAll('[data-speak]').forEach(b => {
        b.textContent = speakLabel(p);
        b.setAttribute('aria-pressed', String(speaking && !auto));
      });
      doc.querySelectorAll('[data-autoplay]').forEach(b => {
        b.textContent = auto ? uiText('■ 停止播放', '■ Stop playing') : uiText('⏵ 全部播放', '⏵ Play all');
        b.setAttribute('aria-pressed', String(auto));
      });
      doc.querySelectorAll('[data-rate]').forEach(b => { b.textContent = `${rate}×`; });
      doc.querySelectorAll('[data-volume]').forEach(r => { if (Number(r.value) !== volume) r.value = volume; });
      doc.querySelectorAll('[data-cc]').forEach(b => b.setAttribute('aria-pressed', String(cc)));
    }
  }
  function wireSpeak(root) {
    root.querySelectorAll('[data-speak]').forEach(b => b.onclick = () => { auto = false; speak(); });
    root.querySelectorAll('[data-autoplay]').forEach(b => b.onclick = playAll);
    root.querySelectorAll('[data-rate]').forEach(b => b.onclick = cycleRate);
    root.querySelectorAll('[data-volume]').forEach(r => r.oninput = () => setVolume(r.value));
    root.querySelectorAll('[data-cc]').forEach(b => b.onclick = toggleCc);
  }
  function commentsHtml(id) {
    const list = commentsOf(id);
    return (list.length
      ? `<ol class="deck-comments">${list.map((c, i) => `<li><p>${esc(c.text)}</p><small>${esc(c.at.slice(5, 16).replace('T', ' '))}<button type="button" data-del="${i}" title="${uiText('刪除這則註解', 'Delete this comment')}">✕</button></small></li>`).join('')}</ol>`
      : `<p class="deck-notes-empty">${uiText('還沒有註解。', 'No comments yet.')}</p>`)
      + `<form class="deck-comment-add"><textarea rows="2" placeholder="${uiText('對這頁留下註解（Ctrl+Enter 送出）', 'Comment on this page (Ctrl+Enter to add)')}"></textarea><button>${uiText('新增', 'Add')}</button></form>`;
  }
  function wireComments(root) {
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => removeComment(Number(b.dataset.del)));
    const form = root.querySelector('.deck-comment-add'), ta = form.querySelector('textarea');
    form.onsubmit = e => { e.preventDefault(); addComment(ta.value); };
    ta.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addComment(ta.value); } };
  }

  // 右側兩個分頁「講稿」「註解」：與左側索引相同，滑鼠移入暫開、點標籤釘選，一次只開一個。
  let side, openPanel = null, pinned = false;
  function buildSide() {
    side = document.createElement('aside');
    side.className = 'deck-side';
    side.setAttribute('aria-label', uiText('講稿與註解', 'Notes and comments'));
    side.innerHTML = '<div class="deck-side-panel" data-panel="notes" hidden></div><div class="deck-side-panel" data-panel="comments" hidden></div>'
      + `<div class="deck-side-tabs"><button type="button" class="deck-side-tab" data-tab="notes" title="${uiText('講稿：講者動作與補充解釋（N）', 'Notes: presenter actions and explanations (N)')}">${uiText('講稿', 'Notes')}</button>`
      + `<button type="button" class="deck-side-tab" data-tab="comments" title="${uiText('本頁註解（C）', 'Comments on this page (C)')}">${uiText('註解', 'Comments')}<b hidden></b></button></div>`;
    side.querySelectorAll('[data-tab]').forEach(tab => {
      tab.onclick = () => togglePanel(tab.dataset.tab);
      tab.onpointerenter = e => { if (e.pointerType === 'mouse' && !pinned) setPanel(tab.dataset.tab, false); };
    });
    // 正在輸入註解時不因滑鼠移出而收起。
    side.onpointerleave = e => { if (e.pointerType === 'mouse' && !pinned && !side.contains(document.activeElement?.closest('textarea'))) setPanel(null, false); };
    side.onkeydown = e => { if (e.key === 'Escape') setPanel(null, false); };
    document.body.append(side);
  }
  function setPanel(name, pin) {
    openPanel = name;
    pinned = !!name && pin;
    side.querySelectorAll('[data-panel]').forEach(el => { el.hidden = el.dataset.panel !== name; });
    side.querySelectorAll('[data-tab]').forEach(tab => {
      tab.setAttribute('aria-expanded', String(tab.dataset.tab === name));
      tab.setAttribute('aria-pressed', String(tab.dataset.tab === name && pinned));
    });
  }
  const togglePanel = name => setPanel(openPanel === name && pinned ? null : name, true);

  function renderNotes() {
    if (!window.storyReader || !side) return;
    const p = currentPage(), n = commentsOf(p.id).length;
    const notes = side.querySelector('[data-panel="notes"]');
    notes.innerHTML = `<h3>🎤 ${uiText('講者動作', 'Presenter actions')}</h3><div class="deck-instruction">${instructionHtml(p)}</div>${speechHtml(p)}${explainHtml(p)}`;
    wireSpeak(notes);
    const box = side.querySelector('[data-panel="comments"]');
    box.innerHTML = `<h3>💬 ${uiText('註解', 'Comments')}</h3>${commentsHtml(p.id)}`;
    wireComments(box);
    const count = side.querySelector('[data-tab="comments"] b');
    count.hidden = !n;
    count.textContent = n;
    badges();
    renderPresenter();
  }

  // 索引縮圖標出各頁註解數；閱讀器重繪索引後由 MutationObserver 補回。
  function badges() {
    document.querySelectorAll('#index-list [data-page]').forEach(b => {
      const n = commentsOf(story.pages[b.dataset.page]?.id).length;
      b.querySelector('.deck-comment-badge')?.remove();
      if (n) b.insertAdjacentHTML('beforeend', `<span class="deck-comment-badge" title="${n} ${uiText('則註解', 'comments')}">💬${n}</span>`);
    });
  }

  // 簡報者視窗：同源的空白視窗，由本頁直接寫入與更新；字級存在講者本機。
  const SIZE_KEY = 'agentdeck-presenter-size';
  let size = 26;
  try { size = Math.min(56, Math.max(14, Number(localStorage.getItem(SIZE_KEY)) || size)); } catch { /* 無法存取儲存空間時用預設字級 */ }
  // 講稿、註解可在簡報者視窗個別開關，同樣存在講者本機。
  const SHOW_KEY = 'agentdeck-presenter-show';
  const show = { notes: true, comments: true };
  try {
    const saved = JSON.parse(localStorage.getItem(SHOW_KEY));
    for (const name of ['notes', 'comments']) if (typeof saved?.[name] === 'boolean') show[name] = saved[name];
  } catch { /* 預設兩者都顯示 */ }
  function setShow(name, value) {
    show[name] = value;
    renderPresenter();
    return persist(SHOW_KEY, JSON.stringify(show));
  }
  const toggleShow = name => setShow(name, !show[name]);
  function openPresenter() {
    presenter = window.open('', 'agentdeck-presenter', 'width=780,height=720');
    try {
      presenter.document.title = `${uiText('講者：', 'Presenter: ')}${story.title}`;
    } catch {
      presenter = null;
      alert(uiText('無法開啟簡報者視窗：請允許此頁開啟彈出視窗。', 'Cannot open the presenter window: allow pop-ups for this page.'));
      return;
    }
    started ??= Date.now();
    const doc = presenter.document;
    doc.head.innerHTML = `<meta charset="utf-8"><style>${PRESENTER_CSS}</style>`;
    doc.body.innerHTML = '<div id="root"></div>';
    presenter.onkeydown = e => {
      if (window.storyReader.preferences.isOpen || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const delta = window.storyReader.navigationDelta(e);
      if (delta) { e.preventDefault(); document.getElementById(delta > 0 ? 'next' : 'prev').click(); return; }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') document.getElementById('next').click();
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') document.getElementById('prev').click();
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) { auto = false; speak(); }
      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) playAll();
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) toggleCc();
    };
    clearInterval(openPresenter.timer);
    openPresenter.timer = setInterval(tick, 1000);
    renderPresenter();
  }
  function tick() {
    const el = presenter && !presenter.closed && presenter.document.getElementById('clock');
    if (!el) return;
    const s = Math.floor((Date.now() - started) / 1000);
    el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  function setSize(value) {
    size = Math.min(56, Math.max(14, value));
    if (presenter && !presenter.closed) presenter.document.documentElement.style.setProperty('--size', `${size}px`);
    return persist(SIZE_KEY, String(size));
  }
  function renderPresenter() {
    if (!presenter || presenter.closed) return;
    const i = window.storyReader.index, p = story.pages[i], next = story.pages[i + 1];
    const doc = presenter.document, root = doc.getElementById('root');
    doc.documentElement.style.setProperty('--size', `${size}px`);
    root.innerHTML = `<header><b>${i + 1} / ${story.pages.length}</b>`
      + `<span class="tools"><button type="button" data-show="notes" aria-pressed="${show.notes}" title="${uiText('顯示或隱藏講稿', 'Show or hide notes')}">${uiText('講稿', 'Notes')}</button><button type="button" data-show="comments" aria-pressed="${show.comments}" title="${uiText('顯示或隱藏註解', 'Show or hide comments')}">${uiText('註解', 'Comments')}</button>`
      + `<button type="button" data-size="-2" title="${uiText('縮小字級', 'Smaller text')}">A−</button><button type="button" data-size="2" title="${uiText('放大字級', 'Larger text')}">A＋</button></span><span id="clock">00:00</span></header>`
      + `<h1>${p.title}</h1><section ${show.notes ? '' : 'hidden'}><div class="deck-instruction">${instructionHtml(p)}</div>${speechHtml(p)}${explainHtml(p)}</section>`
      + `<p class="next">${uiText('下一頁：', 'Next: ')}${next ? next.title : uiText('（最後一頁）', '(last page)')}</p>`
      + `<nav><button type="button" data-go="prev">${uiText('← 上一頁', '← Previous')}</button><button type="button" data-go="next">${uiText('下一頁 →', 'Next →')}</button></nav>`
      + `<section ${show.comments ? '' : 'hidden'}><h3>💬 ${uiText('註解', 'Comments')}</h3>${commentsHtml(p.id)}</section>`;
    root.querySelectorAll('[data-show]').forEach(b => b.onclick = () => toggleShow(b.dataset.show));
    root.querySelectorAll('[data-size]').forEach(b => b.onclick = () => setSize(size + Number(b.dataset.size)));
    root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => document.getElementById(b.dataset.go).click());
    wireComments(root);
    wireSpeak(root);
    tick();
  }
  const PRESENTER_CSS = `:root{--size:26px}body{margin:0;font:18px/1.7 system-ui,"Microsoft JhengHei",sans-serif;background:#1f211b;color:#f5f1e8}
#root{padding:18px 28px}header{display:flex;justify-content:space-between;align-items:center;gap:12px;color:#cbc7b9}#clock{font-variant-numeric:tabular-nums;font-size:22px}
.tools{display:flex;gap:6px}button[aria-pressed=false]{opacity:.45;text-decoration:line-through}h1{font-size:18px;color:#cbc7b9;margin:10px 0}.deck-instruction{font-size:var(--size);line-height:1.75}.deck-instruction b,.deck-instruction strong{color:#f2a58f}
.deck-explain{font-size:calc(var(--size) * .72);line-height:1.75;color:#d9d5c7;border-left:3px solid #666;padding-left:14px}
.deck-speech{font-size:calc(var(--size) * .85);line-height:1.75;border-left:3px solid #f2a58f;padding-left:14px}h3 button{margin-left:8px;padding:2px 10px;font-size:13px}
.next{color:#a9a795;border-top:1px solid #444;padding-top:10px}nav{display:flex;gap:10px}h3{margin:22px 0 8px;font-size:16px;color:#cbc7b9}
button{font:inherit;font-size:15px;padding:6px 14px;border-radius:6px;border:1px solid #666;background:#2c2e26;color:inherit;cursor:pointer}
.deck-comments{padding-left:20px;margin:0}.deck-comments p{margin:0;white-space:pre-wrap}.deck-comments small{color:#a9a795;display:flex;gap:8px;align-items:center}
.deck-comments small button{padding:0 6px;font-size:12px}.deck-comment-add{display:flex;gap:8px;margin-top:10px}
textarea{flex:1;font:inherit;font-size:16px;background:#2c2e26;color:inherit;border:1px solid #666;border-radius:6px;padding:6px}.deck-notes-empty{color:#a9a795}`;

  function setEditing(on) {
    editing = on;
    window.storyReader.annotations?.setEditing(on);
    document.body.classList.toggle('is-editing', on);
    const toggle = document.getElementById('edit-toggle');
    toggle.setAttribute('aria-pressed', String(on));
    toggle.textContent = on ? uiText('✓ 完成', '✓ Done') : uiText('✎ 編輯', '✎ Edit');
    if (on) decorate(); else { document.activeElement?.blur(); undecorate(); }
    syncBar();
  }

  function setBarHidden(hidden) {
    if (hidden && editing) setEditing(false);
    document.body.classList.toggle('deck-bar-hidden', hidden);
    const toggle = document.getElementById('edit-hide');
    toggle.textContent = hidden ? uiText('展開工具', 'Show tools') : uiText('收合', 'Hide');
    toggle.title = hidden ? uiText('展開工具列（E）', 'Show toolbar (E)') : uiText('收合工具列（E）', 'Hide toolbar (E)');
    toggle.setAttribute('aria-label', toggle.title);
    toggle.setAttribute('aria-expanded', String(!hidden));
  }

  async function save() {
    const blob = new Blob([edits.text()], { type: 'text/javascript' });
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

  // 編輯／講者層擁有偏好的語意與套用行為；設定模組只負責呈現及草稿。
  function persist(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }
  function registerPreferences() {
    const preferences = window.storyReader.preferences;
    preferences.register({
      title: uiText('朗讀與字幕', 'Read-aloud and captions'),
      fields: [
        { label: uiText('朗讀速度', 'Read-aloud speed'), options: RATES, default: 1, get: () => rate, set: setRate },
        { label: uiText('朗讀音量（0–100）', 'Read-aloud volume (0–100)'), type: 'number', min: 0, max: 100, default: 100, get: () => volume, set: setVolume },
        { label: uiText('顯示字幕', 'Show captions'), type: 'checkbox', default: false, get: () => cc, set: setCc },
      ],
      help: uiText('R：朗讀 · P：全部播放 · S：字幕。內建語音的新語速與音量從下一句開始套用。字幕比聲音早一點出現、念完多留一下。', 'R: read aloud · P: play all · S: captions. New speed and volume for the built-in voice apply from the next sentence. Captions appear slightly before the voice and linger briefly after.'),
    });
    preferences.register({
      title: uiText('講者視窗', 'Presenter window'),
      fields: [
        { label: uiText('講稿字級（14–56 px）', 'Notes font size (14–56 px)'), type: 'number', min: 14, max: 56, default: 26, get: () => size, set: setSize },
        ...[['notes', uiText('顯示講稿', 'Show notes')], ['comments', uiText('顯示註解', 'Show comments')]].map(([name, label]) => ({
          label, type: 'checkbox', default: true, get: () => show[name], set: value => setShow(name, value),
        })),
      ],
      help: uiText('只影響講者視窗。E：工具列 · N：講稿 · C：註解 · Ctrl／⌘ + S：另存修改。', 'Affects only the presenter window. E: toolbar · N: notes · C: comments · Ctrl/⌘ + S: save edits.'),
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.className = 'deck-edit-bar';
    bar.innerHTML = `<button type="button" id="edit-toggle" aria-pressed="false" title="${uiText('編輯文字、位置與顯示', 'Edit text, position, and visibility')}">${uiText('✎ 編輯', '✎ Edit')}</button>`
      + `<button type="button" id="edit-save" title="${uiText('另存全部修改為 edits.js（Ctrl+S）', 'Save all edits as edits.js (Ctrl+S)')}" hidden>${uiText('另存', 'Save')}</button>`
      + `<button type="button" id="edit-discard" title="${uiText('捨棄未另存的修改', 'Discard unsaved edits')}" hidden>${uiText('捨棄', 'Discard')}</button>`
      + `<button type="button" id="edit-presenter" title="${uiText('開啟簡報者視窗：講稿、計時與註解（拖到講者螢幕）', 'Open the presenter window: notes, timer, and comments (drag it to the presenter screen)')}">${uiText('🎤 講者', '🎤 Presenter')}</button>`
      + (story.pages.some(canSpeak) ? `<span class="deck-speech-bar">${controlsHtml()}</span>` : '')
      + `<button type="button" id="edit-hide" title="${uiText('收合工具列（E）', 'Hide toolbar (E)')}" aria-label="${uiText('收合工具列（E）', 'Hide toolbar (E)')}" aria-expanded="true">${uiText('收合', 'Hide')}</button>`;
    document.querySelector('body>header').append(bar);
    document.getElementById('edit-toggle').onclick = () => setEditing(!editing);
    document.getElementById('edit-save').onclick = save;
    document.getElementById('edit-discard').onclick = () => {
      if (!confirm(uiText('捨棄所有未另存的修改？', 'Discard all unsaved edits?'))) return;
      dirty = false;
      location.reload();
    };
    document.getElementById('edit-hide').onclick = () => setBarHidden(!document.body.classList.contains('deck-bar-hidden'));
    document.getElementById('edit-presenter').onclick = openPresenter;
    wireSpeak(bar);

    buildSide();
    renderNotes();
    registerPreferences();
    // 全部播放時換頁（自動或手動）接著念新的一頁；單頁朗讀則在換頁時停止。同一頁重繪不影響。
    document.addEventListener('story:render', () => {
      clearMarks();
      if (window.storyReader.index === speakPage) return;
      if (auto) speak(true); else if (speaking) speak(false);
    });
    document.addEventListener('story:render', renderNotes);
    const indexList = document.getElementById('index-list');
    if (indexList) new MutationObserver(() => { if (!indexList.querySelector('.deck-comment-badge')) badges(); }).observe(indexList, { childList: true });
    window.addEventListener('pagehide', () => { presenter?.close(); tts?.cancel(); player?.pause(); });

    const root = document.getElementById('page');
    // 換頁重繪由 story:render 重新布置；頁內變動（mount 重繪、全選改寫）只需補回按鈕。
    new MutationObserver(() => { if (editing) ensureUi(); }).observe(root, { childList: true, subtree: true });
    root.addEventListener('input', e => {
      const key = keyOf.get(e.target);
      if (key) record(key, { html: e.target.innerHTML });
      ensureUi();
    });
    window.addEventListener('resize', () => { if (editing) ensureUi(); });
    root.addEventListener('focusout', e => { if (keyOf.has(e.target)) refreshPreviews(); });

    const label = document.getElementById('story-label');
    label.addEventListener('input', () => {
      edits.setLabel(label.textContent.trim());
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
      if (e.isComposing || window.storyReader.preferences.isOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
      const typing = e.target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName);
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'e') {
        setBarHidden(!document.body.classList.contains('deck-bar-hidden'));
      }
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'n') togglePanel('notes');
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'c') togglePanel('comments');
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'r') { auto = false; speak(); }
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'p') playAll();
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 's') toggleCc();
    });
    window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  });
})();
