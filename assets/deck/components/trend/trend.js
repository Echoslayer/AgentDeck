/* trend（零依賴）：隨時間變化的趨勢線，純 SVG + CSS 動畫。說明見 README.md。 */
'use strict';
(() => {
  const PALETTE = ['var(--deck-primary)', 'var(--deck-accent)', 'var(--muted)', '#8aa4c0', '#6b8f71'];
  const nice = x => { const p = 10 ** Math.floor(Math.log10(x)), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  const W = 640, H = 260, L = 48, R = 600, T = 16, B = 222;

  deck.define('trend', (key, labels, series, { min, max, unit = '', format = v => v.toLocaleString(), mark } = {}) => {
    if (!Array.isArray(labels) || labels.length < 2) throw new Error(`deck.trend(${key}): labels 至少兩個時間點`);
    if (!Array.isArray(series) || series.length < 1 || series.length > 5) throw new Error(`deck.trend(${key}): series 需為 1–5 條`);
    for (const s of series) {
      if (s.values?.length !== labels.length || s.values.some(v => typeof v !== 'number' || !isFinite(v))) throw new Error(`deck.trend(${key}): ${s.label} 的 values 需為與 labels 等長的數字陣列`);
    }
    const flat = series.flatMap(s => s.values), step = nice((Math.max(...flat) - Math.min(...flat)) / 4 || 1);
    const lo = min ?? Math.floor(Math.min(...flat) / step) * step, hi = max ?? Math.ceil(Math.max(...flat) / step) * step;
    if (!(hi > lo)) throw new Error(`deck.trend(${key}): max 需大於 min`);
    const X = i => L + (R - L) * i / (labels.length - 1), Y = v => B - (B - T) * (v - lo) / (hi - lo);
    const inc = min === undefined && max === undefined ? step : (hi - lo) / 4, ticks = [];
    for (let v = lo; v <= hi + inc / 1e6; v += inc) ticks.push(v);
    const grid = ticks.map(v => `<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="y" x="${L - 8}" y="${Y(v) + 4}">${format(+v.toPrecision(10))}</text>`).join('');
    const xs = labels.map((t, i) => `<text class="x" x="${X(i)}" y="${B + 22}">${t}</text>`).join('');
    const color = (s, i) => (s.highlight ? 'var(--deck-highlight)' : PALETTE[i % PALETTE.length]);
    const lines = series.map((s, i) => {
      const pts = s.values.map((v, j) => `${X(j).toFixed(1)},${Y(v).toFixed(1)}`);
      const last = s.values.length - 1;
      return `<g class="deck-trend-s deck-trend-s${i + 1}${s.highlight ? ' deck-hl' : ''}" style="--c:${color(s, i)};--d:${i * 0.25}s">`
        + `<path pathLength="1" d="M${pts.join('L')}"/><circle cx="${X(last)}" cy="${Y(s.values[last])}" r="4.5"/>`
        + `<text x="${X(last) + 8}" y="${Y(s.values[last]) + 4}">${format(s.values[last])}${unit}</text></g>`;
    }).join('');
    let markLine = '', markText = '';
    if (mark) {
      if (!(mark.at >= 0 && mark.at <= labels.length - 1)) throw new Error(`deck.trend(${key}): mark.at 需為 0–${labels.length - 1}`);
      markLine = `<line class="deck-trend-markline" x1="${X(mark.at)}" x2="${X(mark.at)}" y1="${T}" y2="${B}"/>`;
      markText = `<span class="deck-trend-mark" style="left:${(X(mark.at) / W * 100).toFixed(2)}%" data-key="${key}-mark" data-edit data-hide>${mark.text}</span>`;
    }
    const legend = series.map((s, i) => {
      const k = deck.util.itemKey(key, s, i);
      return `<li style="--c:${color(s, i)}" data-key="${k}" data-hide><span data-key="${k}-label" data-edit>${s.label}</span></li>`;
    }).join('');
    return `<div class="deck-trend" data-key="${key}"><div class="deck-trend-plot">`
      + `<svg viewBox="0 0 ${W} ${H}" role="img"><g class="deck-trend-grid">${grid}${xs}</g>${markLine}${lines}</svg>${markText}</div>`
      + `<ul class="deck-trend-legend">${legend}</ul></div>`;
  }, {
    summary: '隨時間變化的趨勢；純 SVG，進場時線條依序畫出。',
    demo: () => deck.trend('demo', ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月'], [
      { label: 'A 線良率', values: [91.2, 91.8, 92.1, 94.6, 96.0, 96.8, 97.1, 97.4], highlight: true },
      { label: 'B 線良率', values: [92.0, 91.6, 92.4, 92.2, 92.9, 93.1, 92.8, 93.3] },
    ], { unit: '%', mark: { at: 3, text: '導入新配方' } }),
  });
})();
