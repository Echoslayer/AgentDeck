// 上游 registry：核心檔案、元件、範例、指引與索引（docs/adr/0016 決策 1）。
import fs from 'node:fs';
import path from 'node:path';
import { UP, exists, readText, readJson, listFiles, fail } from './util.mjs';

export const COMPONENTS = path.join(UP, 'assets', 'deck', 'components');
export const EXAMPLES = path.join(UP, 'examples');
export const GUIDES = path.join(UP, 'docs', 'guides');
export const MIGRATIONS = path.join(UP, 'docs', 'migrations');
// 閱讀器的匯出模組按需載入；pack 必須帶入這些非 HTML 直接引用的套件。
export const READER_VENDOR = ['html-to-image', 'jspdf', 'pptxgenjs'];
const CATALOG = path.join(COMPONENTS, 'CATALOG.md');

// 核心副本：update core 整份覆蓋。路徑相對於上游根目錄，也就是下游工作區根目錄。
// templates/blank 保留可直接預覽的骨架；new 建立主題工作區根入口與 resources/<topic>/ 內容（契約 2）。
const CORE = ['LICENSE', 'AGENTDECK.md', 'assets/deck/deck-core.js', 'assets/deck/deck-editor.js', 'assets/deck/deck.css'];
const CORE_DIRS = ['assets/story-reader', 'templates/blank'];
// root 預設上游；傳下游 ws.fw 時列出本地現有的核心副本。
export const coreFiles = (root = UP) => [
  ...CORE.filter(f => exists(path.join(root, f))),
  ...CORE_DIRS.flatMap(d => listFiles(path.join(root, d)).map(f => `${d}/${f}`)),
];
export const isCore = f => CORE.includes(f) || CORE_DIRS.some(d => f.startsWith(`${d}/`));
// 主題檔案，相對於主題資料夾；預設為上游 assets/theme/，init --theme 可換成本機資料夾（ADR 0019）。
export const themeFiles = (dir = path.join(UP, 'assets', 'theme')) => listFiles(dir);

export const componentNames = () => fs.readdirSync(COMPONENTS, { withFileTypes: true })
  .filter(e => e.isDirectory() && exists(path.join(COMPONENTS, e.name, `${e.name}.js`)))
  .map(e => e.name).sort();

export const exampleNames = () => fs.readdirSync(EXAMPLES, { withFileTypes: true })
  .filter(e => e.isDirectory() && exists(path.join(EXAMPLES, e.name, 'README.md')))
  .map(e => e.name).sort();

export const guideNames = () => (exists(GUIDES) ? fs.readdirSync(GUIDES) : [])
  .filter(f => f.endsWith('.md') && f !== 'README.md').map(f => f.slice(0, -3)).sort();

// 元件 manifest 自動推導：資料夾內檔案全收；套件依賴取自 deck.define 的 vendor 與 vendor/<name>/ 引用。
export function componentManifest(name, root = UP) {
  const dir = path.join(root, 'assets', 'deck', 'components', name);
  if (!exists(path.join(dir, `${name}.js`))) return null;
  const files = listFiles(dir);
  const vendor = new Set();
  for (const f of files.filter(f => /\.(js|css|html)$/.test(f))) {
    const text = readText(path.join(dir, f));
    for (const m of text.matchAll(/vendor:\s*\[([^\]]*)\]/g)) for (const v of m[1].matchAll(/['"]([\w.-]+)['"]/g)) vendor.add(v[1]);
    for (const m of text.matchAll(/vendor\/([\w.-]+)\//g)) vendor.add(m[1]);
  }
  return { name, dir, files, vendor: [...vendor].sort() };
}

// Markdown 解析：依標題切段、取表格列。
function sections(md) {
  const out = new Map();
  let cur = '';
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = h[1]; out.set(cur, []); continue; }
    if (cur) out.get(cur).push(line);
  }
  return new Map([...out].map(([k, v]) => [k, v.join('\n').trim()]));
}
function tableRows(text) {
  const rows = (text ?? '').split('\n').filter(l => l.trim().startsWith('|'))
    .map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
  return rows.filter((r, i) => i > 0 && !r.every(c => /^:?-+:?$/.test(c)));
}
const link = cell => cell.match(/\[([^\]]+)\]\(([^)]+)\)/);
const plain = s => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`/g, '');

export function catalogSection(title) {
  return exists(CATALOG) ? sections(readText(CATALOG)).get(title) ?? '' : '';
}

export function buildIndex() {
  const cat = sections(readText(CATALOG));
  const comps = [];
  for (const [title, tier] of [['基礎元件', '基礎'], ['特殊元件', '特殊']]) {
    for (const r of tableRows(cat.get(title))) {
      const l = link(r[0]);
      if (!l) continue;
      const name = l[1];
      const [relation, use, avoid] = tier === '基礎' ? [r[1], r[2], r[3]] : [r[1], r[3], r[4]];
      const m = componentManifest(name);
      comps.push({ name, tier, relation, use: plain(use), avoid: plain(avoid), vendor: m?.vendor ?? [], tech: tier === '特殊' ? plain(r[2]) : '' });
    }
  }
  const lookup = tableRows(cat.get('依需求查找')).map(r => ({ phrase: plain(r[0]), names: [...r[1].matchAll(/`([a-z0-9]+)`/g)].map(m => m[1]) }));
  const missing = (cat.get('依需求查找') ?? '').match(/\*\*還沒有元件的關係\*\*[，,]?\s*(?:一律自製[：:])?\s*(.+)/)?.[1] ?? '';

  const exs = [];
  const exReadme = path.join(EXAMPLES, 'README.md');
  if (exists(exReadme)) {
    for (const r of tableRows(sections(readText(exReadme)).get('選擇表示方式'))) {
      const l = link(r[1]);
      if (l) exs.push({ name: l[2].split('/')[0], title: l[1], relation: plain(r[0]) });
    }
  }
  const guides = guideNames().map(name => {
    const first = readText(path.join(GUIDES, `${name}.md`)).match(/^#\s+(.+)$/m);
    return { name, title: first ? first[1] : name };
  });
  return { comps, lookup, missing: plain(missing), exs, guides };
}

// 名稱對應到上游的文件項目。
export function resolveDoc(name) {
  if (componentManifest(name)) return { kind: 'component', dir: path.join(COMPONENTS, name) };
  if (exampleNames().includes(name)) return { kind: 'example', dir: path.join(EXAMPLES, name) };
  if (guideNames().includes(name)) return { kind: 'guide', file: path.join(GUIDES, `${name}.md`) };
  const mig = name.match(/^(?:migrations\/)?(\d+-to-\d+)$/);
  if (mig && exists(path.join(MIGRATIONS, `${mig[1]}.md`))) return { kind: 'migration', file: path.join(MIGRATIONS, `${mig[1]}.md`) };
  return null;
}

// README 連到同資料夾內的 .md（實作前必讀等追加說明）。
export function linkedDocs(dir, readme = 'README.md') {
  const text = readText(path.join(dir, readme));
  const out = [];
  for (const m of text.matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)) {
    const rel = m[1];
    if (/^[a-z]+:/i.test(rel) || rel.startsWith('/') || rel.includes('..')) continue;
    if (exists(path.join(dir, rel)) && !out.includes(rel)) out.push(rel);
  }
  return out;
}

export function migrationPath(from, to) {
  const steps = [];
  for (let n = from; n < to; n++) {
    const file = path.join(MIGRATIONS, `${n}-to-${n + 1}.md`);
    steps.push({ name: `${n}-to-${n + 1}`, file, ok: exists(file) });
  }
  return steps;
}

export function upstreamVendor() {
  return readJson(path.join(UP, 'vendor.json'));
}

export function requireComponent(name) {
  const m = componentManifest(name);
  if (!m) fail(`上游沒有元件 ${name}；可用：${componentNames().join('、')}`);
  return m;
}
