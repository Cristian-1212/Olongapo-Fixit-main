const fs=require('fs');
let t=fs.readFileSync('src/imageVerification.js','utf8');
const target="  'a meme or funny image'\n  ],\n  'Unrelated':[";
const replacement="  'a meme or funny image'\n  ],\n  'Unrelated Image':PROMPT_TEMPLATES['Unrelated'],\n  'Unrelated':[";
if(t.includes(target)){
  t=t.replace(target,replacement);
  fs.writeFileSync('src/imageVerification.js',t);
  console.log('Added Unrelated Image alias');
}else{
  console.log('Target not found');
  const idx=t.indexOf('Unrelated');
  console.log(JSON.stringify(t.slice(idx, idx+200)));
}