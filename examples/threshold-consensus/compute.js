'use strict';
function consensus(series,selected,threshold,rule){
 if(!Array.isArray(series)||!series.length||!series[0].values?.length)throw Error('Expected non-empty series');
 const n=series[0].values.length,ids=new Set(series.map(s=>s.id));
 if(ids.size!==series.length||!series.every(s=>typeof s.id==='string'&&Array.isArray(s.values)&&s.values.length===n&&s.values.every(v=>Number.isFinite(v)&&v>=0&&v<=1)))throw Error('Expected aligned values in [0,1] and unique IDs');
 if(!Array.isArray(selected)||new Set(selected).size!==selected.length||selected.some(id=>!ids.has(id))||!Number.isFinite(threshold)||threshold<0||threshold>1||!['majority','all','any'].includes(rule))throw Error('Invalid selection, threshold or rule');
 const active=series.filter(s=>selected.includes(s.id)),count=active.length;
 const required=count?(rule==='all'?count:rule==='any'?1:Math.floor(count/2)+1):null;
 const votes=Array.from({length:n},(_,i)=>active.reduce((sum,s)=>sum+Number(s.values[i]>=threshold),0));
 return {votes,required,pass:votes.map(v=>required!==null&&v>=required)};
}
if(typeof module!=='undefined')module.exports=consensus;
