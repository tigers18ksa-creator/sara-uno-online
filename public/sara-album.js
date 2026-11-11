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
#saraAlbumGrid{overflow-y:auto;flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:11px;align-content:start;padding:12px}
.saraAlbumCard{background:#241d2e;border:1px solid #6f5b77;border-radius:12px;overflow:hidden}
.saraAlbumCard img,.saraAlbumCard video{width:100%;aspect-ratio:1;object-fit:cover;background:#0c0c13;display:block}
.saraAlbumCard img{cursor:zoom-in}
.saraAlbumCard strong{display:block;padding:9px;font-size:12px;text-align:center;overflow-wrap:anywhere}
#saraAlbumLightbox{position:fixed;inset:0;background:#000e;z-index:100001;display:grid;place-items:center;padding:20px}
#saraAlbumLightbox img{max-width:100%;max-height:85dvh;object-fit:contain}
`;document.head.append(style);
const overlay=document.createElement('div');overlay.id='saraAlbumOverlay';overlay.hidden=true;overlay.innerHTML='<section id="saraAlbumPanel"><div id="saraAlbumTop"><strong>📸 ألبوم مجلس سارة</strong><button id="saraAlbumClose" type="button">✕ إغلاق</button></div><div id="saraAlbumTabs"><button data-kind="all" class="active">الكل</button><button data-kind="image">الصور</button><button data-kind="video">الفيديوهات</button></div><div id="saraAlbumGrid">جاري تحميل الألبوم...</div></section>';document.body.append(overlay);
let items=[],kind='all';const grid=overlay.querySelector('#saraAlbumGrid');
function render(){grid.replaceChildren();const list=items.filter(x=>kind==='all'||(kind==='image'?!!x.image:!!x.video));if(!list.length){grid.textContent='ما فيه صور أو فيديوهات في هذا القسم';return}for(const x of list){const card=document.createElement('div');card.className='saraAlbumCard';let media;if(x.image){media=document.createElement('img');media.src=x.image;media.loading='lazy';media.onclick=()=>{const box=document.createElement('div');box.id='saraAlbumLightbox';const img=document.createElement('img');img.src=x.image;box.append(img);box.onclick=()=>box.remove();document.body.append(box)}}else{media=document.createElement('video');media.src=x.video;media.controls=true;media.preload='none';media.playsInline=true}const name=document.createElement('strong');name.textContent='👤 '+(x.name||'عضو');card.append(media,name);grid.append(card)}}
open.onclick=()=>{overlay.hidden=false;grid.textContent='جاري تحميل الألبوم...';socket.emit('saraAlbumRequest');document.getElementById('councilMenu').hidden=true};
overlay.querySelector('#saraAlbumClose').onclick=()=>overlay.hidden=true;overlay.onclick=e=>{if(e.target===overlay)overlay.hidden=true};
overlay.querySelectorAll('#saraAlbumTabs button').forEach(b=>b.onclick=()=>{kind=b.dataset.kind;overlay.querySelectorAll('#saraAlbumTabs button').forEach(t=>t.classList.toggle('active',t===b));render()});
socket.on('saraAlbumItems',data=>{items=Array.isArray(data)?data:[];if(!overlay.hidden)render()});
})();