/* 核心：每份簡報都載入，位於元件與 story.js 之前（docs/adr/0009）。
   只提供三件事：
   1. 頁型 deck.cover()／deck.end()（每份簡報都有）；品牌裝飾由主題以 deck.theme() 提供（docs/adr/0010）。
   2. deck.define(name, fn, meta)：元件註冊器。元件放在 assets/deck/components/<name>/，按需引用。
      註冊後以 deck.<name>(key, …) 呼叫；核心在每次呼叫時強制元件契約：
      key 格式正確、只產生單一根元素、根元素 data-key 等於 key。
   3. deck.util：元件共用的小工具，含特殊元件用的 three.js 外殼 deck.util.three。
   另外負責特殊元件的動態內容生命週期（deck.define 的 live 選項，docs/adr/0013）。
   呼叫未載入的元件會直接報錯並說明如何引用；沒有合適元件時，在主題 story.js／story.css 自行實作。 */
'use strict';
window.deck = (() => {
  // 契約版本（docs/adr/0016）：只有不相容變更才遞增，並附 docs/migrations/<n>-to-<n+1>.md。CLI 以此行讀取版本。
  const CONTRACT = 2;
  const KEY = /^[\w-]+$/;
  const TIERS = ['basic', 'special'];
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

  // meta：{ summary: 一句用途（展示頁用）, demo: () => 範例 HTML, css: 是否有同名 .css（預設 true）,
  //         tier: 'basic'｜'special'（見 CATALOG.md）, vendor: 用到的 vendor.json 套件名稱,
  //         live: el => 清理函式（動態內容；見下方 story:render） }
  function define(name, fn, { summary = '', demo, css = true, tier = 'basic', vendor = [], live } = {}) {
    if (!NAME.test(name)) throw new Error(`deck.define: 元件名稱需為小寫英數，收到 ${JSON.stringify(name)}`);
    if (name in api || registry.has(name)) throw new Error(`deck.define: ${name} 已存在`);
    if (typeof fn !== 'function') throw new Error(`deck.define(${name}): 需要產生函式`);
    if (!TIERS.includes(tier)) throw new Error(`deck.define(${name}): tier 需為 ${TIERS.join('／')}`);
    if ((live || vendor.length) && tier !== 'special') throw new Error(`deck.define(${name}): 有 live 或 vendor 的元件必須是 special`);
    if (live !== undefined && typeof live !== 'function') throw new Error(`deck.define(${name}): live 需為函式`);
    const call = (key, ...args) => {
      checkKey(name, key);
      const html = fn(key, ...args);
      checkOutput(name, key, html);
      return html;
    };
    const src = document.currentScript?.src;
    registry.set(name, Object.freeze({ name, call, summary, demo, tier, vendor: Object.freeze([...vendor]), live, css: css && src ? src.replace(/\.js$/, '.css') : null }));
  }

  // 動態內容（WebGL、canvas）：產生函式只回傳 HTML（含靜態後備，供縮圖與失敗時顯示）；
  // 頁面渲染後核心對每個 .deck-<name> 根元素呼叫 live(el)，換頁時先執行上一頁的清理函式。
  // 啟動成功的元素加上 .deck-live-on，deck.css 據此隱藏後備。
  let cleanups = [];
  document.addEventListener('story:render', e => {
    cleanups.forEach(f => { try { f(); } catch (err) { console.error(err); } });
    cleanups = [];
    for (const c of registry.values()) {
      if (!c.live) continue;
      e.detail.root.querySelectorAll(`.deck-${c.name}`).forEach(el => {
        if (el.closest('.mini-page')) return; // 縮圖（含展示頁總覽）一律用靜態後備
        try {
          const f = c.live(el);
          if (typeof f === 'function') cleanups.push(f);
          el.classList.add('deck-live-on');
        } catch (err) {
          console.error(`deck.${c.name}: 動態內容啟動失敗，保留靜態後備`, err);
        }
      });
    }
  });

  // three.js 共用外殼（vendor.json 的 three）：renderer、尺寸、動畫迴圈、拖曳旋轉、釋放資源。
  // setup(ctx) 建好場景後回傳 update(t)；ctx.drag 為累積拖曳角度 { x, y }，ctx.token(name) 讀色票。
  function three(host, setup) {
    if (!window.THREE) throw new Error('three.js 未載入：在 index.html 引用 agentdeck/vendor/three/three.min.js（上游內為 vendor/three/three.min.js），並執行 agentdeck vendor 下載（docs/adr/0011）');
    const T = window.THREE;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.domElement.className = 'deck-canvas';
    host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(35, 1, 0.1, 100);
    const drag = { x: 0, y: 0 };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = { T, scene, camera, renderer, drag, reduced, token: name => getComputedStyle(host).getPropertyValue(name).trim() };
    let update;
    try {
      update = setup(ctx) || (() => {});
    } catch (err) {
      renderer.dispose();
      renderer.domElement.remove();
      throw err;
    }

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let last = null;
    const down = e => { last = [e.clientX, e.clientY]; host.setPointerCapture(e.pointerId); };
    const move = e => {
      if (!last) return;
      drag.x += (e.clientX - last[0]) * 0.01;
      drag.y = Math.max(-0.8, Math.min(0.8, drag.y + (e.clientY - last[1]) * 0.01));
      last = [e.clientX, e.clientY];
    };
    const up = () => { last = null; };
    const events = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up };
    for (const [k, f] of Object.entries(events)) host.addEventListener(k, f);

    let raf;
    const t0 = performance.now();
    const loop = now => {
      raf = requestAnimationFrame(loop);
      if (!host.clientWidth) return; // 被隱藏時不繪製
      update(reduced ? 0 : (now - t0) / 1000);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const [k, f] of Object.entries(events)) host.removeEventListener(k, f);
      scene.traverse(o => {
        o.geometry?.dispose();
        [].concat(o.material || []).forEach(m => m.dispose());
      });
      renderer.dispose();
      renderer.forceContextLoss(); // 瀏覽器同時可用的 WebGL context 有上限，換頁一定要釋放
      renderer.domElement.remove();
    };
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
  // 預設章節名稱跟隨 <html lang>（docs/adr/0031）。
  const zh = () => /^zh/i.test(document.documentElement.lang || 'zh');
  const notes = o => Object.fromEntries(['instruction', 'explain', 'speech', 'audio', 'cues', 'record', 'transition'].filter(k => o[k] !== undefined).map(k => [k, o[k]]));

  function cover({ id = 'cover', section = zh() ? '封面' : 'Cover', title, meta = '', ...rest } = {}) {
    if (typeof title !== 'string') throw new Error('deck.cover: 需要 title');
    return {
      id, section, title, lead: '', point: '', ...notes(rest),
      art: `<div class="deck-cover" data-canvas>`
        + (decor?.cover ?? '')
        + `<h2 class="deck-cover-title" data-key="title" data-edit data-move>${title}</h2>`
        + `<div class="deck-cover-meta" data-key="cover-meta" data-edit data-move>${meta}</div>`
        + `</div>`,
    };
  }

  function end({ id = 'thanks', section = zh() ? '結尾' : 'End', title = 'Thank You', ...rest } = {}) {
    return {
      id, section, title, lead: '', point: '', ...notes(rest),
      art: `<div class="deck-end" data-canvas>`
        + `<h2 class="deck-end-title" data-key="title" data-edit data-move>${title}</h2>`
        + (decor?.end ?? '')
        + `</div>`,
    };
  }

  const api = {
    contract: CONTRACT,
    define, theme, cover, end,
    util: Object.freeze({ itemKey, textOf, three }),
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
        throw new Error(`deck.${prop} 未載入。若元件目錄（agentdeck catalog）有此元件，以 agentdeck add ${prop} 取得後，依其輸出在 index.html 引用 agentdeck/assets/deck/components/${prop}/${prop}.css 與 ${prop}.js；否則在主題 story.js／story.css 自行實作。`);
      }
      return undefined;
    },
    set() { throw new Error('請用 deck.define(name, fn, meta) 註冊元件'); },
  });
})();
