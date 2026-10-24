'use strict';
(()=>{
 const button=document.querySelector('[data-footer-cipher]'),source=document.getElementById('rhiyme-footer-cipher-data');if(!button||!source)return;
 button.addEventListener('click',()=>{
  let panel=document.getElementById('rhiyme-footer-cipher-dialog');
  if(!panel){
   panel=document.createElement('dialog');panel.id='rhiyme-footer-cipher-dialog';panel.setAttribute('aria-label','Encrypted musical message');
   panel.innerHTML='<h2>Musical message</h2><textarea readonly aria-label="Complete encrypted musical message" rows="8"></textarea><p><button type="button" data-copy>Copy notes</button> <button type="button" data-close>Close</button></p><span role="status"></span>';
   panel.style.cssText='box-sizing:border-box;width:min(560px,92vw);max-height:85dvh;overflow:auto;background:#0d1922;color:#f4deb0;border:1px solid #d4b36c;border-radius:16px;padding:20px';
   const area=panel.querySelector('textarea');area.value=source.content.textContent.trim();area.style.cssText='box-sizing:border-box;width:100%;resize:vertical;background:#071018;color:#f4deb0;border:1px solid #6d715f;font:18px/1.8 serif;padding:10px';
   panel.querySelector('[data-close]').onclick=()=>panel.close();
   panel.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(area.value);panel.querySelector('[role=status]').textContent='Notes copied.';}catch{area.focus();area.select();panel.querySelector('[role=status]').textContent='Select and copy the notes.';}};
   panel.addEventListener('click',e=>{if(e.target===panel){const b=panel.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)panel.close();}});
   document.body.append(panel);
  }
  panel.showModal();
 });
})();
