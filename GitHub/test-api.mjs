import assert from 'node:assert/strict';
import { pbkdf2Sync,createCipheriv,createDecipheriv,randomBytes } from 'node:crypto';
import { EotaApi,encryptNotes,decryptNotes,toNotes,fromNotes } from './api.mjs';
class Storage{
 constructor(){this.data=new Map();this.alarmTime=null;this.queue=Promise.resolve();}
 async get(k){return structuredClone(this.data.get(k));}
 async put(k,v){this.data.set(k,structuredClone(v));}
 async delete(k){this.data.delete(k);}
 async getAlarm(){return this.alarmTime;}
 async setAlarm(t){this.alarmTime=t;}
 async list(options={}){return new Map([...this.data].filter(([k])=>!options.prefix||k.startsWith(options.prefix)));}
 async transaction(fn){const next=this.queue.then(()=>fn(this));this.queue=next.catch(()=>{});return next;}
}
const storage=new Storage(),state={storage},env={TARGET_PIN:'1234',CORRECT_COLOR:'#112233',TARGET_PIN_COLOR_ID:'2',TARGET_COMBINATION:'54321',TARGET_SONG:'example',ANALYTICS_ENABLED:'true'};
let api=new EotaApi(state,env),cookie='';
async function req(path,body,options={}){const headers={...options.headers};if(cookie)headers.Cookie=cookie;if(body!==undefined)headers['Content-Type']='application/json';return api.fetch(new Request('https://example.com'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}));}
assert.equal((await req('/api/cipher/encrypt',{text:'hello',password:'password123456'})).status,403);
assert.equal((await new EotaApi(state,{}).fetch(new Request('https://example.com/api/verify-pin',{method:'POST',body:'{}'}))).status,503);
for(let i=0;i<5;i++)assert.equal((await (await req('/api/verify-pin',{scope:'acoustic',pin:'9999'})).json()).verified,false);
assert.equal((await req('/api/verify-pin',{scope:'acoustic',pin:'1234',colorIds:[2,2,2,2],colors:Array(4).fill('#112233')})).status,429);
assert.equal((await req('/api/verify-pin',{scope:'cipher',pin:'1234',colorIds:[2,2,2,2],colors:Array(4).fill('#112233')},{headers:{Origin:'https://evil.example'}})).status,403);
const verified=await req('/api/verify-pin',{scope:'cipher',pin:'1234',colorIds:[2,2,2,2],colors:Array(4).fill('#112233')});assert.equal((await verified.json()).verified,true);cookie=verified.headers.get('Set-Cookie').split(';')[0];assert.match(verified.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Strict/);
// Session survives object reconstruction; it is stored outside the process.
api=new EotaApi(state,env);assert.equal((await (await req('/api/access-status')).json()).cipher,true);
const password='a long example password',text='A preserved musical message ♫';
const encrypted=await req('/api/cipher/encrypt',{text,password});assert.equal(encrypted.status,200);const {notes}=await encrypted.json();assert.equal((await (await req('/api/cipher/decrypt',{notes,password})).json()).text,text);
assert.equal((await req('/api/cipher/decrypt',{notes,password:'incorrect'})).status,400);
// Verify both directions against the original Node format and 310,000 iterations.
const bytes=fromNotes(notes),magic=Buffer.from('EYENOTE1');const key=pbkdf2Sync(password,bytes.slice(8,24),310000,32,'sha256'),dec= createDecipheriv('aes-256-gcm',key,bytes.slice(24,36));dec.setAAD(magic);dec.setAuthTag(bytes.slice(-16));assert.equal(Buffer.concat([dec.update(bytes.slice(36,-16)),dec.final()]).toString(),text);
const salt=randomBytes(16),iv=randomBytes(12),oldKey=pbkdf2Sync(password,salt,310000,32,'sha256'),enc=createCipheriv('aes-256-gcm',oldKey,iv);enc.setAAD(magic);const oldBytes=Buffer.concat([magic,salt,iv,enc.update(text),enc.final(),enc.getAuthTag()]);assert.equal(await decryptNotes(toNotes(oldBytes),password),text);
await req('/api/analytics/collect',{collectionAllowed:true,event:'site_load',mode:'legal'});assert.equal((await storage.list({prefix:'analytics:'})).size,1);
assert.equal((await req('/api/analytics/report')).status,403);
await req('/api/legal/redact',{});assert.equal((await (await req('/api/access-status')).json()).cipher,false);
console.log('API checks passed: scope protection, rate limit, origin checks, durable sessions, old/new cipher interoperability, analytics protection and redaction.');
