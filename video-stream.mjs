// One seekable MP4 backed by the existing 13 static asset pieces.
export const VIDEO_PATH = '/eota-gameplay-stream.mp4';
const PART_SIZE = 20971520;
const PROFILES = {"desktop": {"total": 453852348, "prefix": "eota-expanded-hq", "parts": 22}, "mobile": {"total": 115932477, "prefix": "eota-expanded-mobile", "parts": 6}};
const MAX_RANGE = 2 * 1024 * 1024;
export async function videoResponse(request, env) {
 const mobileStream=new URL(request.url).searchParams.get('mobile')==='1';
 const profile=PROFILES[mobileStream?'mobile':'desktop'];
 const TOTAL=profile.total;
 const headers = new Headers({
  'Content-Type':'video/mp4', 'Accept-Ranges':'bytes',
  'Cache-Control':'public, max-age=3600',
  'X-Content-Type-Options':'nosniff'
 });
 if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 if (request.method === 'HEAD') {
  headers.set('Content-Length',String(TOTAL));
  return new Response(null,{headers});
 }
 const range=request.headers.get('Range');
 let start=0,end=TOTAL-1;
 if(range) {
  const match=/^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if(!match || (!match[1]&&!match[2])) return invalid();
  if(!match[1]) {
   const suffix=Number(match[2]);
   if(!Number.isSafeInteger(suffix)||suffix<=0) return invalid();
   start=Math.max(0,TOTAL-suffix);
  } else {
   start=Number(match[1]);
   end=match[2]?Math.min(Number(match[2]),TOTAL-1):TOTAL-1;
  }
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=TOTAL||end<start) return invalid();
  // Bound each browser request; native media requests the next range as needed.
  end=Math.min(end,start+MAX_RANGE-1);
 }
 function invalid(){
  headers.set('Content-Range','bytes */'+TOTAL);
  return new Response(null,{status:416,headers});
 }
 const first=Math.floor(start/PART_SIZE),last=Math.floor(end/PART_SIZE);
 // Fetch one asset at a time, including for open-ended mobile requests.
 async function fetchSlice(i){
  const base=i*PART_SIZE,partLength=Math.min(PART_SIZE,TOTAL-base);
  const localStart=Math.max(start-base,0),localEnd=Math.min(end-base,partLength-1);
  const url=new URL(request.url);
  url.pathname='/'+profile.prefix+'-'+String(i+1).padStart(2,'0')+'.mp4';url.search='';
  const response=await env.ASSETS.fetch(new Request(url));
  if(response.status!==200)throw new Error('Video part unavailable');
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength!==partLength)throw new Error('Video part is incomplete');
  const slice=bytes.slice(localStart,localEnd+1);
  return {body:new Response(slice).body,skip:0,length:slice.byteLength};
 }
 let initial;
 try{initial=await fetchSlice(first);}catch{ return new Response('Video part unavailable',{status:502}); }
 headers.set('Content-Length',String(end-start+1));
 if(range) headers.set('Content-Range','bytes '+start+'-'+end+'/'+TOTAL);
 let index=first,reader=null,current=null,cancelled=false;
 const stream=new ReadableStream({
  async pull(controller){
   try{
    while(!cancelled){
     if(!reader){
      if(index>last){controller.close();return;}
      current=index===first?initial:await fetchSlice(index);index++;
      reader=current.body.getReader();
      if(cancelled){await reader.cancel();return;}
     }
     const {value,done}=await reader.read();
     if(cancelled)return;
     if(done)throw new Error('Truncated video asset');
     const offset=Math.min(current.skip,value.length);current.skip-=offset;
     if(offset===value.length)continue;
     const bytes=value.subarray(offset,offset+Math.min(current.length,value.length-offset));
     current.length-=bytes.length;controller.enqueue(bytes);
     if(current.length===0){await reader.cancel();reader=null;}
     return;
    }
   }catch(error){
    if(reader)await reader.cancel().catch(()=>{});
    if(index===first)await initial.body.cancel().catch(()=>{});
    controller.error(error);
   }
  },
  async cancel(){
   cancelled=true;
   if(reader)await reader.cancel().catch(()=>{});
   if(index===first)await initial.body.cancel().catch(()=>{});
  }
 });
 return new Response(stream,{status:range?206:200,headers});
}
