// node examples/check.cjs [example-directory]; works against an exported workspace too.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(process.argv[2]||__dirname);
process.stdout.write(execFileSync(process.execPath,[path.join(root,'check-patterns.cjs')]));
for(const name of ['resolution-comparison','threshold-consensus','weighted-ranking','case-replay','intervention-replay'])execFileSync(process.execPath,['--check',path.join(root,name,'demo.js')]);
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory()){scan(file);continue;}if(!/\.(html|md)$/.test(e.name))continue;
 const text=fs.readFileSync(file,'utf8');
 const refs=e.name.endsWith('.html')?[...text.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]):[...text.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]);
 for(const ref of refs){if(/^(?:[a-z]+:|#)/i.test(ref))continue;const target=ref.split(/[?#]/)[0];assert.ok(fs.existsSync(path.resolve(dir,target)),`${file}: missing ${ref}`);assert.ok(!target.includes('playground/'),`${file}: runtime reference to playground`);}
}}
scan(root);console.log('PASS: example HTML and Markdown references');
