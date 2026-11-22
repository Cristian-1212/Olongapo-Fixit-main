const fs=require('fs');
let t=fs.readFileSync('src/imageVerification.js','utf8');
const idx=t.indexOf("'Unrelated':[");
if(idx===-1){
  console.log('Not found');
}else{
  const insertPos=idx;
  const insertText="  'Unrelated Image':PROMPT_TEMPLATES['Unrelated'],\n  ";
  t=t.slice(0,insertPos)+insertText+t.slice(insertPos);
  fs.writeFileSync('src/imageVerification.js',t);
  console.log('Added Unrelated Image alias at position',idx);
}