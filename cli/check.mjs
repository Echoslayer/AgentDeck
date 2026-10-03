// CLI 檢查：在暫存資料夾跑完整下游流程（docs/adr/0016），完成後清理。執行：node cli/check.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { unzip } from './lib/zip.mjs';
import { markClicks } from './lib/export.mjs';
import { hashFile, listFiles } from './lib/util.mjs';

const UP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(UP, 'cli', 'agentdeck.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentdeck-check-'));
const probe = path.join(UP, 'resources', `agentdeck-check-${process.pid}`);
const research = path.join(UP, 'playground', `agentdeck-check-${process.pid}`);
let passed = 0;

function run(args, cwd, expectFail = false) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp } });
  const out = `${r.stdout}${r.stderr}`;
  if (expectFail) assert.notEqual(r.status, 0, `應失敗：${args.join(' ')}\n${out}`);
  else assert.equal(r.status, 0, `失敗：${args.join(' ')}\n${out}`);
  return out;
}
function step(name, fn) {
  fn();
  passed++;
  console.log(`ok ${passed} ${name}`);
}
const has = (base, p) => fs.existsSync(path.join(base, p));
const refsOf = html => [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/(?:src|href)\s*=\s*(["'])(.*?)\1/g)]
  .map(m => m[2].split(/[?#]/)[0]).filter(r => r && !/^(?:[a-z]+:|\/\/)/i.test(r)).map(decodeURIComponent);
function packedRefs(files, top, topics) {
  for (const [name, buf] of files) {
    if (!name.endsWith('.html') || (name !== `${top}/index.html` && !topics.some(topic => name.startsWith(`${top}/${topic}/`)))) continue;
    for (const ref of refsOf(buf.toString('utf8'))) {
      assert.ok(!ref.startsWith('/'), `${name} 使用根目錄路徑：${ref}`);
      const resolved = path.posix.normalize(`${path.posix.dirname(name)}/${ref}`);
      assert.ok(resolved.startsWith(`${top}/`) && files.has(resolved), `${name} 引用不存在：${ref}`);
    }
  }
}
function storyImage(source, scriptSrc) {
  return runInNewContext(`${source}\nresource('img/probe.png')`, {
    document: { currentScript: { getAttribute: name => { assert.equal(name, 'src'); return scriptSrc; } } },
    deck: { cover: () => ({}), end: () => ({}) },
  });
}

try {
  const host = path.join(tmp, 'host');
  const ws = path.join(host, 'slides');
  fs.mkdirSync(host);
  spawnSync('git', ['init', '-q'], { cwd: host });
  fs.writeFileSync(path.join(host, 'AGENTS.md'), '# Host\r\n');

  step('init 建立只含播放與客製所需的工作區，框架集中在 agentdeck/', () => {
    run(['init', ws, '--source', UP, '--agents-hint'], tmp);
    for (const p of ['agentdeck.json', 'LICENSE', 'AGENTDECK.md', 'vendor.json', 'assets/deck/deck-core.js', 'assets/deck/deck-editor.js',
      'assets/deck/deck.css', 'assets/story-reader/reader.js', 'assets/theme/theme.css', 'templates/blank/index.html']) {
      assert.ok(has(ws, `agentdeck/${p}`), `缺少 agentdeck/${p}`);
    }
    for (const p of ['.gitignore', 'resources/.gitkeep']) assert.ok(has(ws, p), `缺少 ${p}`);
    assert.deepEqual(fs.readdirSync(ws).sort(), ['.gitignore', 'agentdeck', 'resources']);
    for (const p of ['examples', 'tools', 'docs', 'cli', 'playground', 'AGENTS.md', 'README.md', 'agentdeck/assets/deck/components/CATALOG.md']) {
      assert.ok(!has(ws, p), `不應帶入 ${p}`);
    }
    const cfg = JSON.parse(fs.readFileSync(path.join(ws, 'agentdeck/agentdeck.json'), 'utf8'));
    const contract = Number(fs.readFileSync(path.join(UP, 'assets/deck/deck-core.js'), 'utf8').match(/const CONTRACT = (\d+);/)[1]);
    assert.equal(cfg.contract, contract);
    assert.ok(cfg.core.files['assets/deck/deck-core.js']);
    assert.match(cfg.cli, /agentdeck\.mjs/);
    const hint = fs.readFileSync(path.join(host, 'AGENTS.md'), 'utf8');
    assert.match(hint, /`slides\/agentdeck\/AGENTDECK\.md`/, '宿主指引應為相對路徑 slides/agentdeck/AGENTDECK.md');
    assert.doesNotMatch(hint, /[^\r]\n/, '宿主指引應沿用宿主的 CRLF');
    assert.match(fs.readFileSync(path.join(ws, '.gitignore'), 'utf8'), /^\/agentdeck\/vendor\/$/m);
    assert.match(run(['status'], path.join(ws, 'agentdeck', 'assets')), /契約：\d+，與上游一致/);
  });

  step('init 拒絕非空與上游位置，允許 playground 研究工作區', () => {
    run(['init', ws, '--source', UP], tmp, true);
    run(['init', UP, '--source', UP], tmp, true);
    run(['init', path.join(UP, 'resources', 'x-check'), '--source', UP], tmp, true);
    run(['init', research, '--source', UP], tmp);
    assert.ok(has(research, 'agentdeck/agentdeck.json'));
  });

  step('init --theme 以本機主題資料夾取代預設主題，缺檔則拒絕', () => {
    const theme = path.join(tmp, 'brand');
    fs.mkdirSync(path.join(theme, 'img'), { recursive: true });
    for (const f of ['theme.css', 'theme.js', 'img/logo.svg']) fs.writeFileSync(path.join(theme, f), `/* brand ${f} */`);
    const branded = path.join(tmp, 'branded');
    run(['init', branded, '--source', UP, '--theme', theme], tmp);
    assert.equal(fs.readFileSync(path.join(branded, 'agentdeck/assets/theme/theme.css'), 'utf8'), '/* brand theme.css */');
    assert.ok(!has(branded, 'agentdeck/assets/theme/img/cover-bg.svg'), '不應混入預設主題檔');
    const cfg = JSON.parse(fs.readFileSync(path.join(branded, 'agentdeck/agentdeck.json'), 'utf8'));
    assert.equal(cfg.theme.source, theme.replace(/\\/g, '/'));
    fs.rmSync(path.join(theme, 'theme.js'));
    run(['init', path.join(tmp, 'broken'), '--source', UP, '--theme', theme], tmp, true);
    assert.ok(!has(tmp, 'broken'), '失敗時不應留下工作區');
  });

  step('new 由工作區的 templates/blank 建立主題', () => {
    run(['new', 'demo'], ws);
    for (const p of ['index.html', 'resources/demo/plan.md', 'resources/demo/story.js', 'resources/demo/story.css', 'resources/demo/edits.js']) assert.ok(has(ws, p), `缺少 ${p}`);
    assert.ok(!has(ws, 'demo/index.html'));
    assert.ok(!has(ws, 'resources/demo/index.html'));
    assert.deepEqual(fs.readdirSync(ws).sort(), ['.gitignore', 'agentdeck', 'index.html', 'resources']);
    const html = fs.readFileSync(path.join(ws, 'index.html'), 'utf8');
    assert.match(html, /src="agentdeck\/assets\/deck\/deck-core\.js"/);
    assert.match(html, /src="resources\/demo\/story\.js"/);
    assert.match(html, /href="resources\/demo\/story\.css"/);
    for (const ref of refsOf(html)) assert.ok(has(ws, ref), `引用不存在：${ref}`);
    run(['new', 'demo'], ws, true);
    run(['new', 'unrelated'], ws, true);
    assert.ok(!has(ws, 'resources/unrelated'));
    run(['new', 'Bad_Name'], ws, true);
    run(['new', `agentdeck-check-${process.pid}`], UP, true);
  });

  step('join 依入口引用順序把分頁檔併回 story.js／story.css', () => {
    const data = path.join(ws, 'resources/demo'), indexPath = path.join(ws, 'index.html');
    const storyBefore = fs.readFileSync(path.join(data, 'story.js'), 'utf8'), cssBefore = fs.readFileSync(path.join(data, 'story.css'), 'utf8');
    const htmlBefore = fs.readFileSync(indexPath, 'utf8');
    fs.mkdirSync(path.join(data, 'pages'));
    for (const id of ['b', 'a']) {
      fs.writeFileSync(path.join(data, 'pages', `${id}.js`), `story.pages.splice(-1, 0, { id: '${id}', section: '', title: '${id}', lead: '', art: resource('img/${id}.png'), point: '' });\n`);
      fs.writeFileSync(path.join(data, 'pages', `${id}.css`), `.demo-${id} { background: url("img/${id}.png"); }\n`);
    }
    const tags = ['b', 'a'].map(id => `<link rel="stylesheet" href="resources/demo/pages/${id}.css">\n`).join('');
    const scripts = ['b', 'a'].map(id => `<script src="resources/demo/pages/${id}.js"></script>\n`).join('');
    fs.writeFileSync(indexPath, htmlBefore
      .replace(/(<link rel="stylesheet" href="resources\/demo\/story\.css">)/, `$1\n${tags}`)
      .replace(/(<script src="resources\/demo\/story\.js"><\/script>\r?\n)/, `$1${scripts}`));
    fs.writeFileSync(path.join(data, 'pages', 'stray.js'), '');
    assert.match(run(['join', 'demo'], ws, true), /stray\.js/);
    fs.rmSync(path.join(data, 'pages', 'stray.js'));
    run(['join', 'demo'], ws);
    assert.deepEqual(refsOf(fs.readFileSync(indexPath, 'utf8')), refsOf(htmlBefore));
    fs.writeFileSync(indexPath, htmlBefore);
    assert.ok(!has(data, 'pages'));
    const css = fs.readFileSync(path.join(data, 'story.css'), 'utf8');
    assert.ok(css.startsWith(cssBefore) && css.indexOf('.demo-b') < css.indexOf('.demo-a') && css.includes('url("pages/img/a.png")'));
    const source = fs.readFileSync(path.join(data, 'story.js'), 'utf8');
    const ids = runInNewContext(`${source}\nstory.pages.map(p => p.id ?? '-').join()`, {
      document: { currentScript: { getAttribute: () => 'resources/demo/story.js' } },
      deck: { cover: () => ({ id: 'cover' }), end: () => ({ id: 'end' }) },
    });
    assert.equal(ids, 'cover,intro,b,a,end');
    run(['join', 'demo'], ws, true);
    fs.writeFileSync(path.join(data, 'story.js'), storyBefore);
    fs.writeFileSync(path.join(data, 'story.css'), cssBefore);
  });

  step('相關簡報需明確分組並保持相對引用', () => {
    run(['new', 'alt', '--related', 'candidates'], ws);
    run(['new', 'appendix', '--related', 'attachments'], ws);
    for (const [group, topic] of [['candidates', 'alt'], ['attachments', 'appendix']]) {
      const html = fs.readFileSync(path.join(ws, group, topic, 'index.html'), 'utf8');
      assert.match(html, new RegExp(`src="\\.\\./\\.\\./resources/${topic}/story\\.js"`));
      assert.match(html, /src="\.\.\/\.\.\/agentdeck\/assets\/deck\/deck-core\.js"/);
      for (const ref of refsOf(html)) assert.ok(has(ws, path.posix.normalize(`${group}/${topic}/${ref}`)), `引用不存在：${ref}`);
    }
    for (const group of ['', 'agentdeck', 'assets', 'resources', 'vendor', 'templates', 'dist', '../escape', 'Bad_Group']) {
      assert.match(run(['new', 'blocked-related', '--related', group], ws, true), /--related 分類/);
    }
    assert.ok(!has(ws, 'resources/blocked-related'));
  });

  step('add 複製元件並登記套件', () => {
    const out = run(['add', 'list', 'globe'], ws);
    assert.match(out, /href="agentdeck\/assets\/deck\/components\/list\/list\.css"/);
    assert.match(out, /src="agentdeck\/vendor\/three\/three\.min\.js"/);
    assert.match(run(['add', 'trend'], ws), /提到搭配 figure/);
    assert.ok(has(ws, 'agentdeck/assets/deck/components/list/README.md') && has(ws, 'agentdeck/assets/deck/components/globe/globe.js'));
    const vendor = JSON.parse(fs.readFileSync(path.join(ws, 'agentdeck/vendor.json'), 'utf8'));
    assert.ok(vendor.packages.three?.files?.length);
    const cfg = JSON.parse(fs.readFileSync(path.join(ws, 'agentdeck/agentdeck.json'), 'utf8'));
    assert.deepEqual(Object.keys(cfg.components).sort(), ['globe', 'list', 'trend']);
    run(['add', 'list'], ws, true);
    run(['add', 'nope'], ws, true);
  });

  step('catalog／docs 按需輸出', () => {
    assert.match(run(['catalog'], ws), /resolution-comparison/);
    const map = run(['catalog', '地圖'], ws);
    assert.match(map, /globe/);
    assert.doesNotMatch(map, /\blist\b.*條列/);
    const doc = run(['docs', 'globe'], ws);
    assert.match(doc, /# globe/);
    assert.match(doc, /特殊元件規則/);
    assert.match(doc, /工作區已有副本/);
    assert.match(run(['docs', 'resolution-comparison', '--code'], ws), /compute\.js/);
    assert.match(run(['docs', 'visual-story'], ws), /Visual Story/);
    assert.match(run(['docs', '0-to-1'], ws), /契約 0 → 1/);
    run(['docs', 'nope'], ws, true);
  });

  step('diff／status 區分本地修改與上游', () => {
    assert.match(run(['diff'], ws), /與取得時及上游一致/);
    fs.appendFileSync(path.join(ws, 'agentdeck/assets/deck/components/list/list.css'), '\n/* local */\n');
    const d = run(['diff', 'list', '--patch'], ws);
    assert.match(d, /本地已改.*list\.css/);
    assert.match(d, /\+\/\* local \*\//);
    const s = run(['status'], ws);
    assert.match(s, /與上游一致/);
    assert.match(s, /元件 list：本地已改 1/);
    assert.match(s, /index\.html/);
    assert.match(s, /three@.*未下載/);
  });

  step('update core 保護本地修改', () => {
    run(['update', 'core'], ws);
    fs.appendFileSync(path.join(ws, 'agentdeck/assets/deck/deck.css'), '\n/* local */\n');
    assert.match(run(['update', 'core'], ws, true), /deck\.css/);
    run(['update', 'core', '--force'], ws);
    assert.doesNotMatch(fs.readFileSync(path.join(ws, 'agentdeck/assets/deck/deck.css'), 'utf8'), /local/);
  });

  step('update 預檢唯讀、備份原檔、只更新核心並保留客製內容', () => {
    const cfgPath = path.join(ws, 'agentdeck/agentdeck.json');
    const corePath = path.join(ws, 'agentdeck/assets/story-reader/reader.css');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    fs.writeFileSync(corePath, '/* old upstream */');
    cfg.core.files['assets/story-reader/reader.css'] = hashFile(corePath);
    fs.writeFileSync(cfgPath, JSON.stringify(cfg));
    const snapshot = () => Object.fromEntries(listFiles(ws).map(f => [f, fs.readFileSync(path.join(ws, f)).toString('base64')]));
    const before = snapshot();
    const dirsBefore = fs.readdirSync(tmp);
    assert.match(run(['update', 'core', '--check'], ws), /1 個檔案待更新；0 個本地修改/);
    assert.deepEqual(snapshot(), before);
    assert.deepEqual(fs.readdirSync(tmp), dirsBefore, '預檢不可產生備份');
    const out = run(['update', 'core'], ws);
    const backup = out.match(/備份：(.*)/)[1].trim();
    assert.equal(fs.readFileSync(path.join(backup, 'agentdeck/assets/story-reader/reader.css'), 'utf8'), '/* old upstream */');
    assert.equal(fs.readFileSync(path.join(backup, 'agentdeck/agentdeck.json')).toString('base64'), before['agentdeck/agentdeck.json']);
    const after = snapshot();
    assert.deepEqual(Object.keys(after), Object.keys(before));
    for (const f of Object.keys(before)) if (!['agentdeck/agentdeck.json', 'agentdeck/assets/story-reader/reader.css'].includes(f)) assert.equal(after[f], before[f], f);
    assert.match(run(['update', 'core'], ws), /無需更新或備份/);
  });

  step('上游移除的核心仍保護本地修改，新增檔保留，符號連結拒絕', () => {
    const cfgPath = path.join(ws, 'agentdeck/agentdeck.json');
    const removed = 'assets/story-reader/retired.js';
    const full = path.join(ws, 'agentdeck', removed);
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    fs.writeFileSync(full, 'old');
    cfg.core.files[removed] = hashFile(full);
    fs.writeFileSync(cfgPath, JSON.stringify(cfg));
    fs.writeFileSync(full, 'custom');
    const extra = path.join(ws, 'agentdeck/assets/story-reader/custom.js');
    fs.writeFileSync(extra, 'keep');
    assert.match(run(['update', 'core', '--check'], ws, true), /核心副本有本地修改/);
    assert.equal(fs.readFileSync(full, 'utf8'), 'custom');
    const out = run(['update', 'core', '--force'], ws);
    assert.ok(!fs.existsSync(full));
    assert.equal(fs.readFileSync(extra, 'utf8'), 'keep');
    assert.equal(fs.readFileSync(path.join(out.match(/備份：(.*)/)[1].trim(), 'agentdeck', removed), 'utf8'), 'custom');
    fs.rmSync(extra);
    if (process.platform !== 'win32') {
      const css = path.join(ws, 'agentdeck/assets/deck/deck.css');
      const original = fs.readFileSync(css);
      const outside = path.join(tmp, 'outside.css');
      fs.writeFileSync(outside, original);
      fs.rmSync(css);
      fs.symlinkSync(outside, css);
      assert.match(run(['update', 'core', '--check'], ws, true), /符號連結/);
      assert.deepEqual(fs.readFileSync(outside), original);
      fs.rmSync(css);
      fs.writeFileSync(css, original);
    }
  });

  step('pack 產生只含工作區檔案的 zip', () => {
    // 使用已下載的匯出套件快取；pack 仍會驗證雜湊。
    for (const name of ['html-to-image', 'jspdf', 'pptxgenjs']) {
      const cached = path.join(UP, 'vendor', name);
      if (fs.existsSync(cached)) fs.cpSync(cached, path.join(ws, 'agentdeck/vendor', name), { recursive: true });
    }
    const index = path.join(ws, 'index.html');
    const html = fs.readFileSync(index, 'utf8')
      .replace('<link rel="stylesheet" href="resources/demo/story.css">', "<link rel='stylesheet' href='agentdeck/assets/deck/components/list/list.css?v=1#style'>\n<link rel=\"stylesheet\" href=\"resources/demo/story.css\">")
      .replace('<script src="resources/demo/story.js"></script>', '<script src="agentdeck/assets/deck/components/list/list.js"></script>\n<script src="resources/demo/story.js"></script>')
      .replace('<main', "<img src='resources/demo/img/O%27Brien.png' alt='Probe'>\n<main");
    assert.match(html, /components\/list\/list\.css/);
    fs.writeFileSync(index, html);
    const dataDir = path.join(ws, 'resources/demo');
    fs.mkdirSync(path.join(dataDir, 'img'));
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nC8AAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(path.join(dataDir, 'img/probe.png'), pixel);
    fs.writeFileSync(path.join(dataDir, 'img/dormant.png'), pixel);
    fs.writeFileSync(path.join(dataDir, "img/O'Brien.png"), pixel);
    const storyPath = path.join(dataDir, 'story.js');
    fs.appendFileSync(storyPath, '\nstory.pages[1].art += \'<img src="\' + resource(\'img/probe.png\') + \'">\';\n');
    const source = fs.readFileSync(storyPath, 'utf8');
    const scriptSrc = html.match(/src="([^"]*\/story\.js)"/)[1];
    assert.equal(storyImage(source, scriptSrc), 'resources/demo/img/probe.png');
    assert.ok(fs.existsSync(path.resolve(path.dirname(index), storyImage(source, scriptSrc))));
    for (const ref of refsOf(html)) assert.ok(fs.existsSync(path.resolve(path.dirname(index), ref)), `引用不存在：${ref}`);

    // 套件只被候選的 HTML 附頁引用，使用本機 fixture 避免測試需要下載。
    const fixture = Buffer.from('/* related-only fixture */');
    fs.mkdirSync(path.join(ws, 'agentdeck/vendor/fixture'), { recursive: true });
    fs.writeFileSync(path.join(ws, 'agentdeck/vendor/fixture/probe.js'), fixture);
    const vendorPath = path.join(ws, 'agentdeck/vendor.json');
    const vendor = JSON.parse(fs.readFileSync(vendorPath, 'utf8'));
    vendor.packages.fixture = { version: '1', files: [{ path: 'probe.js', url: 'https://invalid.example/probe.js', sha256: createHash('sha256').update(fixture).digest('hex').toUpperCase() }] };
    fs.writeFileSync(vendorPath, JSON.stringify(vendor));
    const relatedPath = path.join(ws, 'candidates/alt/index.html');
    fs.appendFileSync(relatedPath, '\n<a href="detail.html">Detail</a>\n');
    fs.writeFileSync(path.join(ws, 'candidates/alt/detail.html'), '<script src="../../agentdeck/vendor/fixture/probe.js"></script>');
    fs.mkdirSync(path.join(ws, 'resources/alt/img'));
    fs.writeFileSync(path.join(ws, 'resources/alt/img/probe.png'), pixel);
    fs.writeFileSync(path.join(ws, 'resources/loose.png'), pixel);
    fs.mkdirSync(path.join(ws, 'dist'));
    fs.writeFileSync(path.join(ws, 'dist/stale.zip'), 'old output');

    const out = path.join(tmp, 'out');
    run(['pack', '--out', out], ws);
    const [zipFile] = fs.readdirSync(out);
    const files = unzip(fs.readFileSync(path.join(out, zipFile)));
    const top = zipFile.replace(/\.zip$/, '');
    for (const p of ['index.html', 'candidates/alt/index.html', 'candidates/alt/detail.html', 'attachments/appendix/index.html', 'resources/demo/edits.js', 'resources/demo/img/probe.png', 'resources/demo/img/dormant.png', 'resources/alt/img/probe.png', 'resources/loose.png', 'agentdeck/vendor/fixture/probe.js', 'agentdeck/assets/deck/components/list/list.js', 'agentdeck/assets/story-reader/reader.js', 'agentdeck/assets/story-reader/export.js', 'agentdeck/vendor/html-to-image/html-to-image.js', 'agentdeck/vendor/jspdf/jspdf.umd.min.js', 'agentdeck/vendor/pptxgenjs/pptxgen.bundle.js', 'agentdeck/LICENSE']) {
      assert.ok(files.has(`${top}/${p}`), `zip 缺少 ${p}`);
    }
    assert.deepEqual([...new Set([...files.keys()].map(f => f.split('/')[1]))].sort(), ['agentdeck', 'attachments', 'candidates', 'index.html', 'resources']);
    assert.ok(![...files.keys()].some(f => f.endsWith('/plan.md') || f.includes('/vendor/three/') || f.includes('/templates/') || f.includes('/dist/') || /\/(?:agentdeck\.json|vendor\.json|AGENTDECK\.md)$/.test(f)), 'zip 不應含製作設定、計畫或未引用的套件');
    assert.ok(!files.has(`${top}/demo/index.html`));
    assert.ok(![...files.keys()].some(f => /\/components\/(?:globe|trend)\//.test(f) || (f.includes('/agentdeck/assets/') && f.endsWith('.md'))), 'zip 不應含未引用的元件或製作說明');
    packedRefs(files, top, ['candidates', 'attachments']);
    for (const [entry, topic, expected] of [['index.html', 'demo', 'resources/demo/img/probe.png'], ['candidates/alt/index.html', 'alt', '../../resources/alt/img/probe.png']]) {
      const packed = files.get(`${top}/${entry}`).toString('utf8');
      assert.doesNotMatch(packed, /<base\b|http-equiv\s*=\s*["']refresh["']/i);
      assert.match(packed, /<main id="page"/);
      if (entry === 'index.html') {
        assert.equal(packed, html);
        assert.match(packed, /list\.css\?v=1#style/);
        assert.match(packed, /src='resources\/demo\/img\/O%27Brien\.png'/);
      }
      const src = packed.match(/src="([^"]*\/story\.js)"/)[1];
      const image = storyImage(files.get(`${top}/resources/${topic}/story.js`).toString('utf8'), src);
      assert.equal(image, expected);
      assert.ok(files.has(path.posix.normalize(`${top}/${path.posix.dirname(entry)}/${image}`)));
    }
    const explicitOut = path.join(tmp, 'explicit-out');
    run(['pack', '.', '--out', explicitOut], ws);
    const [explicitZip] = fs.readdirSync(explicitOut);
    const explicitFiles = unzip(fs.readFileSync(path.join(explicitOut, explicitZip)));
    assert.equal(explicitFiles.get(`${explicitZip.replace(/\.zip$/, '')}/index.html`).toString('utf8'), html);
  });

  step('整份簡報工作區搬移後，入口與圖片仍相對於自身', () => {
    const moved = path.join(tmp, 'moved-slides');
    fs.cpSync(ws, moved, { recursive: true });
    for (const [entry, topic] of [['index.html', 'demo'], ['candidates/alt/index.html', 'alt'], ['attachments/appendix/index.html', 'appendix']]) {
      const index = path.join(moved, entry);
      const html = fs.readFileSync(index, 'utf8');
      for (const ref of refsOf(html)) {
        const resolved = path.resolve(path.dirname(index), ref);
        assert.ok(resolved.startsWith(`${moved}${path.sep}`) && fs.existsSync(resolved), `搬移後引用失效：${ref}`);
      }
      if (topic === 'appendix') continue;
      const source = fs.readFileSync(path.join(moved, 'resources', topic, 'story.js'), 'utf8');
      const src = html.match(/src="([^"]*\/story\.js)"/)[1];
      const image = path.resolve(path.dirname(index), storyImage(source, src));
      assert.ok(image.startsWith(`${moved}${path.sep}`) && fs.existsSync(image), `搬移後動態圖片失效：${image}`);
    }
  });

  step('pack 拒絕非法引用', () => {
    const custom = path.join(ws, 'custom');
    fs.mkdirSync(custom);
    fs.writeFileSync(path.join(custom, 'index.html'), '<!doctype html><main>custom</main>');
    fs.writeFileSync(path.join(tmp, 'outside.js'), '/* outside */');
    for (const html of [
      '<script src="/assets/deck/deck-core.js"></script>',
      `<script src="${path.relative(custom, path.join(tmp, 'outside.js')).replaceAll('\\', '/')}"></script>`,
      '<script src="missing.js"></script>',
      '<base href="../"><main>invalid base</main>',
      '<script src="../assets/deck/deck-core.js"></script>',
      '<script src="../agentdeck/agentdeck.json"></script>',
    ]) {
      fs.writeFileSync(path.join(custom, 'index.html'), html);
      run(['pack', 'custom', '--out', path.join(tmp, 'invalid-out')], ws, true);
    }
  });

  step('契約 1 必須先遷移，更新核心保留人工分鏡', () => {
    const cfgPath = path.join(ws, 'agentdeck/agentdeck.json');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    cfg.contract = 1;
    fs.writeFileSync(cfgPath, JSON.stringify(cfg));
    const storyPath = path.join(ws, 'resources/demo/story.js');
    fs.appendFileSync(storyPath, '\n// manual topic edit\n');
    const before = fs.readFileSync(storyPath);
    const editsPath = path.join(ws, 'resources/demo/edits.js');
    const editsBefore = fs.readFileSync(editsPath);
    for (const args of [['new', 'blocked'], ['add', 'cards'], ['pack', '--out', path.join(tmp, 'blocked-out')]]) {
      assert.match(run(args, ws, true), /契約版本不同/);
    }
    assert.match(run(['update', 'core'], ws, true), /1-to-2/);
    assert.match(run(['update', 'core', '--migrate'], ws), /1-to-2/);
    assert.deepEqual(fs.readFileSync(storyPath), before);
    assert.deepEqual(fs.readFileSync(editsPath), editsBefore);
    assert.equal(JSON.parse(fs.readFileSync(cfgPath, 'utf8')).contract, 2);
    assert.ok(!has(ws, 'resources/blocked'));
  });

  step('舊版工作區視為契約 0／舊佈局並指向遷移說明', () => {
    const legacy = path.join(tmp, 'legacy');
    fs.mkdirSync(legacy);
    fs.writeFileSync(path.join(legacy, 'agentdeck.json'), JSON.stringify({ source: 'D:\\AgentDeck', commit: 'abc' }));
    fs.writeFileSync(path.join(legacy, 'vendor.json'), '{"packages":{}}');
    assert.match(run(['status'], legacy), /契約：0/);
    assert.match(run(['update', 'core', '--migrate'], legacy, true), /0-to-1/);
    run(['add', 'list'], legacy, true);
    // 契約 1 的工作區把框架與 agentdeck.json 放在根目錄，不能就地更新。
    const v1 = path.join(tmp, 'legacy-v1');
    fs.mkdirSync(v1);
    fs.writeFileSync(path.join(v1, 'agentdeck.json'), JSON.stringify({ contract: 1, source: UP, core: {}, components: {} }));
    fs.writeFileSync(path.join(v1, 'vendor.json'), '{"packages":{}}');
    assert.match(run(['status'], v1), /1-to-2[\s\S]*agentdeck\//);
    assert.match(run(['update', 'core', '--migrate'], v1, true), /1-to-2/);
    assert.ok(!has(v1, 'assets'));
  });

  step('上游 pack：examples 可整份打包，主題不得引用 examples', () => {
    const out = path.join(tmp, 'up-out');
    run(['pack', 'examples', '--out', out], UP);
    const [zipFile] = fs.readdirSync(out);
    const files = unzip(fs.readFileSync(path.join(out, zipFile)));
    const top = zipFile.replace(/\.zip$/, '');
    assert.ok(files.has(`${top}/index.html`) && files.has(`${top}/examples/index.html`), 'zip 缺少 examples 入口');
    assert.doesNotMatch(files.get(`${top}/index.html`).toString('utf8'), /<base\b|http-equiv\s*=\s*["']refresh["']/i);
    packedRefs(files, top, ['examples']);
    fs.mkdirSync(probe, { recursive: true });
    fs.writeFileSync(path.join(probe, 'index.html'), '<script src="../../examples/weighted-ranking/compute.js"></script>\n');
    assert.match(run(['pack', path.relative(UP, probe), '--out', out], UP, true), /examples/);
  });

  step('export 把標註步驟分成 PPT 的「按一下」', () => {
    assert.deepEqual(markClicks([{ box: '.a' }, { box: '.b' }, { clear: true }, { box: '.c' }], [['a'], ['b'], [], ['c']]), [
      [{ name: 'a', delay: 0 }], [{ name: 'b', delay: 0 }],
      [{ name: 'a', out: true, delay: 0 }, { name: 'b', out: true, delay: 0 }, { name: 'c', delay: 0 }],
    ]);
    assert.deepEqual(markClicks([{ box: '.a', at: 1 }, { wait: 300 }, { arrow: '.b' }, { clear: true, at: 2 }], [['a'], [], ['b'], []]), [
      [{ name: 'a', delay: 0 }, { name: 'b', delay: 300 }],
      [{ name: 'a', out: true, delay: 0 }, { name: 'b', out: true, delay: 0 }],
    ]);
  });

  console.log(`\n全部通過（${passed} 項）`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(probe, { recursive: true, force: true });
  assert.ok(research.startsWith(`${path.join(UP, 'playground')}${path.sep}`));
  fs.rmSync(research, { recursive: true, force: true });
}
