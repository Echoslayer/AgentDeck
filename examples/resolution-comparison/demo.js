(() => {
 const datasets={
  peak:[[0,0,0,0,0,0],[0,10,0,0,0,0],[0,0,0,0,0,0],[0,0,0,0,4,4],[0,0,0,0,4,4],[0,0,0,0,0,0]],
  checker:Array.from({length:6},(_,r)=>Array.from({length:6},(_,c)=>(r+c)%2?10:0)),
 };
 const dataset=document.getElementById('dataset'),size=document.getElementById('size');
 function table(matrix){return `<table class="ex-matrix" aria-label="矩陣數值"><tbody>${matrix.map(row=>`<tr>${row.map(v=>`<td style="background:hsl(145 35% ${96-v*5}%)">${Number(v.toFixed(2))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
 function render(){const matrix=datasets[dataset.value],n=Number(size.value),pooled=aggregate(matrix,n,n);document.getElementById('reference').innerHTML=table(matrix);document.getElementById('result').innerHTML=table(pooled);document.getElementById('scale').textContent=`聚合結果 · ${n} × ${n}`;document.getElementById('summary').textContent=`36 個原始值 → ${n*n} 個平均值。最大值 ${Math.max(...matrix.flat())} → ${Number(Math.max(...pooled.flat()).toFixed(2))}。${n===6?'兩側相同；降低右侧尺度再比較。':'平均值保留區塊概況，區塊內的位置差異不再可見。'}`;}
 dataset.addEventListener('change',render);size.addEventListener('change',render);document.getElementById('reset').addEventListener('click',()=>{dataset.value='peak';size.value='3';render();});render();
})();
