const assert=require('node:assert/strict');
const {cases,result}=require('./compute.js');
assert.equal(cases.length,3);
for(let i=0;i<3;i++)assert.notEqual(result(i,'before'),result(i,'after'));
assert.match(result(1,'after'),/拒絕空白/);assert.match(result(2,'after'),/讀回/);
assert.throws(()=>result(3,'after'));assert.throws(()=>result(0,'unknown'));
console.log('PASS: project-growth 預期結果與無效選項');
