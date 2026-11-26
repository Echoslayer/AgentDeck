import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { UP, readJson, writeJson, writeText, sha256 } from './lib/util.mjs';

export function checkHost(tmp, run) {
  const host = path.join(tmp, 'multi-book');
  const book = path.join(host, 'example');
  run(['init', book], tmp);
  run(['new', 'example', '--dir', book], tmp);
  run(['add', 'steps', '--dir', book], tmp);
  const installed = path.join(host, 'node_modules/agentdeck');
  for (const file of ['package.json', 'cli', 'assets', 'templates', 'vendor.json', 'LICENSE', 'AGENTDECK.md']) {
    fs.cpSync(path.join(UP, file), path.join(installed, file), { recursive: true });
  }
  const pin = 'abcd'.repeat(10);
  writeJson(path.join(host, 'package-lock.json'), { packages: {
    'node_modules/agentdeck': { resolved: 'https://codeload.github.com/Echoslayer/AgentDeck/tar.gz/' + pin },
  } });
  const status = spawnSync(process.execPath, [path.join(installed, 'cli/agentdeck.mjs'), 'status', '--dir', book], { cwd: host, encoding: 'utf8' });
  assert.ok(status.stdout.includes(pin.slice(0, 12)), status.stderr || status.stdout);
  const fw = path.join(book, 'agentdeck');
  const vendor = readJson(path.join(fw, 'vendor.json'));
  for (const [name, pkg] of Object.entries(vendor.packages)) {
    for (const f of pkg.files) {
      writeText(path.join(fw, 'vendor', name, f.path), 'fixture');
      f.sha256 = sha256(Buffer.from('fixture'));
    }
  }
  writeJson(path.join(fw, 'vendor.json'), vendor);
  const authored = ['agentdeck/components/local.js', 'agentdeck/assets/theme/theme.css', 'resources/example/edits.js'];
  for (const file of authored) writeText(path.join(book, file), 'local changes');
  const build = (...args) => spawnSync(process.execPath, [path.join(installed, 'templates/host/build.mjs'), 'example', ...args], { cwd: host, encoding: 'utf8' });
  const git = (...args) => {
    const r = spawnSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@localhost', '-c', 'commit.gpgsign=false', ...args], { cwd: book, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  git('init', '-q');
  const tracked = 'agentdeck/assets/deck/deck-core.js', staged = 'agentdeck/assets/deck/deck.css';
  git('add', '--', tracked);
  git('commit', '-qm', 'fixture');
  git('add', '--', staged);
  const ignore = path.join(fw, '.gitignore');
  const exception = 'assets/theme/theme.js';
  const projectRules = '# project rules\r\n/local.tmp\r\n!/' + exception;
  writeText(ignore, projectRules);
  const preview = build('--inspect');
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /可納管\t已追蹤\tassets\/deck\/deck-core.js/);
  assert.equal(fs.readFileSync(ignore, 'utf8'), projectRules);
  const first = build('--adopt');
  assert.equal(first.status, 0, first.stderr);
  const core = path.join(fw, 'assets/deck/deck-core.js');
  const component = path.join(fw, 'assets/deck/components/steps/steps.js');
  writeText(ignore, '# prefix\r\n' + fs.readFileSync(ignore, 'utf8'));
  assert.equal(build('--adopt').status, 0);
  const rules = fs.readFileSync(ignore, 'utf8');
  assert.ok(rules.startsWith('# prefix\r\n'));
  assert.ok(rules.endsWith(projectRules));
  const plan = build('--clean');
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(plan.stdout, /可清除\t未追蹤\tassets\/deck\/components\/steps\/steps.js/);
  assert.match(plan.stdout, /保留（Git 規則未忽略）\t未追蹤\tassets\/theme\/theme.js/);
  assert.match(plan.stdout, /有暫存變更/);
  assert.ok(fs.existsSync(component));
  const indexBefore = git('write-tree');
  assert.equal(build('--untrack').status, 0);
  assert.equal(git('write-tree'), indexBefore);
  const untrack = build('--untrack', '--apply');
  assert.equal(untrack.status, 0, untrack.stderr);
  assert.equal(git('ls-files', '--', tracked), '');
  assert.equal(git('ls-files', '--', staged), staged);
  assert.ok(fs.existsSync(core));
  assert.equal(build('--clean', '--apply').status, 0);
  assert.equal(fs.existsSync(component), false);
  assert.ok(fs.existsSync(core) && fs.existsSync(path.join(fw, exception)));
  assert.equal(build().status, 0);
  assert.ok(fs.existsSync(component));
  fs.unlinkSync(core);
  fs.unlinkSync(component);
  assert.match(build().stdout, /2 restored/);
  assert.match(build().stdout, /0 restored/);
  for (const file of authored) assert.equal(fs.readFileSync(path.join(book, file), 'utf8'), 'local changes');
  fs.unlinkSync(core);
  writeText(component, 'local fork');
  const conflict = build();
  assert.notEqual(conflict.status, 0);
  assert.match(conflict.stderr, /Preserved local changes/);
  assert.equal(fs.readFileSync(component, 'utf8'), 'local fork');
  assert.equal(fs.existsSync(core), false);
  assert.notEqual(build('--clean', '--apply').status, 0);
  assert.equal(build('--adopt').status, 0);
  assert.ok(!fs.readFileSync(ignore, 'utf8').includes('/assets/deck/components/steps/steps.js'));
  assert.match(build('--inspect').stdout, /保留差異\t未追蹤\tassets\/deck\/components\/steps\/steps.js/);
  assert.equal(fs.readFileSync(component, 'utf8'), 'local fork');
}
