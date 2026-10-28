// 既有 vendor 下載／驗證流程，供 vendor、pack 與 use 共用。
import fs from 'node:fs';
import path from 'node:path';
import { fail, exists, readJson, inside, sha256 } from './util.mjs';
import { upstreamVendor, READER_VENDOR } from './registry.mjs';

export async function downloadVendor(args, opts, ws, log = () => {}) {
  const manifest = readJson(path.join(ws.fw, 'vendor.json'));
  // 舊工作區更新核心後也能取得匯出依賴，不改寫其 vendor.json。
  if (exists(path.join(ws.fw, 'assets/story-reader/export.js'))) {
    manifest.packages = { ...Object.fromEntries(READER_VENDOR.map(name => [name, upstreamVendor().packages[name]])), ...manifest.packages };
  }
  const all = Object.keys(manifest.packages ?? {});
  const names = args.length ? args : all;
  let failed = 0;
  const errors = [];
  for (const name of names) {
    const p = manifest.packages?.[name];
    if (!p) { errors.push(`[${name}] vendor.json 沒有這個套件`); log(errors.at(-1)); failed++; continue; }
    const dir = path.join(ws.fw, 'vendor', name);
    for (const f of p.files) {
      const dest = path.resolve(dir, f.path);
      if (!inside(dir, dest)) fail(`[${name}] path 不可跳出套件資料夾：${f.path}`);
      const label = `[${name}@${p.version}] ${f.path}`;
      const want = String(f.sha256 ?? '').toUpperCase();
      if (!opts.force && exists(dest) && want && sha256(fs.readFileSync(dest)) === want) { log(`${label} 已就緒`); continue; }
      if (opts.check) { errors.push(`${label} 缺少或雜湊不符`); log(errors.at(-1)); failed++; continue; }
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
        errors.push(`${label} 失敗：${e.message}`);
        log(errors.at(-1));
        failed++;
      }
    }
  }
  if (failed) fail(`有 ${failed} 個檔案未就緒\n${errors.join('\n')}`);
  log('套件全部就緒');
  return { packages: names };
}
