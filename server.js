import express from 'express';
import {createServer} from 'http';
import {Server} from 'socket.io';
import {randomBytes} from 'crypto';
const app=express();app.use(express.static('public'));app.get('/health',(_,res)=>res.json({ok:true,game:'SARA CARROM'}));
const http=createServer(app),io=new Server(http),rooms=new Map();
const uid=()=>randomBytes(7).toString('hex'),rand=()=>randomBytes(3).toString('hex').toUpperCase();
const BOARD=700,MIN=43,MAX=657,POCKETS=[[52,52],[648,52],[52,648],[648,648]];
function state(r){return{code:r.code,status:r.status,host:r.host,players:r.players.map(p=>({id:p.id,name:p.name,online:!!p.sid,score:p.score,color:p.color})),turn:r.players[r.turn]?.id,pieces:r.pieces,shotting:r.shooting,winner:r.winner,message:r.message,round:r.round}}
function send(r){const data=state(r);for(const p of r.players)if(p.sid)io.to(p.sid).emit('state',{...data,you:p.id})}
function setup(r){r.pieces=[];r.round=(r.round||0)+1;r.players.forEach((p,i)=>{p.score=0;p.color=i%2?'black':'white'});let count=0;const add=(x,y,color,radius=15)=>r.pieces.push({id:uid(),x,y,vx:0,vy:0,color,r:radius});add(350,350,'queen');for(let ring=1;ring<=2;ring++){let n=ring===1?6:12;for(let j=0;j<n;j++){let angle=(j/n)*Math.PI*2+(ring===2?Math.PI/12:0);add(350+ring*32*Math.cos(angle),350+ring*32*Math.sin(angle),(count++%2?'black':'white'))}}r.turn=0;r.shooting=false;r.status='playing';r.winner=null;r.message='ابدأ اللعب! وجّه الضربة واسحب لتحديد القوة';send(r)}
function next(r){r.turn=(r.turn+1)%r.players.length}
function shot(r,p,{x,y,vx,vy}){if(r.status!=='playing'||r.shooting||r.players[r.turn]!==p)return; x=Number(x);y=Number(y);vx=Number(vx);vy=Number(vy);if(![x,y,vx,vy].every(Number.isFinite))return;if(x<110||x>590||y<545||y>615)return;const speed=Math.hypot(vx,vy);if(speed<1||speed>25)return;let striker={id:'striker',x,y,vx,vy,color:'striker',r:19};r.pieces.push(striker);r.shooting=true;r.message=p.name+' يلعب الآن';const startCount=r.pieces.length;let tick=0,scored=0,queen=false,strikerPocket=false;
const timer=setInterval(()=>{tick++;const pieces=r.pieces;for(const c of pieces){c.x+=c.vx;c.y+=c.vy;c.vx*=.984;c.vy*=.984;if(Math.abs(c.vx)<.045)c.vx=0;if(Math.abs(c.vy)<.045)c.vy=0;
for(const [px,py] of POCKETS)if(Math.hypot(c.x-px,c.y-py)<27){c.pocketed=true;break}
if(c.pocketed)continue;
if(c.x-c.r<MIN){c.x=MIN+c.r;c.vx=Math.abs(c.vx)*.78}if(c.x+c.r>MAX){c.x=MAX-c.r;c.vx=-Math.abs(c.vx)*.78}if(c.y-c.r<MIN){c.y=MIN+c.r;c.vy=Math.abs(c.vy)*.78}if(c.y+c.r>MAX){c.y=MAX-c.r;c.vy=-Math.abs(c.vy)*.78}}
for(let i=0;i<pieces.length;i++)for(let j=i+1;j<pieces.length;j++){let a=pieces[i],b=pieces[j];if(a.pocketed||b.pocketed)continue;let dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy)||.001,over=a.r+b.r-dist;if(over>0){let nx=dx/dist,ny=dy/dist; a.x-=nx*over/2;a.y-=ny*over/2;b.x+=nx*over/2;b.y+=ny*over/2;let dv=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;if(dv>0){let impulse=dv*.94;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny}}}
for(let i=pieces.length-1;i>=0;i--)if(pieces[i].pocketed){const c=pieces.splice(i,1)[0];if(c.color==='striker'){strikerPocket=true;p.score=Math.max(0,p.score-1)}else if(c.color==='queen'){queen=true;p.score+=3;scored+=3}else{const pts=c.color===p.color?2:1;p.score+=pts;scored+=pts}}
if(tick%3===0)send(r);
if(tick>900||pieces.every(c=>Math.hypot(c.vx,c.vy)<.08)){clearInterval(timer);r.pieces=r.pieces.filter(c=>c.id!=='striker').map(c=>({...c,vx:0,vy:0}));r.shooting=false;if(!scored||strikerPocket)next(r);if(r.pieces.length===0||r.players.some(x=>x.score>=20)){const top=Math.max(...r.players.map(x=>x.score));const winners=r.players.filter(x=>x.score===top);r.winner=winners.map(x=>x.name).join(' و ');r.status='finished';r.message='انتهت الجولة!'}else r.message=scored?p.name+' سجّل '+scored+' نقطة!':'الدور على '+r.players[r.turn].name;send(r)}
},20)}
io.on('connection',s=>{const error=msg=>s.emit('gameError',msg);const ctx=()=>{const r=rooms.get(s.data.code),p=r?.players.find(x=>x.id===s.data.pid);return{r,p,ok:p?.sid===s.id}};
s.on('join',({name,code,token}={})=>{name=String(name||'').trim().slice(0,20);if(!name)return error('اكتب اسمك');code=String(code||'').toUpperCase().trim();let r=code?rooms.get(code):null;if(code&&!r)return error('الغرفة غير موجودة، يمكن الخادم أعيد تشغيله');if(!r){do{code=rand()}while(rooms.has(code));r={code,players:[],status:'lobby',host:null,turn:0,pieces:[],shooting:false,winner:null,round:0,message:'بانتظار اللاعبين'};rooms.set(code,r)}let p=r.players.find(x=>token&&x.token===token);if(!p){if(r.status!=='lobby')return error('الجولة بدأت، انتظر الجولة التالية');if(r.players.length>=4)return error('الغرفة مكتملة');p={id:uid(),token:uid(),name,sid:null,score:0,color:'white'};r.players.push(p);r.host??=p.id}p.sid=s.id;s.data={code,pid:p.id};s.emit('joined',{code,token:p.token});send(r)});
s.on('start',()=>{const{r,p,ok}=ctx();if(!ok||r.host!==p.id)return error('صاحب الغرفة فقط يبدأ');if(r.players.length<2)return error('لازم لاعبين على الأقل');setup(r)});
s.on('shoot',data=>{const{r,p,ok}=ctx();if(!ok)return;shot(r,p,data||{})});
s.on('restart',()=>{const{r,p,ok}=ctx();if(!ok||r.host!==p.id||r.status!=='finished')return;setup(r)});
s.on('disconnect',()=>{const{r,p,ok}=ctx();if(ok){p.sid=null;send(r)}})});
http.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('SARA CARROM ready'));