// Source excerpts: a local snapshot, not live repository analysis.
window.siteEvidenceVersion = "e723737 · 2026-10-06";
window.siteEvidence = [
  {
    "id": "core",
    "path": "assets/deck/deck-core.js",
    "start": 45,
    "summary": {
      "en": "Components produce checked HTML with stable keys.",
      "zh": "元件以穩定 key 產生經檢查的 HTML。"
    },
    "relation": {
      "en": "Component definition → registry → storyboard call",
      "zh": "元件定義 → registry → 分鏡呼叫"
    },
    "code": "    const call = (key, ...args) => {\n      checkKey(name, key);\n      const html = fn(key, ...args);\n      checkOutput(name, key, html);\n      return html;\n    };\n    const src = document.currentScript?.src;\n    registry.set(name, Object.freeze({ name, call, summary, demo, tier, vendor: Object.freeze([...vendor]), live, css: css && src ? src.replace(/\\.js$/, '.css') : null }));"
  },
  {
    "id": "reader",
    "path": "assets/story-reader/reader.js",
    "start": 166,
    "summary": {
      "en": "Each page receives its own state and returns optional cleanup.",
      "zh": "每頁取得自己的狀態，並可回傳清理函式。"
    },
    "relation": {
      "en": "Storyboard mount → page state → render event",
      "zh": "分鏡 mount → 頁面狀態 → 渲染事件"
    },
    "code": "  feedback();\n  if (p.mount) {\n    if (!states.has(p.id)) states.set(p.id, {});\n    cleanup = p.mount(root, states.get(p.id));\n    if (cleanup !== undefined && typeof cleanup !== 'function') throw new Error(`${p.id}: mount 必須回傳清理函式或 undefined`);\n  }\n  document.dispatchEvent(new CustomEvent('story:render', { detail: { page: p, root } }));\n  annotations.render(p.id);"
  },
  {
    "id": "editor",
    "path": "assets/deck/deck-editor.js",
    "start": 96,
    "summary": {
      "en": "Saved edits are applied by page ID and key before rendering.",
      "zh": "播放前依頁面 ID 與 key 套用已保存的人工修正。"
    },
    "relation": {
      "en": "edits.js + story.js → rendered page and preview",
      "zh": "edits.js + story.js → 頁面與靜態預覽"
    },
    "code": "    if (p.previewArt !== undefined) p.previewArt = patchHtml(p.previewArt, key, ov, false);\n  }\n\n  // 在 reader 渲染前套用 edits.js，縮圖與索引因此也看得到人工修改。\n  if (typeof edits.label === 'string') story.label = edits.label;\n  for (const p of story.pages) {\n    for (const [key, ov] of Object.entries(edits.pages[p.id] || {})) applyPage(p, key, ov);\n  }"
  }
];
