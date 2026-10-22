import { P, TAU, hash, line, ellipse, polygon, star, bird, glow } from './paint-primitives.js';
import { palace, exitArch, foreground } from './paint-palace.js';
import { courier, enemy, telegraph, crystal, weight } from './paint-figures.js';

function arrow(c,a){
  c.save();c.translate(a.x,a.y-6);c.rotate(a.angle??Math.atan2(a.vy||0,a.vx||0));
  line(c,[[-17,2],[10,2]],'#57435444',3);line(c,[[-17,0],[10,0]],P.ink,3);line(c,[[-17,-.5],[9,-.5]],P.ivory,1.2);
  polygon(c,[[15,0],[5,-5],[7,0],[5,5]],P.red,P.ink,.8);line(c,[[-14,0],[-19,-4]],'#faf0ca',2);line(c,[[-14,0],[-19,4]],'#faf0ca',2);c.restore();
}
function effects(c,s){
  for(const r of s.rings||[]){const f=Math.max(0,r.life/(r.maxLife||.4));c.save();c.globalAlpha=f*.8;c.beginPath();c.ellipse(r.x,r.y,r.r||1,(r.r||1)*.75,0,0,TAU);c.strokeStyle=r.color||P.ivory;c.lineWidth=1+f*4;c.stroke();c.restore();}
  for(const p of s.particles||[]){const f=Math.max(0,Math.min(1,p.life/(p.maxLife||.6))),r=Math.max(.5,p.r||2);c.save();c.globalAlpha=f;c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy||0,p.vx||0)+p.life*2);polygon(c,[[-r,-r*.35],[r*.7,-r],[r,r*.7],[-r*.5,r]],p.color||P.gold);c.restore();}
}
function ambience(c,s,t){
  for(let i=0;i<15;i++){const x=(hash(i+47)*1200+t*(3+hash(i)*5))%1200,y=190+hash(i+90)*500+Math.sin(t*.3+i)*9;c.save();c.globalAlpha=.17+hash(i+6)*.18;line(c,[[x,y],[x+2,y-1]],'#fff8dc',1.3);c.restore();}
  if(s.awaitingHost&&s.player){const p=s.player;glow(c,p.x,p.y-16,53,'#fff2aa45');ellipse(c,p.x,p.y-11,31,43,null,'#c99a4655',1);for(let i=0;i<3;i++){const a=t*.9+i*TAU/3;star(c,p.x+Math.cos(a)*33,p.y-11+Math.sin(a)*43,3,'#fff9d1',a,4);}}
  if(s.rescue&&s.player){const p=s.player,x=p.x-35+Math.sin(t*2.1)*11,y=p.y-48+Math.cos(t*1.7)*5;ellipse(c,x+15,p.y+12,8,2,'#81748a22');bird(c,x,y,t,.85);}
}
function pointer(c,s,pointer,t){
  if(!pointer||!Number.isFinite(pointer.x)||!Number.isFinite(pointer.y)||pointer.x<90||pointer.x>1110||pointer.y<160||pointer.y>710)return;
  const x=pointer.x,y=pointer.y;c.save();c.globalAlpha=.65;const ready=s.orb?.mode==='held';
  for(let i=0;i<4;i++){const a=i*TAU/4+Math.PI/4;line(c,[[x+Math.cos(a)*7,y+Math.sin(a)*7],[x+Math.cos(a)*11,y+Math.sin(a)*11]],ready?P.ink:P.darkGold,1.2);}ellipse(c,x,y,1,1,ready?P.ink:P.gold);c.restore();
}

export function paint(c,s,view){
  const w=view.width,h=view.height,scale=Math.min(w/1200,h/800),ox=(w-1200*scale)/2,oy=(h-800*scale)/2,t=Number(s.clock??view.time??0);
  c.save();c.clearRect(0,0,w,h);c.fillStyle='#dfbf91';c.fillRect(0,0,w,h);c.translate(ox,oy);c.scale(scale,scale);
  c.beginPath();c.rect(0,0,1200,800);c.clip();
  if(s.shake>0){const k=Math.min(7,s.shake*30);c.translate(Math.sin(t*137)*k,Math.cos(t*117)*k*.6);}
  palace(c,s,t);exitArch(c,s,t);
  for(const e of s.enemies||[])telegraph(c,e);
  // The string always describes the real return line, never a decorative orbit.
  const entities=[...(s.enemies||[]).map(value=>({type:'enemy',value})),...(s.props||[]).map(value=>({type:'prop',value}))];
  if(s.player)entities.push({type:'player',value:s.player});
  entities.sort((a,b)=>a.value.y-b.value.y);
  for(const e of entities){if(e.type==='player')courier(c,e.value,t);else if(e.type==='enemy')enemy(c,e.value,t);else if(e.value.kind==='crystal')crystal(c,e.value,s,t);}
  for(const a of s.shots||[])arrow(c,a);
  weight(c,s,t);effects(c,s);ambience(c,s,t);pointer(c,s,view.pointer,t);foreground(c,t);
  // A thin inner ink edge unifies the scene without a panel, HUD, or vignette.
  c.strokeStyle='#6a584f30';c.lineWidth=1;c.strokeRect(10.5,10.5,1179,779);c.restore();
}
