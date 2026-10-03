/* 人工教材結果回放，不執行資料庫。 */
(function(root){
  const cases = [
    {task:'輸入「買牛奶」後，程式裡有這筆待辦嗎？',before:'尚無輸入能力，沒有待辦。',after:'記憶體待辦：[買牛奶]。'},
    {task:'再輸入空白字串，會發生什麼事？',before:'記憶體待辦：[買牛奶, 空白]，無效資料也被收下。',after:'拒絕空白，記憶體待辦仍為 [買牛奶]。'},
    {task:'關閉程式再開啟，買牛奶還在嗎？',before:'記憶體重置，待辦遺失。',after:'從保存紀錄讀回，待辦仍為 [買牛奶]。'},
  ];
  const api={cases,result(step,version){if(!Number.isInteger(step)||!cases[step]||!['before','after'].includes(version))throw new Error('無效階段或版本');return cases[step][version];}};
  if(typeof module==='object')module.exports=api;else root.growthExample=api;
})(globalThis);
