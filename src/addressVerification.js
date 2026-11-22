'use strict';
const crypto=require('crypto');
const path=require('path');
const fs=require('fs');
const {createWorker}=require('tesseract.js');
let sharp=null;
try{sharp=require('sharp')}catch(_){sharp=null}

function normalizeText(text){
  return String(text||'').toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ').trim();
}

const DOCUMENT_PROFILES={
 'Philippine National ID (PhilID/ePhilID)':{nameLabels:['last name','surname','first name','given name','middle name','suffix','full name'],addressLabels:['address','permanent address','residence'],dateLabels:['date of birth','birth date','dob'],numberLabels:['pcn','philsys card number'],optional:['expirationDate','issueDate']},
 'PhilHealth ID':{nameLabels:['member name','full name','name','member'],addressLabels:['address','residence'],dateLabels:['date of birth','birth date','dob'],numberLabels:['philhealth identification number','philhealth number','pin'],optional:['address','dateOfBirth','expirationDate','issueDate']},
 'UMID':{nameLabels:['surname','given name','middle name','full name','name'],addressLabels:['address','residence','permanent address'],dateLabels:['date of birth','birth date','dob'],numberLabels:['crn','common reference number','sss','gsis'],optional:['address','expirationDate','issueDate']},
 "Philippine Driver's License":{nameLabels:['last name','surname','first name','given name','middle name','full name','name'],addressLabels:['address','residence'],dateLabels:['date of birth','birth date','dob'],numberLabels:['license no','license number'],expirationLabels:['valid until','expiry date','expiration date'],optional:['issueDate']},
 'Philippine Passport':{nameLabels:['surname','given names','given name','full name','name'],addressLabels:['place of birth'],dateLabels:['date of birth','birth date','dob'],numberLabels:['passport no','passport number'],issueLabels:['date of issue'],expirationLabels:['date of expiry','expiry date','expiration date'],optional:['address','barangay','cityMunicipality','province']},
 'Postal ID':{nameLabels:['full name','name'],addressLabels:['address','registered address','residence'],dateLabels:['date of birth','birth date','dob'],numberLabels:['postal id','postal id number','id number'],expirationLabels:['valid until','expiry date','expiration date'],optional:['sex','issueDate']},
 "Voter's ID":{nameLabels:['registered name','full name','name'],addressLabels:['registered address','address','residence','barangay','brgy'],dateLabels:['date of birth','birth date','dob'],numberLabels:['voter id','voter id number','precinct no','precinct number'],optional:['issueDate','expirationDate']},
 'Barangay Residency Document':{nameLabels:['resident','name','full name','this is to certify'],addressLabels:['address','residence','residing at','residence address'],barangayLabels:['barangay','brgy'],dateLabels:['date of birth','birth date','dob'],issueLabels:['date issued','issued this'],numberLabels:['certificate no','certificate number','reference no'],optional:['dateOfBirth','documentNumber','issueDate']}
};

function extractAddress(text){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim().replace(/\s+/g,' ')).filter(Boolean);
  for(let i=0;i<lines.length;i++){
    const label=/^(?:address|residence|permanent address|residential address|barangay|brgy)[\s:.\-]*$/i.test(lines[i]) ||
      /^(?:address|residence|permanent address|residential address)\s*[:\-]/i.test(lines[i]);
    if(label){
      const start=lines[i].replace(/^(?:address|residence|permanent address|residential address|barangay|brgy)\s*[:\-]?\s*/i,'').trim();
      const collected=[];
      if(start)collected.push(start);
      for(let j=i+1;j<lines.length&&collected.length<5;j++){
        const next=lines[j];
        if(/^(?:name|surname|given|date|birth|sex|nationality|civil|status|signature|id|number|issued|expires)\b/i.test(next)&&collected.length)break;
        collected.push(next);
        if(/philippines|province|zambales|\b\d{4}\b/i.test(next))break;
      }
      if(collected.length)return collected.join(', ').replace(/,\s*,/g,',').trim();
    }
  }
  const addressLines=lines.filter(line=>/(\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|barangay|brgy\.?|blk\.?|block|lot|purok|zone|phase|subdivision|sitio|city|province|residence|address)\b)/i.test(line));
  return addressLines.length?addressLines.join(', ').trim():String(text||'').replace(/\s+/g,' ').trim();
}

function extractDob(text){
  const source=String(text||'');
  const months={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
  const dobArea=source.split(/\r?\n/).filter(line=>/date\s*(?:of)?\s*birth|birth|dob/i.test(line)).join(' ');
  const candidates=(dobArea||source).match(/(?:\d{4}-\d{1,2}-\d{1,2})|(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})|(?:\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*,?\s+\d{4})/ig)||[];
  for(const raw of candidates){
    let d,mo,y;
    if(/^\d{4}-/.test(raw)){[y,mo,d]=raw.split('-').map(Number)}
    else if(/[\/.-]/.test(raw)){
      const parts=raw.split(/[\/.-]/).map(Number);
      if(parts[2]>=100||parts[2]>=1000)y=parts[2]<100?2000+parts[2]:parts[2];else y=parts[2];
      // Philippine documents commonly use DD/MM/YYYY; support MM/DD by using the first value as month only when it is >12.
      if(parts[0]>12){d=parts[0];mo=parts[1]}else{d=parts[1];mo=parts[0]}
    }else{
      const m=raw.match(/(\d{1,2})\s+([A-Za-z]+)\s*,?\s+(\d{4})/);
      if(m){d=Number(m[1]);mo=months[m[2].toLowerCase()]||0;y=Number(m[3])}
    }
    if(!Number.isFinite(y)||!Number.isFinite(mo)||!Number.isFinite(d)||mo<1||mo>12||d<1||d>31||y<1900||y>2100)continue;
    const date=new Date(y,mo-1,d);
    if(date.getFullYear()!==y||date.getMonth()!==mo-1||date.getDate()!==d)continue;
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  return null;
}

function extractFieldLine(text,labels){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  for(const line of lines){
    const lower=line.toLowerCase();
    for(const label of labels||[]){
      if(lower.startsWith(label)){
        const value=line.replace(new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*[:\\-]?\\s*','i'),'').trim();
        if(value&&value.length>1)return value;
      }
    }
  }
  return '';
}

function extractSex(text){
  const m=String(text||'').match(/\b(?:sex|gender)\s*[:\-]?\s*(male|female|m|f)\b/i);
  if(!m)return '';
  return /^m/i.test(m[1])?'Male':'Female';
}

function extractDocumentNumber(text,documentType){
  const profile=DOCUMENT_PROFILES[documentType]||{};
  for(const label of profile.numberLabels||[]){
    const m=new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*[:\\-]?\\s*([A-Z0-9][A-Z0-9 \\-]{4,30})','i').exec(text);
    if(m&&m[1]){
      return m[1].replace(/\s+/g,' ').trim();
    }
  }
  return '';
}

function extractMRZ(text){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(x=>x.includes('<')&&x.length>=20);
  if(lines.length<2)return null;
  const passportLine=lines.find(x=>/^P[A-Z<]/.test(x)||x.length>=28);
  if(!passportLine)return null;
  const clean=passportLine.replace(/\s/g,'');
  const passport=clean.match(/[A-Z0-9]{1,2}[0-9]{6,9}/);
  return passport?passport[0]:null;
}

function extractName(text){
  const source=String(text||'');
  const lines=source.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const skip=/^(republic|philippines|pilipinas|name|surname|given|middle|first|last|address|birth|date|sex|male|female|civil|status|nationality|height|weight|blood|signature|barangay|city|province|zip|no\.?|number|id|license|card|common|bienvenido|authority|issued|expires|valid|driver|professional|unified|multi-purpose|voter|passport|tax|sss|gsis|pag-ibig|philhealth|tin|community|cedula|resident|certificate)\b/i;
  const surname=source.match(/^(?:surname|last name|family name)\s*[:\-]\s*(.+)$/im);
  const given=source.match(/^(?:given name|first name)\s*[:\-]\s*(.+)$/im);
  const middle=source.match(/^(?:middle name)\s*[:\-]\s*(.+)$/im);
  if(surname&&given&&given[1]){
    return [given[1].trim(),middle&&middle[1]?middle[1].trim():'',surname[1].trim()].filter(Boolean).join(' ').replace(/\s+/g,' ');
  }
  for(const line of lines){
    if(skip.test(line))continue;
    if(/^\d+[\.\-]\)?\s/.test(line))continue;
    if(/[\d]{4,}[\/\-]/.test(line))continue;
    const words=line.split(/\s+/).filter(w=>w.length>=2);
    if(words.length>=2&&words.length<=4&&words.every(w=>/^[A-Za-zÑñ]+$/.test(w))){
      return line;
    }
  }
  return null;
}

function words(text){
  return new Set(normalizeText(text).split(' ').filter(x=>x.length>=3));
}

function compareAddress(extractedAddress, registeredAddress, barangayName){
  const extracted=normalizeText(extractedAddress);
  const registered=normalizeText(registeredAddress);
  const barangay=normalizeText(barangayName);
  if(!extracted||extracted.length<12)return{status:'unreadable',confidence:0,address:extractedAddress||''};

  const brgyAliases=[barangay, barangay.replace(/^barangay\s*/,''), barangay.replace(/^brgy\.?\s*/, '')]
    .filter(Boolean).map(normalizeText);
  const brgyMatch=brgyAliases.some(alias=>extracted.includes(alias)||registered.includes(alias));
  const addressWords=words(extracted);
  const registeredWords=[...words(registered)].filter(x=>!['house','street','road','barangay','brgy','city','olongapo','zambales'].includes(x));
  const matchedAddressWords=registeredWords.filter(x=>addressWords.has(x));
  const addressMatch=registeredWords.length>0&&matchedAddressWords.length/registeredWords.length>=0.45;

  if(brgyMatch&&addressMatch)return{status:'verified',confidence:0.9,address:extractedAddress};
  if(brgyMatch)return{status:'manual_review',confidence:0.65,address:extractedAddress};
  if(!brgyMatch&&registeredWords.some(x=>addressWords.has(x)))return{status:'manual_review',confidence:0.55,address:extractedAddress};
  return{status:'rejected',confidence:0.8,address:extractedAddress};
}

function extractBarangay(text){
  const source=normalizeText(text);
  for(const name of ['pag asa','pagasa','new kalalake','west tapinac']){
    if(source.includes(name))return name.replace('pag asa','Pag-asa').replace('pagasa','Pag-asa').replace('new kalalake','New Kalalake').replace('west tapinac','West Tapinac');
  }
  const match=String(text||'').match(/(?:barangay|brgy\.?|bgy\.?)\s*[:\-]?\s*([A-Za-z0-9\s-]{2,40})/i);
  return match?match[1].split(/\n|,|province|city/i)[0].trim():null;
}

function nameSimilarity(a,b){
  const normalizeName=value=>normalizeText(value).replace(/\b(jr|sr|ii|iii|iv)\b/g,' ').replace(/\s+/g,' ').trim();
  const aw=new Set(normalizeName(a).split(' ').filter(Boolean)),bw=new Set(normalizeName(b).split(' ').filter(Boolean));
  if(!aw.size||!bw.size)return 0;
  let matched=0;aw.forEach(word=>{if(bw.has(word))matched++});
  return matched/Math.max(aw.size,bw.size);
}

function compareResidencyDocument(text,submittedName,selectedBarangay){
  const normalizedText=normalizeText(text);
  const normalizedBarangay=normalizeText(selectedBarangay);
  const extractedName=extractName(text);
  const extractedBarangay=extractBarangay(text);
  const nameMatch=extractedName?nameSimilarity(extractedName,submittedName)>=0.67:false;
  const barangayMatch=extractedBarangay?normalizeText(extractedBarangay)===normalizedBarangay||normalizedText.includes(normalizedBarangay):false;
  if(!normalizedText||normalizedText.length<20)return{status:'unreadable',confidence:0,name:extractedName,barangay:extractedBarangay};
  if(nameMatch&&barangayMatch)return{status:'manual_review',confidence:.8,name:extractedName,barangay:extractedBarangay,reason:'Document OCR matches the resident and barangay; official verification is still required.'};
  return{status:'manual_review',confidence:.45,name:extractedName,barangay:extractedBarangay,reason:'OCR is incomplete or mismatched. Manual review is required.'};
}

let ocrWorker=null;
let ocrWorkerReady=null;

async function getOcrWorker(){
  if(ocrWorker)return ocrWorker;
  if(ocrWorkerReady)return ocrWorkerReady;
  ocrWorkerReady=(async()=>{
    const tessDir=process.env.TESSDATA_DIR||path.join(__dirname,'..');
    const trainedDataPath=path.join(tessDir,'eng.traineddata');
    if(!fs.existsSync(trainedDataPath)){
      throw new Error('OCR language data not found at '+trainedDataPath+'. Place eng.traineddata at the project root or set TESSDATA_DIR.');
    }
    console.log('[OCR] Using language data from:',tessDir);
    const workerPromise=createWorker('eng',1,{langPath:tessDir,gzip:false,cacheMethod:'none'});
    const timeoutPromise=new Promise((_,reject)=>setTimeout(()=>reject(new Error('OCR worker initialization timed out.')),30000));
    ocrWorker=await Promise.race([workerPromise,timeoutPromise]);
    return ocrWorker;
  })();
  return ocrWorkerReady;
}

async function terminateOcrWorker(){
  if(ocrWorker){try{await ocrWorker.terminate()}catch(_){}ocrWorker=null}
  ocrWorkerReady=null;
}

const OCR_TIMEOUT_MS=60000;
const ocrCache=new Map();
const OCR_CACHE_TTL_MS=10*60*1000;

function cacheOcr(id,result){
  ocrCache.set(id,{result,at:Date.now()});
  const now=Date.now();
  for(const [key,entry] of ocrCache)if(now-entry.at>OCR_CACHE_TTL_MS)ocrCache.delete(key);
}

function getCachedOcr(id){
  const entry=ocrCache.get(id);
  if(!entry)return null;
  if(Date.now()-entry.at>OCR_CACHE_TTL_MS){ocrCache.delete(id);return null}
  return entry.result;
}

function consumeCachedOcr(id){
  const result=getCachedOcr(id);
  if(result)ocrCache.delete(id);
  return result;
}

async function preprocessImage(dataUrl){
  if(!sharp)return dataUrl;
  try{
    const base64=dataUrl.slice(dataUrl.indexOf(',')+1);
    const processed=await sharp(Buffer.from(base64,'base64')).rotate()
      .resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true})
      .grayscale().normalise().sharpen().png().toBuffer();
    return 'data:image/png;base64,'+processed.toString('base64');
  }catch(_){return dataUrl}
}

async function validateImage(dataUrl){
  if(typeof dataUrl!=='string'||!/^data:image\/(jpeg|png);base64,/i.test(dataUrl)){
    return{ok:false,reason:'Only JPG or PNG ID images can be processed.'};
  }
  if(sharp){
    try{
      const base64=dataUrl.slice(dataUrl.indexOf(',')+1);
      const metadata=await sharp(Buffer.from(base64,'base64')).rotate().metadata();
      if(!metadata.width||!metadata.height||metadata.width<100||metadata.height<100){
        return{ok:false,reason:'The uploaded ID is too small or could not be read clearly.'};
      }
    }catch(_){
      return{ok:false,reason:'The uploaded ID is unclear or is not a valid JPG or PNG image.'};
    }
  }
  return{ok:true};
}

async function ocrId(dataUrl,documentType){
  const validation=await validateImage(dataUrl);
  if(!validation.ok)return{status:'unreadable',confidence:0,address:'',text:'',reason:validation.reason};
  const worker=await getOcrWorker();
  let result,text='',confidence=0;
  try{
    const ocrImage=await preprocessImage(dataUrl);
    result=await Promise.race([
      worker.recognize(ocrImage),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('OCR processing timed out.')),OCR_TIMEOUT_MS))
    ]);
    text=String(result?.data?.text||'');
    confidence=Number(result?.data?.confidence||0);
  }catch(_){
    return{status:'unreadable',confidence:0,address:'',text:'',reason:'The uploaded ID is unclear or could not be read. Please upload a clearer JPG or PNG ID.'};
  }
  const address=extractAddress(text);
  const name=extractName(text);
  const dob=extractDob(text);
  const barangay=extractBarangay(text);
  const profile=DOCUMENT_PROFILES[documentType]||{};
  const sex=extractSex(text);
  const documentNumber=documentType==='Philippine Passport'?extractMRZ(text)||extractDocumentNumber(text,documentType):extractDocumentNumber(text,documentType);
  const expirationDate=extractFieldLine(text,profile.expirationLabels||[]);
  const issueDate=extractFieldLine(text,profile.issueLabels||[]);
  if(!text.trim()||confidence<35){
    return{status:'unreadable',confidence:confidence/100,address,text,reason:'The uploaded ID is unclear or could not be processed.'};
  }
  const fieldConfidence={
    fullName:name?Math.min(.95,confidence/100):0,
    dateOfBirth:dob?Math.min(.95,confidence/100):0,
    address:address&&address.length>=12?Math.min(.95,confidence/100):0,
    barangay:barangay?Math.min(.9,confidence/100):0
  };
  return{status:'readable',confidence:confidence/100,address,text,name,dob,barangay,sex,documentNumber,expirationDate,issueDate,documentType:documentType||null,fieldConfidence,
    fullName:name||'',surname:'',firstName:'',middleName:'',suffix:'',dateOfBirth:dob||'',cityMunicipality:'',province:''};
}

async function verifyIdAddress(dataUrl, registeredAddress, barangayName){
  const ocr=await ocrId(dataUrl);
  if(ocr.status==='unreadable')return{status:'unreadable',confidence:ocr.confidence,address:ocr.address||'',text:ocr.text||'',reason:ocr.reason};
  return{...compareAddress(ocr.address,registeredAddress,barangayName),text:ocr.text,confidence:ocr.confidence};
}

if(typeof process!=='undefined'&&process.on){
  process.on('exit',()=>{try{terminateOcrWorker()}catch(_){}});
  process.on('SIGTERM',()=>{try{terminateOcrWorker()}catch(_){}});
  process.on('SIGINT',()=>{try{terminateOcrWorker()}catch(_){}});
}

module.exports={verifyIdAddress,ocrId,extractAddress,extractName,extractDob,extractBarangay,extractSex,extractDocumentNumber,extractMRZ,preprocessImage,compareAddress,compareResidencyDocument,DOCUMENT_PROFILES,normalizeText,getCachedOcr,consumeCachedOcr,cacheOcr,terminateOcrWorker};
