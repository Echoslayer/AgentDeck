'use strict';
const graph=document.querySelector('#graph');
graph.innerHTML=deck.evolution('todo',{
 nodes:[{id:'input',label:'接收輸入',since:0,text:'記憶體中的待辦'},{id:'validate',label:'檢查空白',since:1,text:'有效待辦'},{id:'save',label:'保存與讀回',since:2,text:'重啟後仍在'}],
 edges:[{from:'input',to:'validate'},{from:'validate',to:'save'}],
 stages:[{title:'先能輸入',reason:'從沒有待辦，到記憶體中有一筆資料。'},{title:'拒絕無效資料',reason:'前一版連空白也會收下，必須補上驗證。'},{title:'跨重啟保留',reason:'記憶體會消失，必須保存並在啟動時讀回。'}]
});
let step=0,revealed=false;
const version=document.querySelector('#version');
function render(){document.querySelector('#task').textContent=growthExample.cases[step].task;document.querySelector('#result').textContent=revealed?growthExample.result(step,version.value):'先預測這一版的結果，再揭曉。';}
graph.addEventListener('deck:evolution',e=>{step=e.detail.step;revealed=false;version.value='before';render();});
version.addEventListener('change',render);
document.querySelector('#reveal').addEventListener('click',()=>{revealed=true;render();});
document.dispatchEvent(new CustomEvent('story:render',{detail:{root:graph}}));
render();
