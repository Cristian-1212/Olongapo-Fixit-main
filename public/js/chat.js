/* Ask FixIt AI widget — conversation stays in memory in this browser tab (text-only). */
let chatHistory=[],chatSending=false;
const CHAT_TEXT_ONLY='Ask FixIt currently supports text questions only and cannot read images or files. Please describe your question in text.';
const CHAT_SIGNIN='Please sign in to use the assistant. For emergencies, call 911.';
const CHAT_UNAVAILABLE='Sorry, the assistant is unavailable right now. Please try again later. For emergencies, call 911.';
const GUEST_SUGGESTIONS=[
 'What is Olongapo FixIt?',
 'How do I register?',
 'How do I submit a report?',
 'How do I track a report?',
 'What barangays are covered?',
 'What problems can I report?'
];
const STAFF_SUGGESTIONS=[
 'How many residents in Pag-asa?',
 'Find barangay officials',
 'Barangay clearance requirements',
 'Office hours for barangay hall'
];
const RESIDENT_SUGGESTIONS=[
 'How do I submit and track a report?',
 'What are the requirements for a barangay clearance?',
 'When is the barangay hall open?',
 'How do I contact my barangay officials?'
];

function chatEls(){return{panel:$('chat-panel'),toggle:$('chat-toggle'),list:$('chat-messages'),input:$('chat-input'),send:$('chat-send'),newBtn:$('chat-new'),status:$('chat-status'),suggestions:$('chat-suggestions'),form:document.querySelector('.chat-form')}}
function setChatStatus(msg,isError){const s=$('chat-status');if(!s)return;s.textContent=msg||'';s.className='chat-status'+(isError?' chat-status-error':'')}
function toggleChat(force){const {panel,toggle,list,input}=chatEls();if(!panel||!toggle)return;const open=force===undefined?panel.hidden:!!force;panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open){if(list&&!list.children.length)resetChatMessages();syncChatSuggestions();if(input)input.focus()}}
function resetChatMessages(){const {list,suggestions}=chatEls();if(!list)return;list.replaceChildren();appendChatBubble('assistant','Hello! I am Ask FixIt AI. I can help with barangay services and using Olongapo FixIt. What would you like to know?');if(suggestions)suggestions.hidden=false}
function newChat(){if(chatSending)return;chatHistory=[];setChatStatus('');resetChatMessages();const {input}=chatEls();if(input)input.focus()}
function createBubble(role,text){const bubble=document.createElement('article');bubble.className='chat-bubble '+(role==='user'?'chat-user':'chat-assistant');const body=document.createElement('p');body.textContent=String(text==null?'':text);bubble.append(body);return bubble}
function appendChatBubble(role,text,topic){const {list}=chatEls();if(!list)return;const bubble=createBubble(role,text);if(role==='assistant'&&topic){const feedback=document.createElement('div');feedback.className='chat-feedback';[['up','Helpful'],['down','Not helpful']].forEach(([vote,label])=>{const button=document.createElement('button');button.type='button';button.className='chat-feedback-btn';button.textContent=label;button.setAttribute('aria-label',label+' answer');button.addEventListener('click',()=>sendChatFeedback(button,topic,vote));feedback.append(button)});bubble.append(feedback)}list.append(bubble);list.scrollTop=list.scrollHeight}
function setChatTyping(typing){const {list}=chatEls();if(!list)return;let indicator=$('chat-typing');if(typing&&!indicator){indicator=document.createElement('div');indicator.id='chat-typing';indicator.className='chat-bubble chat-assistant chat-typing';indicator.setAttribute('role','status');indicator.setAttribute('aria-live','polite');indicator.textContent='Ask FixIt AI is typing…';list.append(indicator)}else if(!typing&&indicator)indicator.remove();list.scrollTop=list.scrollHeight}
function setChatBusy(busy){chatSending=busy;const {send,newBtn,input}=chatEls();if(send)send.disabled=busy;if(newBtn)newBtn.disabled=busy;if(input)input.setAttribute('aria-busy',busy?'true':'false')}
async function sendChatFeedback(button,topic,vote){button.disabled=true;try{await api('chat/feedback',{topic,vote});const wrap=button.closest('.chat-feedback');if(wrap)wrap.textContent='Thanks for your feedback.'}catch(e){button.disabled=false;setChatStatus(e&&e.message||'Could not send feedback.',true)}}
function buildUserFacingError(e){
  const status=e&&e.status,msg=e&&e.message||'';
  if(status===401){ME=null;if(typeof nav==='function')nav();return CHAT_SIGNIN}
  if(status===403)return `${msg||'Access denied.'} For emergencies, call 911.`;
  if(msg)return `${msg} For emergencies, call 911.`;
  return CHAT_UNAVAILABLE;
}
async function sendChatMessage(event){if(event)event.preventDefault();if(chatSending)return;const {input,suggestions}=chatEls();if(!input)return;const message=String(input.value||'').trim();if(!message)return;if(message.length>1000){setChatStatus('Please keep your message under 1,000 characters.',true);return}setChatBusy(true);setChatStatus('');if(suggestions)suggestions.hidden=true;appendChatBubble('user',message);setChatTyping(true);input.value='';try{const result=await api('chat',{message,history:chatHistory.slice(-10)}),topic=result&&result.topic||'other',reply=result&&typeof result.reply==='string'?result.reply:'Sorry, I could not generate a response right now.';chatHistory.push({role:'user',content:message},{role:'assistant',content:reply});chatHistory=chatHistory.slice(-10);appendChatBubble('assistant',reply,topic)}catch(e){const text=buildUserFacingError(e);appendChatBubble('assistant',text);if(e&&e.status&&e.status!==401)setChatStatus(text,true)}finally{setChatTyping(false);setChatBusy(false);if(input)input.focus()}}
function sendChatSuggestion(button){const {input}=chatEls();if(!input||!button)return;input.value=button.textContent||'';sendChatMessage()}
function syncChatSuggestions(){const wrap=$('chat-suggestions');if(!wrap)return;const isGuest=!ME||ME.id===0;const isStaff=ME&&['admin','brgy'].includes(ME.role);const isResident=ME&&ME.role==='res';let suggestions;
 if(isGuest)suggestions=GUEST_SUGGESTIONS;
 else if(isStaff)suggestions=STAFF_SUGGESTIONS;
 else if(isResident)suggestions=RESIDENT_SUGGESTIONS;
 else suggestions=GUEST_SUGGESTIONS;
 wrap.innerHTML=suggestions.map(text=>`<button type="button" class="chat-suggestion-btn" onclick="sendChatSuggestion(this)">${esc(text)}</button>`).join('');
 wrap.hidden=false}
function initChat(){
  const {panel,input,form}=chatEls();if(!panel||!input)return;resetChatMessages();syncChatSuggestions();
  if(form){form.addEventListener('submit',sendChatMessage)}
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(form&&typeof form.requestSubmit==='function')form.requestSubmit();else sendChatMessage()}});
  input.addEventListener('paste',e=>{const cd=e.clipboardData,items=cd&&cd.items;if(items){for(const it of items){if(it.type&&it.type.indexOf('image/')===0){e.preventDefault();setChatStatus(CHAT_TEXT_ONLY,true);return}}}if(cd&&cd.files&&cd.files.length){e.preventDefault();setChatStatus(CHAT_TEXT_ONLY,true)}});
  panel.addEventListener('dragover',e=>{const dt=e.dataTransfer;if(dt&&dt.types&&Array.from(dt.types).indexOf('Files')!==-1)e.preventDefault()});
  panel.addEventListener('drop',e=>{const dt=e.dataTransfer;if(dt&&dt.files&&dt.files.length){e.preventDefault();setChatStatus(CHAT_TEXT_ONLY,true)}});
}
initChat();
