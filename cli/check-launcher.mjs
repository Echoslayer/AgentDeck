import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { UP, writeJson, writeText } from './lib/util.mjs';

export function checkLauncher(tmp) {
  const call = (cwd, command) => spawnSync(process.execPath, [path.join(UP, 'cli/agentdeck.mjs'), command], { cwd, encoding: 'utf8' });
  const key = 'node_modules/agentdeck';
  for (const id of ['a', 'b']) {
    const host = path.join(tmp, 'host & ' + id), book = path.join(host, '書 ' + id);
    const branch = path.join(book, 'branches', 'lec01');
    fs.mkdirSync(branch, { recursive: true });
    writeJson(path.join(book, 'agentdeck/agentdeck.json'), { contract: 2 });
    writeText(path.join(book, 'index.html'), 'entry');
    const url = 'https://codeload.github.com/Echoslayer/AgentDeck/tar.gz/' + id.repeat(40);
    const dep = { resolved: url, integrity: 'sha512-' + Buffer.alloc(64, id).toString('base64') };
    const manifest = { dependencies: { agentdeck: url } };
    const lock = { lockfileVersion: 3, packages: { '': manifest, [key]: dep } };
    writeJson(path.join(host, 'package.json'), manifest);
    writeJson(path.join(host, 'package-lock.json'), lock);
    const absent = call(branch, 'inspect');
    assert.notEqual(absent.status, 0);
    assert.match(absent.stderr, /尚未安裝/);
    assert.ok(!fs.existsSync(path.join(host, 'node_modules')));
    const receipt = path.join(host, 'node_modules/.package-lock.json');
    writeJson(receipt, { packages: { [key]: { ...dep, integrity: 'stale' } } });
    writeJson(path.join(host, key, 'package.json'), { name: 'agentdeck' });
    for (const command of ['inspect', 'build']) {
      const stale = call(branch, command);
      assert.notEqual(stale.status, 0);
      assert.match(stale.stderr, /安裝與鎖檔不符/);
    }
    writeJson(receipt, lock);
    assert.match(call(branch, 'build').stderr, /鎖版缺少/);
    const script = path.join(host, key, 'templates/host/build.mjs');
    writeText(script, `console.log(JSON.stringify([${JSON.stringify(id)}, ...process.argv.slice(2)]))`);
    const built = call(branch, 'build'), inspected = call(book, 'inspect');
    assert.equal(built.status, 0, built.stderr);
    assert.ok(built.stdout.includes(JSON.stringify([id, path.basename(book)])));
    assert.ok(built.stdout.includes(path.join(book, 'index.html')));
    assert.equal(inspected.status, 0, inspected.stderr);
    assert.deepEqual(JSON.parse(inspected.stdout), [id, path.basename(book), '--inspect']);
    writeText(script, 'process.exit(7)');
    assert.equal(call(book, 'build').status, 7);
    writeJson(path.join(host, 'package.json'), { dependencies: { agentdeck: 'latest' } });
    assert.match(call(book, 'inspect').stderr, /完整 commit/);
  }
}
