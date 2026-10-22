import { P, TAU, polygon, line, ellipse, arc, shadow, star, glow, bird } from './paint-primitives.js';

export function courier(c,p,t){
  if(!p)return;shadow(c,p.x,p.y,12,29,.22);
  for(const q of p.trail||[]){c.save();c.globalAlpha=Math.max(0,(q.life/(q.maxLife||.3)))*.13;ellipse(c,q.x,q.y-10,10,16,P.red);c.restore();}
  c.save();c.translate(p.x,p.y);const angle=p.angle||0,move=(p.trail||[]).length>2,bob=move?Math.sin(t*17)*1.5:Math.sin(t*3)*.5;
  if(p.grace>0&&t>0)c.globalAlpha=.64+Math.sin(t*24)*.2;
  c.translate(0,bob);const dx=-Math.cos(angle),dy=-Math.sin(angle),tailX=dx*38-8,tailY=dy*19-21;
  c.beginPath();c.moveTo(-3,-23);c.bezierCurveTo(dx*16,-26,tailX+8,tailY-10,tailX,tailY);c.bezierCurveTo(tailX-6,tailY+7,tailX-15,tailY+1,tailX-19,tailY+7);c.lineTo(tailX-3,tailY+11);c.bezierCurveTo(tailX+10,tailY+12,dx*14,-8,3,-16);c.closePath();c.fillStyle=P.red;c.fill();
  line(c,[[tailX-12,tailY+7],[tailX+1,tailY+7],[dx*15,-15]],'#f59454',1.3);
  const step=move?Math.sin(t*17)*3:0;line(c,[[-6,-1],[-8,7+step],[-3,8+step]],P.ink,4);line(c,[[6,-1],[7,7-step],[12,8-step]],P.ink,4);
  polygon(c,[[-9,-20],[7,-23],[12,-5],[7,2],[-12,2]],p.flash>0?'#fff':P.ivory,P.ink,1.5);
  polygon(c,[[-8,-16],[5,-16],[7,-2],[-10,-2]],P.cobalt);line(c,[[-8,-7],[8,-7]],P.gold,3);
  const ax=Math.cos(angle)*15,ay=Math.sin(angle)*9-15;line(c,[[3,-18],[ax,ay]],P.ink,6);line(c,[[3,-19],[ax,ay-1]],P.ivory,4);ellipse(c,ax,ay,3,3,'#bc7752',P.ink,.8);
  ellipse(c,0,-28,9,9,P.ink);ellipse(c,Math.cos(angle)*2,-28+Math.sin(angle),7,7,'#db9d6c',P.ink,1);
  polygon(c,[[-9,-31],[-7,-37],[4,-38],[10,-31],[5,-32],[0,-35],[-4,-30]],'#36364b');
  ellipse(c,Math.cos(angle)*6,-29+Math.sin(angle)*3,1,1,P.ink);
  polygon(c,[[-8,-23],[8,-24],[10,-19],[-5,-18],[-10,-20]],p.flash>0?'#fff':P.red,P.ink,.7);
  c.restore();
  const n=p.maxHp||5;for(let i=0;i<n;i++)ellipse(c,p.x+(i-(n-1)/2)*8,p.y+21,2.4,2.4,i<p.hp?P.red:'#d1b695',i<p.hp?'#a83932':'#a79177',.6);
}
export function telegraph(c,e){
  if(e.hp<=0||!['windup','lunge'].includes(e.phase))return;
  const angle=Number.isFinite(e.aimX)?Math.atan2(e.aimY,e.aimX):(e.angle||0),len=Math.min(e.aimDistance||260,e.kind==='ram'?470:620),ram=e.kind==='ram';
  c.save();c.translate(e.x,e.y);c.rotate(angle);
  const g=c.createLinearGradient(20,0,len,0);g.addColorStop(0,ram?'#b9553c23':'#b9553c12');g.addColorStop(1,'#b9553c00');const spread=ram?32:Math.tan(.17)*len;polygon(c,[[16,-(ram?17:4)],[len,-spread],[len,spread],[16,ram?17:4]],g);
  c.setLineDash(ram?[8,11]:[2,9]);line(c,[[30,0],[len,0]],ram?'#a5493f55':'#8c5b4d77',ram?1.6:1);c.setLineDash([]);
  if(!ram){c.setLineDash([3,11]);for(const side of [-1,1])line(c,[[30,side*5],[len,side*spread]],'#8c5b4d55',1);c.setLineDash([]);}
  if(ram){line(c,[[len-13,-8],[len,0],[len-13,8]],'#a95b4d55',1.5);line(c,[[32,-19],[len-15,-31]],'#a95b4d30',1);line(c,[[32,19],[len-15,31]],'#a95b4d30',1);}
  c.restore();
}
function ram(c,e,t){
  const wind=e.phase==='windup',rush=e.phase==='lunge',flash=e.flash>0;
  c.save();c.translate(e.x,e.y-8);c.rotate(e.angle||0);c.scale(rush?1.13:wind?.91:1,wind?1.08:1);
  for(const side of [-1,1])for(const x of [-17,12]){const offset=rush?Math.sin(t*22+x)*5:0;line(c,[[x,side*12],[x-8+offset,side*25],[x+1+offset,side*27]],P.ink,5);line(c,[[x,side*12],[x-8+offset,side*24]],'#bc8f6a',3);}
  polygon(c,[[-31,0],[-22,-16],[-2,-23],[20,-16],[27,0],[18,17],[-5,23],[-24,13]],flash?P.ivory:'#447c7d',P.ink,2);
  polygon(c,[[-24,-3],[-10,-14],[10,-13],[16,-1],[5,14],[-13,15]],flash?'#fff':'#7ba4a0',P.ink,1);
  for(let x=-15;x<15;x+=8)line(c,[[x,-12],[x+5,0],[x,13]],'#d2bc7b',1.5);
  polygon(c,[[17,-13],[31,-10],[35,0],[29,12],[16,13],[22,0]],flash?'#fff':P.cream,P.ink,1.3);
  for(const side of [-1,1])polygon(c,[[20,side*12],[23,side*26],[34,side*31],[43,side*23],[33,side*24],[29,side*15],[29,side*8]],P.ivory,P.ink,1.3);
  line(c,[[27,-6],[32,-5]],rush?P.red:'#cc7e38',3);line(c,[[27,6],[32,5]],rush?P.red:'#cc7e38',3);
  polygon(c,[[32,-4],[38,0],[32,4]],P.ink);line(c,[[-28,1],[-40,-2],[-43,-8]],P.ink,3);
  if(wind){line(c,[[-34,-19],[-43,-24]],'#b15a42',1.5);line(c,[[-35,19],[-44,25]],'#b15a42',1.5);}
  c.restore();
}
function archer(c,e,t){
  const wind=e.phase==='windup',flash=e.flash>0;
  c.save();c.translate(e.x,e.y-10);c.rotate(e.angle||0);
  line(c,[[-7,-7],[-22,-15],[-25,-12]],P.ink,4);line(c,[[-4,7],[-18,16],[-23,15]],P.ink,4);
  polygon(c,[[-27,-16],[-8,-21],[12,-11],[14,8],[-10,19],[-28,13],[-20,0]],flash?'#fff':P.cobalt,P.ink,1.5);
  polygon(c,[[-24,-13],[-11,-18],[5,-8],[4,7],[-11,14]],'#548aa3');line(c,[[-19,-12],[-8,-9],[-9,10],[-20,10]],'#d3bd82',1.2);
  ellipse(c,8,0,12,10,flash?'#fff':'#c78d53',P.ink,1.4);polygon(c,[[9,-7],[20,-4],[26,0],[19,4],[9,7],[13,0]],P.ivory,P.ink,1);line(c,[[15,-4],[19,-3]],P.ink,1.6);
  polygon(c,[[4,-9],[-8,-21],[1,-18],[7,-10]],P.coral,P.ink,.7);
  const draw=wind?9:1;line(c,[[3,-11],[16,-20],[26,-15]],P.ink,5);line(c,[[3,9],[14+draw,10],[27,-1]],P.ink,5);line(c,[[3,-11],[16,-20],[26,-15]],P.cream,3);line(c,[[3,9],[14+draw,10],[27,-1]],P.cream,3);
  c.beginPath();c.moveTo(26,-29);c.quadraticCurveTo(45,0,26,29);c.strokeStyle=P.darkGold;c.lineWidth=3;c.stroke();line(c,[[26,-29],[17+draw,0],[26,29]],P.ivory,1);
  if(wind){line(c,[[15,0],[49,0]],P.ink,1.3);polygon(c,[[49,0],[41,-4],[41,4]],P.red);star(c,42,0,5,'#ffdd8d',t,4);}
  c.restore();
}
export function enemy(c,e,t){
  if(e.hp<=0&&!(e.down>0))return;c.save();if(e.hp<=0){c.globalAlpha=Math.min(1,e.down/.7);c.translate(e.x,e.y);c.scale(1.15,.55);c.translate(-e.x,-e.y);}else if(e.flash>0){c.translate(e.x,e.y);c.scale(1.13,.82);c.translate(-e.x,-e.y);}
  shadow(c,e.x,e.y,e.kind==='ram'?25:18,e.kind==='ram'?36:46,.22);
  if(e.kind==='ram')ram(c,e,t);else archer(c,e,t);
  if(e.hp>0&&e.hp<e.maxHp){for(let i=0;i<e.maxHp;i++)ellipse(c,e.x+(i-(e.maxHp-1)/2)*7,e.y+29,1.8,1.8,i<e.hp?'#a95b4b':'#c8b69b');}
  c.restore();
}
export function crystal(c,p,s,t){
  if(p.hp<=0){ellipse(c,p.x,p.y+5,34,12,'#6a82931e');for(let i=0;i<7;i++){const a=i*2.399,x=p.x+Math.cos(a)*(20+i*2),y=p.y+Math.sin(a)*13;polygon(c,[[x-4,y],[x,y-7],[x+5,y+1]],i%2?'#80b1b2':'#b2c4b8',P.ink,.5);}return;}
  shadow(c,p.x,p.y,25,67,.18);ellipse(c,p.x,p.y+13,45,16,null,'#6d7b9840',1.5);ellipse(c,p.x,p.y+13,35,12,null,'#6d7b9825',1);
  c.save();c.translate(p.x,p.y+Math.sin(t*2)*2);glow(c,0,-6,70,'#eefce45a');
  // Fine chains and a brass crown frame the actual, hittable crystal body.
  line(c,[[-25,-45],[-13,-76],[13,-76],[25,-45]],'#b98e4e',1.2);arc(c,0,-69,12,Math.PI,TAU,P.darkGold,2);star(c,0,-85,7,P.gold,Math.PI/4,4);
  const pts=[[0,-48],[27,-24],[31,10],[0,38],[-30,10],[-26,-24]];
  polygon(c,pts,p.flash>0?'#fff':'#81bbbd',P.ink,1.6);polygon(c,[[0,-48],[27,-24],[8,-15]],'#e4efe0');polygon(c,[[-26,-24],[0,-48],[8,-15],[-12,16],[-30,10]],'#93c8c1');polygon(c,[[27,-24],[31,10],[0,38],[8,-15]],'#6087a8');polygon(c,[[-30,10],[-12,16],[0,38]],'#bdc7c5');polygon(c,[[-12,16],[8,-15],[0,38]],'#b0d9c4');
  c.save();c.globalAlpha=.9;bird(c,-1,-5,t,.88,'#ffe183');c.restore();
  line(c,[[-21,-22],[-9,-35]],'#fffbe3',2);line(c,[[-26,-9],[-25,-17]],'#fffbe3',1.5);line(c,[[13,-19],[24,-24]],'#fffbe3',1);line(c,[[0,-47],[8,-15],[-12,16],[0,37]],'#e6f3e4',.8);
  if(p.hp<(p.maxHp||2)){line(c,[[0,-29],[5,-14],[-4,-5],[7,6],[0,24]],P.ivory,2.4);line(c,[[7,6],[20,2]],P.ivory,1.7);}
  star(c,-19,-29,6,'#fff9d9',t*.3,4);c.restore();
}
export function weight(c,s,t){
  const o=s.orb,p=s.player;if(!o||!p)return;
  const held=o.mode==='held',returning=o.mode==='returning',resting=o.mode==='resting',lift=held?18:resting?2:10,x=o.x,y=o.y-lift;
  if(!held){
    c.save();const sy=p.y-18,dist=Math.hypot(x-p.x,y-sy),sag=resting?Math.min(36,dist*.09):Math.min(11,dist*.02);
    c.beginPath();c.moveTo(p.x,sy);c.quadraticCurveTo((p.x+x)/2,(sy+y)/2+sag,x,y);c.strokeStyle='#55435470';c.lineWidth=4;c.stroke();
    c.strokeStyle=returning?'#fff8ce':'#c68c30';c.lineWidth=returning?2.7:2;c.stroke();
    if(returning){const f=(t*3)%1;star(c,x+(p.x-x)*f,y+(sy-y)*f,5,P.ivory,t,4);}
    c.restore();
  }
  const trail=o.trail||[];for(let i=1;i<trail.length;i++){const a=trail[i-1],b=trail[i];c.save();c.globalAlpha=Math.max(.05,(b.life/(b.maxLife||.2))*.6);line(c,[[a.x,a.y-10],[b.x,b.y-10]],returning?'#ffed9f':'#df9b36',4+i/trail.length*7);c.restore();}
  shadow(c,o.x,o.y,13,held?20:resting?7:25,.2);if(!held)glow(c,x,y,resting?37:45,returning?'#fff3b588':'#ffd47c4d');
  c.save();c.translate(x,y);c.rotate(o.spin||t*.7);const vertices=[];for(let i=0;i<8;i++){const a=i*TAU/8;vertices.push([Math.cos(a)*18,Math.sin(a)*18]);}
  polygon(c,vertices,P.darkGold,P.ink,2);polygon(c,vertices.map(([a,b])=>[a*.82,b*.82-2]),P.gold);star(c,0,-2,12,'#fff0a4',0,8);ellipse(c,0,-2,5,5,'#edbd54',P.darkGold,1);line(c,[[-10,-10],[-4,-14]],P.ivory,2);c.restore();
  if(resting){const pulse=1+Math.sin(t*3)*.07;for(let i=0;i<4;i++){const a=i*Math.PI/2;line(c,[[x+Math.cos(a)*24*pulse,y+Math.sin(a)*24*pulse],[x+Math.cos(a)*29*pulse,y+Math.sin(a)*29*pulse]],P.darkGold,1.5);}}
  if(returning)arc(c,x,y,25,t*9,t*9+Math.PI*1.4,'#fff7ce',3);
}
