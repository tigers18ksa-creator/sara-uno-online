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
 s.on('hockey:rematch',(_,ack)=>{const g=games.get(membership.get(s.id));const p=g?.players.find(p=>p.sid===s.id);if(!g||!p||g.status!=='finished'){ack?.({ok:false,error:'لا يمكن بدء قيم جديد الآن'});return;}if(g.mode==='online'&&!g.players.every(p=>!!p.sid)){ack?.({ok:false,error:'انتظر رجوع اللاعب الثاني'});return;}g.score=[0,0];g.winner=null;g.effect=null;g.goalPauseUntil=0;g.status='playing';reset(g);send(g);list();ack?.({ok:true});});
 s.on('hockey:move',({x,y}={})=>{const g=games.get(membership.get(s.id));if(!g||g.status!=='playing')return;const p=g.players.find(p=>p.sid===s.id);if(!p||!Number.isFinite(x)||!Number.isFinite(y))return;const i=p.side;const paddle=g.paddles[i];paddle.tx=Math.max(i===0?.055:.525,Math.min(i===0?.475:.945,x));paddle.ty=Math.max(.08,Math.min(.92,y));});
 s.on('hockey:chat',(raw)=>{const g=games.get(membership.get(s.id));if(!g)return;const msg=String(raw||'').trim().slice(0,350);if(!msg)return;const p=g.players.find(p=>p.sid===s.id);const name=p?.name||'مشاهد';const data={name,msg,at:Date.now()};io.to(room(g.id)).emit('hockey:chat',data);io.of('/guest').to(room(g.id)).emit('hockey:chat',data);});s.on('hockey:leave',()=>leave(s));s.on('disconnect',()=>leave(s));}
 io.on('connection',attach);io.of('/guest').on('connection',attach);
 let last=Date.now();
 setInterval(()=>{const now=Date.now(),dt=Math.min(.05,(now-last)/1000);last=now;
 for(const g of games.values()){if(g.status!=='playing')continue;if(g.goalPauseUntil){if(now<g.goalPauseUntil)continue;g.goalPauseUntil=0;reset(g);send(g);continue;}
 const b=g.puck;
 if(g.mode==='cpu'){
 const cpu=g.paddles[1],incoming=b.vx>.035;
 const defendX=.79,travel=incoming?Math.max(0,(defendX-b.x)/Math.max(.07,b.vx)):0;
 const low=.05,span=.90;
 let projected=b.y+b.vy*travel;
 projected=((projected-low)%(2*span)+2*span)%(2*span);
 projected=low+(projected>span?2*span-projected:projected);
 projected=Math.max(.12,Math.min(.88,projected));
 // Medium-strength defense: follow shots without perfect positioning.
 const danger=incoming&&b.x>.53;
 const attackable=b.x>.62&&b.x<.88;
 const attack=!danger&&attackable;
 if(attack){
   // Set up on the goal-side, then lunge through the puck toward the player.
   const behind=Math.max(.58,Math.min(.91,b.x+.105));
   const aligned=Math.abs(cpu.y-b.y)<.11;
   const inRange=Math.abs(cpu.x-b.x)<.20;
   cpu.ty=Math.max(.12,Math.min(.88,b.y+(b.y>.5?-.018:.018)));
   cpu.tx=aligned&&inRange?Math.max(.59,b.x-.025):behind;
 }else{
   cpu.ty=danger?Math.max(.16,Math.min(.84,projected*.68+.5*.32)):.5;
   cpu.tx=danger&&b.x>.59?Math.max(.62,Math.min(.91,b.x+.105)):.85;
 }
 if(b.x>.91){cpu.tx=.91;cpu.ty=Math.max(.31,Math.min(.69,b.y));}
 }
 for(let i=0;i<2;i++){const p=g.paddles[i],oldX=p.x,oldY=p.y;
 p.prevX=oldX;p.prevY=oldY;
 const speed=i===1&&g.mode==='cpu'?1.12:2.05;
 const dx=p.tx-p.x,dy=p.ty-p.y,dist=Math.hypot(dx,dy),step=Math.min(dist,speed*dt);
 if(dist>.00001){const ease=i===1&&g.mode==='cpu'?.80:Math.min(1,.58+dist*3.2);p.x+=dx/dist*step*ease;p.y+=dy/dist*step*ease;}
 p.vx=(p.x-oldX)/dt;p.vy=(p.y-oldY)/dt;
 }
 // Substep fast puck movement to reduce tunneling through a moving mallet.
 // Slightly heavier puck: mild glide resistance, retaining momentum and shot direction.
 const puckDrag=Math.exp(-.38*dt);
 b.vx*=puckDrag;b.vy*=puckDrag;
 const puckSteps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/.025));
 for(let sub=0;sub<puckSteps;sub++){b.x+=b.vx*dt/puckSteps;b.y+=b.vy*dt/puckSteps;
 // Puck remains inside the side rails, including its radius.
 if(b.y<.05||b.y>.95){b.y=Math.max(.05,Math.min(.95,b.y));b.vy=-b.vy*.92;g.effect={type:'wall',seq:++g.effectSeq,force:Math.abs(b.vy)};}
 // A goal is possible only through the center opening at each end.
 let goal=-1;
 if(b.x<.032||b.x>.968){
 const end=b.x<.032?0:1;
 // The entire puck must fit inside the goal mouth (visual opening is 32% wide).
 const puckHalfWidth=.055,clearOpening=.16-puckHalfWidth;
 const insideOpening=Math.abs(b.y-.5)<=clearOpening;
 const movingIntoGoal=end===0?b.vx<0:b.vx>0;
 if(insideOpening&&movingIntoGoal){
 // Only score after the puck's trailing edge has completely crossed the goal line.
 if((end===0&&b.x<.032-.04)||(end===1&&b.x>.968+.04))goal=end===0?1:0;
 }else{
 b.x=Math.max(.032,Math.min(.968,b.x));b.vx=-b.vx*.9;
 g.effect={type:'wall',seq:++g.effectSeq,force:Math.abs(b.vx)};
 }
 }
 if(goal>=0){g.score[goal]++;g.effect={type:'goal',seq:++g.effectSeq,force:1,scorer:goal};if(g.score[goal]>=10){g.status='finished';g.winner=g.players[goal]?.name||'الكمبيوتر';}if(g.status==='playing'){g.goalPauseUntil=now+1300;b.vx=0;b.vy=0;}send(g);list();break;}
 for(let i=0;i<2;i++){const p=g.paddles[i];// Swept mallet contact: detect the full path between ticks, not just its final position.
 const pathX=p.x-(p.prevX??p.x),pathY=p.y-(p.prevY??p.y);
 const pathLen2=pathX*pathX+pathY*pathY;
 const contactT=pathLen2>1e-9?Math.max(0,Math.min(1,((b.x-(p.prevX??p.x))*pathX+(b.y-(p.prevY??p.y))*pathY)/pathLen2)):1;
 const hitX=(p.prevX??p.x)+pathX*contactT,hitY=(p.prevY??p.y)+pathY*contactT;
 const dx=b.x-hitX,dy=b.y-hitY;const dist=Math.hypot(dx,dy);const radius=.099;
 if(dist<radius){const nx=dist>.00001?dx/dist:(i===0?1:-1),ny=dist>.00001?dy/dist:0;
 const approach=(b.vx-p.vx)*nx+(b.vy-p.vy)*ny;
 b.x=hitX+nx*(radius+.008);b.y=Math.max(.05,Math.min(.95,hitY+ny*(radius+.008)));
 // Avoid corner traps: if the puck is pinned against a rail, separate tangentially
 // and add a minimum outward speed instead of letting the mallet carry it.
 const railTrap=b.y<=.065||b.y>=.935;
 if(railTrap){
   const awayX=i===0?1:-1;
   if(Math.abs(b.vx)<.28||b.vx*awayX<0) b.vx=awayX*.48;
   b.vy=b.y<=.065?Math.max(.24,b.vy):Math.min(-.24,b.vy);
   b.x=Math.max(.045,Math.min(.955,b.x+awayX*.013));
 }

 if(approach<-.025 || (pathLen2>.000001 && (p.vx*nx+p.vy*ny)>.08)){
 // Continuous collision response: a gentle tap gives a gentle return, a fast swing
 // transfers more momentum along the actual contact normal.
 const swing=Math.max(0,p.vx*nx+p.vy*ny);
 const incoming=Math.max(0,-(b.vx*nx+b.vy*ny));
 const strength=Math.min(1.55,Math.max(.22,incoming*.83+swing*.75));
 const tangentX=-ny,tangentY=nx;
 const tangent=(b.vx*tangentX+b.vy*tangentY)*.93+(p.vx*tangentX+p.vy*tangentY)*.14;
 b.vx=nx*strength+tangentX*tangent;
 b.vy=ny*strength+tangentY*tangent;
 // Keep CPU returns toward the player without giving it an unnatural power boost.
 if(g.mode==='cpu'&&i===1&&b.vx>-.12)b.vx=-Math.max(.24,Math.min(.85,strength));
 const v=Math.hypot(b.vx,b.vy);
 if(v>1.65){b.vx*=1.65/v;b.vy*=1.65/v;}
 g.effect={type:'hit',seq:++g.effectSeq,force:Math.min(1.5,strength),hitter:i};
 }
 }}
 }
 send(g);
 }
 },50).unref();
}
