/* Each listener controls their own radio. No automatic playback. */
(()=>{
const el=id=>document.getElementById(id),audio=el('saraRadioAudio');
const stations={
'MBC FM':{query:'MBC FM',link:'https://mbcradios.net/'},
'Panorama FM':{query:'Panorama FM',link:'https://mbcradios.net/'},
'Rotana FM':{query:'Rotana FM',link:'https://www.rotana.net/'},
'Alif Alif FM':{query:'Alif Alif FM',link:'https://alifaliffm.com/'},
'Mix FM':{query:'Mix FM Saudi Arabia',link:'https://www.mixfm.sa/'},
'UFM':{query:'UFM 95.5',link:'https://www.ufmradio.com/'},
'Bahrain FM 93.3':{query:'Bahrain FM 93.3',link:'https://www.mia.gov.bh/bahrain-fm-93-3/'},
'Iraqi Songs':{query:'SumerFm Iraq',link:'https://www.alsumaria.tv/SumerFm',direct:['https://l3.itworkscdn.net/itwaudio/9012/stream']},
'Gulf Songs':{query:'Rotana FM',link:'https://rotanaradios.com/'},
'Egyptian Songs':{query:'Nogoum FM Mix',link:'https://www.nogoumfm.net/',direct:['https://stream.zeno.fm/wvqgc9kb1d0uv']},
'Arabic Hits':{query:'Nogoum FM Mix',link:'https://www.nogoumfm.net/',direct:['https://stream.zeno.fm/wvqgc9kb1d0uv']}
};
let request=0,hls=null,hasPlayed=false;const stationCache=new Map();const warm=async(name)=>{if(stationCache.has(name))return stationCache.get(name);try{const resp=await fetch('/api/radio/stations?name='+encodeURIComponent(name));if(!resp.ok)return stations[name]?.direct||[];const data=await resp.json();const urls=[...(stations[name]?.direct||[]),...(data.stations||[]).map(x=>x.url)];stationCache.set(name,urls);return urls}catch{return stations[name]?.direct||[]}};const clearHls=()=>{if(hls){hls.destroy();hls=null}};const ensureHls=()=>new Promise((resolve,reject)=>{if(window.Hls)return resolve(window.Hls);const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/hls.js@1.6.13/dist/hls.min.js';script.onload=()=>window.Hls?resolve(window.Hls):reject(Error('hls missing'));script.onerror=()=>reject(Error('hls unavailable'));document.head.append(script)});
const status=t=>el('saraRadioStatus').textContent=t;
const chosen=()=>stations[el('saraRadioStations').value];
const updateLink=()=>{el('saraRadioExternal').href=chosen().link};const embed=el('saraRadioBahrainEmbed');const embedFrame=embed?.querySelector('iframe');const showBahrainFallback=()=>{if(el('saraRadioStations').value!=='Bahrain Radio 102.3'||!embed)return;embed.hidden=false;embedFrame.src='https://e.mytuner-radio.com/embed/radio-bahrain-arabic-1023-fm-433118';status('إذاعة البحرين 102.3: جرّب زر التشغيل داخل المشغل البديل')};const hideBahrainFallback=()=>{if(embed){embed.hidden=true;embedFrame.src='about:blank'}};
el('saraRadioToggle').onclick=()=>{el('saraRadioPanel').hidden=!el('saraRadioPanel').hidden;updateLink()};
el('saraRadioClose').onclick=()=>el('saraRadioPanel').hidden=true;
el('saraRadioVolume').value=localStorage.getItem('saraRadioVolume')||'50';
const volume=()=>{audio.volume=Number(el('saraRadioVolume').value)/100;el('saraRadioVolText').textContent=el('saraRadioVolume').value+'%';localStorage.setItem('saraRadioVolume',el('saraRadioVolume').value)};
el('saraRadioVolume').oninput=volume;volume();
el('saraRadioStations').onchange=()=>{hideBahrainFallback();request++;clearHls();candidates=[];candidateIndex=0;audio.pause();audio.removeAttribute('src');audio.load();updateLink();document.querySelectorAll('.saraStationChoice').forEach(b=>b.classList.toggle('selected',b.dataset.station===el('saraRadioStations').value));status('جاري تشغيل '+el('saraRadioStations').value+'...');if(hasPlayed)el('saraRadioPlay').click();else status('اضغط تشغيل أول مرة، وبعدها التنقل تلقائي')};
el('saraRadioStop').onclick=()=>{hideBahrainFallback();request++;clearHls();audio.pause();audio.removeAttribute('src');audio.load();el('saraRadioPlay').textContent='▶ تشغيل';status('تم إيقاف الراديو')};
audio.onplaying=()=>{hideBahrainFallback();el('saraRadioPlay').textContent='⏸ إيقاف مؤقت';status('🔴 بث مباشر • '+el('saraRadioStations').value)};
audio.onpause=()=>{el('saraRadioPlay').textContent='▶ تشغيل'};
audio.onerror=()=>status('تعذر تشغيل البث هنا. جرّب فتح موقع الإذاعة أو اختر محطة ثانية');
let candidates=[],candidateIndex=0,trying=false;
const tryCandidate=async(seq)=>{if(seq!==request)return;while(candidateIndex<candidates.length){const url=candidates[candidateIndex++];try{clearHls();if(/\.m3u8(?:[?#]|$)/i.test(url)&&!audio.canPlayType('application/vnd.apple.mpegurl')){const Hls=await ensureHls();if(!Hls.isSupported())throw Error('HLS unsupported');hls=new Hls({enableWorker:true,lowLatencyMode:true});hls.loadSource(url);hls.attachMedia(audio);await new Promise((resolve,reject)=>{hls.once(Hls.Events.MANIFEST_PARSED,resolve);hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)reject(Error(data.details))})})}else{audio.src=url;audio.load()}await Promise.race([audio.play(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),9000))]);if(seq===request){status('🔴 بث مباشر • '+el('saraRadioStations').value);return}}catch(e){clearHls();audio.pause();audio.removeAttribute('src');audio.load()}}if(seq===request){status('تعذر تشغيل روابط البث المتاحة. جرّب المشغل البديل');showBahrainFallback()}};
el('saraRadioPlay').onclick=async()=>{
 if(!audio.paused){audio.pause();status('تم إيقاف الصوت مؤقتًا');return}
 if(audio.src){try{await audio.play();return}catch{audio.removeAttribute('src')}}
 const seq=++request;hasPlayed=true;status('جاري الاتصال بـ '+el('saraRadioStations').value+'...');
 try{const urls=await warm(el('saraRadioStations').value);if(seq!==request)return;candidates=urls;candidateIndex=0;if(!candidates.length)throw Error('empty');await tryCandidate(seq)}catch(e){if(seq===request){status('ما لقينا رابط بث مباشر متاح حاليًا');showBahrainFallback()}}
};
updateLink();const list=el('saraRadioChoices');if(list){for(const opt of el('saraRadioStations').options){const b=document.createElement('button');b.type='button';b.className='saraStationChoice';b.dataset.station=opt.value;b.innerHTML='<span class="stationIcon">📻</span><span class="stationLabel"></span><span class="stationSignal">◉</span>';b.querySelector('.stationLabel').textContent=opt.textContent;b.onclick=()=>{el('saraRadioStations').value=opt.value;el('saraRadioStations').dispatchEvent(new Event('change'))};list.append(b)}list.querySelector('.saraStationChoice')?.classList.add('selected')}const prefetch=()=>{for(const opt of el('saraRadioStations').options)warm(opt.value)};setTimeout(prefetch,1800);
})();