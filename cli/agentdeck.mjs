#!/usr/bin/env node
// AgentDeck CLI：只用於製作端，複製上游來源到下游並記錄版本（docs/adr/0016）。播放與交付的 zip 不需要它。
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import {
  UP, MARKER, DEFAULT_SOURCE, UserError, fail, toPosix, exists, readText, readJson, writeJson, writeText,
  inside, hashFile, sha256, listFiles, copyFile, git, contractOf, upstreamCommit, findWorkspace,
  requireDownstream, saveConfig, cliHint,
} from './lib/util.mjs';
import {
  coreFiles, themeFiles, componentNames, componentManifest, requireComponent, buildIndex, resolveDoc,
  linkedDocs, catalogSection, migrationPath, upstreamVendor,
} from './lib/registry.mjs';
import { zip } from './lib/zip.mjs';

const HELP = `AgentDeck CLI（docs/adr/0016）

用法：agentdeck <指令> [參數]

  init [資料夾]            建立下游工作區（預設目前資料夾，須為空）
      --source <來源>      記錄的上游來源（預設 ${DEFAULT_SOURCE}；也可為本機路徑）
      --commit-vendor      vendor/ 進宿主 git（預設不進）
      --agents-hint        在宿主 AGENTS.md 加一行指引（--no-agents-hint 不加）
  status                   契約版本、副本與上游的差異摘要、套件狀態
  catalog [關鍵字…]        元件、範例、寫作指引的一行索引
  docs <名稱> [--code]     輸出元件／範例／指引／遷移說明的文件；--code 連同範例程式
  add <元件…> [--force]    複製元件到工作區並登記用到的套件
  diff [core|<元件>…]      副本相對於取得時與上游最新版的差異；--patch 顯示內容差異
  update core              以上游核心覆蓋核心副本；--migrate 跨契約版本，--force 覆蓋本地修改
  new <主題>               由 templates/blank 建立 resources/<主題>/
  vendor [套件…]           依 vendor.json 下載並驗證套件；--check 只檢查，--force 重新下載
  pack <簡報資料夾>        打包成可離線播放的 zip；--out 指定輸出資料夾（預設 dist/）

共同選項：--dir <工作區>（預設從目前資料夾往上找 ${MARKER}）`;

const OPTIONS = {
  dir: { type: 'string' }, source: { type: 'string' }, out: { type: 'string' },
  'commit-vendor': { type: 'boolean' }, 'agents-hint': { type: 'boolean' }, 'no-agents-hint': { type: 'boolean' },
  force: { type: 'boolean' }, migrate: { type: 'boolean' }, check: { type: 'boolean' },
  patch: { type: 'boolean' }, code: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
};

const log = (...a) => console.log(...a);
const rel = (from, p) => toPosix(path.relative(from, p)) || '.';
const fileMap = (base, files) => Object.fromEntries(files.map(f => [f, hashFile(path.join(base, f))]));

function checkContract(ws) {
  const up = contractOf(UP);
  if (ws.config.contract !== up) {
    fail(`契約版本不同：工作區 ${ws.config.contract}、上游 ${up}。先執行 status 了解差異，再以 update core --migrate 升級（上游較舊時請改用對應版本的來源）。`);
  }
}

// ---- init ----
async function init(args, opts) {
  const target = path.resolve(args[0] ?? '.');
  if (target === UP || inside(UP, target)) fail(`工作區不能放在 AgentDeck 內：${target}`);
  if (exists(path.join(target, MARKER))) fail(`已是 AgentDeck 工作區：${target}`);
  if (exists(target) && fs.readdirSync(target).length) fail(`資料夾不是空的：${target}`);

  const source = opts.source ? (/^(github:|https?:|git\+)/.test(opts.source) ? opts.source : path.resolve(opts.source)) : DEFAULT_SOURCE;
  const commit = upstreamCommit();
  const core = coreFiles();
  for (const f of [...core, ...themeFiles()]) copyFile(path.join(UP, f), path.join(target, f));
  writeText(path.join(target, 'resources', '.gitkeep'), '');
  writeJson(path.join(target, 'vendor.json'), {
    $comment: '第三方套件清單（docs/adr/0011）：清單進 git，本體下載到 vendor/<name>/。由 agentdeck add 登記，agentdeck vendor 下載。',
    packages: {},
  });
  writeText(path.join(target, '.gitignore'), [
    '# AgentDeck 工作區（agentdeck init 產生）',
    ...(opts['commit-vendor'] ? [] : ['# 套件本體，由 agentdeck vendor 依 vendor.json 下載', '/vendor/']),
    '# 打包輸出，由 agentdeck pack 產生',
    '/dist/',
    '',
  ].join('\n'));
  const config = {
    contract: contractOf(UP),
    source,
    cli: cliHint(source),
    core: { commit, files: fileMap(target, core) },
    theme: { commit },
    components: {},
  };
  writeJson(path.join(target, MARKER), config);
  log(`已建立 AgentDeck 工作區：${target}（契約 ${config.contract}${commit ? `，來源 commit ${commit}` : ''}）`);
  await agentsHint(target, opts);
  log('下一步：');
  log(`  1. 讀 ${rel(process.cwd(), path.join(target, 'AGENTDECK.md'))}，之後的指令以 ${config.cli} 執行`);
  log('  2. new <主題> 建立簡報，先填 plan.md 交人確認');
  log('  3. catalog 選表示方式，docs <名稱> 讀文件，add <元件> 取得元件');
}

async function agentsHint(dir, opts) {
  // realpath 統一 Windows 短檔名（EDISON~1）與 git 回傳的長路徑，相對路徑才算得對。
  const target = fs.realpathSync.native(dir);
  const top = git(['rev-parse', '--show-toplevel'], path.dirname(target));
  const host = top ? fs.realpathSync.native(path.resolve(top)) : path.dirname(target);
  const agents = path.join(host, 'AGENTS.md');
  if (!exists(agents) || host === target) return;
  if (readText(agents).includes('AGENTDECK.md')) return;
  const entry = rel(host, path.join(target, 'AGENTDECK.md'));
  let add = opts['agents-hint'] ? true : opts['no-agents-hint'] ? false : null;
  if (add === null && process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    add = /^y/i.test(await rl.question(`在 ${agents} 加一行指引指向 ${entry}？(y/N) `));
    rl.close();
  }
  if (add) {
    const text = fs.readFileSync(agents, 'utf8');
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const block = `\n## 簡報\n\n簡報在 \`${rel(host, target)}/\`（AgentDeck 工作區）：製作或修改前先讀 \`${entry}\`。\n`.replace(/\n/g, eol);
    fs.writeFileSync(agents, `${text}${text.endsWith('\n') ? '' : eol}${block}`);
    log(`已在 ${agents} 加入指引`);
  } else {
    log(`提示：可在 ${agents} 加一行「製作簡報前先讀 ${entry}」，或執行 init 時加 --agents-hint。`);
  }
}

// ---- catalog ----
function catalog(args, ws) {
  const idx = buildIndex();
  const kws = args.map(a => a.toLowerCase());
  const hit = text => !kws.length || kws.some(k => text.toLowerCase().includes(k));
  const viaLookup = new Set(idx.lookup.filter(l => hit(l.phrase)).flatMap(l => l.names));
  const owned = ws && !ws.upstream ? new Set(Object.keys(ws.config.components ?? {})) : new Set();

  const comps = idx.comps.filter(c => viaLookup.has(c.name) || hit(`${c.name} ${c.relation} ${c.use} ${c.tech}`));
  const exs = idx.exs.filter(e => hit(`${e.name} ${e.title} ${e.relation}`));
  const guides = idx.guides.filter(g => hit(`${g.name} ${g.title}`));
  const pad = Math.max(...idx.comps.map(c => c.name.length), ...idx.exs.map(e => e.name.length), 8);

  if (comps.length) {
    log('元件（deck.<名稱>；add 取得，docs 讀 API 與實作前必讀）');
    for (const c of comps) {
      const tags = [c.tier, ...(c.vendor.length ? [`套件:${c.vendor.join(',')}`] : c.tech ? [c.tech] : []), ...(owned.has(c.name) ? ['已取得'] : [])];
      log(`  ${c.name.padEnd(pad)}  ${c.relation}｜用在：${c.use}｜不要用在：${c.avoid}  [${tags.join(' ')}]`);
    }
  }
  if (exs.length) {
    log('互動組合範例（只讀；docs <名稱> --code 讀說明與程式，在主題內改寫）');
    for (const e of exs) log(`  ${e.name.padEnd(pad)}  ${e.relation}（${e.title}）`);
  }
  if (guides.length) {
    log('寫作指引（docs <名稱>）');
    for (const g of guides) log(`  ${g.name.padEnd(pad)}  ${g.title}`);
  }
  if (!kws.length && idx.missing) log(`還沒有元件的關係（在主題內自製）：${idx.missing}`);
  if (!comps.length && !exs.length && !guides.length) log(`沒有符合「${args.join(' ')}」的項目；不帶關鍵字可看完整索引，仍沒有就在主題內自製。`);
}

// ---- docs ----
function docs(args, opts, ws) {
  const name = args[0];
  if (!name) fail('用法：docs <元件｜範例｜指引｜n-to-m>');
  const doc = resolveDoc(name);
  if (!doc) fail(`找不到 ${name}；先用 catalog 查名稱`);
  const print = (file, title) => { log(`\n===== ${title}（${toPosix(file)}） =====\n`); log(readText(file).trimEnd()); };

  if (doc.kind === 'guide' || doc.kind === 'migration') return print(doc.file, name);
  print(path.join(doc.dir, 'README.md'), `${name}/README.md`);
  for (const f of linkedDocs(doc.dir)) print(path.join(doc.dir, f), `${name}/${f}`);

  if (doc.kind === 'component') {
    const m = componentManifest(name);
    log(`\n===== 引用方式（CATALOG） =====\n\n${catalogSection('引用方式')}`);
    if (m.vendor.length || /tier:\s*'special'/.test(readText(path.join(doc.dir, `${name}.js`)))) {
      log(`\n===== 特殊元件規則（CATALOG） =====\n\n${catalogSection('特殊元件規則')}`);
    }
    if (ws && !ws.upstream) {
      const local = path.join(ws.root, 'assets', 'deck', 'components', name);
      log(exists(local)
        ? `\n注意：工作區已有副本 ${rel(process.cwd(), local)}，可能已依主題修改；實作以副本為準，與上游比對用 diff ${name}。`
        : `\n取得：add ${name}${m.vendor.length ? `（會登記套件 ${m.vendor.join('、')}）` : ''}`);
    }
  } else {
    const code = listFiles(doc.dir).filter(f => !f.endsWith('.md'));
    log(`\n===== 程式檔（範例只讀，不要引用；在主題 story.js／story.css 改寫） =====`);
    for (const f of code) log(`  ${toPosix(path.join(doc.dir, f))}`);
    if (opts.code) for (const f of code) print(path.join(doc.dir, f), `${name}/${f}`);
  }
}

// ---- add ----
function add(args, opts, ws) {
  requireDownstream(ws, 'add');
  if (!args.length) fail('用法：add <元件…>');
  checkContract(ws);
  const manifests = args.map(requireComponent);
  const commit = upstreamCommit();
  const vendorPath = path.join(ws.root, 'vendor.json');
  const vendor = exists(vendorPath) ? readJson(vendorPath) : { packages: {} };
  vendor.packages ??= {};
  const upVendor = upstreamVendor().packages;
  const lines = { css: [], js: [], vendor: new Set() };

  for (const m of manifests) {
    const dst = path.join(ws.root, 'assets', 'deck', 'components', m.name);
    if (exists(dst) && !opts.force) fail(`已有元件副本 ${m.name}；與上游比對用 diff ${m.name}，要以上游整份取代加 --force`);
    if (exists(dst)) fs.rmSync(dst, { recursive: true, force: true });
    for (const f of m.files) copyFile(path.join(m.dir, f), path.join(dst, f));
    ws.config.components[m.name] = { commit, files: fileMap(dst, m.files) };
    for (const v of m.vendor) {
      if (!upVendor[v]) fail(`上游 vendor.json 沒有 ${v}（元件 ${m.name} 需要）`);
      vendor.packages[v] ??= upVendor[v];
      lines.vendor.add(v);
    }
    lines.css.push(`<link rel="stylesheet" href="../../assets/deck/components/${m.name}/${m.name}.css">`);
    lines.js.push(`<script src="../../assets/deck/components/${m.name}/${m.name}.js"></script>`);
    log(`已取得 ${m.name}（${m.files.length} 個檔案）`);
  }
  writeJson(vendorPath, vendor);
  saveConfig(ws);
  log('\n在主題 index.html 引用（css 放 theme.css 之後、story.css 之前；js 放 theme.js 之後、story.js 之前）：');
  for (const l of lines.css) log(`  ${l}`);
  for (const v of lines.vendor) for (const f of upVendor[v].files.filter(f => f.path.endsWith('.js'))) log(`  <script src="../../vendor/${v}/${f.path}"></script>   <!-- 套件，每份簡報一次，元件 js 之前 -->`);
  for (const l of lines.js) log(`  ${l}`);
  if (lines.vendor.size) log(`\n已登記套件 ${[...lines.vendor].join('、')}；執行 vendor 下載（pack 也會自動下載）。`);
  const compDir = path.join(UP, 'assets', 'deck', 'components');
  const known = new Set(fs.readdirSync(compDir).filter(n => exists(path.join(compDir, n, `${n}.js`))));
  for (const m of manifests) {
    const readme = path.join(m.dir, 'README.md');
    if (!exists(readme)) continue;
    const mentioned = [...new Set([...readText(readme).matchAll(/deck\.([a-z0-9]+)\b/g)].map(x => x[1]))]
      .filter(n => n !== m.name && known.has(n) && !ws.config.components[n]);
    if (mentioned.length) log(`\n${m.name} 的 README 提到搭配 ${mentioned.join('、')}（尚未取得）；需要時 add ${mentioned.join(' ')}。`);
  }
}

// ---- diff / status ----
const STATES = {
  local: '本地已改', upstream: '上游已更新', both: '兩邊都改', 'local-missing': '本地已刪',
  'upstream-removed': '上游已移除', 'upstream-added': '上游新增', 'local-added': '本地新增',
};

function compare(recorded, localBase, upBase, upList, localList) {
  const files = [...new Set([...Object.keys(recorded), ...upList, ...localList])].sort();
  const out = [];
  for (const f of files) {
    const h0 = recorded[f] ?? null;
    const hl = hashFile(path.join(localBase, f));
    const hu = upList.includes(f) ? hashFile(path.join(upBase, f)) : null;
    let state = 'same';
    if (hl === hu) state = 'same';
    else if (h0 === null) state = hu === null ? 'local-added' : hl === null ? 'upstream-added' : 'both';
    else if (hl === null) state = 'local-missing';
    else if (hu === null) state = 'upstream-removed';
    else if (hl !== h0 && hu !== h0) state = 'both';
    else if (hl !== h0) state = 'local';
    else if (hu !== h0) state = 'upstream';
    out.push({ file: f, state, local: path.join(localBase, f), up: path.join(upBase, f) });
  }
  return out.filter(e => e.state !== 'same');
}

function coreReport(ws) {
  const up = coreFiles();
  const dirs = ['assets/story-reader', 'templates/blank'];
  const localList = [
    ...['AGENTDECK.md', 'assets/deck/deck-core.js', 'assets/deck/deck-editor.js', 'assets/deck/deck.css'].filter(f => exists(path.join(ws.root, f))),
    ...dirs.flatMap(d => listFiles(path.join(ws.root, d)).map(f => `${d}/${f}`)),
  ];
  return compare(ws.config.core?.files ?? {}, ws.root, UP, up, localList);
}

function componentReport(ws, name) {
  const local = path.join(ws.root, 'assets', 'deck', 'components', name);
  const m = componentManifest(name);
  return compare(ws.config.components[name]?.files ?? {}, local, m?.dir ?? local, m?.files ?? [], listFiles(local));
}

function printChanges(title, commit, changes, opts) {
  log(`${title}（取得於 ${commit ?? '未知 commit'}）：${changes.length ? '' : '與取得時及上游一致'}`);
  for (const c of changes) log(`  ${STATES[c.state].padEnd(6, '　')} ${c.file}`);
  if (!opts.patch) return;
  for (const c of changes) {
    const a = exists(c.up) ? c.up : process.platform === 'win32' ? 'NUL' : '/dev/null';
    const b = exists(c.local) ? c.local : process.platform === 'win32' ? 'NUL' : '/dev/null';
    const r = spawnSync('git', ['diff', '--no-index', '--no-color', '--', a, b], { encoding: 'utf8' });
    if (r.error) { log('  （需要 git 才能顯示內容差異）'); return; }
    log(`\n--- 上游 ${c.file}\n+++ 本地 ${c.file}`);
    log((r.stdout ?? '').split('\n').slice(4).join('\n').trimEnd());
  }
}

function diff(args, opts, ws) {
  requireDownstream(ws, 'diff');
  const targets = args.length ? args : ['core', ...Object.keys(ws.config.components ?? {})];
  for (const t of targets) {
    if (t === 'core') printChanges('核心', ws.config.core?.commit, coreReport(ws), opts);
    else if (ws.config.components?.[t]) printChanges(`元件 ${t}`, ws.config.components[t].commit, componentReport(ws, t), opts);
    else fail(`工作區沒有登記元件 ${t}`);
  }
  log(`\n上游目前：${upstreamCommit() ?? '未知 commit'}（${toPosix(UP)}）`);
  log('「上游已更新」可直接取用；「本地已改／兩邊都改」由 agent 讀 --patch 後決定是否吸收。核心以 update core 整份覆蓋，元件以 add <元件> --force 取代或手動合併。');
}

function status(args, opts, ws) {
  const up = contractOf(UP);
  if (ws.upstream) {
    log(`上游工作區：${toPosix(UP)}（契約 ${up}，commit ${upstreamCommit() ?? '未知'}）`);
    log('在上游內製作僅供試做元件、整理 examples、驗證契約變更（docs/adr/0016）。');
    return;
  }
  const c = ws.config;
  log(`工作區：${toPosix(ws.root)}`);
  log(`來源：${c.source}（CLI：${c.cli}）`);
  log(`上游：${toPosix(UP)}（commit ${upstreamCommit() ?? '未知'}）`);
  if (c.contract === up) log(`契約：${c.contract}，與上游一致`);
  else if (c.contract === 0) log('契約：0（workspace.cmd 建立的舊版工作區）。依 docs 0-to-1 以 init 建立新工作區後搬移內容。');
  else if (c.contract < up) {
    const steps = migrationPath(c.contract, up);
    log(`契約：工作區 ${c.contract} 較上游 ${up} 舊。依序遷移：${steps.map(s => s.name + (s.ok ? '' : '（缺遷移說明）')).join(' → ')}`);
    log(`  步驟：docs <n-to-m> 讀遷移說明 → update core --migrate → 依說明改元件副本、自製元件與簡報 → 驗證`);
  } else log(`契約：工作區 ${c.contract} 比上游 ${up} 新；目前執行的 CLI 版本太舊，請改用較新的來源。`);

  const summarize = changes => {
    const n = s => changes.filter(x => x.state === s).length;
    const parts = Object.keys(STATES).map(s => [STATES[s], n(s)]).filter(([, k]) => k).map(([l, k]) => `${l} ${k}`);
    return parts.length ? parts.join('、') : '一致';
  };
  log(`核心：${summarize(coreReport(ws))}`);
  for (const name of Object.keys(c.components ?? {})) log(`元件 ${name}：${summarize(componentReport(ws, name))}`);
  const own = path.join(ws.root, 'components');
  const custom = exists(own) ? fs.readdirSync(own).filter(d => fs.statSync(path.join(own, d)).isDirectory()) : [];
  if (custom.length) log(`自製元件：${custom.join('、')}`);
  const res = path.join(ws.root, 'resources');
  const decks = exists(res) ? fs.readdirSync(res).filter(d => exists(path.join(res, d, 'index.html'))) : [];
  log(`簡報：${decks.length ? decks.join('、') : '（尚無）'}`);
  const pkgs = Object.entries(readJson(path.join(ws.root, 'vendor.json')).packages ?? {});
  if (pkgs.length) log(`套件：${pkgs.map(([n, p]) => `${n}@${p.version}${p.files.every(f => exists(path.join(ws.root, 'vendor', n, f.path))) ? '' : '（未下載）'}`).join('、')}`);
  log('細節用 diff [core|<元件>] --patch。');
}

// ---- update core ----
function update(args, opts, ws) {
  requireDownstream(ws, 'update');
  if (args[0] !== 'core') fail('用法：update core [--migrate] [--force]（元件以 diff 比對後由 agent 決定，或 add <元件> --force）');
  const up = contractOf(UP);
  const from = ws.config.contract;
  if (up < from) fail(`上游契約 ${up} 比工作區 ${from} 舊，請改用較新的來源。`);
  if (from === 0) fail('這是 workspace.cmd 建立的舊版工作區，不能就地 update core；依 docs 0-to-1 以 init 建立新工作區後搬移內容。');
  const steps = up > from ? migrationPath(from, up) : [];
  if (steps.length && !opts.migrate) fail(`契約會從 ${from} 升到 ${up}；先讀 ${steps.map(s => `docs ${s.name}`).join('、')}，確認後加 --migrate。`);
  const missing = steps.filter(s => !s.ok);
  if (missing.length) fail(`上游缺遷移說明 ${missing.map(s => s.name).join('、')}，無法升級；請回報上游。`);

  const changes = coreReport(ws);
  const touched = changes.filter(c => ['local', 'both', 'local-missing'].includes(c.state));
  if (touched.length && !opts.force) {
    fail(`核心副本有本地修改，update core 會覆蓋：\n${touched.map(c => `  ${c.file}`).join('\n')}\n核心不承諾合併；需要的修改請回饋上游。確認後加 --force。`);
  }
  const files = coreFiles();
  for (const f of files) copyFile(path.join(UP, f), path.join(ws.root, f));
  for (const c of changes.filter(c => c.state === 'upstream-removed')) fs.rmSync(c.local, { force: true });
  const kept = changes.filter(c => c.state === 'local-added').map(c => c.file);
  ws.config.core = { commit: upstreamCommit(), files: fileMap(ws.root, files) };
  ws.config.contract = up;
  saveConfig(ws);
  log(`已更新核心副本（${files.length} 個檔案，commit ${ws.config.core.commit ?? '未知'}）`);
  if (kept.length) log(`保留本地新增：${kept.join('、')}`);
  if (steps.length) {
    log(`\n契約已從 ${from} 升到 ${up}。接著依下列說明修改元件副本、自製元件與簡報，完成後逐份播放驗證：`);
    for (const s of steps) { log(`\n===== ${s.name}（${toPosix(s.file)}） =====\n`); log(readText(s.file).trimEnd()); }
  }
}

// ---- new ----
function newTopic(args, opts, ws) {
  const topic = args[0];
  if (!topic || !/^[a-z0-9][a-z0-9-]*$/.test(topic)) fail('用法：new <主題>（英文小寫、數字與連字號）');
  const src = path.join(ws.root, 'templates', 'blank');
  const dst = path.join(ws.root, 'resources', topic);
  if (!exists(src)) fail(`找不到 ${src}；以 update core 補回核心副本`);
  if (exists(dst)) fail(`已存在：${dst}`);
  for (const f of listFiles(src)) copyFile(path.join(src, f), path.join(dst, f));
  log(`已建立 ${rel(process.cwd(), dst)}；先填 plan.md 交人確認，再寫 story.js。`);
}

// ---- vendor ----
async function vendorCmd(args, opts, ws) {
  const manifest = readJson(path.join(ws.root, 'vendor.json'));
  const all = Object.keys(manifest.packages ?? {});
  const names = args.length ? args : all;
  let failed = 0;
  for (const name of names) {
    const p = manifest.packages?.[name];
    if (!p) { log(`[${name}] vendor.json 沒有這個套件`); failed++; continue; }
    const dir = path.join(ws.root, 'vendor', name);
    for (const f of p.files) {
      const dest = path.resolve(dir, f.path);
      if (!inside(dir, dest)) fail(`[${name}] path 不可跳出套件資料夾：${f.path}`);
      const label = `[${name}@${p.version}] ${f.path}`;
      const want = String(f.sha256 ?? '').toUpperCase();
      if (!opts.force && exists(dest) && want && sha256(fs.readFileSync(dest)) === want) { log(`${label} 已就緒`); continue; }
      if (opts.check) { log(`${label} 缺少或雜湊不符`); failed++; continue; }
      try {
        log(`${label} 下載 ${f.url}`);
        const res = await fetch(f.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const got = sha256(buf);
        if (!want) log(`${label} 未設定 sha256，實際為 ${got}；確認來源後請填回 vendor.json`);
        else if (got !== want) throw new Error(`雜湊不符：預期 ${want}，實際 ${got}`);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, buf);
      } catch (e) {
        log(`${label} 失敗：${e.message}`);
        failed++;
      }
    }
  }
  if (failed) fail(`有 ${failed} 個檔案未就緒`);
  log('套件全部就緒');
}

// ---- pack ----
async function pack(args, opts, ws) {
  const root = ws.root;
  if (!args[0]) {
    const res = path.join(root, 'resources');
    const decks = exists(res) ? fs.readdirSync(res).filter(d => exists(path.join(res, d, 'index.html'))) : [];
    fail(`用法：pack <簡報資料夾>${decks.length ? `；可選：${decks.map(d => `resources/${d}`).join('、')}` : ''}`);
  }
  let deckDir = path.resolve(args[0]);
  if (!exists(deckDir)) deckDir = path.resolve(root, args[0]);
  if (!inside(root, deckDir)) fail(`簡報必須在工作區內：${deckDir}`);
  const index = path.join(deckDir, 'index.html');
  if (!exists(index)) fail(`找不到 ${index}`);
  const deckRel = rel(root, deckDir);
  const name = path.basename(deckDir);

  const refs = [...readText(index).replace(/<!--[\s\S]*?-->/g, '').matchAll(/(?:src|href)\s*=\s*"([^"#?]+)/g)].map(m => m[1])
    .filter(r => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(r));
  const dirs = new Set([deckRel]);
  const packages = new Set();
  for (const ref of new Set(refs)) {
    const full = path.resolve(deckDir, ref);
    if (inside(deckDir, full)) continue;
    if (!inside(root, full)) fail(`引用跳出工作區：${ref}`);
    const r = rel(root, full);
    let m;
    if (r.startsWith('assets/')) dirs.add('assets');
    else if ((m = r.match(/^vendor\/([^/]+)\//))) packages.add(m[1]);
    else if ((m = r.match(/^components\/([^/]+)\//))) dirs.add(`components/${m[1]}`);
    else if (r.startsWith('playground/')) fail(`正式簡報不得引用 playground：${ref}`);
    else if (deckRel.startsWith('resources/') && r.startsWith('examples/')) fail(`正式簡報不得引用 examples；請將需要的程式與資料改寫到主題內：${ref}`);
    else { log(`注意：帶入非標準位置的檔案 ${r}`); dirs.add(r); }
  }
  if (packages.size) await vendorCmd([...packages], {}, ws);
  if (ws.upstream && deckRel === 'examples') dirs.add('docs');
  for (const p of packages) dirs.add(`vendor/${p}`);

  const now = new Date();
  const p2 = n => String(n).padStart(2, '0');
  const top = `${name}-${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}`;
  const entries = [];
  for (const d of dirs) {
    const full = path.join(root, d);
    if (!exists(full)) fail(`找不到引用的檔案：${d}`);
    const files = fs.statSync(full).isDirectory() ? listFiles(full).map(f => `${d}/${f}`) : [d];
    for (const f of files) {
      if (f === `${deckRel}/plan.md`) continue;
      entries.push({ name: `${top}/${f}`, data: fs.readFileSync(path.join(root, f)) });
    }
  }
  const target = `${deckRel}/index.html`;
  entries.push({ name: `${top}/index.html`, data: Buffer.from(`<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><title>${name}</title>
<meta http-equiv="refresh" content="0; url=${target}"></head>
<body><p>正在開啟簡報……若沒有自動跳轉，請點 <a href="${target}">${target}</a>。</p></body></html>
`) });
  const outDir = path.resolve(opts.out ?? path.join(root, 'dist'));
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${top}.zip`);
  fs.writeFileSync(file, zip(entries));
  log(`已輸出 ${file}（${(fs.statSync(file).size / 1048576).toFixed(1)} MB）`);
  log(`  內容：${[...dirs].join('、')}`);
  log('  對方解壓縮後雙擊最上層的 index.html 即可播放。');
}

// ---- main ----
async function main() {
  const { values: opts, positionals } = parseArgs({ args: process.argv.slice(2), options: OPTIONS, allowPositionals: true });
  const [cmd, ...args] = positionals;
  if (!cmd || opts.help || cmd === 'help') return log(HELP);
  if (cmd === 'init') return init(args, opts);
  const optionalWs = () => { try { return findWorkspace(opts); } catch (e) { if (e instanceof UserError) return null; throw e; } };
  switch (cmd) {
    case 'catalog': return catalog(args, optionalWs());
    case 'docs': return docs(args, opts, optionalWs());
    case 'status': return status(args, opts, findWorkspace(opts));
    case 'add': return add(args, opts, findWorkspace(opts));
    case 'diff': return diff(args, opts, findWorkspace(opts));
    case 'update': return update(args, opts, findWorkspace(opts));
    case 'new': return newTopic(args, opts, findWorkspace(opts));
    case 'vendor': return vendorCmd(args, opts, findWorkspace(opts));
    case 'pack': return pack(args, opts, findWorkspace(opts));
    default: fail(`未知指令 ${cmd}；執行 help 查看用法`);
  }
}

main().catch(e => {
  if (e instanceof UserError || e?.code?.startsWith?.('ERR_PARSE_ARGS')) { console.error(`錯誤：${e.message}`); process.exit(1); }
  throw e;
});
