const fs=require('fs');
let t=fs.readFileSync('src/imageVerification.js','utf8');

// Remove the problematic line first
t=t.replace("  'Unrelated Image':PROMPT_TEMPLATES['Unrelated'],\n  ", "");
// Add alias after the PROMPT_TEMPLATES object closes
const idx=t.indexOf("};", t.indexOf("PROMPT_TEMPLATES"));
if(idx!==-1){
  const insertPos=idx+2; // after };
  const insertText="\nPROMPT_TEMPLATES['Unrelated Image']=PROMPT_TEMPLATES['Unrelated'];\n";
  t=t.slice(0,insertPos)+insertText+t.slice(insertPos);
  fs.writeFileSync('src/imageVerification.js',t);
  console.log('Fixed Unrelated Image alias');
}else{
  console.log('Not found');
}