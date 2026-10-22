import {random,clamp} from './geometry.js';
export const WIDTH=1440, HEIGHT=900;
export function newWorld(seed=8421,round=1,best=0) {
  const rand=random(seed+round*1889), offset=round===1 ? 0 : (rand()-.5)*80;
  return {seed,round,best,elapsed:0,energy:85,status:'ready',moves:0,score:0,combo:0,
    source:{x:105,y:465+offset,angle:0},
    bodies:[
      {id:'shard-a',type:'mirror',x:470,y:465+offset,angle:-.62,length:132,draggable:true},
      {id:'shard-b',type:'mirror',x:765,y:640,angle:.5,length:132,draggable:true},
      {id:'shard-c',type:'mirror',x:1115,y:530,angle:-.65,length:132,draggable:true},
      {id:'seed-a',type:'receiver',x:round===1?650:500+rand()*320,y:round===1?220:180+rand()*80,charge:0,radius:34,color:'#aaffc7'},
      {id:'seed-b',type:'receiver',x:round===1?1100:1030+rand()*160,y:round===1?320:250+rand()*130,charge:0,radius:34,color:'#ffa8dc'},
      {id:'seed-c',type:'receiver',x:round===1?960:850+rand()*220,y:round===1?700:650+rand()*100,charge:0,radius:34,color:'#c6adff'},
      ...(round>1 ? [{id:'stone-a',type:'stone',x:770+rand()*120,y:410+rand()*70,radius:48+Math.min(round,6)*3}] : [])
    ],history:[]};
}
export function trace(world,mechanics) {
  const source=world.source, rays=[{x:source.x,y:source.y,dx:Math.cos(source.angle),dy:Math.sin(source.angle),power:1,color:'#91fff0',depth:0}], segments=[], deposits=new Map();
  while(rays.length && segments.length<100) {
    const ray=rays.shift(); if(ray.depth>12||ray.power<.045) continue;
    const hits=mechanics.map(mechanic=>{const hit=mechanic.trace?.(ray,world);return hit?{...hit,mechanic}:null;}).filter(Boolean).sort((a,b)=>a.distance-b.distance);
    const hit=hits[0], length=hit?.distance||1800;
    segments.push({...ray,x2:ray.x+ray.dx*length,y2:ray.y+ray.dy*length,hit:hit?.body?.id});
    if(!hit) continue;
    const result=hit.mechanic.scatter?.(ray,hit,world)||{};
    for(const deposit of result.deposits||[]) deposits.set(deposit.id,(deposits.get(deposit.id)||0)+deposit.power);
    for(const next of result.rays||[]) rays.push({...ray,...next,x:next.x+next.dx*.3,y:next.y+next.dy*.3,depth:ray.depth+1});
  }
  const optics={segments,deposits};
  for(const mechanic of mechanics)mechanic.preview?.(world,optics);
  return optics;
}
export function step(world,dt,optics,mechanics,onBloom) {
  if(world.status!=='playing') return;
  world.elapsed+=dt; world.energy=Math.max(0,world.energy-dt);
  for(const mechanic of mechanics) mechanic.step?.(world,dt,optics);
  for(const body of world.bodies) {
    if(body.type!=='receiver'||body.bloomed) continue;
    const power=optics.deposits.get(body.id)||0;
    body.charge=world.prism?.enabled ? world.prism.chord/2 : clamp(body.charge+(power>0?power*dt*.56:-dt*.13),0,1);
    if(world.prism?.enabled ? world.prism.complete : body.charge>=1) {
      body.charge=1;
      body.bloomed=true; world.combo++; world.energy=Math.min(100,world.energy+7);
      world.score+=Math.round(300+world.energy*3+world.combo*75); onBloom(body);
    }
  }
  const receivers=world.bodies.filter(body=>body.type==='receiver');
  if(receivers.length && (world.prism?.enabled ? world.prism.complete : receivers.every(body=>body.bloomed))) {
    world.status='won'; world.score+=Math.round(world.energy*10); world.best=Math.max(world.best,world.score);
  } else if(world.energy<=0) world.status='lost';
}
