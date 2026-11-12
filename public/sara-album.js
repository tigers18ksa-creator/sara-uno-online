(()=>{
const socket=window.saraBroadcastSocket,open=document.getElementById('saraAlbumOpen');if(!socket||!open)return;
const style=document.createElement('style');style.textContent=`
#saraAlbumOverlay{position:fixed;inset:0;background:#0a0911ef;z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px;direction:rtl;color:#fff}
#saraAlbumOverlay[hidden]{display:none!important}
#saraAlbumPanel{width:min(100%,850px);height:min(92dvh,900px);display:flex;flex-direction:column;background:linear-gradient(150deg,#30223c,#141725);border:1px solid #d3ad67;border-radius:18px;overflow:hidden}
#saraAlbumTop{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #9e7d51}
#saraAlbumTop button,#saraAlbumTabs button{background:#352c41;border:1px solid #ab8b57;color:#ffe6b1;border-radius:10px;padding:9px 15px}
#saraAlbumTabs{display:flex;gap:8px;padding:12px;justify-content:center}
#saraAlbumTabs button.active{background:#b58c4b;color:#171321;font-weight:800}
#saraAlbumGrid{overflow-y:auto;flex:1;min-height:0;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-auto-rows:max-content!important;gap:10px!important;align-content:start!important;padding:12px!important}@media(min-width:650px){#saraAlbumGrid{grid-template-columns:repeat(4,minmax(0,1fr))!important}}
.saraAlbumCard{display:flex!important;flex-direction:column!important;min-width:0!important;height:auto!important;align-self:start!important;background:#241d2e;border:1px solid #6f5b77;border-radius:12px;overflow:hidden}
#saraAlbumGrid .saraAlbumCard>img,#saraAlbumGrid .saraAlbumCard>video{display:block!important;position:static!important;float:none!important;flex:none!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;aspect-ratio:1/1!important;object-fit:cover!important;object-position:center!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:#0c0c13!important}
.saraAlbumCard img{cursor:zoom-in}
.saraAlbumPreview{position:relative;width:100%;aspect-ratio:1/1;background:#0c0c13;overflow:hidden;cursor:pointer}
#saraAlbumGrid .saraAlbumPreview>img{width:100%!important;height:100%!important;aspect-ratio:1/1!important;object-fit:cover!important}
.saraAlbumPlay{position:absolute;inset:0;margin:auto;width:44px;height:44px;border-radius:50%;background:#0009;border:2px solid #fff;color:#fff;font-size:21px;display:grid;place-items:center;pointer-events:none}
#saraAlbumLightbox video{max-width:100%;max-height:85dvh;width:auto;height:auto}

.saraAlbumCard strong{display:block!important;min-height:34px!important;line-height:1.4!important;padding:8px 4px!important;font-size:12px!important;text-align:center!important;overflow-wrap:anywhere;color:#ffe6b1!important}
#saraAlbumLightbox{position:fixed;inset:0;background:#000e;z-index:100001;display:grid;place-items:center;padding:20px}
#saraAlbumLightbox img{max-width:100%;max-height:85dvh;object-fit:contain}
`;document.head.append(style);
const overlay=document.createElement('div');overlay.id='saraAlbumOverlay';overlay.hidden=true;overlay.innerHTML='<section id="saraAlbumPanel"><div id="saraAlbumTop"><strong>📸 ألبوم مجلس سارة</strong><button id="saraAlbumClose" type="button">✕ إغلاق</button></div><div id="saraAlbumTabs"><button data-kind="all" class="active">الكل</button><button data-kind="image">الصور</button><button data-kind="video">الفيديوهات</button></div><div id="saraAlbumGrid">جاري تحميل الألبوم...</div></section>';document.body.append(overlay);
let items=[],kind='all';const grid=overlay.querySelector('#saraAlbumGrid');
// Generate thumbnails from the actual video on each device, with a playable fallback.
const thumbnailCache=new Map();let thumbnailObserver;
function previewVideo(url,img){
 if(thumbnailCache.has(url)){if(thumbnailCache.get(url))img.src=thumbnailCache.get(url);return}
 const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='metadata';v.crossOrigin='anonymous';
 let finished=false;const done=(src)=>{if(finished)return;finished=true;thumbnailCache.set(url,src||'');if(src&&img.isConnected)img.src=src;v.removeAttribute('src');v.load()};
 const capture=()=>{try{if(!v.videoWidth||!v.videoHeight)return done('');const c=document.createElement('canvas');const scale=Math.min(1,420/Math.max(v.videoWidth,v.videoHeight));c.width=Math.max(1,Math.round(v.videoWidth*scale));c.height=Math.max(1,Math.round(v.videoHeight*scale));c.getContext('2d').drawImage(v,0,0,c.width,c.height);done(c.toDataURL('image/jpeg',.78))}catch{done('')}};
 v.addEventListener('loadedmetadata',()=>{try{v.currentTime=Math.min(1,Math.max(0,(v.duration||1)*.15))}catch{capture()}},{once:true});
 v.addEventListener('seeked',capture,{once:true});v.addEventListener('error',()=>done(''),{once:true});
 setTimeout(()=>{if(!finished)done('')},12000);v.src=url;v.load();
}
function showVideo(url){const box=document.createElement('div');box.id='saraAlbumLightbox';const video=document.createElement('video');video.src=url;video.controls=true;video.playsInline=true;video.autoplay=true;box.append(video);box.onclick=e=>{if(e.target===box){video.pause();box.remove()}};document.body.append(box);video.play().catch(()=>{})}
function render(){grid.replaceChildren();if(thumbnailObserver)thumbnailObserver.disconnect();thumbnailObserver=('IntersectionObserver'in window)?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){thumbnailObserver.unobserve(e.target);previewVideo(e.target.dataset.video,e.target.querySelector('img'))}},{root:grid,rootMargin:'250px'}):null;
 const list=items.filter(x=>kind==='all'||(kind==='image'?!!x.image:!!x.video));if(!list.length){grid.textContent='ما فيه صور أو فيديوهات في هذا القسم';return}
 for(const x of list){const card=document.createElement('div');card.className='saraAlbumCard';let media;if(x.image){media=document.createElement('img');media.src=x.image;media.loading='lazy';media.onclick=()=>{const box=document.createElement('div');box.id='saraAlbumLightbox';const img=document.createElement('img');img.src=x.image;box.append(img);box.onclick=()=>box.remove();document.body.append(box)}}else{media=document.createElement('div');media.className='saraAlbumPreview';media.dataset.video=x.video;media.setAttribute('role','button');media.setAttribute('tabindex','0');media.setAttribute('aria-label','تشغيل الفيديو');const poster=document.createElement('img');poster.alt='معاينة الفيديو';poster.loading='lazy';const play=document.createElement('span');play.className='saraAlbumPlay';play.textContent='▶';media.append(poster,play);media.onclick=()=>showVideo(x.video);media.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showVideo(x.video)}};if(thumbnailObserver)thumbnailObserver.observe(media);else previewVideo(x.video,poster)}const name=document.createElement('strong');name.textContent='👤 '+(x.name||'عضو');card.append(media,name);grid.append(card)}
}
open.onclick=()=>{overlay.hidden=false;grid.textContent='جاري تحميل الألبوم...';socket.emit('saraAlbumRequest');document.getElementById('councilMenu').hidden=true};
overlay.querySelector('#saraAlbumClose').onclick=()=>overlay.hidden=true;overlay.onclick=e=>{if(e.target===overlay)overlay.hidden=true};
overlay.querySelectorAll('#saraAlbumTabs button').forEach(b=>b.onclick=()=>{kind=b.dataset.kind;overlay.querySelectorAll('#saraAlbumTabs button').forEach(t=>t.classList.toggle('active',t===b));render()});
socket.on('saraAlbumItems',data=>{items=Array.isArray(data)?data:[];if(!overlay.hidden)render()});
})();