'use strict';
function rank(items,weights,max){
 if(!Array.isArray(weights)||!weights.length||!weights.every(w=>Number.isFinite(w)&&w>=0)||!Number.isFinite(max)||max<=0)throw Error('Invalid weights or score maximum');
 if(!Array.isArray(items)||!items.length||new Set(items.map(item=>item.id)).size!==items.length||!items.every(item=>typeof item.id==='string'&&Array.isArray(item.scores)&&item.scores.length===weights.length&&item.scores.every(v=>Number.isFinite(v)&&v>=0&&v<=max)))throw Error('Invalid item IDs or aligned scores');
 const sum=weights.reduce((a,b)=>a+b,0),normalized=weights.map(w=>sum?w/sum:0);
 const rows=items.map(item=>{const contributions=item.scores.map((v,i)=>v*normalized[i]);return {...item,contributions,total:sum?contributions.reduce((a,b)=>a+b,0):null};}).sort((a,b)=>(b.total??0)-(a.total??0));
 return {normalized,rows};
}
if(typeof module!=='undefined')module.exports=rank;
