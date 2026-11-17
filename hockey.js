import {randomUUID} from 'node:crypto';
export function installHockey(io){
 const games=new Map(), membership=new Map();
 const safeName=s=>String(s||'لاعب').slice(0,24).replace(/[<>]/g,'');
 const room=id=>'hockey:'+id;
 function state(g){return {id:g.id,mode:g.mode,status:g.status,players:g.players.map(p=>({name:p.name,id:p.id,side:p.side,online:!!p.sid})),score:g.score,puck:g.puck,paddles:g.paddles,spectators:g.spectators.size,winner:g.winner||null,effect:g.effect||null};}
 function send(g){io.to(room(g.id)).emit('hockey:state',state(g));io.of('/guest').to(room(g.id)).emit('hockey:state',state(g));}
 function list(){const rows=[...games.values()].map(g=>({id:g.id,mode:g.mode,status:g.status,players:g.players.map(p=>p.name),spectators:g.spectators.size}));io.emit('hockey:list',rows);io.of('/guest').emit('hockey:list',rows);}
 function reset(g){g.puck={x:.5,y:.5,vx:(Math.random()<.5?-1:1)*.32,vy:(Math.random()-.5)*.22};g.paddles=[{x:.17,y:.5,tx:.17,ty:.5,vx:0,vy:0},{x:.83,y:.5,tx:.83,ty:.5,vx:0,vy:0}];}
 function leave(s){const id=membership.get(s.id);if(!id)return;membership.delete(s.id);const g=games.get(id);if(!g)return;g.spectators.delete(s.id);const p=g.players.find(p=>p.sid===s.id);if(p){p.sid=null;if(g.status==='playing'&&g.mode==='online'){g.status='waiting';g.puck.vx=0;g.puck.vy=0;}}s.leave(room(id));if(!g.players.some(p=>p.sid)&&!g.spectators.size)games.delete(id);else send(g);list();}
 function attach(s){s.on('hockey:list',()=>s.emit('hockey:list',[...games.values()].map(g=>({id:g.id,mode:g.mode,status:g.status,players:g.players.map(p=>p.name),spectators:g.spectators.size}))));
 s.on('hockey:create',(data={},ack)=>{leave(s);const id=randomUUID().slice(0,8),mode=data.mode==='cpu'?'cpu':'online';const g={id,mode,status:mode==='cpu'?'playing':'waiting',players:[{id:s.id,sid:s.id,name:safeName(data.name),side:0}],spectators:new Set(),score:[0,0],puck:null,paddles:null,winner:null,effect:null,effectSeq:0};if(mode==='cpu')g.players.push({id:'cpu',sid:null,name:'الكمبيوتر',side:1});reset(g);games.set(id,g);membership.set(s.id,id);s.join(room(id));send(g);list();if(typeof ack==='function')ack({ok:true,id});});
 s.on('hockey:join',(data={},ack)=>{const g=games.get(String(data.id||''));if(!g){ack?.({ok:false,error:'الطاولة غير موجودة'});return;}leave(s);let p=g.players.find(p=>p.id===s.id);if(!p&&g.mode==='online'&&g.players.length<2&&g.status==='waiting'){p={id:s.id,sid:s.id,name:safeName(data.name),side:1};g.players.push(p);g.status='playing';reset(g);}else if(!p)g.spectators.add(s.id);membership.set(s.id,g.id);s.join(room(g.id));send(g);list();ack?.({ok:true,id:g.id,side:p?p.side:-1});});
 s.on('hockey:move',({x,y}={})=>{const g=games.get(membership.get(s.id));if(!g||g.status!=='playing')return;const p=g.players.find(p=>p.sid===s.id);if(!p||!Number.isFinite(x)||!Number.isFinite(y))return;const i=p.side;const paddle=g.paddles[i];paddle.tx=Math.max(i===0?.055:.525,Math.min(i===0?.475:.945,x));paddle.ty=Math.max(.08,Math.min(.92,y));});
 s.on('hockey:chat',(raw)=>{const g=games.get(membership.get(s.id));if(!g)return;const msg=String(raw||'').trim().slice(0,350);if(!msg)return;const p=g.players.find(p=>p.sid===s.id);const name=p?.name||'مشاهد';const data={name,msg,at:Date.now()};io.to(room(g.id)).emit('hockey:chat',data);io.of('/guest').to(room(g.id)).emit('hockey:chat',data);});s.on('hockey:leave',()=>leave(s));s.on('disconnect',()=>leave(s));}
 io.on('connection',attach);io.of('/guest').on('connection',attach);
 let last=Date.now();
 setInterval(()=>{const now=Date.now(),dt=Math.min(.05,(now-last)/1000);last=now;
 for(const g of games.values()){if(g.status!=='playing')continue;
 const b=g.puck;
 if(g.mode==='cpu'){const c=g.paddles[1];const approaching=b.vx>0;const defend=b.x>.39;const travel=Math.max(0,(.77-b.x)/Math.max(.12,b.vx));const projected=b.y+b.vy*Math.min(1.4,travel);const reflected=Math.abs(((projected-.05)%(1.8)+1.8)%1.8-.9)+.05;const targetY=approaching&&defend?reflected:(b.x>.62?b.y:.5);c.ty=Math.max(.11,Math.min(.89,targetY));c.tx=approaching&&b.x>.49?Math.max(.63,Math.min(.88,b.x+.018)):(b.x>.68?.76:.83);}
 for(let i=0;i<2;i++){const p=g.paddles[i],oldX=p.x,oldY=p.y;
 const speed=i===1&&g.mode==='cpu'?1.48:1.65;
 const dx=p.tx-p.x,dy=p.ty-p.y,dist=Math.hypot(dx,dy),step=Math.min(dist,speed*dt);
 if(dist>.00001){p.x+=dx/dist*step;p.y+=dy/dist*step;}
 p.vx=(p.x-oldX)/dt;p.vy=(p.y-oldY)/dt;
 }
 // Substep fast puck movement to reduce tunneling through a moving mallet.
 const puckSteps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/.025));
 for(let sub=0;sub<puckSteps;sub++){b.x+=b.vx*dt/puckSteps;b.y+=b.vy*dt/puckSteps;
 // Puck remains inside the side rails, including its radius.
 if(b.y<.05||b.y>.95){b.y=Math.max(.05,Math.min(.95,b.y));b.vy=-b.vy*.92;g.effect={type:'wall',seq:++g.effectSeq,force:Math.abs(b.vy)};}
 // A goal is possible only through the center opening at each end.
 let goal=-1;
 if(b.x<.032||b.x>.968){
 const end=b.x<.032?0:1;
 if(Math.abs(b.y-.5)<.155 && ((end===0&&b.vx<0)||(end===1&&b.vx>0))){goal=end===0?1:0;}
 else{b.x=Math.max(.032,Math.min(.968,b.x));b.vx=-b.vx*.9;g.effect={type:'wall',seq:++g.effectSeq,force:Math.abs(b.vx)};}
 }
 if(goal>=0){g.score[goal]++;g.effect={type:'goal',seq:++g.effectSeq,force:1,scorer:goal};if(g.score[goal]>=10){g.status='finished';g.winner=g.players[goal]?.name||'الكمبيوتر';}reset(g);send(g);list();break;}
 for(let i=0;i<2;i++){const p=g.paddles[i];const dx=b.x-p.x,dy=b.y-p.y;const dist=Math.hypot(dx,dy);const radius=.099;
 if(dist<radius){const nx=dist>.00001?dx/dist:(i===0?1:-1),ny=dist>.00001?dy/dist:0;
 const approach=(b.vx-p.vx)*nx+(b.vy-p.vy)*ny;
 b.x=p.x+nx*(radius+.004);b.y=Math.max(.05,Math.min(.95,p.y+ny*(radius+.004)));
 if(approach<-.025){const impulse=Math.min(1.85,Math.max(.45,-approach*1.22+.36));
 b.vx+=nx*impulse;b.vy+=ny*impulse; if(i===1&&b.vx>-.25)b.vx=-Math.max(.38,Math.abs(b.vx));if(i===0&&b.vx<.25)b.vx=Math.max(.38,Math.abs(b.vx));
 const v=Math.hypot(b.vx,b.vy);if(v>1.65){b.vx*=1.65/v;b.vy*=1.65/v;}
 g.effect={type:'hit',seq:++g.effectSeq,force:Math.min(1.5,impulse),hitter:i};}
 }}
 }
 send(g);
 }
 },50).unref();
}
