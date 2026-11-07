/* Each listener controls their own radio. No automatic playback. */
(()=>{
const el=id=>document.getElementById(id),audio=el('radioAudio');
const stations={
'MBC FM':{query:'MBC FM',link:'https://mbcradios.net/'},
'Panorama FM':{query:'Panorama FM',link:'https://mbcradios.net/'},
'Rotana FM':{query:'Rotana FM',link:'https://www.rotana.net/'},
'Alif Alif FM':{query:'Alif Alif FM',link:'https://alifaliffm.com/'},
'Mix FM':{query:'Mix FM Saudi Arabia',link:'https://www.mixfm.sa/'},
'UFM':{query:'UFM 95.5',link:'https://www.ufmradio.com/'}
};
let request=0;
const status=t=>el('radioStatus').textContent=t;
const chosen=()=>stations[el('radioStation').value];
const updateLink=()=>{el('radioExternal').href=chosen().link};
el('radioToggle').onclick=()=>{el('radioPanel').hidden=!el('radioPanel').hidden;updateLink()};
el('radioClose').onclick=()=>el('radioPanel').hidden=true;
el('radioVolume').value=localStorage.getItem('saraRadioVolume')||'50';
const volume=()=>{audio.volume=Number(el('radioVolume').value)/100;el('radioVolumeText').textContent=el('radioVolume').value+'%';localStorage.setItem('saraRadioVolume',el('radioVolume').value)};
el('radioVolume').oninput=volume;volume();
el('radioStation').onchange=()=>{request++;audio.pause();audio.removeAttribute('src');audio.load();updateLink();status('اختر تشغيل للاستماع إلى '+el('radioStation').value)};
el('radioStop').onclick=()=>{request++;audio.pause();audio.removeAttribute('src');audio.load();el('radioPlay').textContent='▶ تشغيل';status('تم إيقاف الراديو')};
audio.onplaying=()=>{el('radioPlay').textContent='⏸ إيقاف مؤقت';status('🔴 بث مباشر • '+el('radioStation').value)};
audio.onpause=()=>{el('radioPlay').textContent='▶ تشغيل'};
audio.onerror=()=>status('تعذر تشغيل البث هنا. جرّب فتح موقع الإذاعة أو اختر محطة ثانية');
el('radioPlay').onclick=async()=>{
 if(!audio.paused){audio.pause();status('تم إيقاف الصوت مؤقتًا');return}
 if(audio.src){try{await audio.play()}catch{status('تعذر استئناف البث، جرّب محطة ثانية')}return}
 const seq=++request,station=chosen();status('جاري البحث عن بث '+el('radioStation').value+'...');
 try{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8500);
 let data;try{const response=await fetch('https://de1.api.radio-browser.info/json/stations/byname/'+encodeURIComponent(station.query)+'?limit=35&hidebroken=true',{signal:controller.signal});if(!response.ok)throw Error('network');data=await response.json()}finally{clearTimeout(timer)}
 if(seq!==request)return;
 const matches=data.filter(x=>x.countrycode==='SA'||/Saudi/i.test(x.country||''));
 const candidates=(matches.length?matches:data).filter(x=>/^https:\/\//.test(x.url_resolved||x.url||'')&&!/\.m3u8(?:\?|$)/i.test(x.url_resolved||x.url||'')&&!/\.pls(?:\?|$)/i.test(x.url_resolved||x.url||'')).sort((a,b)=>(b.votes||0)-(a.votes||0));
 if(!candidates.length)throw Error('stream');
 audio.src=candidates[0].url_resolved||candidates[0].url;await audio.play();
 }catch(e){if(seq===request)status('ما قدرنا نشغّل البث داخل المجلس. استخدم «فتح موقع الإذاعة» للاستماع مباشرة')}
};
updateLink();
})();