import express from 'express';
import path from 'path';
import {fileURLToPath} from 'url';
import multer from 'multer';
import {randomBytes, timingSafeEqual, pbkdf2, createCipheriv, createDecipheriv} from 'crypto';
import {promisify} from 'util';
const app=express(),root=path.dirname(fileURLToPath(import.meta.url));
app.set('trust proxy',1);
const derive=promisify(pbkdf2);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024,fields:8,fieldSize:4096}});
const rules={pin:process.env.TARGET_PIN||'',song:process.env.TARGET_SONG||'',combination:process.env.TARGET_COMBINATION||'',color:(process.env.CORRECT_COLOR||'').toLowerCase(),colorId:Number(process.env.TARGET_PIN_COLOR_ID),music:process.env.TARGET_MUSIC_CREDENTIAL||''};
const pinConfigured=()=>/^\d{4}$/.test(rules.pin)&&/^#[0-9a-f]{6}$/.test(rules.color)&&Number.isInteger(rules.colorId)&&rules.colorId>=1&&rules.colorId<=26;
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const sessions=new Map(),attempts=new Map(),ttl=20*60*1000;
const cleanup=setInterval(()=>{const now=Date.now();for(const [k,v] of sessions)if(v.expires<=now)sessions.delete(k);for(const [k,v] of attempts)if(v.until<=now)attempts.delete(k);},60000);cleanup.unref();
app.use(express.json({limit:'2mb'}));
app.use((req,res,next)=>{
 res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','no-referrer');res.set('X-Frame-Options','DENY');
 if(req.path.startsWith('/api/'))res.set('Cache-Control','no-store');
 if(req.method==='POST' && req.get('origin') && req.get('origin')!==`${req.protocol}://${req.get('host')}`)return res.status(403).json({verified:false,reason:'ORIGIN_NOT_ALLOWED'});
 next();
});
function session(req){const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('eyeota_session='));const token=cookie?.slice(15);const state=token&&sessions.get(token);return state&&state.expires>Date.now()?{token,state}:null;}
function requireScope(scope){return (req,res,next)=>{const entry=session(req);if(!entry||!entry.state[scope])return res.status(403).json({verified:false,reason:'VERIFICATION_REQUIRED'});req.eyeotaSession=entry.state;next();};}
app.get('/api/public-config',(req,res)=>res.json({combinationLength:rules.combination.length||5}));
app.get('/api/access-status',(req,res)=>{const state=session(req)?.state;res.json({cipher:!!state?.cipher,acoustic:!!state?.acoustic});});
app.post('/api/verify-pin',(req,res)=>{
 if(!pinConfigured())return res.status(503).json({verified:false,reason:'SERVER_CONFIGURATION_ERROR'});
 const {pin,colorIds,colors,scope}=req.body||{};
 if(!['cipher','acoustic','legal'].includes(scope))return res.status(400).json({verified:false,reason:'INVALID_SCOPE'});
 const rateKey=req.ip+'|pin',rate=attempts.get(rateKey);
 if(rate?.until>Date.now()&&rate.count>=5)return res.status(429).json({verified:false,reason:'TOO_MANY_ATTEMPTS'});
 const correct=equal(pin,rules.pin)&&Array.isArray(colorIds)&&colorIds.length===4&&colorIds.every(x=>x===rules.colorId)&&Array.isArray(colors)&&colors.length===4&&colors.every(x=>typeof x==='string'&&x.toLowerCase()===rules.color);
 if(!correct){const a=rate?.until>Date.now()?rate:{count:0,until:Date.now()+10*60*1000};a.count++;attempts.set(rateKey,a);return res.json({verified:false,reason:'PIN_OR_COLORS_INCORRECT'});}
 attempts.delete(rateKey);let entry=session(req);
 if(!entry){if(sessions.size>=10000)return res.status(503).json({verified:false,reason:'TRY_LATER'});const token=randomBytes(32).toString('hex');entry={token,state:{expires:Date.now()+ttl}};sessions.set(token,entry.state);}
 if(scope==='legal'){entry.state.legalUnlocked=false;entry.state.audioVerified=false;}entry.state[scope]=true;entry.state.expires=Date.now()+ttl;
 res.cookie('eyeota_session',entry.token,{httpOnly:true,sameSite:'strict',secure:req.secure,maxAge:ttl,path:'/'});
 return res.json({verified:true,scope,expiresInSeconds:ttl/1000});
});
function parseArray(value){if(Array.isArray(value))return value;try{return JSON.parse(value||'[]');}catch{return [];}}
function lockMatches(body){
 if(!rules.combination||!rules.song||!/^#[0-9a-f]{6}$/.test(rules.color))return false;
 const colors=parseArray(body.colors),music=String(body.musicCredential||'');
 return equal(body.combination,rules.combination)&&Array.isArray(colors)&&colors.length===rules.combination.length&&colors.every(c=>typeof c==='string'&&c.toLowerCase()===rules.color)&&equal(music,rules.music);
}
app.post('/api/verify-lock',requireScope('acoustic'),(req,res)=>{const verified=!!req.eyeotaSession.audioVerified&&lockMatches(req.body);if(verified&&req.eyeotaSession.legal)req.eyeotaSession.legalUnlocked=true;res.json({verified});});
app.post('/api/verify',requireScope('acoustic'),upload.single('file'),async(req,res)=>{
 try{
  if(!rules.combination||!rules.song||!process.env.AUDD_API_TOKEN)return res.status(503).json({verified:false,reason:'SERVER_CONFIGURATION_ERROR'});
  if(!lockMatches(req.body))return res.json({verified:false,reason:'LOCK_REQUIREMENTS_NOT_MET'});
  if(!req.file)return res.status(400).json({verified:false,reason:'NO_AUDIO'});
  req.eyeotaSession.audioVerified=false;
  const form=new FormData();form.append('api_token',process.env.AUDD_API_TOKEN);form.append('file',new Blob([req.file.buffer],{type:req.file.mimetype||'audio/webm'}),'recording.webm');
  const response=await fetch('https://api.audd.io/',{method:'POST',body:form,signal:AbortSignal.timeout(30000)});
  if(!response.ok)return res.status(502).json({verified:false,reason:'AUDIO_SERVICE_ERROR'});
  const data=await response.json();const title=String(data?.result?.title||'').toLowerCase();
  const verified=data.status==='success'&&title.includes(rules.song.toLowerCase());req.eyeotaSession.audioVerified=verified;
  return res.json({verified,reason:verified?undefined:'SONG_NOT_VERIFIED'});
 }catch{return res.status(502).json({verified:false,reason:'AUDIO_SERVICE_ERROR'});}
});
const symbols=Array.from('♩♪♫♬♭♮♯𝄞𝄢𝄡𝄆𝄇𝄐𝄑𝄪𝄫'),magic=Buffer.from('EYENOTE1');
const toNotes=bytes=>Array.from(bytes,b=>symbols[b>>4]+symbols[b&15]).join('');
function fromNotes(text){const chars=Array.from(text.replace(/\s/g,''));if(chars.length%2||chars.length>2000000)throw Error('Invalid musical message.');const out=Buffer.alloc(chars.length/2);for(let i=0;i<chars.length;i+=2){const a=symbols.indexOf(chars[i]),b=symbols.indexOf(chars[i+1]);if(a<0||b<0)throw Error('Invalid musical message.');out[i/2]=(a<<4)|b;}return out;}
let cryptoTasks=0;
app.post('/api/cipher/encrypt',requireScope('cipher'),async(req,res)=>{
 if(cryptoTasks>=4)return res.status(429).json({error:'Server is busy. Try again shortly.'});
 const {text,password}=req.body||{};
 if(typeof text!=='string'||!text||Array.from(text).length>10000||typeof password!=='string'||password.length<12||password.length>1024)return res.status(400).json({error:'Type a message and use a password of 12–1024 characters.'});
 cryptoTasks++;try{const salt=randomBytes(16),iv=randomBytes(12),key=await derive(password,salt,310000,32,'sha256');const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(magic);const encrypted=Buffer.concat([cipher.update(text,'utf8'),cipher.final()]);key.fill(0);return res.json({notes:toNotes(Buffer.concat([magic,salt,iv,encrypted,cipher.getAuthTag()]))});}catch{return res.status(500).json({error:'Unable to lock this message.'});}finally{cryptoTasks--;}
});
app.post('/api/cipher/decrypt',requireScope('cipher'),async(req,res)=>{
 if(cryptoTasks>=4)return res.status(429).json({error:'Server is busy. Try again shortly.'});
 const {notes,password}=req.body||{};
 if(typeof notes!=='string'||typeof password!=='string'||!password||password.length>1024)return res.status(400).json({error:'Supply the saved musical message and its password.'});
 cryptoTasks++;try{const bytes=fromNotes(notes);if(bytes.length<53||!bytes.subarray(0,8).equals(magic))throw Error();const key=await derive(password,bytes.subarray(8,24),310000,32,'sha256');const decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(24,36));decipher.setAAD(magic);decipher.setAuthTag(bytes.subarray(-16));const text=Buffer.concat([decipher.update(bytes.subarray(36,-16)),decipher.final()]).toString('utf8');key.fill(0);return res.json({text});}catch{return res.status(400).json({error:'Password incorrect or musical message damaged.'});}finally{cryptoTasks--;}
});
// Legal payloads are never served by the public asset handler.
app.post('/api/legal/redact',(req,res)=>{const state=session(req)?.state;if(state){state.legal=false;state.legalUnlocked=false;}res.json({redacted:true});});
app.use('/legal-records',(req,res,next)=>{
 res.set('Cache-Control','no-store');
 if(!['GET','HEAD'].includes(req.method))return res.sendStatus(405);
 const state=session(req)?.state;
 if(!state?.legal||!state?.legalUnlocked)return res.status(403).json({reason:'VERIFICATION_REQUIRED'});
 if(!/^\/R\d{4}\.(?:notes|enc)$/.test(req.path))return res.sendStatus(404);
 return res.sendFile(path.join(root,'legal-records',req.path.slice(1)),err=>{if(err&&!res.headersSent)res.sendStatus(404);});
});
// Only explicit public pages and media are served. Server code and configuration stay private.
app.get(['/', '/index.html'],(req,res)=>res.sendFile(path.join(root,'index.html')));
const publicAssets=express.static(root,{index:false,dotfiles:'deny'});
app.use((req,res,next)=>{
 if(!['GET','HEAD'].includes(req.method))return next();
 if(/(?:^|\/)(?:legal-records|private|upload|uploads|backups)(?:\/|$)/i.test(req.path))return res.sendStatus(404);
 const extension=path.extname(req.path).toLowerCase();
 if(!['.css','.png','.jpg','.jpeg','.gif','.svg','.webp','.avif','.ico','.mp3','.wav','.ogg','.m4a','.mp4','.webm','.woff','.woff2','.ttf'].includes(extension))return next();
 return publicAssets(req,res,next);
});
app.use((err,req,res,next)=>res.status(err?.code==='LIMIT_FILE_SIZE'?413:400).json({verified:false,reason:'INVALID_REQUEST'}));
app.listen(process.env.PORT||3000,()=>console.log('EYEOTA server is running'));
