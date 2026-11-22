const fs=require('fs');
const path='public/js/reports.js';
let s=fs.readFileSync(path,'utf8');
if(!s.includes('function aiDetailCard(r)')){
  const anchor="function detail(id){PH='';if(!guard())return;const r=S.reports.find(x=>x.id===id);";
  const idx=s.indexOf(anchor);
  if(idx===-1){ console.error('NO_DETAIL'); process.exit(1); }
  const fn = "function aiDetailCard(r){if(!r||!r.ai)return '';const a=r.ai,score=(a.similarityScore==null)?'—':Number(a.similarityScore).toFixed(4);const labels={MATCH:'MATCH',REVIEW_REQUIRED:'REVIEW_REQUIRED',POSSIBLE_MISMATCH:'POSSIBLE_MISMATCH',AI_UNAVAILABLE:'AI_UNAVAILABLE'};return `<div class=\"card ai-detail\"><h3>AI Image Verification</h3><p><span class=\"bd ai-${slug(a.status)}\">${esc(labels[a.status]||a.status)}</span></p><div class=\"ai-detail-grid\"><p><b>Selected category:</b> ${esc(a.selectedCategory||r.cat||'—')}</p><p><b>Predicted category:</b> ${esc(a.predictedCategory||'—')}</p><p><b>Similarity score:</b> ${esc(String(score))}</p><p><b>Best matching description:</b> ${esc(a.bestMatchDescription||'—')}</p><p><b>Model:</b> ${esc(a.modelName||'—')}</p><p><b>Analysis date:</b> ${esc(a.analyzedAt?fd(a.analyzedAt):'—')}</p></div><p><b>Explanation:</b> ${esc(a.explanation||'—')}</p><p class=\"mu\">AI assists review only. Officials make the final decision; AI does not automatically approve or reject complaints.</p></div>`}\n";
  s = s.slice(0,idx)+fn+s.slice(idx);
}
if(s.indexOf('${st&&r.ai?aiDetailCard(r):') === -1){
  const marker = " ${st&&open?`<div class=\"card\"><h3>Actions</h3>";
  const m2 = " ${r.ev.length?`<div class=\"card\"><h3>Resolution evidence</h3>";
  if(s.includes(marker)) s = s.replace(marker, " ${st&&r.ai?aiDetailCard(r):''}\n" + marker);
  else if(s.includes(m2)) s = s.replace(m2, " ${st&&r.ai?aiDetailCard(r):''}\n" + m2);
  else { console.error('NO_INSERT'); process.exit(2); }
}
fs.writeFileSync(path,s,'utf8');
console.log('patched');
