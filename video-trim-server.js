import {randomBytes} from 'node:crypto';
import {createWriteStream} from 'node:fs';
import {mkdtemp,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {pipeline} from 'node:stream/promises';
export function installVideoTrim(app,io,users){
 const tickets=new Map(),busy=new Set();
 io.on('connection',socket=>socket.on('saraTrimTicket',ack=>{
  if(typeof ack!=='function')return;
  const u=users.get(socket.data.token);
  if(!u||u.sid!==socket.id)return ack({error:'يرجى تسجيل الدخول'});
  const token=randomBytes(24).toString('hex');
  tickets.set(token,{id:u.id,expires:Date.now()+90000});
  ack({token});
 }));
 app.post('/api/video/trim',async(req,res)=>{
  const token=String(req.headers['x-sara-trim-token']||'');
  const ticket=tickets.get(token);tickets.delete(token);
  if(!ticket||ticket.expires<Date.now())return res.status(401).json({error:'انتهت صلاحية الطلب'});
  if(busy.has(ticket.id))return res.status(429).json({error:'يوجد فيديو قيد المعالجة'});
  const start=Number(req.headers['x-trim-start']),end=Number(req.headers['x-trim-end']);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end-start>600)return res.status(400).json({error:'مدة القص غير صحيحة'});
  const length=Number(req.headers['content-length']);
  if(Number.isFinite(length)&&length>100000000)return res.status(413).json({error:'حجم الفيديو كبير'});
  busy.add(ticket.id);
  let dir;
  try{
   dir=await mkdtemp(join(tmpdir(),'sara-trim-'));
   const input=join(dir,'input'),output=join(dir,'output.mp4');
   let bytes=0;
   const {Transform}=await import('node:stream');
   const limit=new Transform({transform(chunk,enc,cb){bytes+=chunk.length;cb(bytes>100000000?new Error('الملف أكبر من 100 ميجابايت'):null,chunk)}});
   await pipeline(req,limit,createWriteStream(input));
   await new Promise((resolve,reject)=>{
    const args=['-hide_banner','-loglevel','error','-y','-ss',String(start),'-i',input,'-t',String(end-start),'-map','0:v:0','-map','0:a?','-threads','1','-c:v','libx264','-preset','ultrafast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',output];
    const child=spawn('ffmpeg',args,{stdio:['ignore','ignore','pipe']});
    let err='';child.stderr.on('data',c=>{err=(err+String(c)).slice(-600)});
    const timer=setTimeout(()=>child.kill('SIGKILL'),150000);
    child.on('error',e=>{clearTimeout(timer);reject(e)});
    child.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(Error(err||'فشل قص الفيديو'))});
   });
   const info=await stat(output);
   if(info.size<1||info.size>100000000)throw Error('حجم الفيديو الناتج غير مناسب');
   res.type('video/mp4');res.set('Cache-Control','no-store');res.set('Content-Length',String(info.size));
   res.sendFile(output,err=>{rm(dir,{recursive:true,force:true}).catch(()=>{});busy.delete(ticket.id);if(err)console.error('Video trim send failed',err)});
   dir=null;
  }catch(e){console.error('Video trim failed',e);if(!res.headersSent)res.status(422).json({error:'تعذر معالجة الفيديو: '+String(e.message||'خطأ غير معروف').slice(0,160)});}
  finally{if(dir)await rm(dir,{recursive:true,force:true}).catch(()=>{});busy.delete(ticket.id)}
 });
}
