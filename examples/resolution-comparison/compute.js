'use strict';
function aggregate(matrix,rows,cols){
 if(!Array.isArray(matrix)||!matrix.length||!Array.isArray(matrix[0])||!matrix[0].length)throw Error('Expected a non-empty matrix');
 const height=matrix.length,width=matrix[0].length;
 if(!matrix.every(row=>Array.isArray(row)&&row.length===width&&row.every(Number.isFinite)))throw Error('Expected rectangular finite values');
 if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows>height||cols>width)throw Error('Invalid output dimensions');
 return Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>{
  let sum=0,count=0;
  for(let y=Math.floor(r*height/rows);y<Math.floor((r+1)*height/rows);y++)for(let x=Math.floor(c*width/cols);x<Math.floor((c+1)*width/cols);x++){sum+=matrix[y][x];count++;}
  return sum/count;
 }));
}
if(typeof module!=='undefined')module.exports=aggregate;
