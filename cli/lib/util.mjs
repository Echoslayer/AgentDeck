// 共用工具：路徑、雜湊、複製、工作區定位、上游資訊（docs/adr/0016）。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const UP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MARKER = 'agentdeck.json';
// 下游的框架、元件、套件與製作記錄集中在此資料夾，根目錄只留入口與內容（ADR 0017）。
export const FW = 'agentdeck';
export const DEFAULT_SOURCE = 'github:Echoslayer/AgentDeck';

export class UserError extends Error {}
export const fail = msg => { throw new UserError(msg); };

export const toPosix = p => p.split(path.sep).join('/');
export const exists = p => fs.existsSync(p);
export const readText = p => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
export const readJson = p => JSON.parse(readText(p));
export function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}
export function writeText(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

// 子路徑檢查：避免任何寫入或讀取跳出指定資料夾。
export function inside(base, p) {
  const rel = path.relative(base, p);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

const TEXT = /\.(js|mjs|cjs|css|html?|md|json|svg|txt)$/i;
// 文字檔先統一換行再雜湊，避免 git autocrlf 讓未修改的檔案被判為已修改。
export function hashFile(p) {
  if (!exists(p)) return null;
  let buf = fs.readFileSync(p);
  if (TEXT.test(p)) buf = Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'));
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
}
export const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();

// 遞迴列出檔案（相對路徑、posix 分隔），略過暫存下載檔。
export function listFiles(dir, base = dir) {
  if (!exists(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(full, base));
    else if (e.isFile() && !e.name.endsWith('.download')) out.push(toPosix(path.relative(base, full)));
  }
  return out.sort();
}

export function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

export function git(args, cwd) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch { return null; }
}

// 上游契約版本：讀 deck-core.js 的 const CONTRACT。
export function contractOf(root) {
  const core = path.join(root, 'assets', 'deck', 'deck-core.js');
  const m = exists(core) && readText(core).match(/const CONTRACT = (\d+);/);
  if (!m) fail(`找不到契約版本（${core} 的 const CONTRACT）`);
  return Number(m[1]);
}

// 上游 commit：本機 checkout 用 git；npx github: 安裝則從 npx 快取的 package-lock.json 取得。
let commitCache;
export function upstreamCommit() {
  if (commitCache !== undefined) return commitCache;
  commitCache = null;
  const top = git(['rev-parse', '--show-toplevel'], UP);
  if (top && path.resolve(top) === UP) {
    const sha = git(['rev-parse', '--short=12', 'HEAD'], UP);
    const dirty = git(['status', '--porcelain', '--', 'assets', 'templates', 'AGENTDECK.md', 'LICENSE'], UP);
    if (sha) commitCache = sha + (dirty ? '-dirty' : '');
    return commitCache;
  }
  let d = UP;
  for (let i = 0; i < 4; i++) {
    d = path.dirname(d);
    const lock = path.join(d, 'package-lock.json');
    if (!exists(lock)) continue;
    try {
      for (const [k, v] of Object.entries(readJson(lock).packages ?? {})) {
        const m = k.endsWith('node_modules/agentdeck') && String(v.resolved ?? '').match(/#([0-9a-f]{7,40})$/);
        if (m) return (commitCache = m[1].slice(0, 12));
      }
    } catch { /* 快取格式不明時不記錄 commit，雜湊仍可比對 */ }
  }
  return commitCache;
}

// 工作區：往上找 agentdeck/agentdeck.json；在上游 repo 內則以上游為工作區（情境 A，僅供上游自用）。
// root 是簡報單位根目錄（入口與 resources/），fw 是框架副本所在；上游與舊佈局兩者相同。
export function findWorkspace(opts = {}) {
  let d = path.resolve(opts.dir ?? process.cwd());
  const start = d;
  const load = file => ({ contract: 0, core: {}, components: {}, ...readJson(file) });
  for (;;) {
    if (exists(path.join(d, FW, MARKER))) return { root: d, fw: path.join(d, FW), upstream: false, config: load(path.join(d, FW, MARKER)) };
    if (path.basename(d) === FW && exists(path.join(d, MARKER))) {
      const root = path.dirname(d);
      return { root, fw: d, upstream: false, config: load(path.join(d, MARKER)) };
    }
    if (exists(path.join(d, MARKER))) {
      // 根目錄的 agentdeck.json 是契約 1 以前的佈局；workspace.cmd 的記錄沒有 contract，視為契約 0（docs/migrations/0-to-1.md）。
      return { root: d, fw: d, upstream: false, legacy: true, config: load(path.join(d, MARKER)) };
    }
    if (d === UP) return { root: UP, fw: UP, upstream: true, config: null };
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }
  fail(`找不到 ${FW}/${MARKER}（從 ${start} 往上找）。先執行 init 建立工作區，或以 --dir 指定。`);
}

export function requireDownstream(ws, cmd) {
  if (ws.upstream) fail(`${cmd} 只用於下游工作區；上游內的檔案即為來源。`);
}

export function saveConfig(ws) {
  writeJson(path.join(ws.fw, MARKER), ws.config);
}

export function cliHint(source) {
  if (/^(github:|https?:|git\+)/.test(source)) return `npx -y ${source}`;
  return `node "${toPosix(path.resolve(source, 'cli', 'agentdeck.mjs'))}"`;
}

export const LEGACY = `框架檔在工作區根目錄（契約 1 以前的佈局）；依 docs 1-to-2 以 init 建立新單位（框架集中於 ${FW}/）後搬移內容。`;

export function checkContract(ws) {
  const up = contractOf(UP);
  if (ws.config.contract !== up) {
    fail(`契約版本不同：工作區 ${ws.config.contract}、上游 ${up}。先執行 status 了解差異，再以 update core --migrate 升級（上游較舊時請改用對應版本的來源）。`);
  }
  if (ws.legacy) fail(LEGACY);
}

// 僅重定位 HTML 屬性；story.js 的動態網址須相對於其 script src（契約 2）。
export function rebaseHtml(html, from, to, mapFile = p => p) {
  const localRef = r => r && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\?)/i.test(r);
  const rel = (from, p) => toPosix(path.relative(from, p)) || '.';
  if (/<base\b/i.test(html.replace(/<!--[\s\S]*?-->/g, ''))) fail('入口不可使用 <base>；請使用相對 src/href 與 story 的 resource()。');
  return html.replace(/\b(src|href)(\s*=\s*)(["'])(.*?)\3/g, (match, attr, eq, quote, ref) => {
    if (!localRef(ref)) return match;
    if (/^[\/\\]|\\/.test(ref)) fail(`引用必須使用相對路徑與 /：${ref}`);
    const [, file, suffix] = ref.match(/^([^?#]*)([\s\S]*)$/);
    const target = mapFile(path.resolve(from, decodeURIComponent(file)));
    const url = rel(to, target).split('/').map(p => encodeURIComponent(p).replace(/'/g, '%27')).join('/') + suffix;
    return `${attr}${eq}${quote}${url}${quote}`;
  });
}
