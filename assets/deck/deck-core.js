/* 核心：每份簡報都載入，位於元件與 story.js 之前（docs/adr/0009）。
   只提供三件事：
   1. 頁型 deck.cover()／deck.end()（每份簡報都有）；品牌裝飾由主題以 deck.theme() 提供（docs/adr/0010）。
   2. deck.define(name, fn, meta)：元件註冊器。元件放在 assets/deck/components/<name>/，按需引用。
      註冊後以 deck.<name>(key, …) 呼叫；核心在每次呼叫時強制元件契約：
      key 格式正確、只產生單一根元素、根元素 data-key 等於 key。
   3. deck.util：元件共用的小工具。
   呼叫未載入的元件會直接報錯並說明如何引用；沒有合適元件時，在主題 story.js／story.css 自行實作。 */
'use strict';
window.deck = (() => {
  const KEY = /^[\w-]+$/;
  const NAME = /^[a-z][a-z0-9]*$/;
  const registry = new Map();

  // 子項目 key 預設為「父 key-序號」；項目帶 key 時以項目為準。
  const itemKey = (key, item, i) => (item && typeof item === 'object' && item.key) || `${key}-${i + 1}`;
  const textOf = item => (typeof item === 'string' ? item : item.text);

  function checkKey(name, key) {
    if (typeof key !== 'string' || !KEY.test(key)) throw new Error(`deck.${name}: 第一個參數需為 data-key（英數、-、_），收到 ${JSON.stringify(key)}`);
  }

  function checkOutput(name, key, html) {
    const t = document.createElement('template');
    t.innerHTML = html;
    const nodes = [...t.content.childNodes].filter(n => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
    if (nodes.length !== 1 || nodes[0].nodeType !== Node.ELEMENT_NODE) throw new Error(`deck.${name}(${key}): 元件必須產生單一根元素`);
    if (nodes[0].dataset.key !== key) throw new Error(`deck.${name}(${key}): 根元素的 data-key 必須等於 ${key}`);
  }

  // meta：{ summary: 一句用途（展示頁用）, demo: () => 範例 HTML, css: 是否有同名 .css（預設 true） }
  function define(name, fn, { summary = '', demo, css = true } = {}) {
    if (!NAME.test(name)) throw new Error(`deck.define: 元件名稱需為小寫英數，收到 ${JSON.stringify(name)}`);
    if (name in api || registry.has(name)) throw new Error(`deck.define: ${name} 已存在`);
    if (typeof fn !== 'function') throw new Error(`deck.define(${name}): 需要產生函式`);
    const call = (key, ...args) => {
      checkKey(name, key);
      const html = fn(key, ...args);
      checkOutput(name, key, html);
      return html;
    };
    const src = document.currentScript?.src;
    registry.set(name, Object.freeze({ name, call, summary, demo, css: css && src ? src.replace(/\.js$/, '.css') : null }));
  }

  // 主題（assets/theme/theme.js）提供封面／結尾的品牌裝飾，例如 logo；未載入主題時只有標題與說明。
  // cover／end 為 img => HTML，img 是 theme.js 旁 img/ 的網址。每個裝飾都是畫布內元件，需有 data-key。
  const RESERVED = new Set(['title', 'cover-meta']);
  let decor = null;
  function checkDecor(page, html) {
    if (typeof html !== 'string') throw new Error(`deck.theme: ${page} 需回傳 HTML 字串`);
    const t = document.createElement('template');
    t.innerHTML = html;
    const seen = new Set();
    for (const n of t.content.childNodes) {
      if (n.nodeType === Node.TEXT_NODE && !n.textContent.trim()) continue;
      const key = n.nodeType === Node.ELEMENT_NODE && n.dataset.key;
      if (!key || !KEY.test(key)) throw new Error(`deck.theme: ${page} 的每個第一層元素都需要 data-key`);
      if (RESERVED.has(key) || seen.has(key)) throw new Error(`deck.theme: ${page} 的 data-key "${key}" 重複或與頁型保留字衝突`);
      seen.add(key);
    }
    return html;
  }
  function theme({ cover = () => '', end = () => '' } = {}) {
    if (decor) throw new Error('deck.theme: 只能設定一次');
    const src = document.currentScript?.src;
    if (!src) throw new Error('deck.theme: 需由 theme.js 以 <script src> 載入');
    const img = new URL('img/', src).href;
    decor = Object.freeze({ cover: checkDecor('cover', cover(img)), end: checkDecor('end', end(img)) });
  }

  // 頁型：回傳完整頁面物件。reader 的章節、標題、引言、重點由 deck.css 隱藏；title 同步索引與縮圖。
  function cover({ id = 'cover', section = '封面', title, meta = '' } = {}) {
    if (typeof title !== 'string') throw new Error('deck.cover: 需要 title');
    return {
      id, section, title, lead: '', point: '',
      art: `<div class="deck-cover" data-canvas>`
        + (decor?.cover ?? '')
        + `<h2 class="deck-cover-title" data-key="title" data-edit data-move>${title}</h2>`
        + `<div class="deck-cover-meta" data-key="cover-meta" data-edit data-move>${meta}</div>`
        + `</div>`,
    };
  }

  function end({ id = 'thanks', section = '結尾', title = 'Thank You' } = {}) {
    return {
      id, section, title, lead: '', point: '',
      art: `<div class="deck-end" data-canvas>`
        + `<h2 class="deck-end-title" data-key="title" data-edit data-move>${title}</h2>`
        + (decor?.end ?? '')
        + `</div>`,
    };
  }

  const api = {
    define, theme, cover, end,
    util: Object.freeze({ itemKey, textOf }),
    components: () => [...registry.keys()],
    info: name => registry.get(name),
  };

  // 元件引用了 js 卻漏了 css 時，版面會默默走樣；載入完成後檢查一次。
  document.addEventListener('DOMContentLoaded', () => {
    const sheets = new Set([...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href));
    for (const c of registry.values()) {
      if (c.css && !sheets.has(c.css)) console.error(`deck.${c.name}: 缺少樣式，請在 index.html 引用 ${c.css}`);
    }
  });

  return new Proxy(api, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (registry.has(prop)) return registry.get(prop).call;
      if (typeof prop === 'string' && NAME.test(prop) && prop !== 'then') {
        throw new Error(`deck.${prop} 未載入。若 assets/deck/components/CATALOG.md 有此元件，在 index.html 引用 components/${prop}/${prop}.css 與 ${prop}.js；否則在主題 story.js／story.css 自行實作。`);
      }
      return undefined;
    },
    set() { throw new Error('請用 deck.define(name, fn, meta) 註冊元件'); },
  });
})();
