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
    const heading=document.createElement('h3');heading.textContent='معاينة وقص الفيديو';heading.style.margin='0 0 10px';
    const vid=document.createElement('video');vid.src=url;vid.controls=true;vid.playsInline=true;vid.style.cssText='width:100%;max-height:48vh;background:#111;border-radius:9px';
    const fmt=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
    const label=document.createElement('div');label.style.cssText='text-align:center;margin:10px 0;font-weight:bold';
    const makeSlider=()=>{const el=document.createElement('input');el.type='range';el.min='0';el.max=String(duration);el.step='0.1';el.style.width='100%';return el};
    const start=makeSlider(),end=makeSlider();end.value=String(duration);
    const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;justify-content:space-between;margin-top:14px';
    const btn=(title,background)=>{const b=document.createElement('button');b.type='button';b.textContent=title;b.style.cssText='flex:1;padding:11px 5px;background:'+background+';color:white;border:0;border-radius:9px;font-weight:bold';return b};
    const cancel=btn('إلغاء','#777'),whole=btn('إرسال كامل','#555'),trim=btn('قص وإرسال','#8a2145');
    const refresh=()=>{let a=Number(start.value),b=Number(end.value);if(b<=a+.1){if(document.activeElement===start)end.value=String(Math.min(duration,a+.1));else start.value=String(Math.max(0,b-.1));a=Number(start.value);b=Number(end.value)}label.textContent='من '+fmt(a)+' إلى '+fmt(b)+' ('+fmt(b-a)+')'};
    start.oninput=()=>{refresh();vid.currentTime=Number(start.value)};end.oninput=()=>{refresh();vid.currentTime=Number(start.value)};
    const done=(v,error)=>{vid.pause();overlay.remove();if(error)reject(error);else resolve(v)};
    cancel.onclick=()=>done(null,Error('تم إلغاء اختيار الفيديو'));
    whole.onclick=()=>done(file);
    trim.onclick=async()=>{
     const a=Number(start.value),b=Number(end.value);
     if(b-a<.2)return;
     if(a<.1&&b>=duration-.1)return done(file);
     trim.disabled=true;trim.textContent='جاري قص الفيديو...';
     try{
      const auth=await new Promise((resolve,reject)=>socket.timeout(15000).emit('saraTrimTicket',(err,r)=>err||!r?.token?reject(Error(r?.error||'تعذر بدء القص')):resolve(r.token)));
      const response=await fetch('/api/video/trim',{method:'POST',headers:{'Content-Type':'application/octet-stream','x-sara-trim-token':auth,'x-trim-start':String(a),'x-trim-end':String(b)},body:file});
      if(!response.ok){let msg='تعذر قص الفيديو';try{msg=(await response.json()).error||msg}catch{}throw Error(msg)}
      const blob=await response.blob();if(!blob.size)throw Error('الملف المقصوص فارغ');
      done(new File([blob],file.name.replace(/\.[^.]+$/,'')+'-trim.mp4',{type:'video/mp4'}));
     }catch(e){trim.disabled=false;trim.textContent='قص وإرسال';alert(e.message||'تعذر قص الفيديو')}
    };
    row.append(cancel,whole,trim);
    const p1=document.createElement('div');p1.textContent='بداية المقطع';const p2=document.createElement('div');p2.textContent='نهاية المقطع';
    panel.append(heading,vid,p1,start,p2,end,label,row);overlay.append(panel);document.body.append(overlay);refresh();
   });
  }finally{URL.revokeObjectURL(url)}
 };
})();