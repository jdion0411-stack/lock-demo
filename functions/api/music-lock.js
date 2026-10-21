const expectedDigest='bc88b109b9da42a0460d434c4dcefcde6441911ec4e7987df50bed230c656bb5';
export async function onRequest({request}) {
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'Forbidden'},403);
 let body;try{const raw=await request.text();if(raw.length>128)return reply({error:'Invalid request'},400);body=JSON.parse(raw)}catch{return reply({error:'Invalid request'},400)}
 const sequence=body?.sequence;if(typeof sequence!=='string'||!/^[A-Z]{5}$/.test(sequence))return reply({unlocked:false},400);
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sequence)));const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');let difference=0;for(let i=0;i<expectedDigest.length;i++)difference|=hex.charCodeAt(i)^expectedDigest.charCodeAt(i);
 return reply({unlocked:difference===0});
}
