'use strict';
// Select saved results; changing controls never runs the underlying experiment.
function replay(cases,caseId,variantId){
 if(!Array.isArray(cases)||!cases.length)throw Error('Expected non-empty cases');
 const ids=new Set();
 for(const c of cases){
  if(!c||typeof c.id!=='string'||!c.id||ids.has(c.id))throw Error('Expected unique case IDs');
  ids.add(c.id);
  if(!Array.isArray(c.variants)||!c.variants.length)throw Error('Expected saved variants');
  const variants=new Set(),width=c.variants[0]?.values?.length;
  for(const v of c.variants){
   if(!v||typeof v.id!=='string'||!v.id||variants.has(v.id))throw Error('Expected unique variant IDs');
   variants.add(v.id);
   if(!Array.isArray(v.values)||!width||v.values.length!==width||!Array.from(v.values).every(x=>Number.isFinite(x)&&x>=0&&x<=10))throw Error('Expected aligned values in [0,10]');
   if(!Number.isFinite(v.timeMs)||v.timeMs<0)throw Error('Expected non-negative milliseconds');
  }
  if(!variants.has('baseline'))throw Error('Expected baseline variant');
 }
 const c=cases.find(c=>c.id===caseId);
 if(!c)throw Error('Unknown case ID');
 const baseline=c.variants.find(v=>v.id==='baseline'),result=c.variants.find(v=>v.id===variantId);
 if(!result)throw Error('Unknown variant ID');
 return {caseId:c.id,variantId:result.id,baseline,result,deltaMs:result.timeMs-baseline.timeMs,
  evidenceRefs:[`${c.id}/${baseline.id}`,`${c.id}/${result.id}`]};
}
if(typeof module!=='undefined')module.exports=replay;
