'use strict';
// Look up a saved intervention result; changing controls never reruns the underlying system.
function intervene(c,part){
 if(!c||!Array.isArray(c.labels)||!c.labels.length||c.labels.some(l=>typeof l!=='string'||!l)||new Set(c.labels).size!==c.labels.length)throw Error('Expected unique labels');
 const scores=a=>Array.isArray(a)&&a.length===c.labels.length&&Array.from(a).every(x=>Number.isFinite(x)&&x>=0);
 if(!Array.isArray(c.input)||!c.input.length||!Array.from(c.input).every(Number.isFinite))throw Error('Expected numeric input parts');
 if(!Number.isFinite(c.fill))throw Error('Expected numeric fill value');
 if(!scores(c.before)||!Array.isArray(c.after)||c.after.length!==c.input.length||!Array.from(c.after).every(scores))throw Error('Expected one saved result per part');
 // Replacing a part with the value it already has changes nothing; its record must equal the original output.
 c.input.forEach((v,i)=>{if(v===c.fill&&c.after[i].some((x,j)=>x!==c.before[j]))throw Error(`Part ${i} already equals fill but its result differs`);});
 if(!Number.isInteger(part)||part<0||part>=c.input.length)throw Error('Unknown part');
 const top=a=>a.indexOf(Math.max(...a)),tracked=top(c.before),effect=i=>c.after[i][tracked]-c.before[tracked],next=top(c.after[part]);
 return {part,noop:c.input[part]===c.fill,tracked:c.labels[tracked],before:c.before[tracked],after:c.after[part][tracked],delta:effect(part),
  topAfter:c.labels[next],flipped:next!==tracked,scores:c.labels.map((label,i)=>({label,before:c.before[i],after:c.after[part][i]})),
  ranking:c.input.map((v,i)=>({part:i,delta:effect(i),noop:v===c.fill})).sort((a,b)=>a.noop-b.noop||a.delta-b.delta||a.part-b.part)};
}
if(typeof module!=='undefined')module.exports=intervene;
