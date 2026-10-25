const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const code = fs.readFileSync(__dirname + '/../assets/proposal-analytics-v1.js', 'utf8');
function environment({path='/economic-blockade.html', tagged=false, embedded=false}={}) {
  let now=0, focused=true, interval;
  const documentEvents={},windowEvents={},calls=[],scripts=[];
  const document={visibilityState:'visible',hasFocus:()=>focused,
    documentElement:{scrollHeight:10000},
    querySelector:()=>tagged?{}:null,
    createElement:()=>({}),head:{appendChild:s=>scripts.push(s)},
    addEventListener:(n,f)=>documentEvents[n]=f};
  const window={innerHeight:1000,scrollY:0,addEventListener:(n,f)=>windowEvents[n]=f};
  window.self=window;window.top=embedded?{}:window;
  if(tagged) window.gtag=(...a)=>calls.push(a);
  const context=vm.createContext({window,document,location:{pathname:path,origin:'https://rhymedial.com',href:'https://rhymedial.com'+path},URL,Date,Set,performance:{now:()=>now},setInterval:f=>interval=f});
  const run=()=>vm.runInContext(code,context);
  run();
  const events=()=>tagged?calls:(window.dataLayer || []).map(a=>Array.from(a));
  const count=n=>events().filter(a=>a[0]==='event'&&a[1]===n).length;
  const tick=seconds=>{for(let i=0;i<seconds;i++){now+=1000;interval?.();}};
  const scroll=y=>{window.scrollY=y;windowEvents.scroll?.();};
  const click=href=>documentEvents.click?.({target:{closest:()=>({href})}});
  return {run,events,count,tick,scroll,click,scripts,document,window,setFocus:v=>focused=v,activity:()=>documentEvents.pointerdown?.()};
}
const e=environment();
assert.equal(e.scripts.length,1);
assert.equal(e.events().filter(x=>x[0]==='config').length,1);
assert.equal(e.count('proposal_open'),1);
e.run();assert.equal(e.count('proposal_open'),1);
e.click('https://rhymedial.com/essays/economic-blockade.pdf?download=1');
assert.equal(e.count('proposal_pdf_click'),1);
e.click('https://example.com/reference.pdf');assert.equal(e.count('proposal_pdf_click'),1);
assert.equal(e.count('file_download'),0);
e.scroll(5000);e.scroll(5100);
assert.equal(e.count('proposal_scroll_25'),1);assert.equal(e.count('proposal_scroll_50'),1);assert.equal(e.count('proposal_scroll_75'),0);
e.tick(60);assert.equal(e.count('proposal_active_30s'),1);assert.equal(e.count('proposal_active_60s'),1);assert.equal(e.count('proposal_engaged_visit'),1);
e.tick(240);assert.equal(e.count('proposal_active_180s'),0,'idle time must not accumulate');
e.document.visibilityState='hidden';e.activity();e.tick(200);assert.equal(e.count('proposal_active_180s'),0,'hidden time must not accumulate');
e.document.visibilityState='visible';e.setFocus(false);e.activity();e.tick(60);assert.equal(e.count('proposal_active_180s'),0,'unfocused time must not accumulate');
e.setFocus(true);
for(let i=0;i<4;i++){e.activity();e.tick(60);}
assert.equal(e.count('proposal_active_180s'),1);assert.equal(e.count('proposal_active_300s'),1);assert.equal(e.count('proposal_engaged_visit'),1);
e.scroll(8500);e.scroll(9000);assert.equal(e.count('proposal_scroll_90'),1);
const h=environment({path:'/',tagged:true});assert.equal(h.scripts.length,0);assert.equal(h.events().filter(x=>x[0]==='config').length,0);
h.click('https://rhymedial.com/economic-blockade.html');assert.equal(h.count('proposal_link_click'),1);assert.equal(h.count('proposal_open'),0);
const frame=environment({embedded:true});assert.equal(frame.scripts.length,0);assert.equal(frame.events().length,0);
console.log('PASS: one initialization, proposal/PDF clicks, reference exclusion, one-time progress, focused active time, idle/hidden pauses, existing tag reuse, iframe exclusion.');
