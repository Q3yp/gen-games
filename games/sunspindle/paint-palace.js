import { P, TAU, hash, polygon, line, ellipse, arc, star, glow } from './paint-primitives.js';

function palm(c, x, y, size, flip = 1) {
  c.save(); c.translate(x,y); c.scale(size*flip,size); line(c,[[8,80],[3,46],[0,0]],'#8b775e',8); line(c,[[5,80],[0,44],[-2,0]],'#bba17a',3);
  for(let j=0;j<9;j++) { const a = -Math.PI + j*.39, len = 60+hash(j)*35, dx=Math.cos(a)*len,dy=Math.sin(a)*len*.7;
    c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(dx*.55,dy-23,dx,dy+13);c.quadraticCurveTo(dx*.48,dy-3,0,0);c.fillStyle=j%2?'#54796d':'#6c927a';c.fill();
    line(c,[[0,0],[dx*.55,dy-10],[dx,dy+13]],'#344d59',.8);
    for(let k=2;k<9;k++){const f=k/10;line(c,[[dx*f,dy*f-10],[dx*f+10*Math.sin(a),dy*f+12]],'#a3b08b',.6);}
  } c.restore();
}
function arch(c, x, y, w, h, fill) {
  c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x-w/2,y-h+w/2);c.bezierCurveTo(x-w/2,y-h,x+w/2,y-h,x+w/2,y-h+w/2);c.lineTo(x+w/2,y);c.closePath();c.fillStyle=fill;c.fill();
}
function vase(c,x,y,r){
  ellipse(c,x+12,y+8,r*1.3,r*.45,'#81748a44');polygon(c,[[x-r,y-r*1.5],[x+r,y-r*1.5],[x+r*.75,y],[x-r*.75,y]],P.clay,P.ink,.8);
  ellipse(c,x,y-r*1.5,r,r*.3,P.coral,P.ink,.8);line(c,[[x-r*.85,y-r],[x+r*.85,y-r]],P.ivory,2);
  for(let i=0;i<6;i++){const a=i*1.13;line(c,[[x,y-r*1.5],[x+Math.cos(a)*r,y-r*(2.3+hash(i))]],'#5d7669',2);ellipse(c,x+Math.cos(a)*r,y-r*(2.3+hash(i)),4,7,'#789077');}
}
function border(c){
  c.fillStyle='#ba795e';c.fillRect(74,150,1052,578);c.fillStyle='#edd6a5';c.fillRect(83,151,1034,565);
  c.strokeStyle=P.ink;c.lineWidth=1;c.strokeRect(83.5,151.5,1033,564);
  c.fillStyle=P.cobalt;c.fillRect(90,158,1020,10);c.fillRect(90,700,1020,10);c.fillRect(90,158,10,552);c.fillRect(1100,158,10,552);
  for(let x=106;x<1100;x+=27){polygon(c,[[x,161],[x+5,165],[x,169],[x-5,165]],P.ivory);polygon(c,[[x,698],[x+5,704],[x,709],[x-5,704]],P.ivory);}
  for(let y=180;y<700;y+=27){polygon(c,[[91,y],[95,y+5],[99,y],[95,y-5]],P.ivory);polygon(c,[[1101,y],[1105,y+5],[1109,y],[1105,y-5]],P.ivory);}
}
function medallion(c,x,y,r){
  c.save();c.translate(x,y);c.scale(1,.73);ellipse(c,0,0,r,r,null,'#b2785a35',2);ellipse(c,0,0,r*.89,r*.89,null,'#b2785a35',1);
  for(let i=0;i<24;i++){const a=i*TAU/24;polygon(c,[[Math.cos(a)*r*.6,Math.sin(a)*r*.6],[Math.cos(a+.07)*r*.83,Math.sin(a+.07)*r*.83],[Math.cos(a-.07)*r*.83,Math.sin(a-.07)*r*.83]],'#be795d27');}
  star(c,0,0,r*.58,'#be795d25',0,12);ellipse(c,0,0,r*.27,r*.27,null,'#b2785a35',2);c.restore();
}
function floor(c){
  border(c);const g=c.createLinearGradient(90,170,1080,710);g.addColorStop(0,'#fff0c9');g.addColorStop(.6,'#eddbb3');g.addColorStop(1,'#dbc79f');c.fillStyle=g;c.fillRect(101,170,998,529);
  c.save();c.beginPath();c.rect(101,170,998,529);c.clip();
  for(let y=170;y<710;y+=59){for(let x=70;x<1110;x+=79){const n=Math.round(x+y);c.fillStyle=`rgba(139,106,91,${hash(n)*.035})`;c.fillRect(x,y,79,59);line(c,[[x,y],[x+79,y]],'#b89d791f',1);line(c,[[x,y],[x,y+59]],'#b89d791f',1);}}
  for(let q=0;q<4;q++){const x=[134,980,134,980][q],y=[204,204,604,604][q];c.save();c.globalAlpha=.56;c.fillStyle=P.blue;c.fillRect(x,y,84,62);for(let i=0;i<3;i++)for(let j=0;j<3;j++){const a=x+14+i*28,b=y+10+j*21;star(c,a,b,8,'#dfdab5',Math.PI/4,4);}c.restore();}
  medallion(c,604,434,180);
  for(let i=0;i<240;i++){const x=100+hash(i+2)*1000,y=175+hash(i+493)*520;line(c,[[x,y],[x+2+hash(i+76)*5,y+hash(i+99)*2]],'#ac856320',.7);}
  for(const [x,y,a] of [[180,352,.6],[744,657,1.4],[1063,433,2.4],[416,193,.3]]){line(c,[[x,y],[x+20*a,y+6],[x+27*a,y+17],[x+44*a,y+20]],'#b29c7955',1);line(c,[[x+20*a,y+6],[x+18*a,y-9]],'#b29c7944',.7);}
  c.restore();
}
function walls(c){
  polygon(c,[[77,124],[1118,124],[1118,159],[77,159]],P.clay,P.ink,1);c.fillStyle='#dba27a';c.fillRect(77,122,1041,16);c.fillStyle=P.ivory;c.fillRect(77,119,1041,5);
  for(let x=101;x<1115;x+=68){arch(c,x+20,150,32,25,'#a9614f');arc(c,x+20,139,10,Math.PI,TAU,'#eab78d',1.2);line(c,[[x+3,157],[x+37,157]],'#efc798',2);}
  for(const x of [73,320,570,820,1115]){
    polygon(c,[[x-14,155],[x+15,155],[x+117,289],[x+84,289]],'#6d688332');
    polygon(c,[[x-12,153],[x-12,70],[x+12,70],[x+12,153]],'#ead4a7',P.ink,.8);polygon(c,[[x+12,70],[x+21,80],[x+21,159],[x+12,153]],'#bd856b',P.ink,.7);
    c.fillStyle='#fff1c8';c.fillRect(x-17,65,34,13);c.fillRect(x-17,144,34,12);line(c,[[x-5,83],[x-5,136]],'#b39e7d',1);line(c,[[x+2,83],[x+2,136]],'#d3bd94',1);
    ellipse(c,x,61,19,6,P.coral,P.ink,.7);c.fillStyle=P.clay;c.fillRect(x-9,48,18,13);ellipse(c,x,48,12,3,P.ivory,P.ink,.7);
  }
  polygon(c,[[76,158],[89,171],[89,712],[76,725]],'#a76354');polygon(c,[[1111,159],[1126,148],[1126,724],[1111,712]],'#d4ad82');
  c.fillStyle='#f7e9bc';c.fillRect(72,715,1058,8);c.fillStyle='#b87b60';c.fillRect(79,724,1042,8);
  for(let x=106;x<1100;x+=61)line(c,[[x,724],[x,731]],'#875f55',1);
}
export function palace(c,s,t){
  const g=c.createLinearGradient(0,0,0,800);g.addColorStop(0,'#eed3a3');g.addColorStop(1,'#d3aa7e');c.fillStyle=g;c.fillRect(0,0,1200,800);
  polygon(c,[[0,81],[196,81],[236,131],[1200,131],[1200,800],[0,800]],'#dcb68b');
  for(let i=0;i<120;i++){const x=hash(i+9)*1200,y=hash(i+430)*800;ellipse(c,x,y,hash(i)*3+1,.5,'#f9e7bd45');}
  floor(c);walls(c);
  c.save();c.globalAlpha=.25;polygon(c,[[45,0],[80,0],[622,800],[546,800]],'#fff9da');polygon(c,[[115,0],[126,0],[901,800],[862,800]],'#fff9da');c.restore();
  c.save();c.translate(192,83);for(let i=0;i<16;i++){const a=i*TAU/16;line(c,[[Math.cos(a)*34,Math.sin(a)*34],[Math.cos(a)*43,Math.sin(a)*43]],P.darkGold,1.3);}ellipse(c,0,0,28,28,P.gold,P.darkGold,1);ellipse(c,-3,-3,22,22,'#f4ce6a');arc(c,0,0,15,0,TAU,P.darkGold,.7);star(c,0,0,13,P.ivory,0,8);c.restore();
  vase(c,44,630,19);vase(c,1154,402,16);vase(c,41,287,13);palm(c,38,179,.94);palm(c,1166,88,1.1,-1);
}
export function exitArch(c,s,t){
  const x=s.exit?.x||1030,y=s.exit?.y||245,ready=s.exitReady||s.rescue;
  polygon(c,[[x-51,y],[x+47,y],[x+95,y+76],[x+3,y+76]],'#67678030');
  arch(c,x,y+6,100,122,'#bb7b60');arch(c,x-4,y,86,116,'#f4dfb2');arch(c,x-4,y,66,103,ready?'#ffe5a4':'#586777');
  if(ready){glow(c,x,y-36,65,'#fff3bb99');for(let i=0;i<5;i++){const f=(t*.3+i*.23)%1;star(c,x-24+hash(i)*45,y-20-f*70,2+f*2,`rgba(255,249,211,${1-f})`,t+i,4);}polygon(c,[[x-25,y+4],[x+25,y+4],[x+51,y+79],[x-50,y+79]],'#fff0b23a');}
  else { for(let i=-2;i<=2;i++)line(c,[[x+i*12,y-70],[x+i*12,y]],'#a9a08a',2);line(c,[[x-30,y-31],[x+30,y-31]],'#bea57f',3);star(c,x,y-31,12,P.gold,Math.PI/8,8); }
  for(const dx of [-44,36]){c.fillStyle='#fff0c8';c.fillRect(x+dx-5,y-77,10,82);line(c,[[x+dx,y-68],[x+dx,y-5]],'#b8a17c',1);c.fillStyle=P.coral;c.fillRect(x+dx-9,y-5,18,8);}
  line(c,[[x-48,y+8],[x+46,y+8]],P.ivory,4);line(c,[[x-53,y+13],[x+52,y+13]],'#bd9270',3);
  star(c,x-4,y-107,9,P.gold,Math.PI/8,8);
}
export function foreground(c,t){
  palm(c,18,749,1.15);palm(c,1190,757,1.3,-1);vase(c,1148,754,22);
  for(let i=0;i<9;i++){const x=220+i*81,y=755+hash(i)*20;polygon(c,[[x,y],[x+12,y-4],[x+17,y+4],[x+2,y+8]],i%2?'#d2a77d':'#ead0a1','#b98f72',.6);}
}
