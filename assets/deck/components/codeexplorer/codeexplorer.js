/* codeexplorer：作者整理的程式關係、解說與原始碼同步探索。 */
'use strict';
(() => {
const saved=new Map();
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function prepare(input,options={}){
 const fail=message=>{throw Error('deck.codeexplorer: '+message)};
 if(!input||!input.sources?.files||!input.nodes||!input.routes)fail('需要 sources.files、nodes、routes');
 const model=JSON.parse(JSON.stringify(input));
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 if(!Object.keys(model.nodes).length||!Object.keys(model.routes).length)fail('nodes 與 routes 不可為空');
 for(const [file,src] of Object.entries(model.sources.files)){
  if(!file||!Array.isArray(src.lines)||!src.lines.length||src.lines.some(l=>typeof l!=='string')||typeof src.sha!=='string'||!src.sha)fail('來源需 lines 字串陣列與 sha 版本識別');
  if(src.lang!==undefined&&typeof src.lang!=='string')fail('lang 需字串');
 }
 for(const [id,n] of Object.entries(model.nodes)){
  if(!/^[a-zA-Z0-9_-]+$/.test(id)||!own(model.sources.files,n.file))fail('節點 id 或 file 無效');
  for(const field of ['title','symbol','what','input','output','note'])if(typeof n[field]!=='string')fail('節點需字串 '+field);
  if(!Array.isArray(n.ranges)||!n.ranges.length)fail('節點需要 ranges');
  const seen=[];for(const r of n.ranges){if(!Array.isArray(r)||r.length!==2||!r.every(Number.isInteger)||r[0]<1||r[1]<r[0]||r[1]>model.sources.files[n.file].lines.length||seen.some(([a,b])=>r[0]<=b&&r[1]>=a))fail('ranges 需不重疊、位於來源內');seen.push(r)}
 }
 model.edges??=[];model.explanations??={};
 if(!Array.isArray(model.edges))fail('edges 需陣列');
 for(const e of model.edges)if(!Array.isArray(e)||e.length!==4||!own(model.nodes,e[0])||!own(model.nodes,e[1])||typeof e[2]!=='string'||typeof e[3]!=='string')fail('edges 需 [from,to,關係,證據]');
 for(const [id,r] of Object.entries(model.routes))if(!/^[a-zA-Z0-9_-]+$/.test(id)||typeof r.name!=='string'||!Array.isArray(r.ids)||!r.ids.length||r.ids.some(n=>!own(model.nodes,n)))fail('閱讀路線無效');
 for(const [file,notes] of Object.entries(model.explanations)){
  if(!own(model.sources.files,file)||!notes||typeof notes!=='object')fail('解說檔案無效');
  for(const [line,text] of Object.entries(notes))if(!/^[1-9][0-9]*$/.test(line)||Number(line)>model.sources.files[file].lines.length||typeof text!=='string')fail('解說行號或文字無效');
 }
 const opts={start:options.start||Object.keys(model.nodes)[0],route:options.route||Object.keys(model.routes)[0],notesKey:options.notesKey||''};
 if(!own(model.nodes,opts.start)||!own(model.routes,opts.route)||typeof opts.notesKey!=='string')fail('start、route 或 notesKey 無效');
 return {model,options:opts};
}
function context(model,options,key){
const codeSources=model.sources,cxNodes=model.nodes,cxEdges=model.edges,cxRoutes=model.routes,cxExplanations=model.explanations;
const cxEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 整檔解析保留跨行註解狀態，再拆成原始行號；不改寫來源格式。
const cxColored = new Map();
function cxSourceLines(file) {
 if(cxColored.has(file))return cxColored.get(file);
 const source=codeSources.files[file].lines;
 if(!window.hljs?.getLanguage(codeSources.files[file].lang || 'cpp'))return source.map(cxEsc);
 const holder=document.createElement('div'),lines=[''];
 holder.innerHTML=hljs.highlight(source.join('\n'),{language:codeSources.files[file].lang || 'cpp'}).value;
 function walk(node,classes=[]){
  if(node.nodeType===3)node.textContent.split('\n').forEach((part,i)=>{
   if(i)lines.push('');
   lines[lines.length-1]+=classes.reduceRight((text,c)=>`<span class="${cxEsc(c)}">${text}</span>`,cxEsc(part));
  });
  else for(const child of node.childNodes)walk(child,node.className?[...classes,node.className]:classes);
 }
 walk(holder);cxColored.set(file,lines);return lines;
}
const cxButton=(id,label)=>`<button type="button" data-node="${id}">${cxEsc(label||cxNodes[id].title)}</button>`;
const cxBlockCache=new Map();
function cxBlocks(file){
 if(cxBlockCache.has(file))return cxBlockCache.get(file);
 if(!window.hljs?.getLanguage(codeSources.files[file].lang || 'cpp'))return [];
 const holder=document.createElement('div');
 holder.innerHTML=hljs.highlight(codeSources.files[file].lines.join('\n'),{language:codeSources.files[file].lang || 'cpp'}).value;
 // 先遮掉字串與註解，避免其中的括號被當成程式區塊。
 holder.querySelectorAll('.hljs-comment,.hljs-string,.hljs-char').forEach(el=>{el.textContent=el.textContent.replace(/[^\n]/g,' ')});
 const stack=[],blocks=[];let line=1;
 for(const c of holder.textContent){if(c==='\n')line++;else if(c==='{')stack.push(line);else if(c==='}'&&stack.length){const start=stack.pop();if(line>start)blocks.push({start,end:line})}}
 const result=blocks.filter(b=>!blocks.some(other=>other.start===b.start&&other.end>b.end)).sort((a,b)=>a.start-b.start);
 cxBlockCache.set(file,result);return result;
}
function cxMount(root,state){
 const el=root;
 const implementation=el.querySelector('.deck-codeexplorer-implementation');
 const expandDialog=document.createElement('dialog');expandDialog.className='deck-codeexplorer-expanded';expandDialog.setAttribute('aria-label','放大代碼區');
 const placeholder=document.createComment('code pane');implementation.before(placeholder);el.append(expandDialog);
 function restoreCode(){placeholder.after(implementation);implementation.querySelector('[data-expand]').textContent='放大代碼區';implementation.querySelector('[data-expand]').setAttribute('aria-expanded','false')}
 const onExpandClose=()=>{if(!expandDialog.open)restoreCode()};
 expandDialog.addEventListener('close',onExpandClose);
 const storageKey=options.notesKey;
 function validNotes(value){
  if(!Array.isArray(value)||value.length>10000)throw Error('註解格式不正確');
  const keys=new Set();
  for(const n of value){const src=n&&codeSources.files[n.file];
   if(!src||n.sha!==src.sha||!Number.isInteger(n.line)||n.line<1||n.line>src.lines.length||typeof n.text!=='string'||n.text.length>10000)throw Error('註解來源版本、行號或內容不符，未匯入。');
   const key=n.file+':'+n.line;if(keys.has(key))throw Error('註解行號重複，未匯入。');keys.add(key);
  }return value;
 }
 let storageMessage='註解暫存於此瀏覽器；請匯出 JSON 備份。';
 if(!state.notes){try{state.notes=validNotes(JSON.parse(storageKey ? localStorage.getItem(storageKey)||'[]' : '[]'))}catch{state.notes=[];storageMessage='未載入瀏覽器註解；可匯入備份。'}}
 const noteFor=(file,line)=>state.notes.find(n=>n.file===file&&n.line===line);
 const status=()=>{el.querySelector('.deck-codeexplorer-note-status').textContent=`${state.notes.length} 則逐行註解 · ${storageMessage}`};
 function persist(){try{localStorage.setItem(storageKey,JSON.stringify(state.notes));storageMessage='已暫存於此瀏覽器；請匯出 JSON 備份。'}catch{storageMessage='瀏覽器無法保存，請立即匯出 JSON；重新整理會遺失。'}status()}
 const dialog=el.querySelector('.deck-codeexplorer-note-dialog'),textarea=dialog.querySelector('textarea');
 let selected=null;
 function editNote(line){const file=cxNodes[state.id].file;selected={file,line,sha:codeSources.files[file].sha};dialog.querySelector('h3').textContent=file+' · L'+line;dialog.querySelector('pre').textContent=codeSources.files[file].lines[line-1];textarea.value=noteFor(file,line)?.text||'';dialog.showModal();textarea.focus()}
 state.id??=options.start;state.route??=options.route;state.history??=[options.start];state.cursor??=0;state.full??=false;state.folded??={};
 function go(id){if(!cxNodes[id]||state.id===id)return;state.history=state.history.slice(0,state.cursor+1);state.history.push(id);state.cursor++;state.id=id;draw();}
 function draw(){
  const n=cxNodes[state.id],src=codeSources.files[n.file],route=cxRoutes[state.route];
  el.querySelector('.deck-codeexplorer-route').innerHTML=Object.entries(cxRoutes).map(([id,r])=>`<button type="button" data-route="${id}" aria-pressed="${state.route===id}">${cxEsc(r.name)}</button>`).join('');
  el.querySelector('.deck-codeexplorer-map').innerHTML=route.ids.map((id,i)=>`<div>${i?'<span class="deck-codeexplorer-arrow">→</span>':''}<button type="button" data-node="${id}" aria-current="${state.id===id}"><small>${i+1} · ${cxNodes[id].file===cxNodes[options.start].file?'本檔':'跨檔'}</small>${cxEsc(cxNodes[id].title)}</button></div>`).join('');
  el.querySelector('.deck-codeexplorer-back').disabled=state.cursor===0;el.querySelector('.deck-codeexplorer-forward').disabled=state.cursor===state.history.length-1;
  el.querySelector('.deck-codeexplorer-history').textContent=state.history.slice(0,state.cursor+1).map(id=>cxNodes[id].symbol.split(' / ')[0]).join(' › ');
  el.querySelector('.deck-codeexplorer-concept').innerHTML=`<small>${cxEsc(n.file)}</small><h2>${cxEsc(n.title)}</h2><code>${cxEsc(n.symbol)}</code><p>${cxEsc(n.what)}</p><div class="deck-codeexplorer-transform"><div><b>輸入</b><p>${cxEsc(n.input)}</p></div><span>↓</span><div><b>交出去的東西</b><p>${cxEsc(n.output)}</p></div></div><p class="deck-codeexplorer-note">${cxEsc(n.note)}</p>`;
  const incoming=cxEdges.filter(e=>e[1]===state.id),outgoing=cxEdges.filter(e=>e[0]===state.id);
  el.querySelector('.deck-codeexplorer-relations').innerHTML=`<h3>從哪裡來</h3>${incoming.map(e=>edge(e,e[0])).join('')||'<p>本候選未再展開上游。</p>'}<h3>接著可以追</h3>${outgoing.map(e=>edge(e,e[1])).join('')}<details><summary>本候選全部節點</summary>${Object.keys(cxNodes).map(id=>cxButton(id)).join('')}</details>`;
  el.querySelector('.deck-codeexplorer-source-title').textContent=n.file+' · '+(state.full?'整檔上下文':n.ranges.map(r=>'L'+r.join('–')).join(' / '));
  el.querySelector('[data-explain]').setAttribute('aria-pressed',String(state.explain!==false));
  el.querySelector('[data-explain]').textContent=state.explain!==false?'解說註解：開':'解說註解：關';
  el.querySelector('[data-full]').setAttribute('aria-pressed',String(state.full));
  const ranges=state.full?[[1,src.lines.length]]:n.ranges;
  const colored=cxSourceLines(n.file);
  const blocks=cxBlocks(n.file),folded=state.folded[n.file]??=[];
  el.querySelector('.deck-codeexplorer-code').innerHTML=ranges.map(([a,b])=>`<div class="deck-codeexplorer-excerpt">${src.lines.slice(a-1,b).map((line,i)=>{const num=a+i;if(blocks.some(block=>folded.includes(block.start)&&block.start>=a&&block.start<num&&num<=block.end))return '';const block=blocks.find(block=>block.start===num&&num<b),closed=block&&folded.includes(num);const targets=Object.entries(cxNodes).filter(([id,x])=>id!==state.id&&x.file===n.file&&x.ranges.some(([lo,hi])=>num===lo));return `${state.explain!==false&&cxExplanations[n.file]?.[num]?`<div class="deck-codeexplorer-author-comment"><span>${cxEsc(cxExplanations[n.file][num])}</span></div>`:""}<div class="deck-codeexplorer-line${n.ranges.some(([lo,hi])=>num>=lo&&num<=hi)?' deck-codeexplorer-relevant':''}" data-line="${num}"><button type="button" class="deck-codeexplorer-line-number" data-annotate="${num}" aria-label="L${num} 註解" title="${cxEsc(noteFor(n.file,num)?.text||(storageKey?'點擊新增註解':'原始行號'))}">${num}${noteFor(n.file,num)?' ●':''}</button>${block?`<button type="button" class="deck-codeexplorer-fold" data-fold="${num}" aria-expanded="${!closed}" aria-label="${closed?'展開':'收合'} L${num}–${block.end}">${closed?'▸':'▾'}</button>`:'<span class="deck-codeexplorer-fold-space"></span>'}<code>${colored[num-1]||' '}</code>${closed?`<button type="button" class="deck-codeexplorer-fold-summary" data-fold="${num}">⋯ L${num+1}–${Math.min(block.end,b)} 已收合${block.end>b?'（片段內）':''}</button>`:''}${targets.map(([id])=>cxButton(id,'追這段 ↗')).join('')}${noteFor(n.file,num)?`<button type="button" class="deck-codeexplorer-inline-note" data-annotate="${num}">${cxEsc(noteFor(n.file,num).text)}</button>`:''}</div>`}).join('')}</div>`).join('<div class="deck-codeexplorer-omitted">⋯ 中間原始碼省略；可切換整檔上下文 ⋯</div>');
  el.querySelector('.deck-codeexplorer-source-links').innerHTML=outgoing.map(e=>`<div><small>${cxEsc(e[2]+' · '+e[3])}</small>${cxButton(e[1],'↗ '+cxNodes[e[1]].symbol)}</div>`).join('');
  el.querySelector('.deck-codeexplorer-sha').textContent='來源快照 '+(codeSources.date||'')+' · 版本 '+src.sha.slice(0,16)+' · 靜態閱讀，未執行來源程式';
  const pane=el.querySelector('.deck-codeexplorer-code');pane.scrollTop=0;
  if(state.full){const line=pane.querySelector(`[data-line="${n.ranges[0][0]}"]`);if(line)pane.scrollTop=line.offsetTop-pane.offsetTop;}
 }
 function edge(e,id){return `<div class="deck-codeexplorer-edge"><span>${cxEsc(e[2])}</span>${cxButton(id)}<small>${cxEsc(e[3])}</small></div>`}
 function refreshNotes(){const pane=el.querySelector('.deck-codeexplorer-code'),y=pane.scrollTop,x=pane.scrollLeft;draw();pane.scrollTop=y;pane.scrollLeft=x;status()}
 function click(e){const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-expand')){if(expandDialog.open){expandDialog.close();restoreCode()}else{expandDialog.append(implementation);expandDialog.showModal();b.textContent='還原代碼區';b.setAttribute('aria-expanded','true');b.focus()}return}
  if(b.hasAttribute('data-fold')){const file=cxNodes[state.id].file,start=Number(b.dataset.fold),list=state.folded[file]??=[];state.folded[file]=list.includes(start)?list.filter(x=>x!==start):[...list,start];refreshNotes();return}
  if(b.hasAttribute('data-fold-all')){const n=cxNodes[state.id];state.folded[n.file]=b.dataset.foldAll==='close'?cxBlocks(n.file).filter(block=>state.full||n.ranges.some(([a,z])=>block.start>=a&&block.start<z)).map(block=>block.start):[];refreshNotes();return}
  if(b.hasAttribute('data-explain')){state.explain=state.explain===false;refreshNotes();return}
  if(b.dataset.annotate){if(!storageKey)return;editNote(Number(b.dataset.annotate));return}
  if(b.hasAttribute('data-note-cancel')){dialog.close();return}
  if(b.hasAttribute('data-note-save')){state.notes=state.notes.filter(n=>n.file!==selected.file||n.line!==selected.line);if(textarea.value.trim())state.notes.push({...selected,text:textarea.value});persist();dialog.close();refreshNotes();return}
  if(b.hasAttribute('data-note-export')){const blob=new Blob([JSON.stringify({version:1,notes:state.notes},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='codeexplorer-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return}
  if(b.hasAttribute('data-note-import')){el.querySelector('[data-note-file]').click();return}
  if(b.dataset.node)go(b.dataset.node);else if(b.dataset.route){state.route=b.dataset.route;draw()}else if(b.hasAttribute('data-full')){state.full=!state.full;draw()}else if(b.hasAttribute('data-history')){state.cursor+=Number(b.dataset.history);state.id=state.history[state.cursor];draw()}}
 async function importNotes(e){const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('檔案超過 2 MB');const data=JSON.parse(await file.text());if(data.version!==1)throw Error('註解版本不符');const incoming=validNotes(data.notes);const conflicts=incoming.filter(n=>{const old=noteFor(n.file,n.line);return old&&old.text!==n.text});if(conflicts.length)throw Error(`${conflicts.length} 行已有不同註解，未匯入；請先匯出目前筆記再整理。`);state.notes=[...state.notes,...incoming.filter(n=>!noteFor(n.file,n.line))];persist();refreshNotes()}catch(err){storageMessage=err.message;status()}finally{e.target.value=''}}
 const key=e=>{if(e.target.closest('button,summary,textarea,dialog'))e.stopPropagation()};
 el.querySelector('.deck-codeexplorer-note-tools').hidden=!storageKey;
 el.addEventListener('click',click);el.addEventListener('keydown',key);el.querySelector('[data-note-file]').addEventListener('change',importNotes);draw();status();
 return()=>{expandDialog.close();restoreCode();expandDialog.removeEventListener("close",onExpandClose);expandDialog.remove();dialog.close();el.removeEventListener('click',click);el.removeEventListener('keydown',key);el.querySelector('[data-note-file]').removeEventListener('change',importNotes)};
}
const cxArt=`<div class="deck-codeexplorer-explorer"><div class="deck-codeexplorer-route" aria-label="閱讀路線"></div><div class="deck-codeexplorer-map"></div><div class="deck-codeexplorer-navigation"><button class="deck-codeexplorer-back" data-history="-1">← 返回</button><button class="deck-codeexplorer-forward" data-history="1">前進 →</button><span class="deck-codeexplorer-history"></span></div><div class="deck-codeexplorer-workspace"><section class="deck-codeexplorer-understand"><div class="deck-codeexplorer-concept"></div><div class="deck-codeexplorer-relations"></div></section><section class="deck-codeexplorer-implementation"><div class="deck-codeexplorer-source-head"><b class="deck-codeexplorer-source-title"></b><button type="button" data-expand aria-expanded="false">放大代碼區</button><button type="button" data-explain aria-pressed="true">解說註解</button><button type="button" data-full aria-pressed="false">整檔上下文</button></div><div class="deck-codeexplorer-fold-tools"><button type="button" data-fold-all="close">收合全部 { }</button><button type="button" data-fold-all="open">展開全部 { }</button><span>點 ▾ 收合區塊；跨片段只收合可見部分</span></div><div class="deck-codeexplorer-code" tabindex="0" aria-label="原始碼"></div><div class="deck-codeexplorer-source-links"></div></section></div><div class="deck-codeexplorer-note-tools"><button type="button" data-note-export>匯出註解</button><button type="button" data-note-import>匯入註解</button><input type="file" data-note-file accept=".json,application/json" hidden><span class="deck-codeexplorer-note-status" role="status"></span></div><dialog class="deck-codeexplorer-note-dialog" aria-label="逐行註解"><h3></h3><pre></pre><label>這一行的註解<textarea maxlength="10000" rows="6"></textarea></label><p>獨立筆記，不修改 C++。清空後儲存可刪除此行註解。</p><button type="button" data-note-cancel>取消</button><button type="button" data-note-save>儲存註解</button></dialog><p class="deck-codeexplorer-sha"></p></div>`;

return {art:cxArt,mount:cxMount};
}
function fallback(model,options){
 const n=model.nodes[options.start],src=model.sources.files[n.file],r=n.ranges[0];
 return '<div class="deck-codeexplorer-preview"><h3>'+escape(n.title)+'</h3><p>'+escape(n.what)+'</p><p>'+escape(n.file+' · L'+r.join('–'))+'</p><pre>'+escape(src.lines.slice(r[0]-1,Math.min(r[1],r[0]+11)).map((l,i)=>(r[0]+i)+'  '+l).join('\n'))+'</pre><p>'+escape(n.input)+' → '+escape(n.output)+'</p><p>'+escape(n.note)+'</p><p>'+escape(model.routes[options.route].ids.map(id=>model.nodes[id].title).join(' → '))+'</p><small>HTML 版可探索關係、解說、折疊與整檔上下文。</small></div>';
}
deck.define('codeexplorer',(key,input,opts)=>{
 const data=prepare(input,opts),ctx=context(data.model,data.options,key);
 return '<div class="deck-codeexplorer" data-key="'+key+'" data-model="'+escape(JSON.stringify(data))+'"><div class="deck-view"><div class="deck-fallback">'+fallback(data.model,data.options)+'</div></div><template>'+ctx.art+'</template><p class="deck-codeexplorer-hint" data-key="'+key+'-hint" data-edit>灰底解說由作者補寫；原始行號不變。可切換解說、折疊區塊及放大閱讀。</p></div>';
},{tier:'special',vendor:['highlight'],summary:'程式關係探索：跨檔跳轉、原碼解說、語法高亮、區塊折疊與放大閱讀。',demo:()=>deck.codeexplorer('demo',demoData()),live(el){
 const {model,options}=JSON.parse(el.dataset.model),key=el.dataset.key;
 const memoryKey=JSON.stringify([location.pathname,window.storyReader?.page?.id||'',key,Object.entries(model.sources.files).map(([file,s])=>[file,s.sha])]);
 const state=saved.get(memoryKey)||{};saved.set(memoryKey,state);
 const body=el.querySelector('template').content.firstElementChild.cloneNode(true);
 el.append(body);const cleanup=context(model,options,key).mount(body,state);
 return ()=>{cleanup();body.remove()};
}});
function demoData(){
 return {sources:{date:'示範',files:{'worker.cpp':{sha:'example-v1',lang:'cpp',lines:['int run(int value) {','  return twice(value);','}','int twice(int value) {','  return value * 2;','}']}}},nodes:{run:{title:'呼叫端',symbol:'run',file:'worker.cpp',ranges:[[1,3]],what:'把輸入交給計算函式。',input:'value',output:'twice 的回傳值',note:'這是人工整理的直接呼叫。'},twice:{title:'計算端',symbol:'twice',file:'worker.cpp',ranges:[[4,6]],what:'回傳輸入的兩倍。',input:'value',output:'value * 2',note:'示範資料，不執行程式。'}},edges:[['run','twice','直接呼叫','worker.cpp:2']],routes:{main:{name:'從呼叫到計算',ids:['run','twice']}},explanations:{'worker.cpp':{2:'把同一個 value 傳給 twice；結果直接交回呼叫端。',5:'在這裡進行乘法。'}}};
}
})();
