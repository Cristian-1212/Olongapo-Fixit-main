/* Public pages: home, track, community, login, register */
const TRACK_COPY={
 title:'Track a Report',intro:'Enter the reference number you received after sending a report.',
 idLabel:'Report ID',placeholder:'OF-2026-000001',format:'Use this format: OF-YYYY-NNNNNN. Example: OF-2026-000001.',
 invalid:'Check the format. Enter an ID like OF-2026-000001.',
 submit:'Track report',loading:'Searching…',searching:'Looking for your report…',
 recent:'Recently tracked',emptyRecent:'Your recent report IDs will appear here.',
 lost:'Lost your report ID? Check your notifications.',
 notFoundTitle:'Report not found',notFoundText:'Check the ID for typing mistakes, then try again. If you still need help, check your notifications or contact your barangay.',
 timeline:['Submitted','Verified','In Progress','Resolved'],
 descriptions:['Your report was received.','An official checked your report.','Work is underway.','The issue has been resolved.'],
 waiting:'Waiting for this step',rejected:'This report was rejected. Check your notifications or contact your barangay for more information.',
 systemError:'We could not look up this report. Please try again.'
};
const TRACK_CODE_PATTERN=/^OF-\d{4}-\d{6}$/;
let TRACK_REQUEST=0,TRACK_IDS=[];
let OCR_ID='',OCR_REQ=0,OCR_RESULT=null,OCR_STATUS='idle',OCR_FILLED=new Set();
let PH_FRONT='',PH_BACK='',DOCUMENT_TYPE='',UPLOAD_MODE='front';
const DOCUMENT_TYPES=['Philippine National ID (PhilID/ePhilID)','PhilHealth ID','UMID','Philippine Driver\'s License','Philippine Passport','Postal ID','Voter\'s ID','Barangay Residency Document'];
const BACK_REQUIRED=new Set(['Philippine National ID (PhilID/ePhilID)','UMID','Philippine Driver\'s License',"Voter's ID"]);
function loadTrackedIds(){
 try{const values=JSON.parse(localStorage.getItem('fixitTrackedIds')||'[]');return Array.isArray(values)?values.filter(id=>typeof id==='string'&&TRACK_CODE_PATTERN.test(id)).slice(0,3):[]}
 catch(e){console.warn('Could not read recent report IDs from local storage.',e);return[]}
}
function saveTrackedId(id){
 TRACK_IDS=[id,...TRACK_IDS.filter(value=>value!==id)].slice(0,3);
 try{localStorage.setItem('fixitTrackedIds',JSON.stringify(TRACK_IDS))}
 catch(e){console.warn('Could not save recent report IDs to local storage.',e)}
 renderTrackedIds();
}
function renderTrackedIds(){
 const target=$('track-recent');if(!target)return;
 target.innerHTML=`<div class="track-recent-heading"><h3>${esc(TRACK_COPY.recent)}</h3><p>${TRACK_IDS.length?'Select an ID to look it up again.':esc(TRACK_COPY.emptyRecent)}</p></div>${TRACK_IDS.length?`<div class="track-recent-chips">${TRACK_IDS.map(id=>`<button type="button" class="track-chip" onclick="useTrackedReport('${id}')">${esc(id)}</button>`).join('')}</div>`:''}`;
}
function useTrackedReport(id){const input=$('tc');if(!input)return;input.value=id;trackInputChanged();doTrack()}
function trackInputChanged(){
 const input=$('tc');if(!input)return;
 const value=input.value.toUpperCase();if(input.value!==value)input.value=value;
 const error=$('track-id-error'),invalid=!!value&&!TRACK_CODE_PATTERN.test(value);
 error.hidden=!invalid;error.textContent=invalid?TRACK_COPY.invalid:'';
 input.setAttribute('aria-invalid',String(invalid));
 if($('tr'))$('tr').innerHTML='';
}
function home(){const st=P.stats||{};
 const reports=[['Total reports',st.total],['Resolved',st.resolved],['Open now',st.active],['Barangays reached',st.barangays]];
 $('app').innerHTML=`<div class="civic-home">
 <section class="signal-hero" aria-labelledby="home-title">
   <div class="signal-copy reveal"><p class="kicker">Olongapo City · Community desk</p><h1 id="home-title">Small reports.<br><em>Visible change.</em></h1><p class="hero-lede">Spot a problem on your street? Put it on the city’s radar and follow every handoff through to resolution.</p>
   <div class="hero-actions"><a class="signal-cta" href="#/new">Report an issue <span aria-hidden="true">→</span></a><a class="signal-link" href="#/track">Track a report <span aria-hidden="true">↗</span></a></div>
   <p class="quiet-promise">No call queue. No guessing. Your report gets a reference number instantly.</p></div>
   <aside class="signal-board reveal" aria-label="Community report activity"><div class="board-top"><span class="live-dot"></span> LIVE CITY SIGNAL</div><div class="board-number">${st.active??0}</div><p>issues currently moving through review and repair</p><div class="signal-lines" aria-hidden="true"><i></i><i></i><i></i><i></i></div><a href="#/community">See community reports <span aria-hidden="true">→</span></a></aside>
   <div class="hero-grid" aria-hidden="true"></div>
 </section>
 <section class="report-pulse" aria-labelledby="pulse-title"><div class="pulse-heading"><p class="kicker">The city, in motion</p><h2 id="pulse-title">Every report leaves a trail.</h2></div><div class="pulse-stats">${reports.map((x,i)=>`<div class="pulse-stat reveal" style="--i:${i}"><b>${x[1]??0}</b><span>${x[0]}</span></div>`).join('')}</div></section>
 <section class="route-section" aria-labelledby="route-title"><div class="route-intro"><p class="kicker">From sidewalk to solution</p><h2 id="route-title">One clear route.<br>Six accountable steps.</h2><p>FixIt sends each report to the people who can move it forward — while you stay in the loop.</p>${ME?'<a class="text-action" href="#/dash">Open my dashboard <span aria-hidden="true">→</span></a>':'<a class="text-action" href="#/register">Create a resident account <span aria-hidden="true">→</span></a>'}</div><ol class="report-route">${[['01','You flag it','Add a photo, location, and a quick description.'],['02','We check it','Initial verification keeps reports useful and focused.'],['03','It reaches the right desk','Barangay and city teams can review and assign it.'],['04','You see the outcome','Follow status updates until the work is complete.']].map((x,i)=>`<li class="reveal" style="--i:${i}"><span>${x[0]}</span><div><h3>${x[1]}</h3><p>${x[2]}</p></div></li>`).join('')}</ol></section>
 <section class="category-section" aria-labelledby="category-title"><div><p class="kicker">Make your neighborhood legible</p><h2 id="category-title">What needs attention?</h2></div><div class="category-cloud">${CATS.map((c,i)=>`<a class="category-tag tag-${i%4}" href="#/new" aria-label="Report ${esc(c)}">${esc(c)} <span aria-hidden="true">↗</span></a>`).join('')}</div></section>
 <section class="home-close"><p>Olongapo works better when the street-level details have somewhere to go.</p><a class="signal-cta light" href="#/new">Start a report <span aria-hidden="true">→</span></a></section>
 </div>`}
function track(){
 TRACK_IDS=loadTrackedIds();
 $('app').innerHTML=`<section class="track-page"><header class="track-header"><p class="eyebrow">REPORT LOOKUP</p><h2>${esc(TRACK_COPY.title)}</h2><p>${esc(TRACK_COPY.intro)}</p></header><form class="track-form" onsubmit="doTrack(event)" novalidate><label for="tc">${esc(TRACK_COPY.idLabel)}</label><div class="track-form-row"><input id="tc" name="code" type="text" maxlength="14" placeholder="${esc(TRACK_COPY.placeholder)}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="track-id-hint track-id-error"><button id="track-submit" class="btn track-submit" type="submit"><span>${esc(TRACK_COPY.submit)}</span></button></div><p id="track-id-hint" class="track-help">${esc(TRACK_COPY.format)}</p><p id="track-id-error" class="track-inline-error" role="alert" aria-live="polite" hidden></p></form><p class="track-notification-note">${esc(TRACK_COPY.lost)} <a href="#/notifs">View notifications</a></p><div id="track-recent"></div><div id="tr" class="track-result" aria-live="polite" aria-busy="false"></div></section>`;
 $('tc').addEventListener('input',trackInputChanged);renderTrackedIds();
}
function trackTimeline(report){
 const history=report.hist||[],status=String(report.status||'').toUpperCase();
 const entryFor=accepted=>history.filter(item=>accepted.includes(String(item.s||'').toUpperCase())).slice(-1)[0]||null;
 const stageEntries=[
  entryFor(['SUBMITTED','UNDER REVIEW'])||{at:report.created},
  entryFor(['VERIFIED','ASSIGNED']),
  entryFor(['IN PROGRESS']),
  entryFor(['RESOLVED'])
 ];
 const current={SUBMITTED:0,'UNDER REVIEW':0,VERIFIED:1,ASSIGNED:1,'IN PROGRESS':2,RESOLVED:3,REJECTED:Math.max(0,history.reduce((max,item)=>{const index={'SUBMITTED':0,'UNDER REVIEW':0,VERIFIED:1,ASSIGNED:1,'IN PROGRESS':2,RESOLVED:3}[String(item.s||'').toUpperCase()];return index===undefined?max:Math.max(max,index)},0))}[status]??0;
 return `<ol class="track-timeline" aria-label="Report status timeline">${TRACK_COPY.timeline.map((label,index)=>{
  const entry=stageEntries[index],completed=!!entry&&index<current,active=index===current;
  const description=index===3&&report.resolution?report.resolution:TRACK_COPY.descriptions[index];
  return `<li class="track-step ${completed?'is-complete':''} ${active?'is-current':''}"${active?' aria-current="step"':''}><span class="track-step-marker" aria-hidden="true">${completed?'✓':index+1}</span><div class="track-step-content"><div class="track-step-heading"><strong>${esc(label)}</strong><time${entry&&entry.at?` datetime="${esc(entry.at)}" title="${esc(fd(entry.at))}"`:''}>${entry&&entry.at?esc(fd(entry.at)):esc(TRACK_COPY.waiting)}</time></div><p>${esc(description)}</p></div></li>`
 }).join('')}</ol>`
}
function trackedReportMarkup(report){
 const rejected=String(report.status||'').toUpperCase()==='REJECTED';
 return `<article class="track-report-card"><header class="track-report-heading"><div><p class="eyebrow">REPORT FOUND</p><h3>${esc(report.code)}</h3><p>${esc(report.cat)} · ${esc(report.brgy)} · Submitted ${esc(fdate(report.created))}</p></div>${badge(report.status)}</header>${rejected?`<p class="track-rejected" role="status">${esc(TRACK_COPY.rejected)}</p>`:''}${trackTimeline(report)}${report.resolution?`<p class="track-resolution"><b>Resolution:</b> ${esc(report.resolution)}</p>`:''}</article>`
}
async function doTrack(event){
 if(event)event.preventDefault();
 const input=$('tc'),button=$('track-submit'),result=$('tr');if(!input||!button||!result)return;
 input.value=input.value.trim().toUpperCase();
 if(!TRACK_CODE_PATTERN.test(input.value)){const error=$('track-id-error');error.textContent=TRACK_COPY.invalid;error.hidden=false;input.setAttribute('aria-invalid','true');input.focus();return}
 $('track-id-error').hidden=true;input.setAttribute('aria-invalid','false');
 const code=input.value,request=++TRACK_REQUEST;saveTrackedId(code);
 button.disabled=true;button.setAttribute('aria-busy','true');button.innerHTML=`<span class="track-spinner" aria-hidden="true"></span>${esc(TRACK_COPY.loading)}`;
 result.setAttribute('aria-busy','true');result.innerHTML=`<p class="track-searching" role="status">${esc(TRACK_COPY.searching)}</p>`;
 try{
  const report=await api('track?code='+encodeURIComponent(code));if(request!==TRACK_REQUEST)return;
  result.innerHTML=report.found?trackedReportMarkup(report):`<div class="track-not-found" role="alert"><span class="track-not-found-icon" aria-hidden="true">?</span><div><h3>${esc(TRACK_COPY.notFoundTitle)}</h3><p>${esc(TRACK_COPY.notFoundText)}</p><a href="#/notifs">Check notifications</a></div></div>`;
 }catch(error){if(request===TRACK_REQUEST)result.innerHTML=`<p class="track-request-error" role="alert">${esc(error.message||TRACK_COPY.systemError)}</p>`}
 finally{if(request===TRACK_REQUEST&&button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');button.innerHTML=`<span>${esc(TRACK_COPY.submit)}</span>`;result.setAttribute('aria-busy','false')}}
}
function community(){$('app').innerHTML=`<div class="card"><h2>Community Reports</h2><div class="tw"><table><tr><th>Category</th><th>Barangay</th><th>General location</th><th>Status</th><th>Date</th></tr>${P.list.map(r=>`<tr><td>${esc(r.cat)}</td><td>${esc(r.brgy)}</td><td>Brgy. ${esc(r.brgy)}</td><td>${badge(r.status)}</td><td>${esc(fdate(r.date))}</td></tr>`).join('')}</table></div></div>`}
const DEMOS=[['Super Admin','admin@fixit.ph','admin123'],['Pag-asa Official','pagasa@fixit.ph','demo123'],['New Kalalake Official','newkalalake@fixit.ph','demo123'],['West Tapinac Official','westtapinac@fixit.ph','demo123'],['City Official','engineer@fixit.ph','demo123'],['Resident','resident@fixit.ph','demo123']];
function fillDemo(e,p){$('le').value=e;$('lp').value=p;$('lp').focus()}
function login(){$('app').innerHTML=`<div class="authbox card" data-enter="doLogin"><h2>Welcome back</h2><p class="mu">Log in to report problems or manage reports.</p>
 <label for="le">Email</label><input id="le" type="email" autocomplete="username"><label for="lp">Password</label><input id="lp" type="password" autocomplete="current-password">
 <button class="btn block" onclick="doLogin()">Log in</button><p id="lm" class="err" role="alert"></p><p class="mu">New here? <a href="#/register">Create an account</a></p>
 <details class="demo"><summary>Try a demo account</summary><div class="chips">${DEMOS.map(d=>`<button class="chip" onclick="fillDemo('${d[1]}','${d[2]}')">${d[0]}</button>`).join('')}</div></details></div>`;$('le').focus()}
async function doLogin(){$('lm').textContent='';await guarded(async()=>{await api('login',{email:$('le').value,password:$('lp').value});toast('Welcome back!','ok');goto('#/dash')},'lm')}
function register(){PH='';PH_FRONT='';PH_BACK='';DOCUMENT_TYPE='';UPLOAD_MODE='front';const B=allowedBarangays();
 $('app').innerHTML=`<div class="reg-page">
  <div class="reg-card" data-enter="doReg">
   <header class="reg-header">
    <div class="reg-brand">Olongapo <b>FixIt</b></div>
    <h1 class="reg-title">Create your resident account</h1>
    <p class="reg-subtitle">Join Olongapo FixIt to report community problems, track their progress, and receive updates from your barangay officials. All information you provide will be verified before your account is activated.</p>
   </header>
    <ol class="reg-progress" aria-label="Registration progress">
     <li class="active"><span>1</span><strong>Personal</strong></li>
     <li><span>2</span><strong>Residence & document</strong></li>
     <li><span>3</span><strong>Account</strong></li>
    </ol>
   <form id="regForm" novalidate>
    <section class="reg-section">
     <div class="reg-section-head">
      <h2 class="reg-section-title"><span class="reg-sec-icon">👤</span>Personal Information</h2>
      <p class="reg-section-desc">Tell us about yourself so we can create your account.</p>
     </div>
     <div class="reg-cols">
      <div class="reg-field">
       <label class="reg-label"><span class="reg-icon">👤</span>Complete Name<span class="reg-req" aria-hidden="true">*</span></label>
       <input id="rn" type="text" placeholder="Juan Dela Cruz" autocomplete="name" required>
       <p class="reg-err" id="er-rn"></p>
      </div>
      <div class="reg-field">
       <label class="reg-label"><span class="reg-icon">✉️</span>Email Address<span class="reg-req" aria-hidden="true">*</span></label>
       <input id="re" type="email" placeholder="juan@example.com" autocomplete="email" required>
       <p class="reg-err" id="er-re"></p>
      </div>
      <div class="reg-field">
       <label class="reg-label"><span class="reg-icon">📞</span>Contact Number<span class="reg-req" aria-hidden="true">*</span></label>
       <input id="rph" type="tel" placeholder="0917 000 0000" autocomplete="tel" required>
       <p class="reg-err" id="er-rph"></p>
      </div>
      <div class="reg-field">
       <label class="reg-label"><span class="reg-icon">🎂</span>Age<span class="reg-req" aria-hidden="true">*</span></label>
       <input id="ra" type="number" min="13" max="120" inputmode="numeric" placeholder="25" required>
       <p class="reg-err" id="er-ra"></p>
      </div>
      <div class="reg-field">
       <label class="reg-label"><span class="reg-icon">📅</span>Date of Birth<span class="reg-req" aria-hidden="true">*</span></label>
       <input id="rbd" type="date" required>
       <p class="reg-err" id="er-rbd"></p>
      </div>
      <div class="reg-field">
       <label class="reg-label" for="rgn"><span class="reg-icon">⚧</span>Sex<span class="reg-req" aria-hidden="true">*</span></label>
       <select id="rgn" required>
        <option value="">Select sex</option>
        <option>Male</option>
        <option>Female</option>
        <option>Other</option>
        <option>Prefer not to say</option>
       </select>
       <p class="reg-err" id="er-rgn"></p>
      </div>
      <div class="reg-field">
       <label class="reg-label" for="rcivil"><span class="reg-icon">💍</span>Civil Status</label>
       <select id="rcivil">
        <option value="">Select civil status</option>
        <option>Single</option>
        <option>Married</option>
        <option>Widowed</option>
        <option>Separated</option>
        <option>Divorced</option>
       </select>
       <p class="reg-err" id="er-rcivil"></p>
      </div>
      <div class="reg-field" id="rgnOtherWrap" hidden>
        <label class="reg-label" for="rgnOther">Specify gender<span class="reg-req" aria-hidden="true">*</span></label>
        <input id="rgnOther" type="text" maxlength="100" placeholder="Please specify">
        <p class="reg-err" id="er-rgnOther"></p>
      </div>
     </div>
    </section>
    <section class="reg-section">
     <div class="reg-section-head">
      <h2 class="reg-section-title"><span class="reg-sec-icon">🏠</span>Residential Information</h2>
      <p class="reg-section-desc">Where do you live? This helps us assign your reports to the right barangay.</p>
     </div>
     <div class="reg-cols">
      <div class="reg-field full">
       <label class="reg-label"><span class="reg-icon">🏠</span>Complete Residential Address<span class="reg-req" aria-hidden="true">*</span></label>
       <input id="rad" type="text" placeholder="House no., street, purok / zone, barangay" autocomplete="street-address" required>
       <p class="reg-err" id="er-rad"></p>
      </div>
      <div class="reg-field full">
       <label class="reg-label"><span class="reg-icon">📍</span>Barangay<span class="reg-req" aria-hidden="true">*</span></label>
       <select id="rb" required>
        <option value="">Select your barangay…</option>${B.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('')}
       </select>
       <p class="reg-hint">Your barangay officials will verify your residency.</p>
       <p class="reg-err" id="er-rb"></p>
      </div>
     </div>
    </section>
    <section class="reg-section">
     <div class="reg-section-head">
      <h2 class="reg-section-title"><span class="reg-sec-icon">📄</span>Proof of residency</h2>
      <p class="reg-section-desc">Upload a document that proves you live in your selected barangay.</p>
     </div>
     <div class="reg-cols">
       <div class="reg-field full">
        <label class="reg-label" for="ridType"><span class="reg-icon">📋</span>ID / Document Type<span class="reg-req" aria-hidden="true">*</span></label>
        <select id="ridType" required onchange="onDocumentTypeChange(this.value)">
         <option value="">Select document type…</option>${DOCUMENT_TYPES.map(type=>`<option value="${esc(type)}">${esc(type)}</option>`).join('')}
        </select>
        <p class="reg-err" id="er-ridType"></p>
       </div>
       <fieldset class="reg-upload-mode" aria-describedby="uploadModeHint">
        <legend>Upload mode</legend>
        <label><input type="radio" name="uploadMode" value="front" checked onchange="onUploadModeChange(this.value)"> <strong>Front Only</strong></label>
        <label><input type="radio" name="uploadMode" value="back" onchange="onUploadModeChange(this.value)"> <strong>Front and Back</strong></label>
        <p id="uploadModeHint" class="reg-hint">Upload the front of your ID first. Upload the back only if you select Front and Back.</p>
       </fieldset>
       <div class="reg-field full" id="governmentFrontField" hidden>
        <label class="reg-label" for="rf"><span class="reg-icon">📎</span>Front Image<span class="reg-req" aria-hidden="true">*</span></label>
        <div class="reg-upload" id="regUpload">
         <input id="rf" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onchange="regFile(this)">
         <div class="reg-dropzone">
          <div class="reg-drop-icon">📎</div>
          <div class="reg-drop-text"><strong>Drag and drop your document here, or click to browse.</strong></div>
          <div class="reg-drop-hint">Accepted: JPG or PNG · Maximum 5 MB</div>
         </div>
         <div class="reg-file-preview" id="regFilePreview">
          <div class="reg-file-item" id="regFileItem" style="display:none">
           <span class="reg-file-icon">📄</span>
           <span class="reg-file-name" id="regFileName">No file selected</span>
           <button type="button" class="reg-file-remove" onclick="regRemove()" aria-label="Remove uploaded file">Remove</button>
          </div>
          <img id="regFileImage" class="reg-id-preview" alt="Uploaded ID preview" hidden>
         </div>
        </div>
        <p class="reg-hint">Upload a clear front image of the selected document.</p>
        <div class="reg-ocr-status" id="regOcrStatus" role="status" aria-live="polite"></div>
        <div class="reg-ocr-extracted" id="regOcrExtracted" role="status" aria-live="polite"></div>
        <button type="button" class="reg-ocr-retry" id="regOcrRetry" style="display:none" onclick="regOcrRetry()">Retry OCR</button>
        <p class="reg-err" id="er-rf"></p>
       </div>
       <div class="reg-field full" id="governmentBackField" hidden>
        <label class="reg-label" for="rbk"><span class="reg-icon">📎</span>Back Image<span class="reg-req" aria-hidden="true">*</span></label>
        <input id="rbk" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onchange="regBackFile(this)">
        <div id="rbkPreview" class="photo-preview"></div>
        <p class="reg-err" id="er-rbk"></p>
       </div>
     </div>
    </section>
    <section class="reg-section">
     <div class="reg-section-head">
      <h2 class="reg-section-title"><span class="reg-sec-icon">🔐</span>Account Security</h2>
      <p class="reg-section-desc">Create a secure password to protect your account.</p>
     </div>
     <div class="reg-cols">
      <div class="reg-field full">
       <label class="reg-label"><span class="reg-icon">🔒</span>Password<span class="reg-req" aria-hidden="true">*</span></label>
       <div class="reg-pass-wrap">
        <input id="rp" type="password" autocomplete="new-password" placeholder="Create a strong password" required>
        <button type="button" class="reg-pass-toggle" onclick="regToggle('rp')" aria-label="Show password" aria-pressed="false">👁️</button>
       </div>
       <p class="reg-hint" id="regPassReq">8-128 characters; include uppercase, lowercase, and a number</p>
       <p class="reg-strength" id="regStrength"></p>
       <p class="reg-err" id="er-rp"></p>
      </div>
      <div class="reg-field full">
       <label class="reg-label"><span class="reg-icon">🔁</span>Confirm Password<span class="reg-req" aria-hidden="true">*</span></label>
       <div class="reg-pass-wrap">
        <input id="rc" type="password" autocomplete="new-password" placeholder="Enter your password again" required>
        <button type="button" class="reg-pass-toggle" onclick="regToggle('rc')" aria-label="Show password" aria-pressed="false">👁️</button>
       </div>
       <p class="reg-err" id="er-rc"></p>
      </div>
     </div>
    </section>
    <div class="reg-actions">
     <button type="button" class="reg-btn" id="regBtn" onclick="doReg()">Create Account</button>
     <p class="reg-link">Already registered? <a href="#/login">Log in</a></p>
    </div>
   </form>
  </div>
 </div>`;$('rn').focus();
 const up=$('regUpload');
 up.ondragover=e=>{e.preventDefault();up.classList.add('reg-drag')};
 up.ondragleave=e=>{e.preventDefault();up.classList.remove('reg-drag')};
 up.ondrop=e=>{e.preventDefault();up.classList.remove('reg-drag');const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)regSetFile(f)}}
  const genderSelect=$('rgn');
  if(genderSelect)genderSelect.onchange=()=>{const wrap=$('rgnOtherWrap'),show=genderSelect.value==='Other';wrap.hidden=!show;$('rgnOther').required=show;if(!show){$('rgnOther').value='';$('er-rgnOther').textContent='' }};
  const passwordInput=$('rp'),strength=$('regStrength');
  if(passwordInput&&strength){
   passwordInput.addEventListener('input',()=>{
    const value=passwordInput.value;
    let score=0;
    if(value.length>=8)score++;
    if(/[A-Z]/.test(value)&&/[a-z]/.test(value))score++;
    if(/[0-9]/.test(value))score++;
    if(/[^A-Za-z0-9]/.test(value))score++;
    const labels=['Add a stronger password','Weak','Fair','Good','Strong'];
    strength.textContent=value?labels[Math.max(1,score)]:labels[0];
    strength.style.color=score>=4?'var(--ok)':score>=2?'var(--warn)':'var(--er)';
    strength.dataset.score=String(score);
   });
  }
  function updateRegistrationProgress(){
   const steps=[...document.querySelectorAll('.reg-progress li')];
   if(!steps.length)return;
   const personal=['rn','re','rph','ra','rbd','rgn'].every(id=>$(id)&&$(id).value.trim());
   const residence=['rad','rb','ridType'].every(id=>$(id)&&$(id).value);
   const account=$('rp')&&$('rc')&&$('rp').value.length>=8&&$('rp').value===$('rc').value;
   steps.forEach((step,index)=>{const active=index===0?personal&&!residence:index===1?residence&&!account:index===2?account:true;step.classList.toggle('active',active);step.classList.toggle('complete',index===0&&personal||index===1&&residence||index===2&&account)});
  }
  document.querySelectorAll('#regForm input,#regForm select').forEach(control=>{control.addEventListener('input',updateRegistrationProgress);control.addEventListener('change',updateRegistrationProgress)});
 async function regSetFile(file){const item=$('regFileItem'),name=$('regFileName'),preview=$('regFileImage');if(!file){PH='';PH_FRONT='';item.style.display='none';if(preview){preview.hidden=true;preview.removeAttribute('src')}name.textContent='No file selected';regClearOcr();return}if(!/^image\/(jpeg|png)$/.test(file.type)){toast('Only JPG or PNG ID images are allowed.','err');return}if(file.size>5e6){toast('File must be under 5 MB.','err');return}try{PH=await readDataURL(file);PH_FRONT=PH;item.style.display='flex';name.textContent=file.name+' · '+(file.size/1024).toFixed(0)+' KB';if(preview){preview.src=PH;preview.hidden=false}}catch(e){PH='';PH_FRONT='';item.style.display='none';regClearOcr();toast(e.message,'err');return}regClearOcr();startOcr(PH)}
function regFile(inp){regSetFile(inp.files[0]);}
function regRemove(){const inp=$('rf');inp.value='';regSetFile(null);}
function onUploadModeChange(mode){
 UPLOAD_MODE=mode==='back'?'back':'front';
 const govBack=$('governmentBackField');
 if(govBack)govBack.hidden=UPLOAD_MODE==='front'||!DOCUMENT_TYPE;
 if(UPLOAD_MODE==='front'){PH_BACK='';if($('rbk'))$('rbk').value='';if($('rbkPreview'))$('rbkPreview').innerHTML='';regClearOcr();if(PH_FRONT)startOcr(PH_FRONT)}
}
function onDocumentTypeChange(type){
 DOCUMENT_TYPE=DOCUMENT_TYPES.includes(type)?type:'';
 const isResidence=DOCUMENT_TYPE==='Barangay Residency Document';
 if(isResidence){
  UPLOAD_MODE='front';
  document.querySelectorAll('input[name="uploadMode"]').forEach(radio=>{radio.checked=radio.value==='front'});
  PH_BACK='';
  if($('rbk'))$('rbk').value='';
  if($('rbkPreview'))$('rbkPreview').innerHTML='';
 }
 const govFront=$('governmentFrontField'),govBack=$('governmentBackField');
 if(govFront)govFront.hidden=!DOCUMENT_TYPE;
 if(govBack)govBack.hidden=UPLOAD_MODE==='front'||!DOCUMENT_TYPE;
 const frontLabel=govFront&&govFront.querySelector('label');
 const hint=govFront&&govFront.querySelector('.reg-hint');
 if(frontLabel)frontLabel.innerHTML=isResidence?'<span class="reg-icon">🏠</span>Barangay Residency Document Image<span class="reg-req" aria-hidden="true">*</span>':'<span class="reg-icon">📎</span>Front Image<span class="reg-req" aria-hidden="true">*</span>';
 if(hint)hint.textContent=isResidence?'Upload a clear Barangay Certificate of Residency or officially accepted residency document. Only this front image is required.':'Upload a clear front image of the selected document.';
 regClearOcr();clearDocumentFiles(isResidence);
}
function clearDocumentFiles(isResidence){
 PH='';PH_FRONT='';if($('rf'))$('rf').value='';
 if($('regFileItem'))$('regFileItem').style.display='none';
 if($('regFileImage')){$('regFileImage').hidden=true;$('regFileImage').removeAttribute('src')}
 PH_BACK='';if($('rbk'))$('rbk').value='';
 if($('rbkPreview'))$('rbkPreview').innerHTML='';
}
async function regBackFile(inp){
 try{const file=inp.files[0];if(!file)return;if(!/^image\/(jpeg|png)$/.test(file.type))throw new Error('Only JPG or PNG images are allowed.');if(file.size>5e6)throw new Error('Image must be under 5 MB.');PH_BACK=await readImg(file,1200);$('rbkPreview').innerHTML=PH_BACK?`<img class="ph" src="${PH_BACK}" alt="Back document image preview">`:'';$('er-rbk').textContent=''}
 catch(e){PH_BACK='';inp.value='';$('rbkPreview').innerHTML=`<span class="err">${esc(e.message)}</span>`;$('er-rbk').textContent=e.message}
}
function regClearOcr(){OCR_REQ++;OCR_ID='';OCR_RESULT=null;OCR_STATUS='idle';OCR_FILLED=new Set();const st=$('regOcrStatus'),ex=$('regOcrExtracted'),retry=$('regOcrRetry');if(st)st.textContent='';if(ex)ex.textContent='';if(retry)retry.style.display='none'}
async function startOcr(dataUrl){
 const req=++OCR_REQ;
 const st=$('regOcrStatus');
 const ex=$('regOcrExtracted'),retry=$('regOcrRetry');
 if(st){st.textContent='Reading information from your document...';st.className='reg-ocr-status reg-ocr-busy'}
 if(ex)ex.textContent='';if(retry)retry.style.display='none';
 try{
  const result=await api('ocr',{proof:dataUrl,documentType:DOCUMENT_TYPE,uploadMode:UPLOAD_MODE,front:dataUrl,back:UPLOAD_MODE==='back'?(PH_BACK||undefined):undefined});
  if(req!==OCR_REQ)return;
  OCR_RESULT=result;OCR_STATUS=result.status;
  if(result.status==='readable'){OCR_ID=result.ocrId;applyOcrResult(result);if(st){const confidence=result.fieldConfidence||{};const available=Object.values(confidence).filter(value=>Number(value)>0).length;st.textContent=available<2?'Some information could not be detected. Please review the extracted fields.':'Information extracted successfully. Please review the fields.';st.className='reg-ocr-status reg-ocr-success'}}
  else{if(st){st.textContent='Unable to read the document. Please upload a clearer image.';st.className='reg-ocr-status reg-ocr-error'}if(retry)retry.style.display='inline-block'}
 }catch(e){if(req!==OCR_REQ)return;if(st){st.textContent='Unable to read the document. OCR service unavailable. Please try again.';st.className='reg-ocr-status reg-ocr-error'}if(retry)retry.style.display='inline-block'}
}
function applyOcrResult(result){
 const name=$('rn'),dob=$('rbd'),rad=$('rad'),rb=$('rb'),sex=$('rgn');
 const address=result.address||'',barangay=result.barangay||'';
 if(name&&!name.value.trim()&&result.name){name.value=result.name;name.dispatchEvent(new Event('input',{bubbles:true}));name.dispatchEvent(new Event('change',{bubbles:true}));OCR_FILLED.add('rn')}
 if(dob&&!dob.value&&result.dob){dob.value=result.dob;dob.dispatchEvent(new Event('input',{bubbles:true}));dob.dispatchEvent(new Event('change',{bubbles:true}));OCR_FILLED.add('rbd')}
 if(rad&&!rad.value.trim()&&address){rad.value=address;rad.dispatchEvent(new Event('input',{bubbles:true}));rad.dispatchEvent(new Event('change',{bubbles:true}));OCR_FILLED.add('rad')}
 if(sex&&!sex.value&&result.sex&&['Male','Female'].includes(result.sex)){sex.value=result.sex;sex.dispatchEvent(new Event('change',{bubbles:true}))}
 const ex=$('regOcrExtracted');
 if(ex){
  const brgySel=rb&&rb.value?rb.options[rb.selectedIndex]?.text||'':'';
  const normalizeKey=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const normalizedAddress=normalizeKey(address+' '+barangay),normalizedBarangay=normalizeKey(brgySel);
  const addrStatus=!brgySel?'Please select a barangay':normalizedBarangay&&normalizedAddress.includes(normalizedBarangay)?'Address appears to match selected barangay':'Address requires manual review';
  ex.innerHTML=`<strong>${esc(addrStatus)}</strong>${address?' · '+esc(address):''}`;
 }
}
async function regOcrRetry(){
 const req=++OCR_REQ;
 const st=$('regOcrStatus'),retry=$('regOcrRetry');
 const image=PH_FRONT||PH;
 if(!image)return;
 if(st){st.textContent='Reading information from your document...';st.className='reg-ocr-status reg-ocr-busy'}
 if(retry)retry.style.display='none';
 try{
  const result=await api('ocr',{proof:image,documentType:DOCUMENT_TYPE,uploadMode:UPLOAD_MODE,front:PH_FRONT||image,back:UPLOAD_MODE==='back'?(PH_BACK||undefined):undefined});
  if(req!==OCR_REQ)return;
  OCR_RESULT=result;OCR_STATUS=result.status;
  if(result.status==='readable'){OCR_ID=result.ocrId;applyOcrResult(result);if(st){const confidence=result.fieldConfidence||{};const available=Object.values(confidence).filter(value=>Number(value)>0).length;st.textContent=available<2?'Some information could not be detected. Please review the extracted fields.':'Information extracted successfully. Please review the fields.';st.className='reg-ocr-status reg-ocr-success'}}
  else{if(st){st.textContent='Unable to read the document. Please upload a clearer image.';st.className='reg-ocr-status reg-ocr-error'}if(retry)retry.style.display='inline-block'}
 }catch(e){if(req!==OCR_REQ)return;if(st){st.textContent='Unable to read the document. OCR service unavailable. Please try again.';st.className='reg-ocr-status reg-ocr-error'}if(retry)retry.style.display='inline-block'}
}
function regToggle(id){const i=$(id),b=i.parentElement.querySelector('.reg-pass-toggle');const show=i.type!=='password';i.type=show?'text':'password';b.setAttribute('aria-pressed',show);b.textContent=show?'🙈':'👁️';}
function regClear(){['rn','re','rph','ra','rbd','rgn','rcivil','rgnOther','rad','rb','ridType','rf','rbk','rp','rc'].forEach(id=>{const e=$('er-'+id),input=$(id);if(e)e.textContent='';if(input)input.removeAttribute('aria-invalid')})}
function regErr(field,msg){const e=$('er-'+field),input=$(field);if(e)e.textContent=msg;if(input)input.setAttribute('aria-invalid','true')}
async function doReg(){
 const btn=$('regBtn');regClear();
 if(!$('rn').value.trim()){regErr('rn','Please enter your complete name.');$('rn').focus();return}
 if(!$('re').value.trim()){regErr('re','Please enter your email address.');$('re').focus();return}
 if(!/^\S+@\S+\.\S+$/.test($('re').value.trim())){regErr('re','Please enter a valid email address.');$('re').focus();return}
 if(!$('rph').value.trim()){regErr('rph','Please enter your contact number.');$('rph').focus();return}
 const age=Number($('ra').value);if(!$('ra').value||!Number.isInteger(age)||age<13||age>120){regErr('ra','Please enter a valid age between 13 and 120.');$('ra').focus();return}
 if(!$('rbd').value){regErr('rbd','Please enter your date of birth.');$('rbd').focus();return}
 if(!$('rgn').value){regErr('rgn','Please select your gender.');$('rgn').focus();return}
 if($('rgn').value==='Other'&&!$('rgnOther').value.trim()){regErr('rgnOther','Please specify your gender.');$('rgnOther').focus();return}
 if(!$('rad').value.trim()){regErr('rad','Please enter your complete residential address.');$('rad').focus();return}
 if(!$('rb').value){regErr('rb','Please select your barangay.');$('rb').focus();return}
 if(!DOCUMENT_TYPE){regErr('ridType','Please select an ID or document type.');$('ridType').focus();return}
 if(DOCUMENT_TYPE==='Barangay Residency Document'){
  if(!PH_FRONT){regErr('rf','Please upload the Barangay Residency Document front image.');$('rf').focus();return}
 }else{
  if(!PH_FRONT){regErr('rf','Please upload the front image of your document.');$('rf').focus();return}
  if(UPLOAD_MODE==='back'&&!PH_BACK){regErr('rbk','Please upload the back image of your document.');$('rbk').focus();return}
 }
 const password=$('rp').value;if(password.length<8||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)){regErr('rp','Use 8-128 characters with uppercase, lowercase, and a number.');$('rp').focus();return}
 if(password!==$('rc').value){regErr('rc','Passwords do not match.');$('rc').focus();return}
 btn.disabled=true;btn.innerHTML='<span class="reg-loader"></span> Creating account…';
 try{
  const result=await api('register',{name:$('rn').value.trim(),email:$('re').value.trim().toLowerCase(),phone:$('rph').value.trim(),age:+$('ra').value,dob:$('rbd').value,sex:$('rgn').value,gender:$('rgn').value,civilStatus:$('rcivil').value,customGender:$('rgnOther').value.trim(),address:$('rad').value.trim(),brgy:+$('rb').value,documentType:DOCUMENT_TYPE,uploadMode:UPLOAD_MODE,proof:PH_FRONT||PH,front:PH_FRONT||undefined,back:UPLOAD_MODE==='back'?(PH_BACK||undefined):undefined,password,ocrId:OCR_ID||undefined});
  PH='';btn.innerHTML='<span class="reg-ok">✓</span> Account created!';
  toast(result.verification&&result.verification.status==='verified'?'Account created and address verified.': 'Account created. Your address is pending barangay review.','ok');
  setTimeout(()=>{goto('#/dash');btn.disabled=false;btn.innerHTML='Create Account';},1200)
 }catch(e){
  btn.disabled=false;btn.innerHTML='Create Account';
  const msg=e.message||'Registration failed. Please try again.';
  if(/email already/i.test(msg)){regErr('re',msg);$('re').focus()}
  else if(/document type|ID Type/i.test(msg)){regErr('ridType',msg);$('ridType').focus()}
  else if(/back image/i.test(msg)){regErr('rbk',msg);$('rbk').focus()}
  else if(/proof|ID|address|OCR|barcode|front image/i.test(msg)){regErr('rf',msg);$('rf').focus()}
  else if(/barangay/i.test(msg)){regErr('rb',msg);$('rb').focus()}
  else if(/age/i.test(msg)){regErr('ra',msg);$('ra').focus()}
  else toast(msg,'err')
 }
}
