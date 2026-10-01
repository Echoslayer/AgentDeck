// CLI 檢查：在暫存資料夾跑完整下游流程（docs/adr/0016），完成後清理。執行：node cli/check.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unzip } from './lib/zip.mjs';

const UP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(UP, 'cli', 'agentdeck.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agentdeck-check-'));
const probe = path.join(UP, 'resources', `agentdeck-check-${process.pid}`);
let passed = 0;

function run(args, cwd, expectFail = false) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
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
const refsOf = html => [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/(?:src|href)\s*=\s*"([^"#?]+)/g)].map(m => m[1]).filter(r => !/^[a-z]+:/i.test(r));

try {
  const host = path.join(tmp, 'host');
  const ws = path.join(host, 'slides');
  fs.mkdirSync(host);
  spawnSync('git', ['init', '-q'], { cwd: host });
  fs.writeFileSync(path.join(host, 'AGENTS.md'), '# Host\r\n');

  step('init 建立只含播放與客製所需的工作區', () => {
    run(['init', ws, '--source', UP, '--agents-hint'], tmp);
    for (const p of ['agentdeck.json', 'AGENTDECK.md', 'vendor.json', '.gitignore', 'assets/deck/deck-core.js', 'assets/deck/deck-editor.js',
      'assets/deck/deck.css', 'assets/story-reader/reader.js', 'assets/theme/theme.css', 'templates/blank/index.html', 'resources/.gitkeep']) {
      assert.ok(has(ws, p), `缺少 ${p}`);
    }
    for (const p of ['examples', 'tools', 'docs', 'cli', 'playground', 'AGENTS.md', 'README.md', 'assets/deck/components/CATALOG.md']) {
      assert.ok(!has(ws, p), `不應帶入 ${p}`);
    }
    const cfg = JSON.parse(fs.readFileSync(path.join(ws, 'agentdeck.json'), 'utf8'));
    const contract = Number(fs.readFileSync(path.join(UP, 'assets/deck/deck-core.js'), 'utf8').match(/const CONTRACT = (\d+);/)[1]);
    assert.equal(cfg.contract, contract);
    assert.ok(cfg.core.files['assets/deck/deck-core.js']);
    assert.match(cfg.cli, /agentdeck\.mjs/);
    const hint = fs.readFileSync(path.join(host, 'AGENTS.md'), 'utf8');
    assert.match(hint, /`slides\/AGENTDECK\.md`/, '宿主指引應為相對路徑 slides/AGENTDECK.md');
    assert.doesNotMatch(hint, /[^\r]\n/, '宿主指引應沿用宿主的 CRLF');
    assert.match(fs.readFileSync(path.join(ws, '.gitignore'), 'utf8'), /\/vendor\//);
  });

  step('init 拒絕非空資料夾與上游內位置', () => {
    run(['init', ws, '--source', UP], tmp, true);
    run(['init', path.join(UP, 'resources', 'x-check'), '--source', UP], tmp, true);
  });

  step('new 由工作區的 templates/blank 建立主題', () => {
    run(['new', 'demo'], ws);
    assert.ok(has(ws, 'resources/demo/index.html') && has(ws, 'resources/demo/plan.md'));
    run(['new', 'demo'], ws, true);
    run(['new', 'Bad_Name'], ws, true);
  });

  step('add 複製元件並登記套件', () => {
    const out = run(['add', 'list', 'globe'], ws);
    assert.match(out, /components\/list\/list\.css/);
    assert.match(out, /vendor\/three\/three\.min\.js/);
    assert.match(run(['add', 'trend'], ws), /提到搭配 figure/);
    assert.ok(has(ws, 'assets/deck/components/list/README.md') && has(ws, 'assets/deck/components/globe/globe.js'));
    const vendor = JSON.parse(fs.readFileSync(path.join(ws, 'vendor.json'), 'utf8'));
    assert.ok(vendor.packages.three?.files?.length);
    const cfg = JSON.parse(fs.readFileSync(path.join(ws, 'agentdeck.json'), 'utf8'));
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
    fs.appendFileSync(path.join(ws, 'assets/deck/components/list/list.css'), '\n/* local */\n');
    const d = run(['diff', 'list', '--patch'], ws);
    assert.match(d, /本地已改.*list\.css/);
    assert.match(d, /\+\/\* local \*\//);
    const s = run(['status'], ws);
    assert.match(s, /與上游一致/);
    assert.match(s, /元件 list：本地已改 1/);
    assert.match(s, /簡報：demo/);
    assert.match(s, /three@.*未下載/);
  });

  step('update core 保護本地修改', () => {
    run(['update', 'core'], ws);
    fs.appendFileSync(path.join(ws, 'assets/deck/deck.css'), '\n/* local */\n');
    assert.match(run(['update', 'core'], ws, true), /deck\.css/);
    run(['update', 'core', '--force'], ws);
    assert.doesNotMatch(fs.readFileSync(path.join(ws, 'assets/deck/deck.css'), 'utf8'), /local/);
  });

  step('pack 產生只含工作區檔案的 zip', () => {
    const index = path.join(ws, 'resources/demo/index.html');
    const html = fs.readFileSync(index, 'utf8')
      .replace('<link rel="stylesheet" href="story.css">', '<link rel="stylesheet" href="../../assets/deck/components/list/list.css">\n<link rel="stylesheet" href="story.css">')
      .replace('<script src="story.js"></script>', '<script src="../../assets/deck/components/list/list.js"></script>\n<script src="story.js"></script>');
    fs.writeFileSync(index, html);
    for (const ref of refsOf(html)) assert.ok(fs.existsSync(path.resolve(path.dirname(index), ref)), `引用不存在：${ref}`);
    const out = path.join(tmp, 'out');
    run(['pack', 'resources/demo', '--out', out], ws);
    const [zipFile] = fs.readdirSync(out);
    const files = unzip(fs.readFileSync(path.join(out, zipFile)));
    const top = zipFile.replace(/\.zip$/, '');
    for (const p of ['index.html', 'resources/demo/index.html', 'resources/demo/edits.js', 'assets/deck/components/list/list.js', 'assets/story-reader/reader.js']) {
      assert.ok(files.has(`${top}/${p}`), `zip 缺少 ${p}`);
    }
    assert.ok(![...files.keys()].some(f => f.endsWith('/plan.md') || f.includes('/vendor/')), 'zip 不應含 plan.md 或未引用的套件');
    const packed = files.get(`${top}/resources/demo/index.html`).toString('utf8');
    for (const ref of refsOf(packed)) {
      const p = path.posix.normalize(`${top}/resources/demo/${ref}`);
      assert.ok(files.has(p), `zip 內引用不存在：${ref}`);
    }
  });

  step('舊版工作區視為契約 0 並指向遷移說明', () => {
    const legacy = path.join(tmp, 'legacy');
    fs.mkdirSync(legacy);
    fs.writeFileSync(path.join(legacy, 'agentdeck.json'), JSON.stringify({ source: 'D:\\AgentDeck', commit: 'abc' }));
    fs.writeFileSync(path.join(legacy, 'vendor.json'), '{"packages":{}}');
    assert.match(run(['status'], legacy), /契約：0/);
    assert.match(run(['update', 'core', '--migrate'], legacy, true), /0-to-1/);
    run(['add', 'list'], legacy, true);
  });

  step('上游 pack：examples 可整份打包，主題不得引用 examples', () => {
    const out = path.join(tmp, 'up-out');
    run(['pack', 'examples', '--out', out], UP);
    const [zipFile] = fs.readdirSync(out);
    const files = unzip(fs.readFileSync(path.join(out, zipFile)));
    const top = zipFile.replace(/\.zip$/, '');
    assert.ok(files.has(`${top}/index.html`) && files.has(`${top}/examples/index.html`), 'zip 缺少 examples 入口');
    for (const [name, buf] of files) {
      if (!name.startsWith(`${top}/examples/`) || !name.endsWith('.html')) continue;
      for (const ref of refsOf(buf.toString('utf8'))) {
        assert.ok(files.has(path.posix.normalize(`${path.posix.dirname(name)}/${ref}`)), `${name} 引用不存在：${ref}`);
      }
    }
    fs.mkdirSync(probe, { recursive: true });
    fs.writeFileSync(path.join(probe, 'index.html'), '<script src="../../examples/weighted-ranking/compute.js"></script>\n');
    assert.match(run(['pack', path.relative(UP, probe), '--out', out], UP, true), /examples/);
  });

  console.log(`\n全部通過（${passed} 項）`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(probe, { recursive: true, force: true });
}
