// 元件取得與接入：CLI 與程式呼叫共用，訊息由呼叫端選擇如何呈現。
import fs from 'node:fs';
import path from 'node:path';
import {
  UP, FW, MARKER, fail, exists, readText, readJson, writeJson, listFiles, hashFile, copyFile,
  upstreamCommit, saveConfig, requireDownstream, checkContract, findWorkspace, inside, rebaseHtml,
} from './util.mjs';
import { componentManifest, requireComponent, upstreamVendor } from './registry.mjs';
import { downloadVendor } from './vendor.mjs';
const fileMap = (base, files) => Object.fromEntries(files.map(f => [f, hashFile(path.join(base, f))]));

// ---- add ----
export function addComponents(args, opts, ws, log = () => {}) {
  requireDownstream(ws, 'add');
  if (!args.length) fail('用法：add <元件…>');
  checkContract(ws);
  const manifests = args.map(requireComponent);
  const commit = upstreamCommit();
  const vendorPath = path.join(ws.fw, 'vendor.json');
  const vendor = exists(vendorPath) ? readJson(vendorPath) : { packages: {} };
  vendor.packages ??= {};
  const upVendor = upstreamVendor().packages;
  const lines = { css: [], js: [], vendor: new Set() };

  for (const m of manifests) {
    const dst = path.join(ws.fw, 'assets', 'deck', 'components', m.name);
    if (exists(dst) && !opts.force) fail(`已有元件副本 ${m.name}；與上游比對用 diff ${m.name}，要以上游整份取代加 --force`);
    if (exists(dst)) fs.rmSync(dst, { recursive: true, force: true });
    for (const f of m.files) copyFile(path.join(m.dir, f), path.join(dst, f));
    ws.config.components[m.name] = { commit, files: fileMap(dst, m.files) };
    for (const v of m.vendor) {
      if (!upVendor[v]) fail(`上游 vendor.json 沒有 ${v}（元件 ${m.name} 需要）`);
      vendor.packages[v] ??= upVendor[v];
      lines.vendor.add(v);
    }
    lines.css.push(`<link rel="stylesheet" href="${FW}/assets/deck/components/${m.name}/${m.name}.css">`);
    lines.js.push(`<script src="${FW}/assets/deck/components/${m.name}/${m.name}.js"></script>`);
    log(`已取得 ${m.name}（${m.files.length} 個檔案）`);
  }
  writeJson(vendorPath, vendor);
  saveConfig(ws);
  log('\n在根 index.html 引用（相關入口 <分類>/<主題>/index.html 前面加 ../../；css 放 theme.css 之後、story.css 之前；js 放 theme.js 之後、story.js 之前）：');
  for (const l of lines.css) log(`  ${l}`);
  for (const v of lines.vendor) for (const f of upVendor[v].files.filter(f => f.path.endsWith('.js'))) log(`  <script src="${FW}/vendor/${v}/${f.path}"></script>   <!-- 套件，每份簡報一次，元件 js 之前 -->`);
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
  return { components: manifests.map(m => m.name), packages: [...lines.vendor] };
}

function noLinks(root, target) {
  if (!inside(root, target)) fail(`路徑不可跳出工作區：${target}`);
  for (let p = target; p === root || inside(root, p); p = path.dirname(p)) {
    if (fs.lstatSync(p, { throwIfNoEntry: false })?.isSymbolicLink()) fail(`use 不接受符號連結：${p}`);
  }
}

// shortcut: 只接入標準根入口，支援客製 HTML 前須改用有對應測試的解析方式（ADR 0038）。
export async function useComponents({ dir, names }) {
  if (!Array.isArray(names) || !names.length || names.some(n => typeof n !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(n))) {
    fail('用法：use <元件…>（名稱限英文小寫、數字與連字號）');
  }
  const ws = findWorkspace({ dir });
  requireDownstream(ws, 'use');
  checkContract(ws);
  const entry = path.join(ws.root, 'index.html');
  for (const f of [entry, path.join(ws.fw, MARKER), path.join(ws.fw, 'vendor.json')]) noLinks(ws.root, f);
  if (!exists(entry)) fail('use 需要根 index.html；先執行 new <主題>。');
  const original = fs.readFileSync(entry, 'utf8');
  const html = original.replace(/\r\n/g, '\n');
  const topic = html.match(/<script src="resources\/([a-z0-9][a-z0-9-]*)\/story\.js"><\/script>/)?.[1];
  if (!topic) fail('use 只接受 new 產生的標準根入口；自訂或相關入口請用 add 後手動引用。');
  const src = path.join(ws.fw, 'templates/blank');
  const data = path.join(ws.root, 'resources', topic);
  const template = rebaseHtml(readText(path.join(src, 'index.html')), src, ws.root,
    p => inside(src, p) ? path.join(data, path.relative(src, p)) : p).replace(/\r\n/g, '\n');
  const cssAnchor = `<link rel="stylesheet" href="resources/${topic}/story.css">`;
  const jsAnchor = `<script src="resources/${topic}/story.js"></script>`;
  const marker = kind => `<!-- agentdeck:components ${kind} -->`;
  const end = '<!-- /agentdeck:components -->';
  const blocks = [...html.matchAll(/<!-- agentdeck:components (css|js) -->\n([\s\S]*?)<!-- \/agentdeck:components -->\n/g)];
  if (blocks.length && (blocks.length !== 2 || blocks[0][1] !== 'css' || blocks[1][1] !== 'js')) fail('use 引用區塊不完整；請保留原檔並改用 add 手動接入。');
  const previous = blocks.length ? [...blocks[1][2].matchAll(/<script src="agentdeck\/assets\/deck\/components\/([a-z0-9][a-z0-9-]*)\/\1\.js"><\/script>/g)].map(m => m[1]) : [];
  const all = [...new Set([...previous, ...names])];
  const manifests = new Map();
  const missing = [];
  for (const name of all) {
    const dst = path.join(ws.fw, 'assets/deck/components', name);
    noLinks(ws.root, dst);
    const record = ws.config.components[name];
    if (exists(dst) || record) {
      if (!exists(dst) || !record?.files) fail(`元件 ${name} 缺檔或沒有取得記錄；先用 diff 檢查。`);
      // listFiles 忽略符號連結，先檢查整個副本，避免漏掉額外的連結。
      const walk = p => { for (const item of fs.readdirSync(p, { withFileTypes: true })) {
        const f = path.join(p, item.name);
        noLinks(ws.root, f);
        if (item.isDirectory()) walk(f);
      } };
      walk(dst);
      const files = listFiles(dst);
      if (JSON.stringify(files) !== JSON.stringify(Object.keys(record.files).sort()) || files.some(f => hashFile(path.join(dst, f)) !== record.files[f])) {
        fail(`元件 ${name} 有本地修改；use 不覆蓋，先用 diff ${name} 檢查，或用 add 後手動引用。`);
      }
      const manifest = componentManifest(name, ws.fw);
      if (!manifest) fail(`元件 ${name} 缺少程式檔。`);
      manifests.set(name, manifest);
    } else {
      if (previous.includes(name)) fail(`已接入的元件 ${name} 缺檔；先用 diff 檢查。`);
      manifests.set(name, requireComponent(name));
      missing.push(name);
    }
  }
  const vendor = readJson(path.join(ws.fw, 'vendor.json')).packages ?? {};
  const upstream = upstreamVendor().packages;
  const packagesFor = components => [...new Set(components.flatMap(n => manifests.get(n).vendor))];
  const packages = packagesFor(all);
  for (const name of packages) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name) || !(vendor[name] ?? upstream[name])) fail(`找不到套件：${name}`);
    for (const f of (vendor[name] ?? upstream[name]).files) {
      const dest = path.resolve(ws.fw, 'vendor', name, f.path);
      if (!inside(path.join(ws.fw, 'vendor', name), dest)) fail(`非法套件路徑：${f.path}`);
      noLinks(ws.root, dest);
      if (!/^[a-f0-9]{64}$/i.test(f.sha256 ?? '')) fail(`套件 ${name}/${f.path} 缺少有效 SHA-256，無法保證接入完成。`);
    }
  }
  const render = components => {
    if (!components.length) return template;
    const css = components.map(n => `<link rel="stylesheet" href="${FW}/assets/deck/components/${n}/${n}.css">`).join('\n');
    const js = [
      ...packagesFor(components).flatMap(n => (vendor[n] ?? upstream[n]).files.filter(f => f.path.endsWith('.js'))
        .map(f => `<script src="${FW}/vendor/${n}/${f.path}"></script>`)),
      ...components.map(n => `<script src="${FW}/assets/deck/components/${n}/${n}.js"></script>`),
    ].join('\n');
    return template.replace(cssAnchor, `${marker('css')}\n${css}\n${end}\n${cssAnchor}`)
      .replace(jsAnchor, `${marker('js')}\n${js}\n${end}\n${jsAnchor}`);
  };
  if (html !== render(previous)) fail('use 只接受未自訂的標準根入口與完整的 use 引用區塊；原檔未改，請用 add 後手動引用。');
  const updated = render(all).replace(/\n/g, original.includes('\r\n') ? '\r\n' : '\n');
  try {
    if (missing.length) addComponents(missing, {}, ws);
    if (packages.length) await downloadVendor(packages, {}, ws);
  } catch (e) {
    fail(`use 未完成，入口未修改：${e.message}\n已取得的元件／套件可能保留；排除問題後可重試 use。`);
  }
  if (fs.readFileSync(entry, 'utf8') !== original) fail('接入期間 index.html 已變動，保留新內容；請檢查後重試 use。');
  if (updated !== original) {
    // 先完整寫入再取代，避免磁碟寫入失敗截斷原入口。
    const staging = fs.mkdtempSync(path.join(ws.root, '.agentdeck-use-'));
    const temporary = path.join(staging, 'index.html');
    try {
      fs.writeFileSync(temporary, updated, { flag: 'wx', mode: fs.statSync(entry).mode });
      fs.renameSync(temporary, entry);
    } finally {
      if (exists(temporary)) fs.unlinkSync(temporary);
      fs.rmdirSync(staging);
    }
  }
  return { entry, components: all, installed: missing, packages, entryChanged: updated !== original };
}
