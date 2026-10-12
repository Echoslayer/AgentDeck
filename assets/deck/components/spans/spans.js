/* spans（零依賴）：依真實時間比例的多泳道區間，可播放游標看「此刻在做什麼」。說明見 README.md。 */
'use strict';
(() => {
// 類別依序取色，只用主題色票；超過 6 類就該合併或拆頁（README「必須保留」）。
const PALETTE = ['var(--deck-accent)', 'var(--deck-highlight)', 'var(--deck-primary)',
  'color-mix(in srgb,var(--deck-accent) 50%,var(--deck-highlight))', 'color-mix(in srgb,var(--deck-primary) 45%,var(--deck-accent))', 'var(--muted)'];
const fmt = v => (Math.round(v * 1000) / 1000).toLocaleString();
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

deck.define('spans', (key, { unit = '', categories = {}, groups = [] } = {}, { hint = '用播放、拉桿或「下一個事件」移動時間游標。', duration = 6 } = {}) => {
  const err = m => new Error(`deck.spans(${key}): ${m}`);
  const cats = Object.keys(categories);
  if (!cats.length || cats.length > PALETTE.length) throw err(`categories 需 1–${PALETTE.length} 類`);
  if (!Array.isArray(groups) || !groups.length) throw err('groups 至少 1 組');
  const all = [];
  groups.forEach((g, gi) => {
    if (!Array.isArray(g.lanes) || !g.lanes.length) throw err(`第 ${gi + 1} 組沒有 lanes`);
    g.lanes.forEach(l => (l.spans || []).forEach(s => {
      if (!(Number.isFinite(s.start) && Number.isFinite(s.end) && s.end >= s.start)) throw err(`區間「${s.label}」需 start ≤ end`);
      if (!categories[s.cat]) throw err(`區間「${s.label}」的 cat「${s.cat}」不在 categories`);
      all.push(s);
    }));
  });
  if (!all.length) throw err('沒有任何區間');
  const from = Math.min(0, ...all.map(s => s.start)), to = Math.max(...all.map(s => s.end));
  const span = to - from || 1, pct = v => (100 * (v - from) / span).toFixed(3);
  const color = c => PALETTE[cats.indexOf(c)];
  const u = unit ? ` ${esc(unit)}` : '';

  const body = groups.map((g, gi) => {
    const gk = deck.util.itemKey(key, g, gi);
    const lanes = g.lanes.map(l => `<div class="deck-spans-lane"><span class="deck-spans-lane-label">${esc(l.label ?? '')}</span><div class="deck-spans-track">${
      (l.spans || []).map(s => `<i class="deck-spans-bar" style="left:${pct(s.start)}%;width:${(100 * (s.end - s.start) / span).toFixed(3)}%;--c:${color(s.cat)}" data-start="${s.start}" data-end="${s.end}" data-label="${esc(s.label ?? '')}" title="${esc(s.label ?? '')}：${fmt(s.start)}–${fmt(s.end)}${u}"><span>${esc(s.label ?? '')}</span></i>`).join('')
    }<b class="deck-spans-cursor" aria-hidden="true"></b></div></div>`).join('');
    return `<section class="deck-spans-group" data-key="${gk}" data-hide><div class="deck-spans-head"><b data-key="${gk}-label" data-edit>${g.label}</b>${g.note ? `<small data-key="${gk}-note" data-edit>${g.note}</small>` : ''}</div><p class="deck-spans-now" aria-live="polite"></p>${lanes}</section>`;
  }).join('');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => `<span style="left:${100 * f}%">${fmt(from + f * span)}${f === 1 ? u : ''}</span>`).join('');
  const legend = cats.map((c, i) => `<span><i style="--c:${PALETTE[i]}"></i><span data-key="${key}-cat-${i + 1}" data-edit>${categories[c].label ?? c}</span></span>`).join('');
  const ctrl = `<div class="deck-spans-ctrl"><button type="button" data-act="play">播放</button><button type="button" data-act="next">下一個事件</button>`
    + `<input type="range" min="0" max="1000" step="any" value="0" aria-label="時間"><output>${fmt(from)} / ${fmt(to)}${u}</output></div>`;
  return `<div class="deck-spans" data-key="${key}" data-from="${from}" data-to="${to}" data-unit="${esc(unit)}" data-duration="${duration}">`
    + `<div class="deck-spans-legend">${legend}</div>${body}<div class="deck-spans-axis">${ticks}</div>${ctrl}${hint ? `<p class="deck-hint">${hint}</p>` : ''}</div>`;
}, {
  tier: 'special',
  live,
  summary: '依時間比例畫出多條泳道上的區間；可播放游標，看此刻哪些區間同時進行、哪裡在等待。',
  // 示範：同樣兩張圖，循序處理與分兩條執行列管線處理，看重疊與等待
  demo: () => deck.spans('demo', {
    unit: 'ms',
    categories: { io: { label: '讀檔' }, cpu: { label: '前處理' }, gpu: { label: '推論' }, wait: { label: '等待' } },
    groups: [
      { label: '循序處理', note: '共 52 ms', lanes: [{ label: '執行列 1', spans: [
        { start: 0, end: 6, label: '讀圖 1', cat: 'io' }, { start: 6, end: 14, label: '前處理 1', cat: 'cpu' }, { start: 14, end: 26, label: '推論 1', cat: 'gpu' },
        { start: 26, end: 32, label: '讀圖 2', cat: 'io' }, { start: 32, end: 40, label: '前處理 2', cat: 'cpu' }, { start: 40, end: 52, label: '推論 2', cat: 'gpu' }] }] },
      { label: '管線處理', note: '共 38 ms', lanes: [
        { label: '執行列 1', spans: [{ start: 0, end: 6, label: '讀圖 1', cat: 'io' }, { start: 6, end: 14, label: '前處理 1', cat: 'cpu' },
          { start: 14, end: 20, label: '讀圖 2', cat: 'io' }, { start: 20, end: 28, label: '前處理 2', cat: 'cpu' }] },
        { label: '執行列 2', spans: [{ start: 0, end: 14, label: '等待輸入', cat: 'wait' }, { start: 14, end: 26, label: '推論 1', cat: 'gpu' },
          { start: 26, end: 28, label: '等待', cat: 'wait' }, { start: 28, end: 38, label: '推論 2', cat: 'gpu' }] }] },
    ],
  }),
});

function live(el) {
  const from = +el.dataset.from, to = +el.dataset.to, unit = el.dataset.unit ? ` ${el.dataset.unit}` : '';
  const input = el.querySelector('.deck-spans-ctrl input'), out = el.querySelector('.deck-spans-ctrl output'), play = el.querySelector('[data-act=play]');
  const bars = [...el.querySelectorAll('.deck-spans-bar')];
  const edges = [...new Set(bars.flatMap(b => [+b.dataset.start, +b.dataset.end]))].sort((a, b) => a - b);
  let frame = null, last = 0;
  const tAt = () => from + (to - from) * input.value / 1000;
  const draw = () => {
    const t = tAt();
    el.style.setProperty('--deck-spans-t', String(input.value / 1000));
    out.textContent = `${fmt(t)} / ${fmt(to)}${unit}`;
    for (const b of bars) b.classList.toggle('is-active', +b.dataset.start <= t && t < +b.dataset.end);
    el.querySelectorAll('.deck-spans-group').forEach(g => {
      const on = [...g.querySelectorAll('.deck-spans-bar.is-active')].map(b => b.dataset.label);
      const done = t >= Math.max(...[...g.querySelectorAll('.deck-spans-bar')].map(b => +b.dataset.end));
      g.querySelector('.deck-spans-now').textContent = on.length ? on.join(' ＋ ') : done ? '已完成' : '空檔';
    });
  };
  const stop = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; play.textContent = '播放'; };
  const tick = now => {
    input.value = String(Math.min(1000, +input.value + (now - last) / (+el.dataset.duration * 1000) * 1000)); last = now; draw();
    if (+input.value >= 1000) stop(); else frame = requestAnimationFrame(tick);
  };
  const onClick = e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'play') {
      if (frame !== null) return stop();
      if (+input.value >= 1000) input.value = '0';
      last = performance.now(); frame = requestAnimationFrame(tick); play.textContent = '暫停';
    } else if (act === 'next') {
      stop();
      const t = tAt(), nxt = edges.find(v => v > t + (to - from) * 1e-6);
      input.value = String(nxt === undefined ? 1000 : 1000 * (nxt - from) / (to - from || 1)); draw(); // 不捨入，避免停在事件前一點而重複跳同一個事件
    }
  };
  const onInput = () => { stop(); draw(); };
  el.addEventListener('click', onClick);
  input.addEventListener('input', onInput);
  draw();
  return () => { stop(); el.removeEventListener('click', onClick); input.removeEventListener('input', onInput); };
}
})();
