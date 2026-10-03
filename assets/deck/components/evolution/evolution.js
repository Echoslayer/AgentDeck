/* evolution：以階段揭露有向無環圖；HTML 負責文字排版，SVG 只畫連線。 */
'use strict';
(() => {
  const saved = new Map();
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function prepare({ nodes, edges = [], stages } = {}) {
    const fail = message => { throw new Error(`deck.evolution: ${message}`); };
    if (!Array.isArray(stages) || !stages.length || stages.some(s => !s || typeof s.title !== 'string' || (s.reason !== undefined && typeof s.reason !== 'string'))) fail('stages 需有 title 與可選 reason');
    if (!Array.isArray(nodes) || !nodes.length || !Array.isArray(edges)) fail('nodes 需非空，edges 需為陣列');
    const byId = new Map();
    nodes.forEach(n => {
      if (!n || typeof n.id !== 'string' || !/^[\w-]+$/.test(n.id) || byId.has(n.id) || typeof n.label !== 'string' || !Number.isInteger(n.since) || n.since < 0 || n.since >= stages.length || (n.text !== undefined && typeof n.text !== 'string')) fail('節點需唯一 id、label、有效 since 與可選 text');
      byId.set(n.id, n);
    });
    const seen = new Set();
    edges.forEach(e => {
      const key = JSON.stringify([e?.from,e?.to]);
      if (!e || !byId.has(e.from) || !byId.has(e.to) || seen.has(key)) fail('連線端點不存在或重複');
      seen.add(key);
    });
    const ranks = new Map(), visiting = new Set();
    const rank = id => {
      if (visiting.has(id)) fail('僅支援無環圖，不能含回圈');
      if (ranks.has(id)) return ranks.get(id);
      visiting.add(id);
      const value = Math.max(0, ...edges.filter(e => e.to === id).map(e => rank(e.from) + 1));
      visiting.delete(id); ranks.set(id, value); return value;
    };
    nodes.forEach(n => rank(n.id));
    return { nodes, edges, stages, ranks, byId };
  }
  function build(key, input) {
    const {nodes,edges,stages,ranks,byId} = prepare(input);
    const columns = Array.from({length:Math.max(...ranks.values())+1},(_,rank) => `<div class="deck-evolution-column">${nodes.filter(n=>ranks.get(n.id)===rank).map(n=>{
      const incoming=edges.filter(e=>e.to===n.id).map(e=>`<span data-link-since="${Math.max(n.since,byId.get(e.from).since)}">${escape(byId.get(e.from).label)}</span>`);
      return `<div class="deck-evolution-node" data-node="${n.id}" data-since="${n.since}" data-key="${key}-${n.id}"><small>${escape(stages[n.since].title)}</small><strong data-key="${key}-${n.id}-label" data-edit>${escape(n.label)}</strong>${n.text?`<p data-key="${key}-${n.id}-text" data-edit>${escape(n.text)}</p>`:''}${incoming.length?`<p class="deck-evolution-incoming">接自：${incoming.join('、')}</p>`:''}</div>`;
    }).join('')}</div>`).join('');
    return `<div class="deck-evolution" data-key="${key}" data-edges="${escape(JSON.stringify(edges))}"><div class="deck-evolution-controls" aria-label="演進階段">${stages.map((s,i)=>`<button type="button" data-step="${i}" aria-pressed="false">${escape(s.title)}</button>`).join('')}<button type="button" data-action="prev">上一步</button><button type="button" data-action="next">下一步</button><button type="button" data-action="reset">從頭看</button></div><div class="deck-view"><div class="deck-fallback"><div class="deck-evolution-graph" style="--evolution-columns:${ranks.size?Math.max(...ranks.values())+1:1}">${columns}<svg class="deck-evolution-lines" aria-hidden="true"></svg></div><ol class="deck-evolution-stages">${stages.map((s,i)=>`<li data-stage="${i}"><strong data-key="${key}-stage-${i}-title" data-edit>${escape(s.title)}</strong>${s.reason?`<p data-key="${key}-stage-${i}-reason" data-edit>${escape(s.reason)}</p>`:''}</li>`).join('')}</ol></div></div><p class="deck-evolution-status" aria-live="polite"></p></div>`;
  }
  function live(el) {
    const buttons=[...el.querySelectorAll('[data-step]')], nodes=[...el.querySelectorAll('[data-node]')];
    const edges=JSON.parse(el.dataset.edges), byId=new Map(nodes.map(n=>[n.dataset.node,n]));
    const memoryKey=JSON.stringify([window.storyReader?.page?.id || '',el.dataset.key]);
    let step=Math.min(saved.get(memoryKey) || 0,buttons.length-1), frame;
    const graph=el.querySelector('.deck-evolution-graph'), svg=el.querySelector('svg');
    const draw=()=>{
      const bounds=graph.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      // 瀏覽器 zoom 會改變 CSS pixel 比例；SVG viewBox 使用相同的實際座標。
      svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
      const vertical=getComputedStyle(graph).getPropertyValue('--evolution-vertical').trim()==='1';
      const rect=id=>{const r=byId.get(id).getBoundingClientRect();return {x:r.left-bounds.left,y:r.top-bounds.top,w:r.width,h:r.height};};
      svg.innerHTML=edges.filter(e=>Number(byId.get(e.from).dataset.since)<=step && Number(byId.get(e.to).dataset.since)<=step).map(e=>{
        const a=rect(e.from),b=rect(e.to);
        let d,tip;
        if(vertical){const x=a.x+a.w/2,y=a.y+a.h+4,X=b.x+b.w/2,Y=b.y-5;const lane=Math.min(a.x,b.x)-12;
          d=Y-y<100?`M${x} ${y} V${(y+Y)/2} H${X} V${Y}`:`M${x} ${y} v8 H${lane} V${Y-8} H${X} V${Y}`;tip=`M${X-4} ${Y-6} L${X} ${Y} L${X+4} ${Y-6}`;
        }else{const x=a.x+a.w+4,y=a.y+a.h/2,X=b.x-5,Y=b.y+b.h/2;
          d=X-x<80?`M${x} ${y} H${(x+X)/2} V${Y} H${X}`:`M${x} ${y} h8 V12 H${X-8} V${Y} H${X}`;tip=`M${X-6} ${Y-4} L${X} ${Y} L${X-6} ${Y+4}`;
        }
        return `<path d="${d}"/><path d="${tip}"/>`;
      }).join('');
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);};
    const render=()=>{
      saved.set(memoryKey,step); el.dataset.step=step;
      buttons.forEach((b,i)=>{b.setAttribute('aria-pressed',i===step);b.textContent=el.querySelector(`[data-stage="${i}"]>strong`).textContent;});
      el.querySelectorAll('[data-link-since]').forEach(n=>n.hidden=Number(n.dataset.linkSince)>step);
      nodes.forEach(n=>{const since=Number(n.dataset.since);n.classList.toggle('deck-evolution-future',since>step);n.classList.toggle('deck-evolution-new',since===step);n.setAttribute('aria-hidden',since>step);});
      el.querySelectorAll('[data-stage]').forEach(n=>n.hidden=Number(n.dataset.stage)!==step);
      el.querySelector('[data-action=prev]').disabled=step===0;
      el.querySelector('[data-action=next]').disabled=step===buttons.length-1;
      el.querySelector('.deck-evolution-status').textContent=`階段 ${step+1} / ${buttons.length} · 粗框為本階新增；虛框為尚未加入。`;
      schedule();
      el.dispatchEvent(new CustomEvent('deck:evolution',{bubbles:true,detail:{key:el.dataset.key,step}}));
    };
    const click=e=>{
      const button=e.target.closest('button');if(!button || !el.contains(button))return;
      if(button.dataset.step!==undefined)step=Number(button.dataset.step);
      else if(button.dataset.action==='reset')step=0;
      else if(button.dataset.action)step=Math.max(0,Math.min(buttons.length-1,step+(button.dataset.action==='next'?1:-1)));
      else return;
      render();
    };
    el.classList.add('deck-evolution-active');
    el.addEventListener('click',click);
    const observer=new ResizeObserver(schedule);observer.observe(graph);nodes.forEach(n=>observer.observe(n));
    render();
    return()=>{observer.disconnect();cancelAnimationFrame(frame);el.removeEventListener('click',click);};
  }
  deck.define('evolution',build,{
    tier:'special',live,summary:'逐階長出的能力與連接關係；以缺口解釋新增部分，零依賴。',
    demo:()=>build('demo',{nodes:[{id:'input',label:'收集資料',since:0},{id:'check',label:'驗證內容',since:1},{id:'save',label:'保存結果',since:2}],edges:[{from:'input',to:'check'},{from:'check',to:'save'}],stages:[{title:'先收到資料',reason:'起點：資料先進到記憶體。'},{title:'補上驗證',reason:'缺口：空白與錯誤資料也會進來。'},{title:'補上保存',reason:'缺口：重新啟動後，記憶體裡的資料會消失。'}]})
  });
})();
