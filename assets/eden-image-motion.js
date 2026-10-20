(()=>{
const reduced=matchMedia("(prefers-reduced-motion:reduce)");if(reduced.matches)return;
const canvas=document.createElement("canvas");canvas.id="eden-animated-background";canvas.setAttribute("aria-hidden","true");document.body.append(canvas);
const gl=canvas.getContext("webgl",{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:"low-power",preserveDrawingBuffer:false});if(!gl){startCanvasMotion(canvas);return}
const vertex="attribute vec2 position;varying vec2 screenUV;void main(){screenUV=position*.5+.5;gl_Position=vec4(position,0.,1.);}";
const fragment=`precision highp float;
uniform sampler2D artwork;uniform float seconds;uniform vec2 viewport;uniform float pageHeight;uniform float scrollTop;varying vec2 screenUV;
float region(vec2 p,vec2 c,vec2 r){vec2 q=(p-c)/r;return 1.-smoothstep(.45,1.,dot(q,q));}
void main(){
vec2 uv=vec2(screenUV.x,(scrollTop+(1.-screenUV.y)*viewport.y)/pageHeight);
float leftCanopy=(1.-smoothstep(.28,.44,uv.x))*(1.-smoothstep(.14,.23,uv.y));
float rightCanopy=smoothstep(.60,.80,uv.x)*(1.-smoothstep(.25,.37,uv.y));
float anchored=smoothstep(.015,.20,uv.x)*(1.-smoothstep(.80,.985,uv.x));
float foliage=max(leftCanopy,rightCanopy)*anchored;
float breeze=sin(seconds*.78+uv.y*11.)*.75+sin(seconds*1.31+uv.x*8.+uv.y*13.)*.25;
vec2 treeUV=uv+vec2(breeze*.013,sin(seconds*.66+uv.x*9.)*.0016)*foliage;
vec3 color=texture2D(artwork,clamp(treeUV,vec2(.001),vec2(.999))).rgb;
float falls=region(uv,vec2(.280,.337),vec2(.020,.067));
falls=max(falls,region(uv,vec2(.196,.441),vec2(.030,.040)));
falls=max(falls,region(uv,vec2(.224,.510),vec2(.037,.055)));
falls=max(falls,region(uv,vec2(.275,.650),vec2(.024,.037)));
falls=max(falls,region(uv,vec2(.172,.828),vec2(.040,.052)));
falls=max(falls,region(uv,vec2(.198,.964),vec2(.055,.067)));
falls=max(falls,region(uv,vec2(.859,.365),vec2(.017,.048)));
falls=max(falls,region(uv,vec2(.796,.567),vec2(.024,.040)));
falls=max(falls,region(uv,vec2(.816,.758),vec2(.033,.031)));
falls=max(falls,region(uv,vec2(.844,.933),vec2(.065,.041)));
float river=max(region(uv,vec2(.235,.894),vec2(.21,.031)),region(uv,vec2(.816,.985),vec2(.22,.027)));
river=max(river,region(uv,vec2(.755,.806),vec2(.11,.026)));
float waterTone=smoothstep(.07,.22,min(color.g,color.b)-color.r*.61);
float water=max(falls,river)*waterTone;
if(water>.008){float phase=fract(seconds*.22);float second=fract(phase+.5);float blend=abs(phase-.5)*2.;
vec2 ripple=vec2(sin(uv.y*700.-seconds*4.)*.0012,cos(uv.x*460.+seconds*2.8)*.00045);
vec2 flow=vec2(.0008*river,.011*falls+.0009*river);
vec3 a=texture2D(artwork,clamp(uv+ripple-flow*phase,vec2(.001),vec2(.999))).rgb;
vec3 b=texture2D(artwork,clamp(uv+ripple-flow*second,vec2(.001),vec2(.999))).rgb;
color=mix(color,mix(a,b,blend),water*.94);}
float shade=.02+.125*smoothstep(0.,.28,uv.x)*(1.-smoothstep(.72,1.,uv.x));
gl_FragColor=vec4(mix(color,vec3(.012,.067,.105),shade),1.);
}`;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
let program;try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("Background shader link failed")}catch(error){console.warn("Eden background fallback",error.message);canvas.remove();return}
gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,"position");gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
const locations=Object.fromEntries(["artwork","seconds","viewport","pageHeight","scrollTop"].map(k=>[k,gl.getUniformLocation(program,k)]));
let width=innerWidth,height=innerHeight,documentHeight=1,scroll=window.scrollY,last=0,running=true,loaded=false,frames=0,report=0,origin=performance.now(),time=0,previous=origin;
function size(){width=innerWidth;height=innerHeight;documentHeight=Math.max(document.body.getBoundingClientRect().height,height);const scale=Math.min(1,(width<700?700:1100)/width);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);gl.viewport(0,0,canvas.width,canvas.height);last=0}
addEventListener("resize",size,{passive:true});addEventListener("scroll",()=>{scroll=window.scrollY},{passive:true});new ResizeObserver(()=>{documentHeight=Math.max(document.body.getBoundingClientRect().height,innerHeight);last=0}).observe(document.body);size();
function draw(t){if(!running)return;requestAnimationFrame(draw);const dt=Math.min(t-previous,100);previous=t;if(document.hidden||!loaded||reduced.matches)return;time+=dt/1000;const interval=width<700?55:42;if(t-last<interval)return;last=t;gl.uniform1i(locations.artwork,0);gl.uniform1f(locations.seconds,time);gl.uniform2f(locations.viewport,width,height);gl.uniform1f(locations.pageHeight,documentHeight);gl.uniform1f(locations.scrollTop,scroll);gl.drawArrays(gl.TRIANGLES,0,6);frames++;if(t-report>1000){canvas.dataset.frames=String(frames);report=t}}
canvas.addEventListener("webglcontextlost",()=>{running=false;canvas.style.opacity="0"});const image=new Image();image.onload=()=>{try{const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);loaded=true;canvas.dataset.motion="original-image";canvas.style.opacity="1";requestAnimationFrame(draw)}catch(error){console.warn("Eden texture fallback",error.message);canvas.remove()}};image.onerror=()=>canvas.remove();image.src="/assets/eden-page-garden.svg?v=eden-page-67";
function startCanvasMotion(oldCanvas){
const c=document.createElement('canvas');c.id='eden-animated-background';c.setAttribute('aria-hidden','true');oldCanvas.replaceWith(c);const ctx=c.getContext('2d',{alpha:false});if(!ctx){c.remove();return}
const picture=new Image();picture.onload=()=>{const source=document.createElement('canvas');source.width=941;source.height=1672;source.getContext('2d').drawImage(picture,0,0,941,1672);const falls=[[.280,.337,.020,.067],[.196,.441,.030,.040],[.224,.510,.037,.055],[.275,.650,.024,.037],[.172,.828,.040,.052],[.198,.964,.055,.067],[.859,.365,.017,.048],[.796,.567,.024,.040],[.816,.758,.033,.031],[.844,.933,.065,.041]].map(([x,y,rx,ry])=>{const w=Math.ceil(rx*1882),h=Math.ceil(ry*3344),patch=document.createElement('canvas'),mask=document.createElement('canvas');patch.width=mask.width=w;patch.height=mask.height=h;const m=mask.getContext('2d');m.scale(w/2,h/2);const g=m.createRadialGradient(1,1,.35,1,1,1);g.addColorStop(0,'#fff');g.addColorStop(1,'#fff0');m.fillStyle=g;m.fillRect(0,0,2,2);return{x:x*941-w/2,y:y*1672-h/2,w,h,patch,mask,p:patch.getContext('2d')}});
let viewW=innerWidth,viewH=innerHeight,pageH=document.body.getBoundingClientRect().height,scroll=window.scrollY,last=0,previous=performance.now(),time=0,frames=0;function size(){viewW=innerWidth;viewH=innerHeight;const scale=Math.min(1,960/viewW);c.width=Math.round(viewW*scale);c.height=Math.round(viewH*scale);pageH=Math.max(document.body.getBoundingClientRect().height,viewH);last=0}size();addEventListener('resize',size,{passive:true});addEventListener('scroll',()=>scroll=window.scrollY,{passive:true});new ResizeObserver(()=>pageH=Math.max(document.body.getBoundingClientRect().height,viewH)).observe(document.body);
function draw(t){requestAnimationFrame(draw);const dt=Math.min(t-previous,100);previous=t;if(document.hidden)return;time+=dt*.001;if(t-last<(viewW<700?80:65))return;last=t;const sx=c.width/941,sy=pageH/1672*c.height/viewH,top=scroll*c.height/viewH;ctx.drawImage(source,0,-top,c.width,1672*sy);
// Warp source pixels in fixed mesh cells; draw no extra branches, lines, or particles.
for(const [left,right,bottom,phase] of [[0,430,258,0],[564,941,488,1.3]]){const cellX=24,cellY=38;for(let y=0;y<bottom;y+=cellY){const dy=y*sy-top;if(dy>c.height||dy+cellY*sy<0)continue;for(let x=left;x<right;x+=cellX){const w=Math.min(cellX,right-x),h=Math.min(cellY,bottom-y),cx=(x+w/2-left)/(right-left),bend=Math.sin(cx*Math.PI)**2*(1-y/bottom),offset=(Math.sin(time*.78+y*.012+phase)*.8+Math.sin(time*1.31+x*.009)*.2)*10*bend;ctx.drawImage(source,Math.max(0,Math.min(941-w,x+offset)),y,w,h,x*sx,dy,w*sx+.3,h*sy+.3)}}}
const phase=(time*.22)%1,b=(phase+.5)%1,weight=Math.abs(phase-.5)*2;for(const f of falls){const y=f.y*sy-top;if(y>c.height||y+f.h*sy<0)continue;f.p.globalCompositeOperation='copy';f.p.globalAlpha=1;f.p.drawImage(source,f.x,f.y-phase*15,f.w,f.h,0,0,f.w,f.h);f.p.globalCompositeOperation='source-over';f.p.globalAlpha=weight;f.p.drawImage(source,f.x,f.y-b*15,f.w,f.h,0,0,f.w,f.h);f.p.globalAlpha=1;f.p.globalCompositeOperation='destination-in';f.p.drawImage(f.mask,0,0);ctx.drawImage(f.patch,f.x*sx,y,f.w*sx,f.h*sy)}ctx.fillStyle='#03111b12';ctx.fillRect(0,0,c.width,c.height);if(frames++%15===0)c.dataset.frames=String(frames);}
c.dataset.motion='original-image-canvas';c.style.opacity='1';requestAnimationFrame(draw)};picture.onerror=()=>c.remove();picture.src='/assets/eden-page-garden.svg?v=eden-page-67';
}

})();
