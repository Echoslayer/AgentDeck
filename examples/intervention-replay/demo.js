'use strict';
const cases=[
 {id:'case-a',label:'案例 A',labels:['甲','乙','丙'],fill:0,input:[2,5,1,6,9,4,0,7,3],before:[55,30,15],after:[
  [52,32,16],[44,38,18],[54,31,15],[47,36,17],[28,52,20],[50,33,17],[55,30,15],[40,41,19],[53,31,16]]},
 {id:'case-b',label:'案例 B',labels:['甲','乙','丙'],fill:0,input:[8,3,0,4,2,5,6,0,7],before:[20,62,18],after:[
  [30,48,22],[21,60,19],[20,62,18],[22,57,21],[18,66,16],[24,55,21],[27,50,23],[20,62,18],[33,40,27]]}
];
const START={caseId:'case-a',part:4};
const caseSelect=document.getElementById('case'),partsHost=document.getElementById('parts');
let part=START.part;
const current=()=>cases.find(c=>c.id===caseSelect.value);
const signed=x=>`${x>0?'+':x<0?'−':'±'}${Math.abs(x)}`;
const name=i=>`區塊 ${i+1}`;
function render(){
 const c=current(),r=intervene(c,part);
 partsHost.innerHTML=c.input.map((v,i)=>`<button type="button" class="ex-cell" data-part="${i}" aria-pressed="${i===part}" style="background:${i===part?'#2b2f2d':`rgba(22,104,88,${.08+.6*v/10})`};color:${i===part?'white':'#10251d'}"><strong>${i===part?c.fill:v}</strong><small>${name(i)}${i===part?' 已替換':''}</small></button>`).join('');
 document.getElementById('scores').innerHTML=`<table><caption>各輸出分數（替換前 → 後）</caption><thead><tr><th>輸出</th><th>替換前</th><th>替換後</th><th>變化</th></tr></thead><tbody>${r.scores.map(s=>`<tr><th>${s.label}${s.label===r.tracked?'（追蹤）':''}</th><td>${s.before}</td><td>${s.after}</td><td>${signed(s.after-s.before)}</td></tr>`).join('')}</tbody></table>`;
 document.getElementById('summary').textContent=r.noop
  ?`${name(part)} 原本就等於替換值 ${c.fill}，這次替換沒有改變輸入：結果相同只代表「沒測到」，不代表此區塊不重要。`
  :`把 ${name(part)} 換成 ${c.fill} 後，原最高輸出「${r.tracked}」${r.before} → ${r.after}（${signed(r.delta)}）；最高輸出${r.flipped?`改為「${r.topAfter}」`:'不變'}。`;
 document.getElementById('ranking').innerHTML=r.ranking.map(x=>`<li${x.part===part?' aria-current="true" style="font-weight:bold"':''}>${name(x.part)}：${x.noop?'未測（輸入已等於替換值）':signed(x.delta)}</li>`).join('');
 document.getElementById('export-preview').textContent=JSON.stringify({mode:'precomputed_demo',source:'人工示範資料',caseId:c.id,fill:c.fill,...r},null,2);
}
caseSelect.addEventListener('change',render);
partsHost.addEventListener('click',e=>{const b=e.target.closest('[data-part]');if(b){part=Number(b.dataset.part);render();}});
document.getElementById('reset').addEventListener('click',()=>{caseSelect.value=START.caseId;part=START.part;render();});
render();
