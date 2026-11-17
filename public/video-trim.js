(function(){
 window.saraPrepareVideoTrim=async function(file,socket){
  const url=URL.createObjectURL(file);
  try{
   const duration=await new Promise((resolve,reject)=>{const v=document.createElement('video');v.preload='metadata';v.onloadedmetadata=()=>resolve(v.duration);v.onerror=()=>reject(Error('تعذر قراءة الفيديو'));v.src=url});
   if(!Number.isFinite(duration)||duration<=0)throw Error('تعذر قراءة مدة الفيديو');
   if(duration>600)throw Error('مدة الفيديو لازم 10 دقائق أو أقل');
   return await new Promise((resolve,reject)=>{
    const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;background:#000c;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:12px;direction:rtl';
    const panel=document.createElement('div');panel.style.cssText='width:min(94vw,460px);max-height:94vh;overflow:auto;background:#fff;color:#222;border-radius:16px;padding:16px;box-sizing:border-box;font-family:inherit';
    const heading=document.createElement('h3');heading.textContent='اختر الجزء اللي تبي ترسله';heading.style.margin='0 0 10px';
    const vid=document.createElement('video');vid.src=url;vid.controls=true;vid.playsInline=true;vid.style.cssText='width:100%;max-height:48vh;background:#111;border-radius:9px';
    const fmt=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
    const label=document.createElement('div');label.style.cssText='text-align:center;margin:10px 0;font-weight:bold';
    const timeline=document.createElement('div');timeline.style.cssText='position:relative;height:68px;margin:15px 0 8px;touch-action:none;user-select:none;overflow:hidden;border-radius:9px;background:#242424;direction:ltr';
    const frames=document.createElement('div');frames.style.cssText='position:absolute;inset:0;display:flex;overflow:hidden';timeline.append(frames);
    const shadeLeft=document.createElement('div'),shadeRight=document.createElement('div');for(const x of [shadeLeft,shadeRight]){x.style.cssText='position:absolute;top:0;bottom:0;background:#0009;pointer-events:none';timeline.append(x)}
    const selection=document.createElement('div');selection.style.cssText='position:absolute;top:0;bottom:0;border-top:3px solid #23c86a;border-bottom:3px solid #23c86a;box-sizing:border-box;pointer-events:none';timeline.append(selection);
    const handle=(side)=>{const h=document.createElement('div');h.style.cssText='position:absolute;top:0;bottom:0;width:19px;background:#23c86a;border-radius:5px;display:flex;align-items:center;justify-content:center;touch-action:none;cursor:ew-resize;z-index:2;transform:translateX(-50%)';h.innerHTML='<span style="width:3px;height:23px;border-radius:3px;background:white;box-shadow:5px 0 #ffffff90,-5px 0 #ffffff90"></span>';h.setAttribute('aria-label',side==='start'?'اسحب لتحديد بداية الفيديو':'اسحب لتحديد نهاية الفيديو');timeline.append(h);return h};
    const leftHandle=handle('start'),rightHandle=handle('end');let startTime=0,endTime=duration;
    const help=document.createElement('p');help.textContent='اسحب الطرف الأخضر يمين أو يسار لتحديد الجزء اللي تبيه';help.style.cssText='font-size:13px;line-height:1.8;color:#555;text-align:center';
    const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;justify-content:space-between;margin-top:14px';
    const btn=(title,background)=>{const b=document.createElement('button');b.type='button';b.textContent=title;b.style.cssText='flex:1;padding:11px 5px;background:'+background+';color:white;border:0;border-radius:9px;font-weight:bold';return b};
    const cancel=btn('إلغاء','#777'),whole=btn('إرسال كامل','#555'),trim=btn('قص وإرسال','#8a2145');
    const refresh=()=>{const x=startTime/duration*100,y=endTime/duration*100;shadeLeft.style.cssText+=';left:0;width:'+x+'%';shadeRight.style.cssText+=';right:0;width:'+(100-y)+'%';selection.style.left=x+'%';selection.style.width=(y-x)+'%';leftHandle.style.left=x+'%';rightHandle.style.left=y+'%';label.textContent='من '+fmt(startTime)+' إلى '+fmt(endTime)+' ('+fmt(endTime-startTime)+')'};
    let dragging=null;const setFromPointer=e=>{const r=timeline.getBoundingClientRect();const t=Math.max(0,Math.min(duration,(e.clientX-r.left)/r.width*duration));if(dragging==='start')startTime=Math.min(t,endTime-.2);else if(dragging==='end')endTime=Math.max(t,startTime+.2);startTime=Math.max(0,startTime);endTime=Math.min(duration,endTime);vid.currentTime=startTime;refresh()};
    timeline.addEventListener('pointerdown',e=>{const r=timeline.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*duration;dragging=Math.abs(x-startTime)<=Math.abs(x-endTime)?'start':'end';timeline.setPointerCapture(e.pointerId);setFromPointer(e);e.preventDefault()});
    timeline.addEventListener('pointermove',e=>{if(dragging)setFromPointer(e)});for(const type of ['pointerup','pointercancel','lostpointercapture'])timeline.addEventListener(type,()=>dragging=null);
    const preview=btn('▶ معاينة القص','#335e9c');preview.onclick=()=>{vid.currentTime=startTime;vid.play().catch(()=>{})};vid.addEventListener('timeupdate',()=>{if(!vid.paused&&vid.currentTime>=endTime){vid.pause();vid.currentTime=startTime}});
    (async()=>{try{const c=document.createElement('canvas');c.width=90;c.height=68;const ctx=c.getContext('2d');const probe=document.createElement('video');probe.muted=true;probe.playsInline=true;probe.preload='auto';probe.src=url;await new Promise((res,rej)=>{probe.onloadeddata=res;probe.onerror=rej});for(let i=0;i<8;i++){await new Promise((res,rej)=>{probe.onseeked=res;probe.onerror=rej;probe.currentTime=Math.min(duration-.05,duration*(i+.5)/8)});ctx.drawImage(probe,0,0,90,68);const im=document.createElement('img');im.src=c.toDataURL('image/jpeg',.6);im.style.cssText='width:12.5%;height:100%;object-fit:cover;flex:none';frames.append(im)}probe.remove()}catch(e){frames.style.background='linear-gradient(90deg,#333,#666,#333)'}})();
    const done=(v,error)=>{vid.pause();overlay.remove();if(error)reject(error);else resolve(v)};
    cancel.onclick=()=>done(null,Error('تم إلغاء اختيار الفيديو'));
    whole.onclick=()=>done(file);
    trim.onclick=async()=>{
     const a=startTime,b=endTime;
     if(b-a<.2)return;
     if(a<.1&&b>=duration-.1)return done(file);
     trim.disabled=true;trim.textContent='جاري قص الفيديو... انتظر';
     try{
      const auth=await new Promise((resolve,reject)=>socket.timeout(15000).emit('saraTrimTicket',(err,r)=>err||!r?.token?reject(Error(r?.error||'تعذر بدء القص')):resolve(r.token)));
      const response=await fetch('/api/video/trim',{method:'POST',headers:{'Content-Type':'application/octet-stream','x-sara-trim-token':auth,'x-trim-start':String(a),'x-trim-end':String(b)},body:file});
      if(!response.ok){let msg='تعذر قص الفيديو';try{msg=(await response.json()).error||msg}catch{}throw Error(msg)}
      const blob=await response.blob();if(!blob.size)throw Error('الملف المقصوص فارغ');
      done(new File([blob],file.name.replace(/\.[^.]+$/,'')+'-trim.mp4',{type:'video/mp4'}));
     }catch(e){trim.disabled=false;trim.textContent='قص وإرسال';alert(e.message||'تعذر قص الفيديو')}
    };
    row.append(cancel,whole,trim);
    panel.append(heading,vid,help,timeline,label,preview,row);overlay.append(panel);document.body.append(overlay);refresh();
   });
  }finally{URL.revokeObjectURL(url)}
 };
})();