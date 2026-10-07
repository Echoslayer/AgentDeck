// NODE_PATH=<Playwright installation> node tools/check-evolution.cjs
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE,channel:process.env.PLAYWRIGHT_EXECUTABLE?undefined:process.env.PLAYWRIGHT_CHANNEL});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../examples/project-growth/index.html')).href);
 await page.locator('button[data-step="2"]').click();await page.locator('#reveal').click();await page.locator('#version').selectOption('after');assert.match(await page.locator('#result').innerText(),/讀回/);
 // 邊界與圖關係的輸入驗證，不只檢查能否產生字串。
 assert.equal(await page.evaluate(()=>{
  const base={nodes:[{id:'a',label:'a',since:0},{id:'b',label:'b',since:0}],edges:[],stages:[{title:'起點'}]};
  const invalid=[{...base,nodes:[{label:'x',since:0}]},{...base,nodes:[base.nodes[0],base.nodes[0]]},{...base,nodes:[{id:'a',label:'a',since:2}]},{...base,edges:[{from:'a',to:'missing'}]},{...base,edges:[{from:'a',to:'b'},{from:'a',to:'b'}]},{...base,edges:[{from:'a',to:'b'},{from:'b',to:'a'}]}];
  return invalid.every(data=>{try{deck.evolution('invalid',data);return false;}catch{return true;}});
 }),true);
 // 分支、跨層線、長文字、自動換行與縮窄後重算座標。
 await page.evaluate(()=>{
  window.layoutData={nodes:[{id:'a',label:'讀取一筆具體輸入',since:0},{id:'b',label:'檢查必填欄位並保留完整文字',since:1},{id:'c',label:'記錄原始內容',since:1},{id:'d',label:'保存可以讀回的結果',since:2}],edges:[{from:'a',to:'b'},{from:'a',to:'c'},{from:'b',to:'d'},{from:'c',to:'d'},{from:'a',to:'d'}],stages:[{title:'輸入'},{title:'驗證'},{title:'保存'}]};
  const graph=document.querySelector('#graph');graph.innerHTML=deck.evolution('layout',layoutData);document.dispatchEvent(new CustomEvent('story:render',{detail:{root:graph}}));
 });
 await page.locator('button[data-step="2"]').click();
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:900});await page.waitForTimeout(80);
  const issues=await page.locator('.deck-evolution').evaluate(root=>{
   const issues=[],graph=root.querySelector('.deck-evolution-graph'),bounds=graph.getBoundingClientRect();
   const boxes=[...root.querySelectorAll('[data-node]')].map(n=>n.getBoundingClientRect());
   if(root.scrollWidth>root.clientWidth+1)issues.push('horizontal overflow');
   root.querySelectorAll('[data-node]').forEach(n=>{if(n.scrollWidth>n.clientWidth+1)issues.push('text overflow');});
   const svg=root.querySelector('svg'),matrix=svg.getScreenCTM();
   for(const p of svg.querySelectorAll('path'))for(let n=0;n<=80;n++){const q=p.getPointAtLength(p.getTotalLength()*n/80);const pt=new DOMPoint(q.x,q.y).matrixTransform(matrix);if(boxes.some(b=>pt.x>b.left+1&&pt.x<b.right-1&&pt.y>b.top+1&&pt.y<b.bottom-1))issues.push('line crosses node');if(pt.x<bounds.left-1||pt.x>bounds.right+1||pt.y<bounds.top-1||pt.y>bounds.bottom+1)issues.push('line outside graph');}
   return [...new Set(issues)];
  });assert.deepEqual(issues,[],String(width));
 }
 // 固定文字不因階段更新而被覆蓋；切走須清理事件，返回恢復階段。
 await page.locator('[data-key=layout-b-label]').evaluate(e=>e.textContent='人工修改');await page.locator('button[data-step="1"]').click();assert.equal(await page.locator('[data-key=layout-b-label]').textContent(),'人工修改');
 await page.evaluate(()=>{window.oldGraph=document.querySelector('.deck-evolution');document.dispatchEvent(new CustomEvent('story:render',{detail:{root:document.createElement('div')}}));oldGraph.querySelector('[data-step="0"]').click();});
 assert.equal(await page.locator('.deck-evolution').getAttribute('data-step'),'1');
 await page.evaluate(()=>{const host=document.querySelector('#graph');host.innerHTML=deck.evolution('layout',layoutData);document.dispatchEvent(new CustomEvent('story:render',{detail:{root:host}}));});
 assert.equal(await page.locator('.deck-evolution').getAttribute('data-step'),'1');
 // 未啟動的後備是完整圖與所有階段，沒有互動控制項。
 await page.evaluate(()=>{const el=document.createElement('section');el.id='static';el.innerHTML=deck.evolution('static',layoutData);document.body.append(el);});
 assert.equal(await page.locator('#static [data-node]').count(),4);assert.equal(await page.locator('#static .deck-evolution-controls').isVisible(),false);assert.equal(await page.locator('#static [data-stage]:visible').count(),3);
 // 真實閱讀器：mount 在 core live 前執行，初始階段事件仍能送到主題。
 await page.goto(pathToFileURL(path.resolve(__dirname,'../templates/blank/index.html')).href);
 await page.addStyleTag({path:path.resolve(__dirname,'../assets/deck/components/evolution/evolution.css')});
 await page.addScriptTag({path:path.resolve(__dirname,'../assets/deck/components/evolution/evolution.js')});
 await page.evaluate(()=>{
  const p=story.pages[1];p.art=deck.info('evolution').demo();p.previewArt=p.art;
  p.mount=(root,state)=>{const listener=e=>{state.step=e.detail.step;root.dataset.observedStep=e.detail.step;};root.addEventListener('deck:evolution',listener);return()=>root.removeEventListener('deck:evolution',listener);};
  storyReader.go(1);
 });
 await page.waitForSelector('#page[data-observed-step="0"]',{timeout:3000}); // go() 在換頁轉場內非同步渲染
 await page.locator('#page button[data-step="2"]').click();
 await page.evaluate(()=>{storyReader.go(0);storyReader.go(1);});
 await page.waitForSelector('#page[data-observed-step="2"] .deck-evolution',{timeout:3000});
 const snapshot=await page.evaluate(()=>storyReader.snapshot().pages[1].html);
 assert(!snapshot.includes('deck-evolution-future'));assert(snapshot.includes('保存結果'));
 assert.deepEqual(errors,[]);console.log('PASS: evolution 邊界、回放、分支連線、長文字、窄版、編輯保留、清理、返回與靜態後備');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
