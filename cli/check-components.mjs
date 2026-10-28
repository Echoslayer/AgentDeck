// 透過 CLI 與同一個公開 interface 驗證接入；套件用 data: fixture，不依賴網路。
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { useComponents } from './lib/components.mjs';
import { sha256, listFiles } from './lib/util.mjs';

export async function checkComponents({ run, tmp }) {
  const dir = path.join(tmp, 'component-use');
  run(['init', dir, '--no-agents-hint'], tmp);
  assert.match(run(['use', 'cards'], dir, true), /先執行 new/);
  run(['new', 'sample'], dir);
  const entry = path.join(dir, 'index.html');
  const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
  const write = (f, text) => fs.writeFileSync(path.join(dir, f), text);
  const snapshot = () => Object.fromEntries(listFiles(dir).map(f => [f, sha256(fs.readFileSync(path.join(dir, f)))]));
  const unchanged = async action => { const before = snapshot(); await action(); assert.deepEqual(snapshot(), before); };
  // 非空人工修正 fixture：成功與失敗接入都不得改寫它或分鏡、主題、核心。
  write('resources/sample/edits.js', 'window.storyEdits = { comments: { intro: "human fixture" } };\n');
  const protectedBefore = snapshot();
  run(['add', 'list'], dir);
  assert.match(run(['use', 'cards', 'cards'], dir), /已接入 cards/);
  assert.doesNotMatch(read('index.html'), /components\/list\/list\.(?:js|css)/);
  const refs = source => [...source.replace(/<!--[\s\S]*?-->/g, '').matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
  const assertOrder = (items, ordered) => {
    let last = -1;
    for (const item of ordered) { const at = items.indexOf(item); assert.ok(at > last, `順序錯誤：${item}`); last = at; }
  };
  const cardRefs = refs(read('index.html'));
  assert.equal(cardRefs.filter(r => r.endsWith('/cards.js')).length, 1);
  assertOrder(cardRefs, ['agentdeck/assets/theme/theme.css', 'agentdeck/assets/deck/components/cards/cards.css', 'resources/sample/story.css']);
  await unchanged(async () => {
    const result = await useComponents({ dir, names: ['cards'] });
    assert.equal(result.entryChanged, false);
    assert.deepEqual(result.installed, []);
    assert.deepEqual(result.packages, []);
  });
  for (const [f, hash] of Object.entries(protectedBefore)) {
    if (!['index.html', 'agentdeck/agentdeck.json', 'agentdeck/vendor.json'].includes(f)) assert.equal(snapshot()[f], hash, `保護檔案：${f}`);
  }

  const vendorPath = 'agentdeck/vendor.json';
  const vendor = JSON.parse(read(vendorPath));
  const bytes = Buffer.from('window.hljs = {}; // fixture');
  const fixture = { version: 'fixture', files: [{ path: 'highlight.min.js', url: `data:text/javascript;base64,${bytes.toString('base64')}`, sha256: sha256(bytes) }] };
  vendor.packages.highlight = fixture;
  write(vendorPath, JSON.stringify(vendor));
  const result = await useComponents({ dir, names: ['code'] });
  assert.deepEqual(result.installed, ['code']);
  assert.deepEqual(result.components, ['cards', 'code']);
  assert.deepEqual(result.packages, ['highlight']);
  assert.equal(read('agentdeck/vendor/highlight/highlight.min.js'), bytes.toString());
  assertOrder(refs(read('index.html')), ['agentdeck/assets/theme/theme.js', 'agentdeck/vendor/highlight/highlight.min.js', 'agentdeck/assets/deck/components/cards/cards.js', 'agentdeck/assets/deck/components/code/code.js', 'resources/sample/story.js']);
  assert.match(run(['use', 'code'], dir), /引用已一致/);
  await useComponents({ dir, names: ['codeexplorer'] });
  assert.equal(refs(read('index.html')).filter(r => r === 'agentdeck/vendor/highlight/highlight.min.js').length, 1, '共用套件只引用一次');
  await unchanged(() => assert.rejects(useComponents({ dir, names: ['metrics', 'not-a-component'] }), /上游沒有元件/));
  for (const names of [[], ['../code'], ['Code'], [12], null]) await unchanged(() => assert.rejects(useComponents({ dir, names }), /用法/));
  assert.match(run(['use', 'cards', '--force'], dir, true), /不覆蓋本地修改/);
  await unchanged(async () => assert.match(run(['use', 'metrics', '--check'], dir, true), /不支援其他選項/));

  const original = read('index.html');
  for (const customized of [
    original.replace('<body>', '<body class="custom">'),
    original.replace('<!-- /agentdeck:components -->', ''),
    original.replace('agentdeck/vendor/highlight/highlight.min.js', 'agentdeck/vendor/highlight/highlight.min.js?custom'),
    original.replace('<script src="agentdeck/assets/deck/components/code/code.js"></script>', ''),
  ]) {
    write('index.html', customized);
    await unchanged(() => assert.rejects(useComponents({ dir, names: ['metrics'] }), /入口|引用區塊/));
  }
  write('index.html', original);
  const component = 'agentdeck/assets/deck/components/cards/cards.css';
  const originalCss = read(component);
  write(component, originalCss + '\n/* local */');
  await unchanged(() => assert.rejects(useComponents({ dir, names: ['metrics'] }), /本地修改/));
  write(component, originalCss);
  const extra = 'agentdeck/assets/deck/components/cards/local.txt';
  write(extra, 'local addition');
  await unchanged(() => assert.rejects(useComponents({ dir, names: ['cards'] }), /本地修改/));
  fs.unlinkSync(path.join(dir, extra));

  // 下載雜湊不符時，入口不改；修正來源後可接著完成，無需 force。
  const retryDir = path.join(tmp, 'component-retry');
  run(['init', retryDir, '--no-agents-hint'], tmp);
  run(['new', 'retry'], retryDir);
  const retryEntry = path.join(retryDir, 'index.html');
  const retryOriginal = fs.readFileSync(retryEntry);
  const retryVendorPath = path.join(retryDir, 'agentdeck/vendor.json');
  const retryVendor = JSON.parse(fs.readFileSync(retryVendorPath, 'utf8'));
  retryVendor.packages.highlight = structuredClone(fixture);
  retryVendor.packages.highlight.files[0].url = 'data:text/javascript,wrong';
  fs.writeFileSync(retryVendorPath, JSON.stringify(retryVendor));
  await assert.rejects(useComponents({ dir: retryDir, names: ['code'] }), /入口未修改[\s\S]*雜湊不符/);
  assert.deepEqual(fs.readFileSync(retryEntry), retryOriginal);
  assert.ok(!fs.existsSync(path.join(retryDir, 'agentdeck/vendor/highlight/highlight.min.js')));
  retryVendor.packages.highlight = fixture;
  fs.writeFileSync(retryVendorPath, JSON.stringify(retryVendor));
  assert.equal((await useComponents({ dir: retryDir, names: ['code'] })).entryChanged, true);

  // Windows junction 也必須在下載／寫入前拒絕。
  const linked = path.join(retryDir, 'agentdeck/vendor/highlight');
  const stored = path.join(tmp, 'stored-highlight');
  assert.ok(linked.startsWith(retryDir + path.sep) && stored.startsWith(tmp + path.sep));
  fs.renameSync(linked, stored);
  fs.symlinkSync(stored, linked, process.platform === 'win32' ? 'junction' : 'dir');
  try {
    const before = fs.readFileSync(retryEntry);
    await assert.rejects(useComponents({ dir: retryDir, names: ['code'] }), /符號連結/);
    assert.deepEqual(fs.readFileSync(retryEntry), before);
    assert.equal(fs.readFileSync(path.join(stored, 'highlight.min.js'), 'utf8'), bytes.toString());
  } finally {
    fs.unlinkSync(linked);
    fs.renameSync(stored, linked);
  }
  // 已接入的套件缺檔時重建，入口不變；不同換行也保持位元組不變。
  fs.unlinkSync(path.join(retryDir, 'agentdeck/vendor/highlight/highlight.min.js'));
  assert.equal((await useComponents({ dir: retryDir, names: ['code'] })).entryChanged, false);
  write('index.html', original.replace(/\r?\n/g, '\r\n'));
  await unchanged(() => useComponents({ dir, names: ['code'] }));
  write('index.html', original);
  const configFile = 'agentdeck/agentdeck.json';
  const config = read(configFile);
  write(configFile, JSON.stringify({ ...JSON.parse(config), contract: 1 }));
  await unchanged(() => assert.rejects(useComponents({ dir, names: ['cards'] }), /契約版本不同/));
  write(configFile, config);
}
