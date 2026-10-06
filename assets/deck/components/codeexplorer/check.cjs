/* 製作端檢查：node assets/deck/components/codeexplorer/check.cjs */
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../../..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:process.platform==='win32'?{channel:'chrome'}:{})});
 try{
  const p=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await p.setContent('<main id="page"></main>');
  for(const file of ['assets/story-reader/reader.css','assets/deck/deck.css','assets/theme/theme.css','assets/deck/components/codeexplorer/codeexplorer.css'])await p.addStyleTag({path:path.join(root,file)});
  for(const file of ['assets/deck/deck-core.js','vendor/highlight/highlight.min.js','assets/deck/components/codeexplorer/codeexplorer.js'])await p.addScriptTag({path:path.join(root,file)});
  await p.evaluate(()=>{
   const html=deck.info('codeexplorer').demo(),t=document.createElement('template');t.innerHTML=html;
   window.fixture=JSON.parse(t.content.firstElementChild.dataset.model).model;
   fixture.sources.files['worker.cpp'].lines=['int run(int value) {','  /* } ignored','     { ignored */','  const char* label = "}";','  return twice(value);','}','int twice(int value) {','  return value * 2;','}'];
   fixture.nodes.run.ranges=[[1,6]];fixture.nodes.twice.ranges=[[7,9]];
   fixture.routes.main.name='<img src=x onerror=alert(1)>';
   fixture.explanations={'worker.cpp':{5:'Author explanation <tag>'}};
   window.render=()=>{document.getElementById('page').innerHTML=deck.codeexplorer('one',fixture)+deck.codeexplorer('two',fixture,{start:'twice'});document.dispatchEvent(new CustomEvent('story:render',{detail:{root:document.getElementById('page')}}))};render();
  });
  const one=p.locator('.deck-codeexplorer[data-key="one"]'),two=p.locator('.deck-codeexplorer[data-key="two"]');
  assert.equal(await one.locator('img').count(),0);
  assert(await one.locator('.hljs-keyword').count()>0);
  assert.equal(await one.locator('[data-key="one"]').count(),0);
  assert.equal(await one.locator('.deck-codeexplorer-author-comment').textContent(),'Author explanation <tag>');
  await one.locator('[data-explain]').click();assert.equal(await one.locator('.deck-codeexplorer-author-comment').count(),0);await one.locator('[data-explain]').click();
  await one.locator('.deck-codeexplorer-fold[data-fold="1"]').click();assert.equal(await one.locator('.deck-codeexplorer-line').count(),1);await one.locator('[data-fold-all="open"]').click();assert.equal(await one.locator('.deck-codeexplorer-line').count(),6);
  await one.locator('[data-expand]').click();assert(await one.locator('dialog.deck-codeexplorer-expanded').evaluate(e=>e.open));await p.keyboard.press('Escape');await one.locator('.deck-codeexplorer-workspace .deck-codeexplorer-code').waitFor();
  await one.locator('.deck-codeexplorer-map [data-node="twice"]').click();assert((await one.locator('.deck-codeexplorer-source-title').textContent()).includes('L7'));
  await one.locator('.deck-codeexplorer-back').click();assert((await two.locator('.deck-codeexplorer-source-title').textContent()).includes('L7'));
  await p.evaluate(()=>render());assert((await one.locator('.deck-codeexplorer-source-title').textContent()).includes('L1'));
  assert(await p.evaluate(()=>{const variants=[m=>m.nodes.run.ranges=[[0,2]],m=>m.edges=[['missing','run','call','x']],m=>m.explanations={'worker.cpp':{99:'bad'}},m=>m.routes.main.ids=['missing']];return variants.every(change=>{const m=structuredClone(fixture);change(m);try{deck.codeexplorer('bad',m);return false}catch{return true}})}));
  await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.evaluate(()=>{window.hljs=undefined;render()});assert.equal(await one.locator('.deck-codeexplorer-fold').count(),0);assert.equal(await one.locator('.deck-codeexplorer-line').count(),6);
  assert.deepEqual(errors,[]);console.log('PASS: contract, validation, escaping, highlighting, folding, explanations, dialog, history, isolation, lifecycle, mobile, fallback');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
