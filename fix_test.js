const fs=require('fs');
let t=fs.readFileSync('test.js','utf8');
const target='assert.equal((await ana(\'POST\',\'chat/service/save\',{name:\'X\',requirements:\'X\',fee:\'X\',officeHours:\'X\'})).s,403,\'resident cannot configure service details\');';
const i=t.indexOf(target);
if(i===-1) console.log('Target not found');
else {
  const insertPos=i+target.length;
  const insertText='\n  mockCallCount=0;\n  geminiRequests.length=0;';
  t=t.slice(0,insertPos)+insertText+t.slice(insertPos);
  fs.writeFileSync('test.js',t);
  console.log('Added mock reset');
}