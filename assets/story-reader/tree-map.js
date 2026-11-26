/* 所有簡報樹共用 story.sequence；只有閱讀器辨認出目前入口時才載入。 */
'use strict';
(() => {
  const button = Object.assign(document.createElement('button'), { type: 'button', className: 'reader-tree-toggle', title: uiText('簡報樹', 'Presentation tree') });
  button.setAttribute('aria-label', button.title);
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', 'reader-tree');
  button.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M10 6v4M4 14v-4h12v4"/><circle cx="10" cy="4" r="2.4"/><circle cx="4" cy="16" r="2.4"/><circle cx="16" cy="16" r="2.4"/></svg>';
  document.querySelector('.reader-overview-toggle').after(button);

  const dialog = document.createElement('dialog');
  dialog.id = 'reader-tree';
  dialog.setAttribute('aria-labelledby', 'reader-tree-title');
  const searchLabel = uiText('搜尋編號、名稱或分組', 'Search by number, title or group');
  dialog.innerHTML = `<div class="tree-head"><h2 id="reader-tree-title">${uiText('簡報樹', 'Presentation tree')}</h2>
    <button type="button" data-close aria-label="${uiText('關閉', 'Close')}">✕</button></div>
    <div class="tree-search"><input type="search" aria-label="${searchLabel}" placeholder="${searchLabel}"></div>
    <div class="tree-body"><div class="tree-viewport"><div class="tree-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg></div></div>
    <section class="tree-side"><h3 aria-live="polite"></h3><div class="tree-links"></div></section></div>
    <div class="tree-location">${uiText('目前位置', 'Current location')} · <strong></strong></div>`;
  document.body.append(dialog);
  const chart = dialog.querySelector('.tree-chart'), svg = chart.querySelector('svg');
  const input = dialog.querySelector('input'), list = dialog.querySelector('.tree-links');
  const entries = sequence.map((link, index) => ({ ...link, index }));
  const currentEntry = entries[sequenceIndex];
  dialog.querySelector('.tree-location strong').textContent = currentEntry.label;
  const groups = new Map();
  for (const entry of entries.slice(1)) {
    const name = entry.group || '';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(entry);
  }
  const colors = ['#8fe3d0', '#a9c8ff', '#dbb4f3', '#f2bd81', '#ef9d9d'];
  let selected = currentEntry.group || (sequenceIndex === 0 ? groups.keys().next().value : '');

  function linkTo(entry, text) {
    const a = Object.assign(document.createElement('a'), { href: entry.href, textContent: text, title: entry.label });
    a.dataset.entry = entry.index;
    a.setAttribute('aria-label', entry.label);
    if (entry.index === sequenceIndex) a.setAttribute('aria-current', 'page');
    return a;
  }
  function refresh() {
    const q = input.value.trim().toLowerCase();
    const number = q.match(/^(?:第\s*)?(\d+)(?:\s*講)?$/);
    const matches = q ? entries.filter(e => number ? e.index === Number(number[1])
      : e.label.toLowerCase().includes(q) || e.group?.toLowerCase().includes(q)) : groups.get(selected);
    if (q && !number) matches.sort((a, b) => Number(b.label.toLowerCase().includes(q)) - Number(a.label.toLowerCase().includes(q)));
    dialog.classList.toggle('tree-searching', Boolean(q));
    dialog.querySelector('h3').textContent = q
      ? uiText(`搜尋結果（${matches.length}）`, `Results (${matches.length})`)
      : selected || uiText('分支', 'Branches');
    list.replaceChildren(...matches.map(entry => {
      const a = linkTo(entry, entry.label), n = document.createElement('span');
      n.textContent = entry.index ? String(entry.index).padStart(2, '0') : '⌂';
      a.prepend(n);
      return a;
    }));
    list.scrollTop = 0;
    if (!matches.length) list.textContent = uiText('找不到相符的簡報', 'No matching presentations');
    const visible = new Set(matches.map(entry => entry.index));
    for (const a of chart.querySelectorAll('a')) a.classList.toggle('tree-dim', Boolean(q) && !visible.has(Number(a.dataset.entry)));
    for (const hub of chart.querySelectorAll('button')) hub.setAttribute('aria-pressed', String(!q && hub.dataset.group === selected));
  }

  // 外圈依分支數分配角度。大分組收合為一個節點，點組名即可從旁邊的清單跳轉。
  function drawChart() {
    const center = [50, 50];
    const point = (angle, radius) => [50 + Math.sin(angle) * radius, 50 - Math.cos(angle) * radius];
    function place(el, xy, cls) {
      el.className = cls;
      el.style.left = xy[0] + '%';
      el.style.top = xy[1] + '%';
      chart.append(el);
    }
    function edge(a, b, color) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      for (const [key, value] of Object.entries({ x1:a[0], y1:a[1], x2:b[0], y2:b[1], stroke:color })) line.setAttribute(key, value);
      svg.append(line);
    }
    const sectors = [...groups].map(([name, items]) => {
      const collapsed = Boolean(name) && items.length > 8;
      return { name, items, collapsed, slots: name ? Math.max(3, collapsed ? 1 : items.length) : items.length };
    });
    const slots = sectors.reduce((n, sector) => n + sector.slots, 0);
    const step = Math.PI * 2 / slots;
    chart.style.minWidth = Math.max(320, slots * 10) + 'px';
    let angle = -(sectors[0].slots - 1) * step / 2;
    sectors.forEach(({ name, items, slots: count, collapsed }, i) => {
      const mid = angle + (count - 1) * step / 2, color = colors[i % colors.length];
      let parent = center;
      if (name) {
        parent = point(mid, collapsed ? 34 : 24);
        edge(center, parent, color);
        const hub = Object.assign(document.createElement('button'), { type:'button', textContent:name, title:name });
        hub.dataset.group = name;
        hub.style.setProperty('--node-color', color);
        place(hub, parent, 'tree-hub');
      }
      if (!collapsed) items.forEach((entry, j) => {
        const leaf = point(mid + (j - (items.length - 1) / 2) * step, 43);
        edge(parent, leaf, color);
        const a = linkTo(entry, String(entry.index).padStart(2, '0'));
        a.style.setProperty('--node-color', color);
        place(a, leaf, 'tree-leaf');
      });
      angle += count * step;
    });
    place(linkTo(entries[0], entries[0].label), center, 'tree-root');
  }

  button.onclick = () => {
    if (!chart.querySelector('a')) drawChart();
    input.value = '';
    refresh();
    dialog.showModal();
    if (matchMedia('(pointer: fine)').matches) input.focus();
  };
  input.oninput = refresh;
  dialog.addEventListener('click', e => {
    const hub = e.target.closest('[data-group]');
    if (hub) { selected = hub.dataset.group; input.value = ''; refresh(); }
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
    const a = e.target.closest('a');
    if (a && Number(a.dataset.entry) === sequenceIndex && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      dialog.close();
      if (!a.hash) { e.preventDefault(); window.storyReader.go(0); }
    }
  });
  dialog.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.isComposing) return;
    if (e.key === 'Escape') { e.preventDefault(); dialog.close(); }
    if (e.target === input && e.key === 'Enter' && input.value.trim()) {
      e.preventDefault(); list.querySelector('a')?.click();
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const a = e.target.closest('.tree-links a');
      if (!a && e.target !== input) return;
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? (a ? a.nextElementSibling : list.firstElementChild) : (a?.previousElementSibling || input);
      next?.focus();
    }
  });
  dialog.addEventListener('close', () => button.focus());
})();
