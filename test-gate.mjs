import assert from 'node:assert/strict';
import worker from './worker.mjs';
const key='a'.repeat(64), calls=[];
const env={EOTA_BROWSER_ACCESS_KEY:key,ASSETS:{async fetch(req){calls.push(new URL(req.url).pathname);return new Response('asset');}}};
async function request(path, headers={}, method='GET',bindings=env){return worker.fetch(new Request('https://example.com'+path,{headers,method}),bindings,{});}
assert.equal((await request('/')).status,200);assert.equal(calls.pop(),'/public.html');
for(const path of ['/api/verify-pin','/clip.mp4','/worker.mjs','/legal.pdf'])assert.equal((await request(path)).status,403);
await request('/',{'X-EOTA-Access':key});assert.equal(calls.pop(),'/index.html');
await request('/clip.mp4',{'X-EOTA-Access':key});assert.equal(calls.pop(),'/clip.mp4');
assert.equal((await request('/worker.mjs',{'X-EOTA-Access':key})).status,404);
assert.equal((await request('/api/verify-pin',{'X-EOTA-Access':key})).status,503);
assert.equal((await request('/clip.mp4',{'X-EOTA-Access':key},'GET',{...env,EOTA_BROWSER_ACCESS_KEY:''})).status,403);
assert.equal((await request('/',{'X-EOTA-Access':key})).headers.get('Cache-Control'),'private, no-store');
console.log('Access routing checks passed.');
