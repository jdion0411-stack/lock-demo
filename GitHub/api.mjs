import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
const encoder=new TextEncoder(),decoder=new TextDecoder();
const symbols=Array.from('♩♪♫♬♭♮♯𝄞𝄢𝄡𝄆𝄇𝄐𝄑𝄪𝄫'),magic=encoder.encode('EYENOTE1');
const ttl=20*60*1000;
const json=(value,status=200,headers={})=>Response.json(value,{status,headers});
const bytesEqual=(a,b)=>a.length===b.length&&a.reduce((difference,value,index)=>difference|(value^b[index]),0)===0;
function equal(a,b){return typeof a==='string'&&typeof b==='string'&&bytesEqual(encoder.encode(a),encoder.encode(b));}
function random(size){return crypto.getRandomValues(new Uint8Array(size));}
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
function join(...arrays){const result=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const a of arrays){result.set(a,offset);offset+=a.length;}return result;}
export const toNotes=bytes=>Array.from(bytes,b=>symbols[b>>4]+symbols[b&15]).join('');
export function fromNotes(text){const chars=Array.from(text.replace(/\s/g,''));if(chars.length%2||chars.length>2000000)throw Error('Invalid musical message.');const out=new Uint8Array(chars.length/2);for(let i=0;i<chars.length;i+=2){const a=symbols.indexOf(chars[i]),b=symbols.indexOf(chars[i+1]);if(a<0||b<0)throw Error('Invalid musical message.');out[i/2]=(a<<4)|b;}return out;}
async function derive(password,salt){const bytes=await pbkdf2Async(sha256,encoder.encode(password),salt,{c:310000,dkLen:32,asyncTick:10});try{return await crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['encrypt','decrypt']);}finally{bytes.fill(0);}}
export async function encryptNotes(text,password){const salt=random(16),iv=random(12),key=await derive(password,salt);const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:magic,tagLength:128},key,encoder.encode(text)));return toNotes(join(magic,salt,iv,ciphertext));}
export async function decryptNotes(notes,password){const bytes=fromNotes(notes);if(bytes.length<53||!bytesEqual(bytes.subarray(0,8),magic))throw Error('Invalid message');const key=await derive(password,bytes.subarray(8,24));return decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.subarray(24,36),additionalData:magic,tagLength:128},key,bytes.subarray(36)));}
function array(value){if(Array.isArray(value))return value;try{return JSON.parse(value||'[]');}catch{return [];}}
function rules(env){return {pin:env.TARGET_PIN||'',song:env.TARGET_SONG||'',combination:env.TARGET_COMBINATION||'',color:(env.CORRECT_COLOR||'').toLowerCase(),colorId:Number(env.TARGET_PIN_COLOR_ID),music:env.TARGET_MUSIC_CREDENTIAL||'1-2-3-4-5-6-7-8-9-10-11-12-13-14-15-16'};}
function lockMatches(body,r){const colors=array(body.colors);return !!r.song&&!!r.combination&&/^#[0-9a-f]{6}$/.test(r.color)&&equal(body.combination,r.combination)&&colors.length===r.combination.length&&colors.every(c=>typeof c==='string'&&c.toLowerCase()===r.color)&&equal(String(body.musicCredential||''),r.music);}
// Legacy Durable Object interface; SQLite-backed storage is configured in Wrangler.
export class EotaApi {
 constructor(state,env){this.state=state;this.env=env;this.cryptoTasks=0;}
 async session(request){const token=(request.headers.get('Cookie')||'').split(';').map(c=>c.trim()).find(c=>c.startsWith('eyeota_session='))?.slice(15);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const value=await this.state.storage.get('session:'+token);return value&&value.expires>Date.now()?{token,value}:null;}
 async saveSession(entry){await this.state.storage.put('session:'+entry.token,entry.value);if(!await this.state.storage.getAlarm())await this.state.storage.setAlarm(Date.now()+10*60*1000);}
 async alarm(){const values=await this.state.storage.list();let keep=false;for(const [key,value] of values){if((key.startsWith('session:')||key.startsWith('rate:'))){if((value.expires||value.until)<=Date.now())await this.state.storage.delete(key);else keep=true;}}if(keep)await this.state.storage.setAlarm(Date.now()+10*60*1000);}
 async fetch(request){try{return await this.handle(request);}catch{return json({verified:false,reason:'INVALID_REQUEST'},400);}}
 async handle(request){
  const url=new URL(request.url),path=url.pathname,r=rules(this.env);
  if(request.method==='POST'&&request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({verified:false,reason:'ORIGIN_NOT_ALLOWED'},403);
  if(request.method==='GET'&&path==='/api/public-config')return json({combinationLength:r.combination.length||5});
  if(request.method==='GET'&&path==='/api/access-status'){const entry=await this.session(request);return json({cipher:!!entry?.value.cipher,acoustic:!!entry?.value.acoustic});}
  if(request.method==='GET'&&path==='/api/analytics/config')return json({enabled:this.env.ANALYTICS_ENABLED==='true'});
  if(request.method==='GET'&&path==='/api/analytics/report'){
   if(!this.env.ANALYTICS_ADMIN_TOKEN||!equal(request.headers.get('Authorization'),`Bearer ${this.env.ANALYTICS_ADMIN_TOKEN}`))return json({error:'ADMIN_VERIFICATION_REQUIRED'},403);
   return json({counts:Object.fromEntries(await this.state.storage.list({prefix:'analytics:'}))});
  }
  if(request.method!=='POST')return json({reason:'NOT_FOUND'},404);
  if(Number(request.headers.get('Content-Length')||0)>27*1024*1024)return json({reason:'INVALID_REQUEST'},413);
  if(path==='/api/verify')return this.verifyAudio(request,r);
  const raw=await request.text();if(encoder.encode(raw).length>2*1024*1024)return json({reason:'INVALID_REQUEST'},413);
  let body;try{body=raw?JSON.parse(raw):{};}catch{return json({reason:'INVALID_REQUEST'},400);}
  if(path==='/api/analytics/collect'){
   if(this.env.ANALYTICS_ENABLED!=='true'||body.collectionAllowed!==true||request.headers.get('DNT')==='1'||request.headers.get('Sec-GPC')==='1')return json({collected:false});
   if(!['site_load','dial_view'].includes(body.event)||typeof body.mode!=='string'||!/^[a-z-]{1,40}$/.test(body.mode))return json({collected:false},400);
   const location=request.cf||{},day=new Date().toISOString().slice(0,10),domain=url.hostname;
   const key='analytics:'+JSON.stringify([day,domain,body.event,body.mode,String(location.city||'Unknown').slice(0,80),String(location.region||'Unknown').slice(0,80),String(location.country||'Unknown').slice(0,10)]);
   await this.state.storage.transaction(async storage=>{await storage.put(key,(await storage.get(key)||0)+1);});
   return json({collected:true});
  }
  if(path==='/api/verify-pin'){
   if(!/^\d{4}$/.test(r.pin)||!/^#[0-9a-f]{6}$/.test(r.color)||!Number.isInteger(r.colorId)||r.colorId<1||r.colorId>26)return json({verified:false,reason:'SERVER_CONFIGURATION_ERROR'},503);
   const {pin,colorIds,colors,scope}=body;if(!['cipher','acoustic'].includes(scope))return json({verified:false,reason:'INVALID_SCOPE'},400);
   const ipHash=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(request.headers.get('CF-Connecting-IP')||'unknown'))));
   const rateKey='rate:'+ipHash+'|'+scope;
   const correct=equal(pin,r.pin)&&Array.isArray(colorIds)&&colorIds.length===4&&colorIds.every(x=>x===r.colorId)&&Array.isArray(colors)&&colors.length===4&&colors.every(x=>typeof x==='string'&&x.toLowerCase()===r.color);
   const outcome=await this.state.storage.transaction(async storage=>{let rate=await storage.get(rateKey);if(rate?.until>Date.now()&&rate.count>=5)return 'limited';if(correct){await storage.delete(rateKey);return 'correct';}if(!rate||rate.until<=Date.now())rate={count:0,until:Date.now()+10*60*1000};rate.count++;await storage.put(rateKey,rate);return 'wrong';});
   if(outcome==='limited')return json({verified:false,reason:'TOO_MANY_ATTEMPTS'},429);
   if(outcome==='wrong'){if(!await this.state.storage.getAlarm())await this.state.storage.setAlarm(Date.now()+10*60*1000);return json({verified:false,reason:'PIN_OR_COLORS_INCORRECT'});}
   let entry=await this.session(request);if(!entry)entry={token:hex(random(32)),value:{}};entry.value[scope]=true;entry.value.expires=Date.now()+ttl;await this.saveSession(entry);
   return json({verified:true,scope,expiresInSeconds:ttl/1000},200,{'Set-Cookie':`eyeota_session=${entry.token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${ttl/1000}; Path=/`});
  }
  const entry=await this.session(request);
  if(path==='/api/legal/redact'){if(entry){delete entry.value.cipher;delete entry.value.acoustic;delete entry.value.audioVerified;await this.saveSession(entry);}return json({redacted:true});}
  if(path==='/api/verify-lock'){if(!entry?.value.acoustic)return json({verified:false,reason:'VERIFICATION_REQUIRED'},403);return json({verified:!!entry.value.audioVerified&&lockMatches(body,r)});}
  if(['/api/cipher/encrypt','/api/cipher/decrypt'].includes(path)){
   if(!entry?.value.cipher)return json({verified:false,reason:'VERIFICATION_REQUIRED'},403);
   if(this.cryptoTasks>=4)return json({error:'Server is busy. Try again shortly.'},429);
   const {text,notes,password}=body;
   if(path.endsWith('/encrypt')&&(typeof text!=='string'||!text||Array.from(text).length>10000||typeof password!=='string'||password.length<12||password.length>1024))return json({error:'Type a message and use a password of 12–1024 characters.'},400);
   if(path.endsWith('/decrypt')&&(typeof notes!=='string'||typeof password!=='string'||!password||password.length>1024))return json({error:'Supply the saved musical message and its password.'},400);
   this.cryptoTasks++;try{return path.endsWith('/encrypt')?json({notes:await encryptNotes(text,password)}):json({text:await decryptNotes(notes,password)});}catch{return json({error:path.endsWith('/encrypt')?'Unable to lock this message.':'Password incorrect or musical message damaged.'},path.endsWith('/encrypt')?500:400);}finally{this.cryptoTasks--;}
  }
  return json({reason:'NOT_FOUND'},404);
 }
 async verifyAudio(request,r){
  const entry=await this.session(request);if(!entry?.value.acoustic)return json({verified:false,reason:'VERIFICATION_REQUIRED'},403);
  if(!r.combination||!r.song||!this.env.AUDD_API_TOKEN)return json({verified:false,reason:'SERVER_CONFIGURATION_ERROR'},503);
  const form=await request.formData(),body=Object.fromEntries(form.entries());if(!lockMatches(body,r))return json({verified:false,reason:'LOCK_REQUIREMENTS_NOT_MET'});
  const file=form.get('file');if(!file||typeof file.arrayBuffer!=='function')return json({verified:false,reason:'NO_AUDIO'},400);if(file.size>25*1024*1024)return json({verified:false,reason:'INVALID_REQUEST'},413);
  entry.value.audioVerified=false;await this.saveSession(entry);
  try{const outgoing=new FormData();outgoing.append('api_token',this.env.AUDD_API_TOKEN);outgoing.append('file',file,'recording.webm');const response=await fetch('https://api.audd.io/',{method:'POST',body:outgoing,signal:AbortSignal.timeout(30000)});if(!response.ok)return json({verified:false,reason:'AUDIO_SERVICE_ERROR'},502);const data=await response.json(),title=String(data?.result?.title||'').toLowerCase(),verified=data.status==='success'&&title.includes(r.song.toLowerCase());entry.value.audioVerified=verified;await this.saveSession(entry);return json({verified,reason:verified?undefined:'SONG_NOT_VERIFIED'});}catch{return json({verified:false,reason:'AUDIO_SERVICE_ERROR'},502);}
 }
}
