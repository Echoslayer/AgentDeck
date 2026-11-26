// Run from the host's package.json. All books share its locked AgentDeck dependency.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { coreFiles, componentManifest, themeFiles, READER_VENDOR, upstreamVendor } from 'agentdeck/cli/lib/registry.mjs';
import { UP, contractOf, hashFile, readJson, sha256 } from 'agentdeck/cli/lib/util.mjs';
import { downloadVendor } from 'agentdeck/cli/lib/vendor.mjs';

const host = process.cwd();
const [book, flag, apply, ...extra] = process.argv.slice(2);
const header = '# AgentDeck stock files (one literal path per line)';
const footer = '# End AgentDeck stock files';
const help = `npm run deck:build -- <簡報資料夾> [選項]
  --inspect           列出框架檔的 Git 狀態，以及忽略自製元件檔案的規則
  --adopt             把與鎖版相符的檔案加入該簡報的 .gitignore
  --untrack [--apply] 預覽取消 Git 追蹤的檔案；套用後保留本機副本
  --clean [--apply]   預覽可從本機清除的檔案；套用後再執行重建即可播放
  省略選項            還原缺少的框架檔與第三方套件
查可用元件與範例：npm exec --offline -- agentdeck catalog [關鍵字]
讀元件用法：npm exec --offline -- agentdeck docs <名稱>`;

// Only descend through ordinary directories in this book, including on Windows.
function local(base, relative) {
  let result = base;
  for (const part of relative.split('/')) {
    if (!/^[\p{L}\p{N}_ .-]+$/u.test(part) || /[. ]$/.test(part)) throw Error('Invalid path: ' + relative);
    result = path.join(result, part);
    if (fs.lstatSync(result, { throwIfNoEntry: false })?.isSymbolicLink()) throw Error('Linked path: ' + result);
  }
  return result;
}

// Preserve the host's own rules outside the managed block, including their line endings.
function ignoreBlock(text) {
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const markers = lines.map(line => line.replace(/\r?\n$/, ''));
  const start = markers.indexOf(header), end = markers.indexOf(footer);
  if (start < 0 && end < 0) return { before: '', entries: null, after: text };
  // The original format occupied the whole file and had no closing marker.
  const legacy = start === 0 && end < 0 && markers.slice(1).every(line => line.startsWith('/'));
  if (start < 0 || markers.lastIndexOf(header) !== start || markers.lastIndexOf(footer) !== end || (!legacy && end < start))
    throw Error('請檢查 agentdeck/.gitignore 的 AgentDeck 區塊標記。');
  return { before: lines.slice(0, start).join(''), entries: markers.slice(start + 1, legacy ? undefined : end),
    after: legacy ? '' : lines.slice(end + 1).join('') };
}

function git(cwd, args, input, allowed = [0]) {
  const r = spawnSync('git', args, { cwd, input, encoding: 'utf8' });
  if (!allowed.includes(r.status)) throw Error(r.error?.message || r.stderr.trim() || 'Git failed');
  return r.stdout.split('\0').filter(Boolean);
}

function reportIgnoredComponents(fw) {
  const files = git(fw, ['ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--', 'components/']);
  if (!files.length) return;
  const fields = git(fw, ['check-ignore', '--verbose', '-z', '--stdin'], files.join('\0') + '\0', [0, 1]);
  for (let i = 0; i < fields.length; i += 4) {
    const [source, line, pattern, file] = fields.slice(i, i + 4);
    console.log('自製元件未追蹤且被忽略\t' + path.basename(fw) + '/' + file + '\t' + source + ':' + line + '\t' + pattern);
  }
}

function maintenance(fw, rows) {
  const tracked = new Set(git(fw, ['ls-files', '-z', '--', '.']));
  const staged = new Set(git(fw, ['diff', '--cached', '--no-renames', '--relative', '--name-only', '-z', '--', '.']));
  const ignored = new Set(git(fw, ['check-ignore', '--no-index', '-z', '--stdin'], rows.map(r => r.file + '\0').join(''), [0, 1]));
  const targets = [];
  for (const row of rows) {
    const { file, same, managed, present, pinOK } = row;
    let action;
    if (!present) action = '缺檔';
    else if (!same || !pinOK) action = managed ? '保留差異（請檢查 ignore 清單）' : '保留差異';
    else if (!managed) action = '可納管';
    else if (!ignored.has(file)) action = '保留（Git 規則未忽略）';
    else if (staged.has(file)) action = '保留（有暫存變更）';
    else action = tracked.has(file) ? '可取消追蹤' : '可清除';
    console.log(action + '\t' + (tracked.has(file) ? '已追蹤' : '未追蹤') + '\t' + file +
      (!same && present && ignored.has(file) && !tracked.has(file) ? '\t注意：Git 目前忽略這份修改' : ''));
    if ((flag === '--clean' && action === '可清除') || (flag === '--untrack' && action === '可取消追蹤')) targets.push(row);
  }
  console.log('保留來源：入口、resources/（含 edits.js）、自製元件、agentdeck.json 與 vendor.json。');
  console.log('另行管理：vendor/ 由 vendor.json 驗證；dist/ 存放交付包。');
  if (flag === '--inspect') return reportIgnoredComponents(fw);
  console.log((apply ? '套用' : '預覽') + ' ' + flag + '：' + targets.length + ' 個檔案');
  if (!apply || !targets.length) return;
  if (rows.some(r => r.managed ? !r.pinOK || (r.present && !r.same) : !r.present))
    throw Error('這份簡報目前無法完整重建。請先處理上列缺檔或受管理檔案的差異。');
  if (flag === '--untrack') {
    git(fw, ['--literal-pathspecs', 'rm', '--cached', '--', ...targets.map(r => r.file)]);
  } else {
    for (const { file, hash } of targets) {
      const dest = local(fw, file);
      if (hashFile(dest) !== hash) throw Error('檔案已變動，請重新預覽：' + file);
      fs.unlinkSync(dest);
    }
  }
}

async function build() {
  if ((!book || book === '--help') && !flag) return console.log(help);
  const review = ['--inspect', '--untrack', '--clean'].includes(flag);
  if (!book || book.includes('/') || (flag && flag !== '--adopt' && !review) || extra.length ||
      (apply && (apply !== '--apply' || !['--clean', '--untrack'].includes(flag)))) throw Error(help);
  const root = local(host, book);
  const fw = local(root, 'agentdeck');
  const config = readJson(local(fw, 'agentdeck.json'));
  if (config.contract !== contractOf(UP)) throw Error('The installed AgentDeck contract differs from this book.');

  const files = new Map();
  for (const f of coreFiles()) files.set(f, config.core.files[f]);
  if (!config.theme?.source) for (const f of themeFiles()) files.set('assets/theme/' + f, null);
  for (const name of Object.keys(config.components)) {
    if (!/^[a-z0-9-]+$/.test(name)) throw Error('Invalid component: ' + name);
    const component = componentManifest(name);
    if (!component) throw Error('Missing component in installed version: ' + name);
    for (const f of component.files) files.set('assets/deck/components/' + name + '/' + f, config.components[name].files[f]);
  }

  const ignore = local(fw, '.gitignore');
  const previous = fs.existsSync(ignore) ? fs.readFileSync(ignore, 'utf8') : '';
  const block = ignoreBlock(previous);
  if (!block.entries && !['--adopt', '--inspect'].includes(flag)) throw Error('First adopt this book with --adopt.');
  const managed = new Set((block.entries ?? []).map(line => {
    if (!line.startsWith('/') || !files.has(line.slice(1))) throw Error('Review stale framework path: ' + line);
    return line.slice(1);
  }));
  const missing = [], rows = [];
  for (const [file, baseline] of files) {
    const dest = local(fw, file), src = path.join(UP, file);
    const stock = new Set([hashFile(src)]);
    // Older manifests hashed the extensionless LICENSE with the checkout's line endings.
    if (file === 'LICENSE') {
      const lf = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
      for (const text of [lf, lf.replace(/\n/g, '\r\n')]) stock.add(sha256(Buffer.from(text)).toLowerCase().slice(0, 16));
    }
    const have = hashFile(dest);
    if (review) {
      rows.push({ file, same: stock.has(have), managed: managed.has(file), present: have !== null,
        pinOK: baseline === null || stock.has(baseline), hash: have });
      continue;
    }
    if (flag === '--adopt' && have) {
      if (stock.has(have)) managed.add(file);
      else if (managed.delete(file)) console.log('保留為專案來源：' + file);
    }
    if (!managed.has(file)) {
      if (!have) throw Error('Missing author-owned file or new framework file: ' + dest);
      continue;
    }
    if (baseline !== null && !stock.has(baseline)) throw Error('Framework pin differs from agentdeck.json: ' + file);
    if (have && !stock.has(have)) throw Error('Preserved local changes: ' + dest + ' (remove its .gitignore line to keep it as source)');
    if (!have) missing.push({ src, dest });
  }
  if (review && !apply) return maintenance(fw, rows);
  const vendor = readJson(local(fw, 'vendor.json'));
  const defaults = Object.fromEntries(READER_VENDOR.map(name => [name, upstreamVendor().packages[name]]));
  for (const [name, pkg] of Object.entries({ ...defaults, ...vendor.packages })) {
    if (name.includes('/')) throw Error('Invalid vendor name: ' + name);
    for (const f of pkg.files) {
      local(fw, 'vendor/' + name + '/' + f.path);
      if (!/^[a-f0-9]{64}$/i.test(f.sha256)) throw Error('Missing vendor checksum: ' + f.path);
    }
  }
  if (review) return maintenance(fw, rows);
  for (const { src, dest } of missing) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest, fs.constants.COPYFILE_EXCL);
  }
  await downloadVendor([], {}, { fw });
  const eol = previous.includes('\r\n') ? '\r\n' : '\n';
  const prefix = block.before && !block.before.endsWith('\n') ? block.before + eol : block.before;
  const rules = prefix + [header, ...[...managed].sort().map(f => '/' + f), footer, ''].join(eol) + block.after;
  if (flag === '--adopt' && previous !== rules) fs.writeFileSync(ignore, rules);
  console.log(book + ': ' + managed.size + ' stock files, ' + missing.length + ' restored');
}

build().catch(error => { console.error(error.message); process.exitCode = 1; });
