'use strict';
const cases=[
 {id:'case-a',label:'案例 A',variants:[
  {id:'baseline',label:'基線',values:[2,8,4,1],timeMs:100},
  {id:'setting-a',label:'設定 A',values:[2,5,3,1],timeMs:75},
  {id:'setting-b',label:'設定 B',values:[1,4,6,2],timeMs:60}
 ]},
 {id:'case-b',label:'案例 B',variants:[
  {id:'baseline',label:'基線',values:[6,2,7,3],timeMs:80},
  {id:'setting-a',label:'設定 A',values:[5,2,6,3],timeMs:90},
  {id:'setting-b',label:'設定 B',values:[4,3,8,2],timeMs:65}
 ]}
];
const caseSelect=document.getElementById('case'),variantSelect=document.getElementById('variant');
function values(row){return `<table class="ex-matrix"><caption>相同四個位置，固定色階 0–10</caption><thead><tr>${row.values.map((_,i)=>`<th>位置 ${i+1}</th>`).join('')}</tr></thead><tbody><tr>${row.values.map(v=>`<td style="background:rgba(22,104,88,${.08+.6*v/10})">${v}</td>`).join('')}</tr></tbody></table>`;}
function render(){
 const r=replay(cases,caseSelect.value,variantSelect.value),delta=r.deltaMs;
 document.getElementById('reference').innerHTML=values(r.baseline);
 document.getElementById('result').innerHTML=values(r.result);
 document.getElementById('reference-time').textContent=`${r.baseline.timeMs} ms`;
 document.getElementById('result-time').textContent=`${r.result.timeMs} ms`;
 document.getElementById('result-title').textContent=`${caseSelect.selectedOptions[0].textContent} / ${r.result.label}`;
 document.getElementById('summary').textContent=`耗時差：${delta>0?'+':''}${delta} ms（結果減基線）。切換案例後，兩側都使用 ${r.caseId} 的紀錄。`;
 document.getElementById('evidence').textContent=r.evidenceRefs.join(' ↔ ');
 document.getElementById('export-preview').textContent=JSON.stringify({mode:'precomputed_demo',source:'人工示範資料',...r},null,2);
}
caseSelect.addEventListener('change',render);variantSelect.addEventListener('change',render);
document.getElementById('reset').addEventListener('click',()=>{caseSelect.value='case-a';variantSelect.value='setting-a';render();});
render();
