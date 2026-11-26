import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { exists, fail, inside, readJson } from './util.mjs';

const installArgs = ['ci', '--omit=optional', '--ignore-scripts', '--no-audit', '--no-fund'];
const archive = /^https:\/\/codeload\.github\.com\/[\w.-]+\/[\w.-]+\/tar\.gz\/[0-9a-f]{40}$/i;

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) fail(`啟動失敗：${result.error.message}`);
  return result.status ?? 1;
}

function install(host) {
  const args = [...installArgs, '--prefix', host];
  if (process.platform !== 'win32') return run('npm', args, host);
  // npm.cmd needs a shell. Launch npm's JS entry with Node so host paths remain literal arguments.
  const dirs = [path.dirname(process.execPath), ...(process.env.PATH ?? '').split(path.delimiter)];
  const cli = dirs.filter(d => path.isAbsolute(d)).map(d => path.join(d, 'node_modules/npm/bin/npm-cli.js')).find(exists);
  if (!cli) fail(`找不到 npm。請在 ${host} 執行 npm ${installArgs.join(' ')}。`);
  return run(process.execPath, [cli, ...args], host);
}

export function launchBook(command, root) {
  const book = fs.realpathSync(root);
  const host = path.dirname(book);
  const manifest = path.join(host, 'package.json'), lockFile = path.join(host, 'package-lock.json');
  if (!exists(manifest) || !exists(lockFile)) fail(`書的父目錄需要 package.json 與 package-lock.json：${host}`);
  const spec = readJson(manifest).dependencies?.agentdeck;
  const lock = readJson(lockFile);
  const key = 'node_modules/agentdeck', pin = lock.packages?.[key];
  if (lock.lockfileVersion !== 3 || !archive.test(spec) || pin?.resolved !== spec ||
      lock.packages?.['']?.dependencies?.agentdeck !== spec || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(pin?.integrity ?? '')) {
    fail(`請核對 ${manifest} 與 ${lockFile} 的 AgentDeck 完整 commit 網址及 integrity。`);
  }
  const modules = path.join(host, 'node_modules');
  const repair = `請在 ${host} 執行 npm ${installArgs.join(' ')}。`;
  if (!fs.lstatSync(modules, { throwIfNoEntry: false })) {
    if (command === 'inspect') fail(`尚未安裝 AgentDeck。${repair}`);
    // Claim an absent install directory before npm ci, which clears an existing one.
    fs.mkdirSync(modules);
    const code = install(host);
    if (code) { console.error(`npm ci 失敗。請依 npm 訊息核對鎖檔或下載來源。${repair}`); return code; }
  }
  const pkg = path.join(host, key);
  const receipt = path.join(modules, '.package-lock.json');
  const installed = exists(receipt) && readJson(receipt).packages?.[key];
  if (installed?.resolved !== spec || installed?.integrity !== pin.integrity || !exists(path.join(pkg, 'package.json'))) {
    fail(`宿主的 AgentDeck 安裝與鎖檔不符。${repair}`);
  }
  const script = path.join(pkg, 'templates/host/build.mjs');
  if (!exists(script)) fail(`這個鎖版缺少 ${script}，請更新宿主鎖版，或使用宿主原有的 deck:build 指令。`);
  if (path.relative(pkg, fs.realpathSync(pkg)) || !inside(pkg, fs.realpathSync(script))) fail(`腳本必須在宿主安裝的套件內：${pkg}`);
  const code = run(process.execPath, [script, path.basename(book), ...(command === 'inspect' ? ['--inspect'] : [])], host);
  if (!code && command === 'build') {
    const entry = path.join(book, 'index.html');
    if (!fs.statSync(entry, { throwIfNoEntry: false })?.isFile()) fail(`框架已還原，找不到簡報入口：${entry}`);
    console.log(`簡報入口：${entry}`);
  }
  return code;
}
