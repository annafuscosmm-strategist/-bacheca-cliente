"use strict";
/* ============ Verace Studio — engine + vibes + banks + chat ============ */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const uid=()=>Math.random().toString(36).slice(2,9);
const fmt=t=>{t=Math.max(0,t||0);const m=Math.floor(t/60),s=Math.floor(t%60),d=Math.floor((t*10)%10);return m+":"+String(s).padStart(2,"0")+"."+d;};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),2200);}
function fmtDate(ms){try{return new Date(ms).toLocaleDateString("it-IT",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});}catch(e){return"";}}
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const PALETTE=["#FBF4E6","#2B2724","#C7A45E","#A8636A","#AC3F3F","#3E7A54","#E0C488","#F3E9D6"];
const FONTS=[["Outfit","Outfit"],["Playfair Display","Playfair"],["Caveat","Caveat"]];
const PRESETS={none:"Naturale",bw:"B/N",warm:"Caldo",cold:"Freddo",vivid:"Vivido",soft:"Soft"};
const EMOJIS=["🎄","🎅","⛄","🦌","🎁","✨","❄️","🔔","⭐","😍","🔥","👇","💥","🤍","🧡","🎬"];

/* ---- state ---- */
const S={src:null,segments:[],audios:[],overlays:[],playhead:0,playing:false,sel:null,pps:48,undo:[],
  projectId:null,projectName:"",projectCreatedAt:null,vibe:null,
  textStyle:{font:"Outfit",color:"#FBF4E6",bold:true},refThumb:null,refBlob:null,chat:[],_greeted:false};
let AC=null,master=null,exportDest=null,vidSrcNode=null,vidGain=null,playingSources=[];
let DL=null;const CAP={db:null,assets:null,user:null,sample:null,ready:false,canWrite:true,sampleImages:false};
let activeTab="vibe",relinkTarget=null;

const canvas=$("#canvas"),ctx=canvas.getContext("2d"),CW=canvas.width,CH=canvas.height;
const stage=$("#stage"),tlinner=$("#tlinner"),ruler=$("#ruler"),playheadEl=$("#playheadEl");

/* ---- caps ---- */
async function initCaps(){
  if(!(window.claude&&claude.use))return;
  try{
    const [db,assets,user,dl,sample]=await Promise.all([
      claude.use("db").catch(()=>null),claude.use("assets").catch(()=>null),claude.use("user").catch(()=>null),
      claude.use("downloads").catch(()=>null),claude.use("sample").catch(()=>null)]);
    CAP.db=db;CAP.assets=assets;CAP.user=user;DL=dl;CAP.sample=sample;CAP.ready=true;
    if(user){try{const w=await user.can("data.write");CAP.canWrite=(w!==false);}catch(e){}}
    if(sample){try{const lim=await sample.limits();CAP.sampleImages=!!(lim&&lim.images);}catch(e){}}
  }catch(e){}
  updateStudioUI();if(activeTab==="chat")ensureChat();
}
const cloudOn=()=>!!(CAP.db&&CAP.assets);

/* ---- mapping ---- */
const segDur=s=>s.out-s.in;
const total=()=>S.segments.reduce((a,s)=>a+segDur(s),0);
function segStart(i){let a=0;for(let k=0;k<i;k++)a+=segDur(S.segments[k]);return a;}
function locate(t){let a=0;for(let i=0;i<S.segments.length;i++){const d=segDur(S.segments[i]);
  if(t<a+d||i===S.segments.length-1)return{i,src:S.segments[i].in+clamp(t-a,0,d)};a+=d;}return null;}
function newSeg(i,o){return{id:uid(),in:i,out:o,eff:{bri:100,con:100,sat:100,scale:100,preset:"none"},fx:{},fi:0,fo:0};}

/* ---- undo ---- */
function snapshot(){try{S.undo.push(JSON.stringify({segments:S.segments,overlays:S.overlays,vibe:S.vibe,textStyle:S.textStyle,
  audios:S.audios.map(a=>({id:a.id,name:a.name,sfx:a.sfx,start:a.start,in:a.in,out:a.out,vol:a.vol,missing:a.missing}))}));
  if(S.undo.length>40)S.undo.shift();$("#undoBtn").disabled=false;}catch(e){}}
function undo(){if(!S.undo.length)return;const st=JSON.parse(S.undo.pop());
  S.segments=st.segments;S.overlays=st.overlays;S.vibe=st.vibe;S.textStyle=st.textStyle;
  const map={};S.audios.forEach(a=>map[a.id]=a.buf);
  S.audios=st.audios.map(a=>({...a,buf:map[a.id]||null})).filter(a=>a.buf||a.sfx||a.missing);
  S.sel=null;$("#undoBtn").disabled=!S.undo.length;renderAll();drawFrame();}

/* ---- audio graph ---- */
function ensureAudio(){if(AC)return;AC=new (window.AudioContext||window.webkitAudioContext)();
  master=AC.createGain();master.gain.value=1;master.connect(AC.destination);
  exportDest=AC.createMediaStreamDestination();master.connect(exportDest);
  if(S.src){try{vidSrcNode=AC.createMediaElementSource(S.src.el);vidGain=AC.createGain();vidSrcNode.connect(vidGain);vidGain.connect(master);}catch(e){}}}

/* ---- load video ---- */
function loadVideoFromUrl(url,label,opts){opts=opts||{};
  const v=document.createElement("video");v.src=url;v.playsInline=true;v.preload="auto";v.crossOrigin="anonymous";
  v.addEventListener("loadedmetadata",()=>{
    S.src={el:v,url,dur:v.duration,w:v.videoWidth,h:v.videoHeight,blob:opts.blob||null,assetId:opts.assetId||null};
    if(opts.after){try{opts.after();}catch(e){}}
    else if(!S.segments.length)S.segments=[newSeg(0,v.duration)];
    stage.classList.remove("empty");canvas.classList.remove("hidden");$("#drop").classList.add("hidden");
    if(AC&&!vidSrcNode){try{vidSrcNode=AC.createMediaElementSource(v);vidGain=AC.createGain();vidSrcNode.connect(vidGain);vidGain.connect(master);}catch(e){}}
    S.playhead=0;seekTo(0);renderAll();S.sel=null;renderPanel();
    if(label)toast(label);
    if(opts.sfxRestore){opts.sfxRestore();}
    if(!opts.silentGreet)greet();
  },{once:true});
  v.addEventListener("seeked",()=>{if(!S.playing)drawFrame();});
  v.load();
}
$("#videoFile").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;
  S.segments=[];S.audios=[];S.overlays=[];S.undo=[];S.projectId=null;S.vibe=null;S._greeted=false;$("#undoBtn").disabled=true;
  loadVideoFromUrl(URL.createObjectURL(f),"Video caricato",{blob:f});});
["dragover","drop"].forEach(ev=>stage.addEventListener(ev,e=>{e.preventDefault();
  if(ev==="drop"&&e.dataTransfer.files[0]){const f=e.dataTransfer.files[0];if(f.type.startsWith("video")){
    S.segments=[];S.audios=[];S.overlays=[];S.undo=[];S.projectId=null;S.vibe=null;S._greeted=false;
    loadVideoFromUrl(URL.createObjectURL(f),"Video caricato",{blob:f});}}}));

/* ---- audio upload + relink ---- */
$("#audioFile").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;ensureAudio();
  if(relinkTarget){const clip=S.audios.find(a=>a.id===relinkTarget);relinkTarget=null;
    if(clip){try{const buf=await AC.decodeAudioData(await f.arrayBuffer());clip.buf=buf;clip.blob=f;clip.missing=false;
      clip.out=Math.min(clip.out||buf.duration,clip.in+buf.duration);renderTracks();renderPanel();toast("Audio ricollegato");}catch(err){toast("Audio non supportato");}}
    e.target.value="";return;}
  try{const buf=await AC.decodeAudioData(await f.arrayBuffer());snapshot();
    S.audios.push({id:uid(),name:f.name.replace(/\.[^.]+$/,"").slice(0,22),buf,blob:f,sfx:null,assetId:null,start:S.playhead,in:0,out:buf.duration,vol:1,missing:false});
    renderTracks();select({kind:"audio",id:S.audios[S.audios.length-1].id});setTab("sound");toast("Suono aggiunto");
  }catch(err){toast("Audio non supportato");}e.target.value="";});

/* ---- effects filter ---- */
function filterFor(eff){let f=`brightness(${eff.bri}%) contrast(${eff.con}%) saturate(${eff.sat}%)`;
  if(eff.preset==="bw")f+=" grayscale(1)";else if(eff.preset==="warm")f+=" sepia(.35) saturate(135%) hue-rotate(-8deg)";
  else if(eff.preset==="cold")f+=" saturate(115%) hue-rotate(10deg) brightness(102%)";
  else if(eff.preset==="vivid")f+=" saturate(160%) contrast(108%)";else if(eff.preset==="soft")f+=" brightness(104%) contrast(94%) saturate(96%)";return f;}
function alphaAt(t,i){const seg=S.segments[i];let a=1;const st=segStart(i),d=segDur(seg);
  if(seg.fi>0)a=Math.min(a,clamp((t-st)/seg.fi,0,1));if(seg.fo>0)a=Math.min(a,clamp((st+d-t)/seg.fo,0,1));return a;}

/* ---- FX overlays ---- */
let noiseTile=null;
function getNoise(){if(noiseTile)return noiseTile;const n=document.createElement("canvas");n.width=160;n.height=284;
  const g=n.getContext("2d"),d=g.createImageData(n.width,n.height);
  for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}
  g.putImageData(d,0,0);noiseTile=n;return n;}
function drawFx(fx,t,lt){
  if(fx.leak){ctx.save();ctx.globalCompositeOperation="screen";const cx=CW*(0.5+0.4*Math.sin(t*0.6)),cy=CH*(0.3+0.1*Math.cos(t*0.5));
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,CW*0.95);g.addColorStop(0,"rgba(224,196,136,.5)");g.addColorStop(.5,"rgba(172,63,63,.16)");g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;ctx.fillRect(0,0,CW,CH);ctx.restore();}
  if(fx.grain){ctx.save();ctx.globalAlpha=0.07;ctx.globalCompositeOperation="overlay";ctx.drawImage(getNoise(),-(Math.random()*30),-(Math.random()*30),CW+30,CH+30);ctx.restore();}
  if(fx.snow){ctx.save();ctx.fillStyle="#fff";for(let i=0;i<46;i++){const sp=18+(i%7)*6;const y=((t*sp+i*53)%(CH+30))-15;const x=(i*71%CW)+Math.sin(t*0.8+i)*16;const r=1+(i%3)*0.9;
    ctx.globalAlpha=.35+(i%5)/9;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}ctx.restore();}
  if(fx.vignette){ctx.save();const g=ctx.createRadialGradient(CW/2,CH/2,CH*0.3,CW/2,CH/2,CH*0.63);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,.5)");ctx.fillStyle=g;ctx.fillRect(0,0,CW,CH);ctx.restore();}
  if(fx.flash){const fl=Math.exp(-lt*7);if(fl>0.02){ctx.save();ctx.globalAlpha=Math.min(0.85,fl);ctx.fillStyle="#fff";ctx.fillRect(0,0,CW,CH);ctx.restore();}}
}

/* ---- draw frame ---- */
function drawFrame(){
  ctx.clearRect(0,0,CW,CH);ctx.fillStyle="#141010";ctx.fillRect(0,0,CW,CH);
  const t=S.playhead,loc=S.src&&S.segments.length?locate(t):null;
  if(loc&&S.src){const seg=S.segments[loc.i],v=S.src.el,lt=t-segStart(loc.i),a=alphaAt(t,loc.i);
    let scale=Math.max(CW/S.src.w,CH/S.src.h)*(seg.eff.scale/100);if(seg.fx.zoom)scale*=1+0.14*Math.exp(-lt*5);
    let ox=0,oy=0;if(seg.fx.shake){ox=Math.sin(t*33)*CW*0.012;oy=Math.cos(t*39)*CH*0.012;}
    ctx.save();ctx.globalAlpha=a;ctx.filter=filterFor(seg.eff);
    const dw=S.src.w*scale,dh=S.src.h*scale;ctx.drawImage(v,(CW-dw)/2+ox,(CH-dh)/2+oy,dw,dh);
    ctx.restore();ctx.filter="none";ctx.globalAlpha=1;drawFx(seg.fx,t,lt);}
  for(const o of S.overlays){if(t<o.start||t>o.end)continue;ctx.save();
    const px=o.x*CW,py=o.y*CH,fs=o.size/100*CH*0.1+10;
    ctx.font=`${o.bold?"800":"600"} ${fs}px ${o.font},sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle=o.color;
    ctx.shadowColor="rgba(0,0,0,.45)";ctx.shadowBlur=fs*0.18;ctx.shadowOffsetY=fs*0.04;
    const lines=(o.text||"").split("\n"),lh=fs*1.15;lines.forEach((ln,k)=>ctx.fillText(ln,px,py+(k-(lines.length-1)/2)*lh));ctx.restore();
    if(S.sel&&S.sel.kind==="overlay"&&S.sel.id===o.id){ctx.save();ctx.strokeStyle="#E0C488";ctx.lineWidth=2;ctx.setLineDash([6,5]);
      const w=CW*0.9;ctx.strokeRect(px-w/2,py-fs,w,fs*2*(o.text.split("\n").length));ctx.restore();}}
}

/* ---- playback ---- */
let raf=null,lastClock=0;
function stopSources(){playingSources.forEach(s=>{try{s.stop()}catch(e){}});playingSources=[];}
function scheduleAudio(fromT){if(!AC)return;stopSources();const now=AC.currentTime;
  for(const c of S.audios){if(!c.buf)continue;const clipDur=c.out-c.in,endT=c.start+clipDur;if(endT<=fromT)continue;
    let offset=c.in,when=now+(c.start-fromT),dur=clipDur;if(c.start<fromT){offset=c.in+(fromT-c.start);when=now;dur=c.out-offset;}if(dur<=0)continue;
    const src=AC.createBufferSource();src.buffer=c.buf;const g=AC.createGain();g.gain.value=c.vol;src.connect(g);g.connect(master);
    try{src.start(Math.max(now,when),offset,dur);playingSources.push(src);}catch(e){}}}
function seekVideoForPlayhead(){if(!S.src)return;const loc=locate(S.playhead);if(loc)S.src.el.currentTime=loc.src;}
async function play(){if(!S.src||!S.segments.length||S.playing)return;ensureAudio();if(AC.state==="suspended")await AC.resume();
  if(S.playhead>=total()-0.02)S.playhead=0;S.playing=true;$("#playIco").innerHTML='<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>';
  seekVideoForPlayhead();try{await S.src.el.play();}catch(e){}scheduleAudio(S.playhead);lastClock=performance.now();loop();}
function pause(){S.playing=false;$("#playIco").innerHTML='<path d="M8 5v14l11-7z"/>';if(S.src)S.src.el.pause();stopSources();if(raf)cancelAnimationFrame(raf);}
function loop(){if(!S.playing)return;const now=performance.now();lastClock=now;const loc=locate(S.playhead);
  if(loc&&S.src){const seg=S.segments[loc.i];S.playhead=segStart(loc.i)+clamp(S.src.el.currentTime-seg.in,0,segDur(seg));
    if(S.src.el.currentTime>=seg.out-0.03||S.src.el.paused){const ns=loc.i+1;
      if(ns<S.segments.length){S.src.el.currentTime=S.segments[ns].in;S.playhead=segStart(ns)+0.001;if(S.src.el.paused)S.src.el.play().catch(()=>{});}
      else{S.playhead=total();pause();updatePlayhead();drawFrame();return;}}}
  drawFrame();updatePlayhead();raf=requestAnimationFrame(loop);}
function seekTo(t){S.playhead=clamp(t,0,total());if(S.src){const loc=locate(S.playhead);if(loc)S.src.el.currentTime=loc.src;}
  if(S.playing)scheduleAudio(S.playhead);updatePlayhead();if(!S.playing)drawFrame();}
$("#playBtn").addEventListener("click",()=>S.playing?pause():play());

/* ---- timeline render ---- */
function updatePlayhead(){playheadEl.style.left=(S.playhead*S.pps)+"px";$("#timeLbl").textContent=fmt(S.playhead)+" / "+fmt(total());
  const tr=$("#tracks"),x=S.playhead*S.pps;if(x<tr.scrollLeft+40)tr.scrollLeft=x-40;else if(x>tr.scrollLeft+tr.clientWidth-40)tr.scrollLeft=x-tr.clientWidth+40;}
function renderRuler(){const T=Math.max(total(),1);tlinner.style.width=Math.max(T*S.pps+20,$("#tracks").clientWidth)+"px";ruler.innerHTML="";
  let step=1;if(S.pps<30)step=5;else if(S.pps<60)step=2;else if(S.pps>120)step=.5;
  for(let t=0;t<=T+0.001;t+=step){const d=document.createElement("div");d.className="tick";d.style.left=(t*S.pps)+"px";d.textContent=fmt(t).replace(/\.\d$/,"");ruler.appendChild(d);}}
function clipEl(cls,left,width,label,sel,data){const el=document.createElement("div");el.className="clip "+cls+(sel?" sel":"");
  el.style.left=left+"px";el.style.width=Math.max(width,10)+"px";
  el.innerHTML=`<div class="h l"></div><div class="cl-t">${esc(label)}</div><div class="h r"></div>`;Object.assign(el.dataset,data);return el;}
function renderTracks(){$$(".clip").forEach(c=>c.remove());
  const vt=$('[data-track="video"]'),at=$('[data-track="audio"]'),tt=$('[data-track="text"]');
  S.segments.forEach((s,i)=>vt.appendChild(clipEl("vid",segStart(i)*S.pps,segDur(s)*S.pps,"▦ "+fmt(segDur(s)),S.sel&&S.sel.kind==="segment"&&S.sel.id===s.id,{kind:"segment",id:s.id})));
  S.audios.forEach(a=>{const el=clipEl("aud",a.start*S.pps,(a.out-a.in)*S.pps,(a.missing?"⚠ ":"♪ ")+a.name,S.sel&&S.sel.kind==="audio"&&S.sel.id===a.id,{kind:"audio",id:a.id});if(a.missing)el.style.opacity=".6";at.appendChild(el);});
  S.overlays.forEach(o=>tt.appendChild(clipEl("txt",o.start*S.pps,(o.end-o.start)*S.pps,(o.kind==="emoji"?o.text:"T "+(o.text||"").replace(/\n/g," ")),S.sel&&S.sel.kind==="overlay"&&S.sel.id===o.id,{kind:"overlay",id:o.id})));}
function renderAll(){renderRuler();renderTracks();updatePlayhead();refreshButtons();renderPanel();}
function refreshButtons(){$("#delBtn").disabled=!S.sel;$("#splitBtn").disabled=!S.src||!S.segments.length;}
function select(sel){S.sel=sel;renderTracks();refreshButtons();renderPanel();drawFrame();}
function getSelObj(){if(!S.sel)return null;if(S.sel.kind==="segment")return S.segments.find(s=>s.id===S.sel.id);
  if(S.sel.kind==="audio")return S.audios.find(a=>a.id===S.sel.id);if(S.sel.kind==="overlay")return S.overlays.find(o=>o.id===S.sel.id);}

/* ---- edits ---- */
function splitAt(t){const loc=locate(t);if(!loc)return;const seg=S.segments[loc.i],srcT=loc.src;if(srcT<=seg.in+0.05||srcT>=seg.out-0.05)return;
  snapshot();const b=newSeg(srcT,seg.out);b.eff={...seg.eff};b.fx={...seg.fx};seg.out=srcT;seg.fo=0;b.fi=0;S.segments.splice(loc.i+1,0,b);renderAll();toast("Tagliato");}
function delSel(){if(!S.sel)return;snapshot();
  if(S.sel.kind==="segment"){if(S.segments.length<=1){toast("Serve almeno un clip video");S.undo.pop();return;}S.segments=S.segments.filter(s=>s.id!==S.sel.id);}
  else if(S.sel.kind==="audio")S.audios=S.audios.filter(a=>a.id!==S.sel.id);else if(S.sel.kind==="overlay")S.overlays=S.overlays.filter(o=>o.id!==S.sel.id);
  S.sel=null;S.playhead=clamp(S.playhead,0,total());renderAll();seekTo(S.playhead);toast("Eliminato");}
$("#splitBtn").addEventListener("click",()=>splitAt(S.playhead));
$("#delBtn").addEventListener("click",delSel);
$("#undoBtn").addEventListener("click",undo);

/* ---- overlays add ---- */
function addOverlay(kind,text,x,y){if(!S.src){toast("Carica prima un video");return;}snapshot();
  const o={id:uid(),kind,text,x:x!=null?x:0.5,y:y!=null?y:(kind==="emoji"?0.45:0.8),
    size:kind==="emoji"?60:34,color:kind==="emoji"?"#fff":S.textStyle.color,font:kind==="emoji"?"Outfit":S.textStyle.font,bold:kind==="emoji"?true:S.textStyle.bold,
    start:S.playhead,end:Math.min(S.playhead+2.5,total())};if(o.end-o.start<0.5)o.start=Math.max(0,o.end-2.5);
  S.overlays.push(o);renderTracks();select({kind:"overlay",id:o.id});setTab("text");}
$("#addTextBtn").addEventListener("click",()=>addOverlay("text","Nuovo testo"));

/* ============ PANEL / TABS ============ */
function cap(s){return s[0].toUpperCase()+s.slice(1);}
function setTab(name){activeTab=name;$$(".tab").forEach(t=>t.classList.toggle("on",t.dataset.tab===name));
  ["vibe","fx","sound","text","chat"].forEach(k=>$("#pane"+cap(k)).classList.toggle("on",k===name));renderPanel();}
function renderPanel(){if(activeTab==="vibe")renderVibe();else if(activeTab==="fx")renderFx();else if(activeTab==="sound")renderSound();else if(activeTab==="text")renderText();else if(activeTab==="chat")ensureChat();}
$$(".tab").forEach(t=>t.addEventListener("click",()=>setTab(t.dataset.tab)));

/* ---- VIBES ---- */
const VIBES={
 elegante:{name:"Elegante",desc:"Raffinato, caldo",grade:{bri:102,con:104,sat:92,preset:"soft"},fx:{},text:{font:"Playfair",color:"#F3E9D6",bold:false},sw:"linear-gradient(135deg,#A8636A,#2B2724)"},
 creativo:{name:"Creativo",desc:"Vivace, dinamico",grade:{bri:104,con:110,sat:140,preset:"vivid"},fx:{zoom:true},text:{font:"Outfit",color:"#FBF4E6",bold:true},sw:"linear-gradient(135deg,#C7A45E,#AC3F3F)"},
 minimal:{name:"Minimal",desc:"Pulito, essenziale",grade:{bri:103,con:98,sat:72,preset:"none"},fx:{},text:{font:"Outfit",color:"#FBF4E6",bold:true},sw:"linear-gradient(135deg,#efe3cd,#b7ac9b)"},
 energico:{name:"Energico",desc:"Ritmo e impatto",grade:{bri:106,con:114,sat:130,preset:"vivid"},fx:{zoom:true,flash:true},text:{font:"Outfit",color:"#FBF4E6",bold:true},sw:"linear-gradient(135deg,#AC3F3F,#C7A45E)"},
 caldo:{name:"Caldo",desc:"Toni dorati",grade:{bri:104,con:104,sat:120,preset:"warm"},fx:{leak:true},text:{font:"Playfair",color:"#FBF4E6",bold:false},sw:"linear-gradient(135deg,#E0C488,#A8636A)"},
 natalizio:{name:"Natalizio",desc:"Festivo, neve",grade:{bri:104,con:106,sat:125,preset:"warm"},fx:{snow:true,vignette:true},text:{font:"Playfair",color:"#FBF4E6",bold:true},sw:"linear-gradient(135deg,#AC3F3F,#3E7A54)"},
 cinema:{name:"Cinema",desc:"Cinematografico",grade:{bri:98,con:112,sat:104,preset:"cold"},fx:{vignette:true},text:{font:"Playfair",color:"#F3E9D6",bold:false},sw:"linear-gradient(135deg,#35506b,#1c1815)"},
 dolce:{name:"Dolce",desc:"Morbido, romantico",grade:{bri:104,con:96,sat:92,preset:"soft"},fx:{leak:true},text:{font:"Caveat",color:"#FBF4E6",bold:true},sw:"linear-gradient(135deg,#CE8D97,#E0C488)"}
};
function applyVibe(key){const v=VIBES[key];if(!v){return;}if(!S.src){toast("Carica prima un video");return;}snapshot();S.vibe=key;
  S.segments.forEach(s=>{s.eff={...s.eff,bri:v.grade.bri,con:v.grade.con,sat:v.grade.sat,preset:v.grade.preset};s.fx={...v.fx};});
  S.textStyle={...v.text};renderPanel();drawFrame();renderTracks();toast("Vibe «"+v.name+"» applicata");}
function renderVibe(){const p=$("#paneVibe");
  p.innerHTML=`<div class="sec-t">1 · Scegli una vibe</div><p class="hint">Dà al video un look coordinato (colore + stile testo + effetti). Puoi sempre ritoccare dalla tab Effetti.</p>`;
  const grid=document.createElement("div");grid.className="vgrid";
  Object.entries(VIBES).forEach(([k,v])=>{const c=document.createElement("button");c.className="vibe"+(S.vibe===k?" on":"");
    c.innerHTML=`<div class="sw" style="background:${v.sw}"></div><b>${v.name}</b><span>${v.desc}</span>`;c.onclick=()=>applyVibe(k);grid.appendChild(c);});
  p.appendChild(grid);
  const rt=document.createElement("div");rt.innerHTML=`<div class="sec-t" style="margin-top:4px">2 · Oppure allega una referenza</div>
    <p class="hint">Carica un video che ti piace: Claude ne guarda uno fotogramma e ti propone vibe ed elementi.</p>`;p.appendChild(rt);
  const ref=document.createElement("div");ref.className="ref";
  ref.innerHTML=`<img src="${S.refThumb||""}" alt="" style="${S.refThumb?'':'opacity:.3'}">
    <div style="flex:1"><label class="btn sm" for="refFile" style="margin-bottom:6px">${S.refThumb?"Cambia referenza":"Carica referenza"}</label>
    <button class="btn sm accent" id="refAnalyze" ${S.refBlob?"":"disabled"}>Analizza con Claude</button></div>`;
  p.appendChild(ref);
  const an=ref.querySelector("#refAnalyze");if(an)an.onclick=analyzeRef;
}
/* reference */
$("#refFile").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;
  const v=document.createElement("video");v.src=URL.createObjectURL(f);v.muted=true;v.playsInline=true;
  v.addEventListener("loadeddata",()=>{try{v.currentTime=Math.min(0.5,v.duration/2);}catch(e){}});
  v.addEventListener("seeked",()=>{const c=document.createElement("canvas");c.width=120;c.height=213;
    const g=c.getContext("2d");const sc=Math.max(120/v.videoWidth,213/v.videoHeight);const dw=v.videoWidth*sc,dh=v.videoHeight*sc;
    g.drawImage(v,(120-dw)/2,(213-dh)/2,dw,dh);S.refThumb=c.toDataURL("image/jpeg",0.6);
    c.toBlob(b=>{S.refBlob=b;renderPanel();},"image/jpeg",0.7);},{once:true});
  e.target.value="";});
async function analyzeRef(){if(!CAP.sample){setTab("chat");pushAi("La chat live e l'analisi della referenza funzionano nella versione online dell'editor (link condivisibile). Qui offline posso darti idee generali: prova le vibe «Elegante» o «Creativo».");return;}
  setTab("chat");pushAi("Sto guardando la tua referenza… 👀");typing(true);
  try{const prompt="Sei la direttrice creativa di Anna (social media manager). Guarda questo fotogramma di un video di riferimento. In italiano, max 80 parole: 1) qual è la vibe più adatta tra elegante, creativo, minimal, energico, caldo, natalizio, cinema, dolce; 2) 3 elementi visivi da replicare (testi tra «...», effetti); 3) un consiglio sul ritmo.";
    const opts={modelTier:"default"};if(CAP.sampleImages&&S.refBlob)opts.images=[S.refBlob];
    const r=await CAP.sample(prompt,opts);typing(false);pushAiParsed(r.text||"Non sono riuscita a leggere la referenza.");
  }catch(e){typing(false);pushAi("Non sono riuscita ad analizzare la referenza adesso. Riprova tra poco.");}}

/* ---- EFFETTI tab ---- */
function sliderEl(label,val,min,max,unit,oninput,step){const f=document.createElement("div");f.className="field";
  f.innerHTML=`<label><span>${label}</span><span class="val">${val}${unit||""}</span></label>`;
  const r=document.createElement("input");r.type="range";r.min=min;r.max=max;r.value=val;r.step=step||1;
  r.addEventListener("input",()=>{f.querySelector(".val").textContent=r.value+(unit||"");oninput(+r.value);});f.appendChild(r);return f;}
const FXDEFS=[["vignette","Vignetta","M12 3a9 9 0 100 18 9 9 0 000-18z"],["grain","Grana","M5 5h.01M12 5h.01M19 5h.01M5 12h.01M12 12h.01M19 12h.01M5 19h.01M12 19h.01M19 19h.01"],
  ["leak","Bagliore","M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 100 8 4 4 0 000-8z"],["flash","Flash","M13 2L4 14h6l-1 8 9-12h-6z"],
  ["snow","Neve","M12 2v20M4 7l16 10M20 7L4 17"],["shake","Shake","M4 12h16M7 8l-3 4 3 4M17 8l3 4-3 4"],["zoom","Zoom punch","M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3"]];
function renderFx(){const p=$("#paneFx");p.innerHTML="";
  const s=S.sel&&S.sel.kind==="segment"?getSelObj():null;
  if(!s){p.innerHTML=`<div class="sec-t">Effetti clip</div><p class="hint">Seleziona un <b>clip video</b> dalla timeline per regolare look, colore e dissolvenze, e per aggiungere effetti dalla banca qui sotto.</p>`;}
  else{
    const h=document.createElement("div");h.className="sec-t";h.textContent="Look · "+fmt(segDur(s));p.appendChild(h);
    const cw=document.createElement("div");cw.className="chips";Object.entries(PRESETS).forEach(([k,v])=>{const c=document.createElement("button");c.className="chip"+(s.eff.preset===k?" on":"");c.textContent=v;c.onclick=()=>{s.eff.preset=k;drawFrame();renderFx();};cw.appendChild(c);});p.appendChild(cw);
    p.appendChild(sliderEl("Luminosità",s.eff.bri,40,180,"%",v=>{s.eff.bri=v;drawFrame();}));
    p.appendChild(sliderEl("Contrasto",s.eff.con,40,180,"%",v=>{s.eff.con=v;drawFrame();}));
    p.appendChild(sliderEl("Saturazione",s.eff.sat,0,220,"%",v=>{s.eff.sat=v;drawFrame();}));
    p.appendChild(sliderEl("Zoom",s.eff.scale,100,180,"%",v=>{s.eff.scale=v;drawFrame();}));
    p.appendChild(sliderEl("Dissolvenza in entrata",s.fi,0,2,"s",v=>{s.fi=v;drawFrame();},0.1));
    p.appendChild(sliderEl("Dissolvenza in uscita",s.fo,0,2,"s",v=>{s.fo=v;drawFrame();},0.1));
  }
  const bt=document.createElement("div");bt.className="sec-t";bt.textContent="Banca effetti";bt.style.marginTop="4px";p.appendChild(bt);
  if(!s){const hh=document.createElement("p");hh.className="hint";hh.textContent="Seleziona un clip per attivarli.";p.appendChild(hh);}
  const bank=document.createElement("div");bank.className="bank";
  FXDEFS.forEach(([key,name,path])=>{const c=document.createElement("button");c.className="bcard"+(s&&s.fx[key]?" on":"");c.style.textAlign="left";
    c.innerHTML=`<div class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="${path}"/></svg></div><b>${name}</b><span class="d">${s&&s.fx[key]?"Attivo — tocca per togliere":"Tocca per applicare"}</span>`;
    c.onclick=()=>{if(!s){toast("Seleziona un clip video");return;}snapshot();s.fx[key]=!s.fx[key];drawFrame();renderFx();};bank.appendChild(c);});
  p.appendChild(bank);
}

/* ---- SUONI tab (bank) ---- */
function renderOffline(dur,build){const sr=44100,OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;const oc=new OAC(2,Math.ceil(sr*dur),sr);build(oc);return oc.startRendering();}
function noiseBuf(oc,dur){const sr=oc.sampleRate,n=Math.ceil(sr*dur),b=oc.createBuffer(1,n,sr),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return b;}
const SFX={
  whoosh:{name:"Whoosh",d:"transizione",dur:0.7,build:oc=>{const s=oc.createBufferSource();s.buffer=noiseBuf(oc,0.7);const f=oc.createBiquadFilter();f.type="bandpass";f.frequency.setValueAtTime(400,0);f.frequency.exponentialRampToValueAtTime(3600,0.5);f.Q.value=0.8;const g=oc.createGain();g.gain.setValueAtTime(0.0001,0);g.gain.linearRampToValueAtTime(0.5,0.18);g.gain.exponentialRampToValueAtTime(0.001,0.7);s.connect(f);f.connect(g);g.connect(oc.destination);s.start(0);}},
  pop:{name:"Pop",d:"accento",dur:0.2,build:oc=>{const o=oc.createOscillator();o.type="sine";o.frequency.setValueAtTime(900,0);o.frequency.exponentialRampToValueAtTime(180,0.12);const g=oc.createGain();g.gain.setValueAtTime(0.5,0);g.gain.exponentialRampToValueAtTime(0.001,0.18);o.connect(g);g.connect(oc.destination);o.start(0);o.stop(0.2);}},
  ding:{name:"Ding",d:"notifica",dur:0.8,build:oc=>{[1319,1760].forEach((fq,i)=>{const o=oc.createOscillator();o.type="sine";o.frequency.value=fq;const g=oc.createGain();g.gain.setValueAtTime(i?0.18:0.35,0);g.gain.exponentialRampToValueAtTime(0.001,0.8);o.connect(g);g.connect(oc.destination);o.start(0);o.stop(0.8);});}},
  riser:{name:"Riser",d:"tensione",dur:1.1,build:oc=>{const s=oc.createBufferSource();s.buffer=noiseBuf(oc,1.1);const f=oc.createBiquadFilter();f.type="highpass";f.frequency.setValueAtTime(300,0);f.frequency.exponentialRampToValueAtTime(5000,1.0);const g=oc.createGain();g.gain.setValueAtTime(0.05,0);g.gain.linearRampToValueAtTime(0.5,1.0);g.gain.exponentialRampToValueAtTime(0.001,1.1);s.connect(f);f.connect(g);g.connect(oc.destination);s.start(0);}},
  boom:{name:"Boom",d:"impatto",dur:0.9,build:oc=>{const o=oc.createOscillator();o.type="sine";o.frequency.setValueAtTime(120,0);o.frequency.exponentialRampToValueAtTime(45,0.5);const g=oc.createGain();g.gain.setValueAtTime(0.9,0);g.gain.exponentialRampToValueAtTime(0.001,0.9);o.connect(g);g.connect(oc.destination);o.start(0);o.stop(0.9);}},
  swoosh:{name:"Swoosh",d:"transizione",dur:0.5,build:oc=>{const s=oc.createBufferSource();s.buffer=noiseBuf(oc,0.5);const f=oc.createBiquadFilter();f.type="highpass";f.frequency.setValueAtTime(1500,0);f.frequency.exponentialRampToValueAtTime(600,0.4);const g=oc.createGain();g.gain.setValueAtTime(0.4,0);g.gain.exponentialRampToValueAtTime(0.001,0.5);s.connect(f);f.connect(g);g.connect(oc.destination);s.start(0);}},
  click:{name:"Click",d:"tap",dur:0.08,build:oc=>{const s=oc.createBufferSource();s.buffer=noiseBuf(oc,0.08);const g=oc.createGain();g.gain.setValueAtTime(0.5,0);g.gain.exponentialRampToValueAtTime(0.001,0.07);s.connect(g);g.connect(oc.destination);s.start(0);}},
  shimmer:{name:"Shimmer",d:"magia",dur:1.0,build:oc=>{[2093,2637,3136].forEach((fq,i)=>{const o=oc.createOscillator();o.type="triangle";o.frequency.value=fq;const g=oc.createGain();g.gain.setValueAtTime(0.0001,0);g.gain.linearRampToValueAtTime(0.14,0.1+i*0.08);g.gain.exponentialRampToValueAtTime(0.001,1.0);o.connect(g);g.connect(oc.destination);o.start(i*0.05);o.stop(1.0);});}},
  sparkle:{name:"Sparkle",d:"brillio",dur:0.7,build:oc=>{for(let k=0;k<6;k++){const o=oc.createOscillator();o.type="sine";o.frequency.value=1800+Math.random()*2200;const g=oc.createGain();const st=k*0.08;g.gain.setValueAtTime(0.0001,st);g.gain.linearRampToValueAtTime(0.18,st+0.01);g.gain.exponentialRampToValueAtTime(0.001,st+0.15);o.connect(g);g.connect(oc.destination);o.start(st);o.stop(st+0.16);}}},
  heartbeat:{name:"Battito",d:"ritmo",dur:0.9,build:oc=>{[0,0.28].forEach(st=>{const o=oc.createOscillator();o.type="sine";o.frequency.setValueAtTime(90,st);o.frequency.exponentialRampToValueAtTime(50,st+0.14);const g=oc.createGain();g.gain.setValueAtTime(0.0001,st);g.gain.linearRampToValueAtTime(0.8,st+0.02);g.gain.exponentialRampToValueAtTime(0.001,st+0.2);o.connect(g);g.connect(oc.destination);o.start(st);o.stop(st+0.25);});}}
};
async function previewSfx(key){ensureAudio();if(AC.state==="suspended")await AC.resume();try{const buf=await renderOffline(SFX[key].dur,SFX[key].build);const s=AC.createBufferSource();s.buffer=buf;const g=AC.createGain();g.gain.value=0.9;s.connect(g);g.connect(AC.destination);s.start();}catch(e){}}
async function addSfx(key){if(!S.src){toast("Carica prima un video");return;}ensureAudio();try{const buf=await renderOffline(SFX[key].dur,SFX[key].build);snapshot();
  S.audios.push({id:uid(),name:SFX[key].name,buf,sfx:key,blob:null,assetId:null,start:S.playhead,in:0,out:buf.duration,vol:0.9,missing:false});
  renderTracks();select({kind:"audio",id:S.audios[S.audios.length-1].id});toast(SFX[key].name+" aggiunto");}catch(e){toast("Errore audio");}}
function renderSound(){const p=$("#paneSound");p.innerHTML="";
  const a=S.sel&&S.sel.kind==="audio"?getSelObj():null;
  if(a){const h=document.createElement("div");h.className="sec-t";h.textContent=(a.missing?"⚠ ":"")+a.name;p.appendChild(h);
    if(a.missing){const w=document.createElement("div");w.innerHTML=`<p class="hint" style="color:var(--danger)">File non salvato nel progetto. Ricaricalo per sentirlo.</p>`;const b=document.createElement("button");b.className="btn sm accent";b.textContent="Ricarica file";b.onclick=()=>{relinkTarget=a.id;$("#audioFile").click();};w.appendChild(b);p.appendChild(w);}
    p.appendChild(sliderEl("Volume",Math.round(a.vol*100),0,150,"%",v=>{a.vol=v/100;}));
    const r=document.createElement("div");r.className="row";const b=document.createElement("button");b.className="btn sm";b.textContent="Allinea al cursore";b.onclick=()=>{snapshot();a.start=S.playhead;renderTracks();};r.appendChild(b);p.appendChild(r);
    p.appendChild(Object.assign(document.createElement("p"),{className:"hint",textContent:"Trascina il blocco verde sulla traccia per spostarlo; i bordi per tagliarlo."}));
  }
  const ht=document.createElement("div");ht.className="sec-t";ht.textContent="Banca suoni";ht.style.marginTop="2px";p.appendChild(ht);
  const up=document.createElement("label");up.className="btn sm";up.setAttribute("for","audioFile");up.textContent="＋ Carica la tua musica";p.appendChild(up);
  const list=document.createElement("div");list.className="soundlist";
  Object.entries(SFX).forEach(([k,v])=>{const row=document.createElement("div");row.className="srow";
    row.innerHTML=`<button class="iconbtn" title="Ascolta"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button><div class="nm"><b>${v.name}</b><span>${v.d}</span></div><button class="btn sm accent">Aggiungi</button>`;
    row.children[0].onclick=()=>previewSfx(k);row.children[2].onclick=()=>addSfx(k);list.appendChild(row);});
  p.appendChild(list);
}

/* ---- TESTO tab ---- */
function renderText(){const p=$("#paneText");p.innerHTML="";
  const r=document.createElement("div");r.className="row";
  const bt=document.createElement("button");bt.className="btn";bt.textContent="＋ Testo";bt.onclick=()=>addOverlay("text","Nuovo testo");
  const be=document.createElement("button");be.className="btn";be.textContent="＋ Emoji";be.onclick=openEmoji;r.appendChild(bt);r.appendChild(be);p.appendChild(r);
  const o=S.sel&&S.sel.kind==="overlay"?getSelObj():null;
  if(!o){p.appendChild(Object.assign(document.createElement("p"),{className:"hint",textContent:"Aggiungi un testo o un'emoji, poi trascinalo direttamente sul video per posizionarlo."}));return;}
  const h=document.createElement("div");h.className="sec-t";h.textContent=o.kind==="emoji"?"Emoji":"Testo";p.appendChild(h);
  if(o.kind!=="emoji"){
    const f=document.createElement("div");f.className="field";f.innerHTML=`<label><span>Testo</span></label>`;const ta=document.createElement("textarea");ta.value=o.text;ta.oninput=()=>{o.text=ta.value;drawFrame();renderTracks();};f.appendChild(ta);p.appendChild(f);
    const ff=document.createElement("div");ff.className="field";ff.innerHTML=`<label><span>Font</span></label>`;const sel=document.createElement("select");FONTS.forEach(([n,v])=>{const op=document.createElement("option");op.value=v;op.textContent=n;if(o.font===v)op.selected=true;sel.appendChild(op);});sel.onchange=()=>{o.font=sel.value;drawFrame();};ff.appendChild(sel);p.appendChild(ff);
    const cf=document.createElement("div");cf.className="field";cf.innerHTML=`<label><span>Colore</span></label>`;const sw=document.createElement("div");sw.className="swatches";PALETTE.forEach(c=>{const b=document.createElement("button");b.className="sw2"+(o.color===c?" on":"");b.style.background=c;b.onclick=()=>{o.color=c;renderText();drawFrame();};sw.appendChild(b);});cf.appendChild(sw);p.appendChild(cf);
    const tg=document.createElement("div");tg.className="field";tg.innerHTML=`<label><span>Stile</span></label>`;const tog=document.createElement("div");tog.className="toggle";const g1=document.createElement("button");g1.textContent="Grassetto";g1.className=o.bold?"on":"";const g2=document.createElement("button");g2.textContent="Normale";g2.className=o.bold?"":"on";g1.onclick=()=>{o.bold=true;renderText();drawFrame();};g2.onclick=()=>{o.bold=false;renderText();drawFrame();};tog.appendChild(g1);tog.appendChild(g2);tg.appendChild(tog);p.appendChild(tg);
  }
  p.appendChild(sliderEl("Dimensione",o.size,12,120,"",v=>{o.size=v;drawFrame();}));
  const dur=document.createElement("div");dur.className="row";const b1=document.createElement("button");b1.className="btn sm ghost";b1.textContent="Inizio = cursore";b1.onclick=()=>{snapshot();o.start=clamp(S.playhead,0,o.end-0.3);renderTracks();drawFrame();};const b2=document.createElement("button");b2.className="btn sm ghost";b2.textContent="Fine = cursore";b2.onclick=()=>{snapshot();o.end=clamp(S.playhead,o.start+0.3,total());renderTracks();drawFrame();};dur.appendChild(b1);dur.appendChild(b2);p.appendChild(dur);
  const sv=document.createElement("button");sv.className="btn sm";sv.textContent="🎨 Salva come stile";sv.onclick=()=>{setTab("chat");openStyles();};
  if(o.kind!=="emoji")p.appendChild(sv);
  p.appendChild(Object.assign(document.createElement("p"),{className:"hint",textContent:"Trascina sul video per posizionarlo."}));
}
function openEmoji(){if(!S.src){toast("Carica prima un video");return;}const m=document.createElement("div");m.className="modal";
  m.innerHTML=`<div class="card"><h2>Scegli un'emoji</h2><div class="chips" style="font-size:24px">${EMOJIS.map(e=>`<button class="chip" data-e="${e}" style="font-size:22px">${e}</button>`).join("")}</div><div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn ghost" data-x>Chiudi</button></div></div>`;
  m.addEventListener("click",ev=>{if(ev.target===m||ev.target.hasAttribute("data-x"))m.remove();const b=ev.target.closest("[data-e]");if(b){addOverlay("emoji",b.dataset.e);m.remove();}});document.body.appendChild(m);}

/* ---- CHAT ---- */
function ensureChat(){const p=$("#paneChat");if(p.dataset.built)return;p.dataset.built="1";p.classList.add("chat");p.style.padding="12px";
  p.innerHTML=`<div class="chatlog" id="chatlog"></div><div class="chatbar"><textarea id="chatIn" placeholder="Chiedimi idee: hook, testi, effetti, ritmo…"></textarea><button class="btn accent" id="chatSend" style="align-self:flex-end"><svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l18-8-8 18-2-7z"/></svg></button></div>`;
  const send=()=>{const t=($("#chatIn").value||"").trim();if(!t)return;$("#chatIn").value="";askClaude(t);};
  p.querySelector("#chatSend").onclick=send;
  p.querySelector("#chatIn").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}});
  S.chat.forEach(m=>appendBubble(m.role,m.text,m.quotes));}
function appendBubble(role,text,quotes){const log=$("#chatlog");if(!log)return;const d=document.createElement("div");d.className="msg "+(role==="me"?"me":role==="sys"?"sys":"ai");
  d.textContent=text;if(role!=="me"&&quotes&&quotes.length){const a=document.createElement("div");a.className="acts";
    quotes.forEach(q=>{const b=document.createElement("button");b.className="btn sm";b.textContent="＋ "+q;b.onclick=()=>{addOverlay("text",q);toast("Testo aggiunto");};a.appendChild(b);});d.appendChild(a);}
  log.appendChild(d);log.scrollTop=log.scrollHeight;}
function pushMe(t){S.chat.push({role:"me",text:t});appendBubble("me",t);}
function pushAi(t){S.chat.push({role:"ai",text:t});appendBubble("ai",t);}
function pushAiParsed(t){const quotes=[];const re=/«([^»]{2,60})»/g;let m;while((m=re.exec(t)))quotes.push(m[1]);S.chat.push({role:"ai",text:t,quotes});appendBubble("ai",t,quotes);
  const vk=detectVibe(t);if(vk){const log=$("#chatlog");if(log){const d=document.createElement("div");d.className="msg sys";const b=document.createElement("button");b.className="btn sm accent";b.textContent="Applica vibe «"+VIBES[vk].name+"»";b.onclick=()=>applyVibe(vk);d.appendChild(b);log.appendChild(d);log.scrollTop=log.scrollHeight;}}}
function detectVibe(t){const low=(t||"").toLowerCase();for(const k of Object.keys(VIBES))if(low.includes(k))return k;return null;}
let typingEl=null;function typing(on){const log=$("#chatlog");if(!log)return;if(on){if(typingEl)return;typingEl=document.createElement("div");typingEl.className="typing";typingEl.textContent="Claude sta scrivendo…";log.appendChild(typingEl);log.scrollTop=log.scrollHeight;}else if(typingEl){typingEl.remove();typingEl=null;}}
function greet(){if(S._greeted)return;S._greeted=true;setTab("chat");
  pushAiParsed("Ciao Anna! 🎬 Ho aperto il tuo video. Ecco tre idee per renderlo più forte:\n\n• Un hook grande nei primi 2 secondi, tipo «Fermati un attimo…»\n• Una vibe coordinata (prova «Elegante» o «Creativo» dalla tab Vibe)\n• Un whoosh sui tagli per dare ritmo (tab Suoni)\n\nDimmi di cosa parla il reel e ti propongo testi ed effetti su misura.");}
async function askClaude(text){pushMe(text);
  if(!CAP.sample){pushAi("La chat live con me è attiva nella versione online dell'editor (il link condivisibile). Intanto: scegli una vibe, aggiungi un hook grande all'inizio e un whoosh sul primo taglio. Vuoi che ti prepari io dei testi? Scrivimeli nella nostra chat qui su Claude. 💛");return;}
  typing(true);
  try{const hist=S.chat.slice(-8).map(m=>(m.role==="me"?"Anna: ":"Tu: ")+m.text).join("\n");
    const sys="Sei la direttrice creativa dello studio di Anna, social media manager dell'agenzia Marketing Verace. Aiuti a montare reel verticali. Rispondi SEMPRE in italiano, tono caldo e concreto, massimo 80 parole. Proponi elementi visivi: testi/hook da mostrare a schermo, effetti e vibe (tra elegante, creativo, minimal, energico, caldo, natalizio, cinema, dolce), ritmo dei tagli. Quando proponi una scritta da mettere nel video, mettila tra virgolette basse «così». Niente elenchi lunghissimi.";
    const ctx="Contesto reel: durata "+fmt(total())+", "+S.segments.length+" clip, vibe attuale: "+(S.vibe?VIBES[S.vibe].name:"nessuna")+".";
    const r=await CAP.sample(sys+"\n\n"+ctx+"\n\nConversazione:\n"+hist+"\n\nRispondi all'ultimo messaggio di Anna.",{modelTier:"default"});
    typing(false);pushAiParsed(r.text||"…");
  }catch(e){typing(false);const code=e&&e.code;pushAi(code==="rate_limited"?"Un attimo, troppe richieste insieme — riprova tra poco.":"Non riesco a rispondere adesso. Riprova tra poco.");}
}

/* ---- timeline pointer ---- */
let drag=null;
$("#tracks").addEventListener("pointerdown",e=>{const tr=$("#tracks"),rect=tlinner.getBoundingClientRect(),x=e.clientX-rect.left,t=x/S.pps;
  const clip=e.target.closest(".clip");
  if(!clip){const trackEl=e.target.closest(".track");pause();seekTo(t);select(null);
    if(trackEl&&trackEl.dataset.track==="audio")setTab("sound");else if(trackEl&&trackEl.dataset.track==="text")setTab("text");
    drag={mode:"scrub"};tr.setPointerCapture(e.pointerId);return;}
  const kind=clip.dataset.kind,id=clip.dataset.id;select({kind,id});
  setTab(kind==="segment"?"fx":kind==="audio"?"sound":"text");
  const handle=e.target.classList.contains("h")?(e.target.classList.contains("l")?"l":"r"):null;const obj=getSelObj();snapshot();
  drag={mode:handle?"trim":"move",handle,kind,id,startX:e.clientX,obj,
    orig:JSON.parse(JSON.stringify(kind==="segment"?{in:obj.in,out:obj.out}:kind==="audio"?{start:obj.start,in:obj.in,out:obj.out}:{start:obj.start,end:obj.end}))};
  tr.setPointerCapture(e.pointerId);});
$("#tracks").addEventListener("pointermove",e=>{if(!drag)return;const rect=tlinner.getBoundingClientRect(),t=(e.clientX-rect.left)/S.pps,dt=(e.clientX-drag.startX)/S.pps;
  if(drag.mode==="scrub"){seekTo(t);return;}const o=drag.obj,og=drag.orig;
  if(drag.kind==="segment"){if(drag.handle==="l")o.in=clamp(og.in+dt,0,o.out-0.1);else if(drag.handle==="r")o.out=clamp(og.out+dt,o.in+0.1,S.src.dur);renderTracks();drawFrame();}
  else if(drag.kind==="audio"){if(drag.mode==="move")o.start=Math.max(0,og.start+dt);else if(drag.handle==="l")o.in=clamp(og.in+dt,0,o.out-0.1);else o.out=clamp(og.out+dt,o.in+0.1,(o.buf?o.buf.duration:o.out));renderTracks();}
  else{if(drag.mode==="move"){const d=og.end-og.start;o.start=Math.max(0,og.start+dt);o.end=o.start+d;}else if(drag.handle==="l")o.start=clamp(og.start+dt,0,o.end-0.3);else o.end=clamp(og.end+dt,o.start+0.3,total()+30);renderTracks();}});
$("#tracks").addEventListener("pointerup",()=>{if(drag&&drag.mode!=="scrub"){renderRuler();renderPanel();seekTo(S.playhead);}drag=null;});

/* ---- canvas overlay drag ---- */
let odrag=null;
canvas.addEventListener("pointerdown",e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;let hit=null;
  for(let i=S.overlays.length-1;i>=0;i--){const o=S.overlays[i];if(S.playhead<o.start||S.playhead>o.end)continue;const fs=(o.size/100*CH*0.1+10)/CH,w=0.46,h=fs*1.3*Math.max(1,(o.text||"").split("\n").length);if(Math.abs(x-o.x)<w&&Math.abs(y-o.y)<h){hit=o;break;}}
  if(hit){select({kind:"overlay",id:hit.id});setTab("text");snapshot();odrag={o:hit,dx:x-hit.x,dy:y-hit.y};canvas.setPointerCapture(e.pointerId);canvas.style.cursor="grabbing";}});
canvas.addEventListener("pointermove",e=>{if(!odrag)return;const r=canvas.getBoundingClientRect();odrag.o.x=clamp((e.clientX-r.left)/r.width-odrag.dx,0.05,0.95);odrag.o.y=clamp((e.clientY-r.top)/r.height-odrag.dy,0.05,0.95);drawFrame();});
canvas.addEventListener("pointerup",()=>{if(odrag){odrag=null;canvas.style.cursor="grab";renderPanel();}});

/* ---- zoom/keys/theme ---- */
$("#zoomIn").addEventListener("click",()=>{S.pps=clamp(S.pps*1.3,12,240);renderAll();});
$("#zoomOut").addEventListener("click",()=>{S.pps=clamp(S.pps/1.3,12,240);renderAll();});
$("#addSoundBtn").addEventListener("click",()=>setTab("sound"));
$("#addFxBtn").addEventListener("click",()=>setTab("fx"));
document.addEventListener("keydown",e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  if(e.code==="Space"){e.preventDefault();S.playing?pause():play();}else if(e.key==="s"||e.key==="S")splitAt(S.playhead);
  else if(e.key==="Delete"||e.key==="Backspace"){if(S.sel){e.preventDefault();delSel();}}
  else if(e.key==="ArrowLeft"){pause();seekTo(S.playhead-(e.shiftKey?1:0.1));}else if(e.key==="ArrowRight"){pause();seekTo(S.playhead+(e.shiftKey?1:0.1));}
  else if(e.key==="z"||e.key==="Z")undo();});
$("#themeBtn").addEventListener("click",()=>{const cur=document.documentElement.getAttribute("data-theme");const sysDark=matchMedia("(prefers-color-scheme:dark)").matches;document.documentElement.setAttribute("data-theme",cur?(cur==="dark"?"light":"dark"):(sysDark?"light":"dark"));});
$("#helpBtn").addEventListener("click",()=>{const m=document.createElement("div");m.className="modal";
  m.innerHTML=`<div class="card"><h2>Come si usa</h2><p class="note" style="font-size:13.5px;line-height:1.7">
  <b>1.</b> Carica un video (o usa la demo).<br><b>2. Vibe</b> — scegli un look coordinato, o allega una referenza e fatti analizzare da Claude.<br>
  <b>3. Chat</b> — chiedimi idee: hook, testi, effetti, ritmo. Posso trasformare una frase in testo con un clic.<br>
  <b>4. Taglia</b> — cursore + <span class="kbd">S</span>; seleziona e <span class="kbd">Canc</span>; trascina i bordi per ritagliare.<br>
  <b>5. Suoni</b> — banca di effetti sonori pronti (ascolta e aggiungi) o carica la tua musica.<br>
  <b>6. Effetti</b> — look, colore, dissolvenze e banca effetti (vignetta, grana, bagliore, flash, neve, shake, zoom).<br>
  <b>7. Testo/Emoji</b> — aggiungi e trascina sul video.<br><b>8. Esporta</b> — scarica, salva in Libreria o copia il piano per il render in alta qualità.<br>
  <b>9. Salva</b> — Progetti, Libreria e Stili restano legati al tuo account.</p>
  <div class="row" style="margin-top:8px;justify-content:flex-end"><button class="btn accent" data-x>Ho capito</button></div></div>`;
  m.addEventListener("click",ev=>{if(ev.target===m||ev.target.hasAttribute("data-x"))m.remove();});document.body.appendChild(m);});

/* ============ EXPORT ============ */
function buildPlan(){return{format:"verace-studio-plan/2",createdAt:new Date().toISOString(),canvas:{w:1080,h:1920,fps:30},
  vibe:S.vibe,totalDuration:+total().toFixed(2),source:S.src?{duration:+S.src.dur.toFixed(2),w:S.src.w,h:S.src.h}:null,
  segments:S.segments.map((s,i)=>({order:i,sourceIn:+s.in.toFixed(2),sourceOut:+s.out.toFixed(2),effects:s.eff,fx:s.fx,fadeIn:s.fi,fadeOut:s.fo})),
  audio:S.audios.map(a=>({name:a.name,sfx:a.sfx||null,timelineStart:+a.start.toFixed(2),clipIn:+a.in.toFixed(2),clipOut:+a.out.toFixed(2),volume:+a.vol.toFixed(2)})),
  overlays:S.overlays.map(o=>({type:o.kind,text:o.text,xPct:+(o.x*100).toFixed(1),yPct:+(o.y*100).toFixed(1),size:o.size,color:o.color,font:o.font,bold:o.bold,start:+o.start.toFixed(2),end:+o.end.toFixed(2)}))};}
function thumbDataUrl(){try{const c=document.createElement("canvas");c.width=120;c.height=213;c.getContext("2d").drawImage(canvas,0,0,120,213);return c.toDataURL("image/jpeg",0.5);}catch(e){return"";}}
function openExport(){if(!S.src){toast("Carica prima un video");return;}const m=document.createElement("div");m.className="modal";
  m.innerHTML=`<div class="card"><h2>Esporta il reel</h2><p class="note">Durata <b>${fmt(total())}</b> · ${S.segments.length} clip · ${S.audios.length} audio · ${S.overlays.length} testi${S.vibe?" · vibe "+VIBES[S.vibe].name:""}</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin:14px 0">
      <button class="btn accent" id="exPlan">Copia il piano per Claude · alta qualità (1080×1920)</button>
      <button class="btn" id="exLib">Salva nella Libreria</button>
      <button class="btn" id="exVideo">Scarica video adesso (.webm)</button></div>
    <p class="note">Il piano contiene tagli, effetti, testi, suoni e tempi: incollamelo in chat per il render finale con i tuoi font.</p>
    <div id="exArea"></div><div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn ghost" data-x>Chiudi</button></div></div>`;
  m.addEventListener("click",ev=>{if((ev.target===m||ev.target.hasAttribute("data-x"))&&!recording)m.remove();});
  m.querySelector("#exPlan").onclick=()=>showPlan(m);m.querySelector("#exVideo").onclick=()=>recordVideo(m,"download");m.querySelector("#exLib").onclick=()=>recordVideo(m,"library");
  document.body.appendChild(m);}
function showPlan(m){const plan=JSON.stringify(buildPlan(),null,2),area=m.querySelector("#exArea");
  area.innerHTML=`<pre id="planPre">${esc(plan)}</pre><button class="btn accent sm" id="copyPlan">Copia negli appunti</button>`;
  m.querySelector("#copyPlan").onclick=async()=>{try{await navigator.clipboard.writeText(plan);toast("Piano copiato! Incollalo in chat.");}catch(e){const pre=m.querySelector("#planPre"),r=document.createRange();r.selectNodeContents(pre);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);toast("Selezionato: premi Cmd/Ctrl+C");}};}
let recording=false;
async function recordVideo(m,sink){sink=sink||"download";if(recording)return;const area=m.querySelector("#exArea");
  if(sink==="library"&&!cloudOn()){area.innerHTML=`<p class="note">La Libreria è disponibile nella versione online (link condivisibile).</p>`;return;}
  if(typeof MediaRecorder==="undefined"){area.innerHTML=`<p class="note">Browser senza registrazione. Usa «Copia il piano».</p>`;return;}
  ensureAudio();if(AC.state==="suspended")await AC.resume();
  const types=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"];const mime=types.find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||"";
  const vstream=canvas.captureStream(30),stream=new MediaStream([...vstream.getVideoTracks(),...exportDest.stream.getAudioTracks()]);
  let rec;try{rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:3500000}:undefined);}catch(e){area.innerHTML=`<p class="note">Registrazione non disponibile. Usa «Copia il piano».</p>`;return;}
  const chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recording=true;
  area.innerHTML=`<p class="note">Registrazione… <b id="exPct">0%</b> (resta su questa scheda)</p>`;pause();S.playhead=0;seekTo(0);drawFrame();const thumb=thumbDataUrl();
  rec.onstop=async()=>{recording=false;const blob=new Blob(chunks,{type:mime.split(";")[0]||"video/webm"}),ext=mime.includes("mp4")?"mp4":"webm",fn=(S.projectName||"verace-reel").replace(/[^\w\-]+/g,"-")+"."+ext,sizeMB=(blob.size/1048576).toFixed(1);
    if(sink==="library"){area.innerHTML=`<p class="note">Caricamento nella libreria…</p>`;try{const up=await CAP.assets.upload(blob,{type:mime.includes("mp4")?"video/mp4":"video/webm"});await CAP.db.collection("exports").add({name:S.projectName||"Reel senza nome",assetId:up.id,ext,durationSec:+total().toFixed(1),sizeBytes:blob.size,thumb,createdAt:Date.now()});area.innerHTML=`<p class="note">✓ Salvato nella Libreria (${sizeMB} MB).</p>`;}catch(err){area.innerHTML=`<p class="note">${err&&err.code==="too_large"?"Supera 20 MB: accorcia il reel.":"Caricamento non riuscito."}</p>`;}return;}
    if(DL){try{await DL.save({filename:fn,data:blob});area.innerHTML=`<p class="note">✓ Video salvato (${sizeMB} MB). Per 1080×1920 usa «Copia il piano».</p>`;return;}catch(err){if(err&&err.code==="declined"){area.innerHTML=`<p class="note">Annullato.</p>`;return;}}}
    const url=URL.createObjectURL(blob);try{const a=document.createElement("a");a.href=url;a.download=fn;document.body.appendChild(a);a.click();a.remove();}catch(e){}
    area.innerHTML=`<p class="note">Video pronto (${sizeMB} MB). <a href="${url}" download="${fn}" class="btn accent sm">Scarica</a><br>Se non parte, apri l'editor come file sul tuo computer, o usa «Copia il piano».</p>`;};
  rec.start(200);await play();const tot=total();
  const watch=()=>{const pct=Math.min(100,Math.round(S.playhead/tot*100));const pe=m.querySelector("#exPct");if(pe)pe.textContent=pct+"%";if(!S.playing||S.playhead>=tot-0.05){try{rec.stop()}catch(e){}return;}requestAnimationFrame(watch);};requestAnimationFrame(watch);}
$("#exportBtn").addEventListener("click",openExport);

/* ============ STORAGE: projects / library / styles ============ */
function openModal(titleHtml){const m=document.createElement("div");m.className="modal";const card=document.createElement("div");card.className="card";
  card.innerHTML=`<h2>${titleHtml}</h2><div class="mbody"></div><div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn ghost" data-x>Chiudi</button></div>`;
  m.appendChild(card);m.addEventListener("click",ev=>{if(ev.target===m||ev.target.hasAttribute("data-x"))m.remove();});document.body.appendChild(m);return{m,body:card.querySelector(".mbody")};}
function infoModal(t,x){const{body}=openModal(t);body.innerHTML=`<p class="note">${x}</p>`;}
async function ensureSourceAsset(){if(S.src.assetId)return S.src.assetId;if(!S.src.blob)throw{code:"no_blob"};const t=(S.src.blob.type||"");const type=t.includes("webm")?"video/webm":(t.includes("mp4")?"video/mp4":"");if(!type)throw{code:"bad_type"};const up=await CAP.assets.upload(S.src.blob,{type});S.src.assetId=up.id;return up.id;}
async function saveProjectDoc(name){await ensureSourceAsset();S.projectName=name;const id=S.projectId||uid(),now=Date.now();
  const body={name,updatedAt:now,createdAt:S.projectCreatedAt||now,vibe:S.vibe,textStyle:S.textStyle,source:{assetId:S.src.assetId,w:S.src.w,h:S.src.h,dur:+S.src.dur.toFixed(3)},
    segments:S.segments.map(s=>({in:+s.in.toFixed(3),out:+s.out.toFixed(3),eff:s.eff,fx:s.fx,fi:s.fi,fo:s.fo})),
    overlays:S.overlays.map(o=>({kind:o.kind,text:o.text,x:o.x,y:o.y,size:o.size,color:o.color,font:o.font,bold:o.bold,start:o.start,end:o.end})),
    audios:S.audios.map(a=>({name:a.name,sfx:a.sfx||null,start:a.start,in:a.in,out:a.out,vol:a.vol})),thumb:thumbDataUrl()};
  await CAP.db.collection("projects").doc(id).set(body);S.projectId=id;S.projectCreatedAt=body.createdAt;}
function loadProjectData(p,id){S.segments=[];S.audios=[];S.overlays=[];S.undo=[];$("#undoBtn").disabled=true;S.projectId=id;S.projectName=p.name;S.projectCreatedAt=p.createdAt;S.vibe=p.vibe||null;if(p.textStyle)S.textStyle=p.textStyle;S._greeted=true;
  loadVideoFromUrl("/_blob/"+p.source.assetId,"Progetto aperto: "+p.name,{assetId:p.source.assetId,silentGreet:true,after:()=>{
    S.segments=(p.segments||[]).map(s=>({id:uid(),in:s.in,out:s.out,eff:s.eff||{bri:100,con:100,sat:100,scale:100,preset:"none"},fx:s.fx||{},fi:s.fi||0,fo:s.fo||0}));
    if(!S.segments.length)S.segments=[newSeg(0,S.src.dur)];
    S.overlays=(p.overlays||[]).map(o=>({...o,id:uid()}));
    S.audios=(p.audios||[]).map(a=>({id:uid(),name:a.name,sfx:a.sfx||null,start:a.start,in:a.in,out:a.out,vol:a.vol,buf:null,blob:null,assetId:null,missing:!a.sfx}));
  },sfxRestore:async()=>{for(const a of S.audios){if(a.sfx&&SFX[a.sfx]){try{a.buf=await renderOffline(SFX[a.sfx].dur,SFX[a.sfx].build);a.missing=false;renderTracks();}catch(e){}}}}});}
function doSaveProject(){if(!cloudOn()){infoModal("Salva progetto","I progetti si salvano nella versione <b>online</b> (il link condivisibile). Nel file locale puoi comunque montare ed esportare.");return;}if(!CAP.canWrite){infoModal("Salva progetto","Hai accesso in sola lettura.");return;}if(!S.src){toast("Carica prima un video");return;}
  const{m,body}=openModal("💾 Salva progetto");body.innerHTML=`<div class="field"><label><span>Nome del progetto</span></label><input type="text" id="pName" maxlength="60" value="${esc(S.projectName||"Reel senza nome")}"></div><button class="btn accent" id="pSave" style="margin-top:4px">Salva</button><p class="note" id="pMsg" style="margin-top:8px">Si salvano video, tagli, vibe, testi ed effetti. (La musica caricata va riaggiunta; gli effetti sonori si rigenerano da soli.)</p>`;
  body.querySelector("#pSave").onclick=async()=>{const name=(body.querySelector("#pName").value||"").trim()||"Reel senza nome",msg=body.querySelector("#pMsg");msg.textContent="Salvataggio… (carico il video)";
    try{await saveProjectDoc(name);msg.textContent="✓ Salvato";toast("Progetto salvato");setTimeout(()=>m.remove(),700);}catch(e){msg.textContent=e&&e.code==="bad_type"?"Per salvare serve MP4 o WebM (.mov non supportato).":(e&&e.code==="too_large"?"Il video supera 20 MB.":"Salvataggio non riuscito.");}};}
async function openProjects(){if(!cloudOn()){infoModal("📁 Progetti","Disponibile nella versione <b>online</b> (link condivisibile).");return;}const{body}=openModal("📁 Progetti");
  const mapFn=it=>{const acts=[`<button class="btn sm accent" data-a="open">Apri</button>`];if(CAP.canWrite)acts.push(`<button class="btn sm ghost" data-a="ren">Rinomina</button>`,`<button class="btn sm ghost danger" data-a="del">Elimina</button>`);return{thumb:it.thumb,title:it.name,sub:fmtDate(it.updatedAt),acts:acts.join("")};};
  const actFn=async(it,a,row)=>{if(a==="open"){document.querySelectorAll(".modal").forEach(x=>x.remove());loadProjectData(it,it.id);}else if(a==="del"){await CAP.db.collection("projects").doc(it.id).delete();row.remove();if(!body.querySelector(".litem"))refresh();toast("Eliminato");}else if(a==="ren"){promptInline(row,it.name,async v=>{await CAP.db.collection("projects").doc(it.id).update({name:v,updatedAt:Date.now()});it.name=v;toast("Rinominato");refresh();});}};
  async function refresh(){body.innerHTML=`<p class="note">Caricamento…</p>`;let list;try{const s=await CAP.db.collection("projects").orderBy("updatedAt","desc").limit(100).get();list=s.docs.map(d=>({id:d.id,...d.data()}));}catch(e){body.innerHTML=`<p class="empty-note">Impossibile leggere i progetti.</p>`;return;}renderList(body,list,"Nessun progetto salvato.<br>Monta un reel e premi «Salva».",mapFn,actFn);}refresh();}
async function openLibrary(){if(!cloudOn()){infoModal("🎬 Libreria","Disponibile nella versione <b>online</b> (link condivisibile).");return;}const{body}=openModal("🎬 Libreria video");body.innerHTML=`<p class="note">Caricamento…</p>`;
  let list;try{const s=await CAP.db.collection("exports").orderBy("createdAt","desc").limit(100).get();list=s.docs.map(d=>({id:d.id,...d.data()}));}catch(e){body.innerHTML=`<p class="empty-note">Impossibile leggere la libreria.</p>`;return;}
  renderList(body,list,"Nessun video salvato.<br>Esporta e scegli «Salva nella Libreria».",it=>{const acts=[`<button class="btn sm accent" data-a="play">Riproduci</button>`,`<button class="btn sm ghost" data-a="dl">Scarica</button>`];if(CAP.canWrite)acts.push(`<button class="btn sm ghost danger" data-a="del">Elimina</button>`);return{thumb:it.thumb,title:it.name,sub:fmtDate(it.createdAt)+" · "+(it.durationSec||0)+"s · "+((it.sizeBytes||0)/1048576).toFixed(1)+" MB",acts:acts.join("")};},
  async(it,a,row)=>{const url="/_blob/"+it.assetId;if(a==="play"){const{body:b2}=openModal("▶ "+esc(it.name));b2.innerHTML=`<video src="${url}" controls autoplay playsinline style="width:100%;max-width:300px;border-radius:12px;display:block;margin:0 auto;background:#000"></video>`;}
    else if(a==="dl"){try{const blob=await (await fetch(url)).blob(),fn=(it.name||"reel").replace(/[^\w\-]+/g,"-")+"."+(it.ext||"webm");if(DL){await DL.save({filename:fn,data:blob});toast("Scaricato");}else{const u=URL.createObjectURL(blob),x=document.createElement("a");x.href=u;x.download=fn;document.body.appendChild(x);x.click();x.remove();}}catch(e){toast("Download non riuscito");}}
    else if(a==="del"){await CAP.db.collection("exports").doc(it.id).delete();try{await CAP.assets.delete(it.assetId);}catch(e){}row.remove();toast("Eliminato");}});}
async function stylesList(){if(CAP.db){const s=await CAP.db.collection("styles").orderBy("createdAt","desc").limit(100).get();return s.docs.map(d=>({id:d.id,...d.data()}));}return LS.get("verace_styles",[]);}
async function styleSave(st){st.createdAt=Date.now();if(CAP.db&&CAP.canWrite){const r=await CAP.db.collection("styles").add(st);return r.id;}st.id=uid();const arr=LS.get("verace_styles",[]);arr.unshift(st);LS.set("verace_styles",arr);return st.id;}
async function styleDelete(id){if(CAP.db&&CAP.canWrite){try{await CAP.db.collection("styles").doc(id).delete();return;}catch(e){}}LS.set("verace_styles",LS.get("verace_styles",[]).filter(s=>s.id!==id));}
function styleFromSelection(){const o=getSelObj();if(!o||!S.sel)return null;if(S.sel.kind==="segment")return{kind:"look",data:{eff:{...o.eff},fx:{...o.fx},fi:o.fi,fo:o.fo}};if(S.sel.kind==="overlay"&&o.kind!=="emoji")return{kind:"text",data:{color:o.color,font:o.font,bold:o.bold,size:o.size}};return null;}
function applyStyleObj(st){const o=getSelObj();if(!o){toast("Seleziona prima un elemento");return;}
  if(st.kind==="look"&&S.sel.kind==="segment"){snapshot();o.eff={...o.eff,...st.data.eff};if(st.data.fx)o.fx={...st.data.fx};o.fi=st.data.fi||0;o.fo=st.data.fo||0;renderPanel();drawFrame();renderTracks();toast("Stile applicato");}
  else if(st.kind==="text"&&S.sel.kind==="overlay"&&o.kind!=="emoji"){snapshot();Object.assign(o,st.data);renderPanel();renderTracks();drawFrame();toast("Stile applicato");}
  else toast(st.kind==="look"?"Seleziona un clip video":"Seleziona un testo");}
function pcolor(eff){if(!eff)return"#888";if(eff.preset==="bw")return"#555";if(eff.preset==="warm")return"#b07a3a";if(eff.preset==="cold")return"#4a6b8a";if(eff.preset==="vivid")return"#AC3F3F";if(eff.preset==="soft")return"#9a8c76";return"#6b7e5a";}
async function openStyles(){const{body}=openModal("🎨 Stili salvati");const sel=styleFromSelection();const head=document.createElement("div");head.style.marginBottom="10px";
  if(sel)head.innerHTML=`<div class="field"><label><span>Salva stile dalla selezione (${sel.kind==="look"?"effetti del clip":"stile del testo"})</span></label><div class="row"><input type="text" id="stName" placeholder="Nome stile" maxlength="40" style="flex:1"><button class="btn accent sm" id="stSave">Salva</button></div></div>`;
  else head.innerHTML=`<p class="note">Seleziona un <b>clip video</b> o un <b>testo</b>, poi riapri qui per salvarne lo stile.</p>`;body.appendChild(head);
  const listWrap=document.createElement("div");body.appendChild(listWrap);
  async function refresh(){let arr;try{arr=await stylesList();}catch(e){arr=[];}listWrap.innerHTML="";if(!arr.length){listWrap.innerHTML=`<p class="empty-note">Nessuno stile salvato.</p>`;return;}
    arr.forEach(st=>{const row=document.createElement("div");row.className="litem";
      const prev=st.kind==="look"?`<div class="styprev" style="background:${esc(pcolor(st.data.eff))};color:#fff">A</div>`:`<div class="styprev" style="background:${esc(st.data.color||'#888')};color:#2a2113;font-family:${esc(st.data.font||'Outfit')}">A</div>`;
      row.innerHTML=`${prev}<div class="lmeta"><b>${esc(st.name||"Stile")}</b><span>${st.kind==="look"?"Effetto video":"Stile testo"}</span></div><div class="lacts"><button class="btn sm accent" data-a="apply">Applica</button><button class="btn sm ghost danger" data-a="del">Elimina</button></div>`;
      row.querySelector('[data-a="apply"]').onclick=()=>applyStyleObj(st);row.querySelector('[data-a="del"]').onclick=async()=>{await styleDelete(st.id);row.remove();if(!listWrap.querySelector(".litem"))refresh();toast("Eliminato");};listWrap.appendChild(row);});}
  if(sel)head.querySelector("#stSave").onclick=async()=>{const name=(head.querySelector("#stName").value||"").trim()||(sel.kind==="look"?"Look":"Testo");try{await styleSave({name,kind:sel.kind,data:sel.data});toast("Stile salvato");head.querySelector("#stName").value="";refresh();}catch(e){toast("Salvataggio non riuscito");}};refresh();}
function renderList(body,list,emptyHtml,mapFn,actFn){body.innerHTML="";if(!list.length){body.innerHTML=`<p class="empty-note">${emptyHtml}</p>`;return;}
  list.forEach(it=>{const m=mapFn(it),row=document.createElement("div");row.className="litem";row.innerHTML=`<img class="lthumb" src="${m.thumb||""}" alt=""><div class="lmeta"><b>${esc(m.title)}</b><span>${esc(m.sub)}</span></div><div class="lacts">${m.acts}</div>`;row.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>actFn(it,b.dataset.a,row,body));body.appendChild(row);});}
function promptInline(row,val,onok){const meta=row.querySelector(".lmeta"),old=meta.innerHTML;meta.innerHTML=`<input type="text" value="${esc(val)}" style="width:100%" maxlength="60"> <button class="btn sm accent" style="margin-top:4px">OK</button>`;const inp=meta.querySelector("input");inp.focus();meta.querySelector("button").onclick=async()=>{const v=(inp.value||"").trim();if(v){try{await onok(v);}catch(e){}}meta.innerHTML=old;};}
function updateStudioUI(){const c=cloudOn();const set=(sel,on,tip)=>{const b=$(sel);if(b){b.disabled=!on;if(tip)b.title=on?"":tip;}};set("#saveProjBtn",c&&CAP.canWrite,"Disponibile online");set("#projBtn",c,"Disponibile online");set("#libBtn",c,"Disponibile online");}
$("#saveProjBtn").addEventListener("click",doSaveProject);$("#projBtn").addEventListener("click",openProjects);$("#libBtn").addEventListener("click",openLibrary);$("#stylesBtn2").addEventListener("click",openStyles);

/* ---- boot ---- */
function b64ToBlob(b64,type){const bin=atob(b64),len=bin.length,bytes=new Uint8Array(len);for(let i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);return new Blob([bytes],{type});}
updateStudioUI();setTab("vibe");renderAll();drawFrame();initCaps();
(function boot(){try{if(window.DEMO_B64&&DEMO_B64.length>100){const b=b64ToBlob(DEMO_B64,"video/mp4");loadVideoFromUrl(URL.createObjectURL(b),"Clip demo caricata — prova le vibe",{blob:b});}}catch(e){}})();
