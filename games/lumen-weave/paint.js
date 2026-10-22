import {TAU,random} from './geometry.js';
import {WIDTH,HEIGHT} from './simulation.js';
function glow(ctx,x,y,r,color,alpha=.3) { ctx.save(); ctx.globalAlpha=alpha; const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore(); }
function line(ctx,x,y,x2,y2,color,width=1) {ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
export function createPainter() {
  const stars=Array.from({length:160},()=>null),rand=random(4751);
  stars.forEach((_,index)=>stars[index]={x:rand()*WIDTH,y:rand()*HEIGHT,r:rand()*1.8+.3,a:rand()});
  return function paint(ctx,world,optics,view,time,mechanics) {
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    const sky=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);sky.addColorStop(0,'#05151d');sky.addColorStop(.5,'#0b152c');sky.addColorStop(1,'#24172f');ctx.fillStyle=sky;ctx.fillRect(0,0,WIDTH,HEIGHT);
    glow(ctx,500,350,550,'#196568',.22);glow(ctx,1140,640,510,'#693b70',.2);
    for(const star of stars) {ctx.globalAlpha=.25+star.a*.4+Math.sin(time*.7+star.x)*.15;ctx.fillStyle='#b8d1da';ctx.beginPath();ctx.arc(star.x,star.y,star.r,0,TAU);ctx.fill();}ctx.globalAlpha=1;
    // Fine etched circles make this feel like a physical optical instrument.
    ctx.strokeStyle='#739eae10';ctx.lineWidth=1;
    for(let radius=140;radius<1100;radius+=140) {ctx.beginPath();ctx.arc(world.source.x,world.source.y,radius,-1.2,1.2);ctx.stroke();}
    for(let i=0;i<8;i++) {
      const y=HEIGHT-20-i*15;ctx.beginPath();ctx.moveTo(-40,y);ctx.bezierCurveTo(400,y-100-i*4,850,y+60,1500,y-80);ctx.strokeStyle=`rgba(62,117,120,${.08+i*.008})`;ctx.stroke();
    }
    // Bottom foliage sways without participating in the authoritative simulation.
    for(let i=0;i<35;i++) {const x=i*47+Math.sin(i)*20,h=20+(Math.sin(i*7)+1)*26,sway=Math.sin(time*.5+i)*6;ctx.strokeStyle=i%3?'#244149':'#3b5554';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,900);ctx.quadraticCurveTo(x-8,900-h*.5,x+sway,900-h);ctx.stroke();ctx.fillStyle='#29474c';ctx.beginPath();ctx.ellipse(x+sway,900-h,3,11,-.6,0,TAU);ctx.fill();}
    for(const body of world.bodies.filter(body=>body.type==='stone')) drawStone(ctx,body,time);
    for(const beam of optics.segments) {
      const active=world.status!=='lost';ctx.save();ctx.globalAlpha=active?Math.min(1,beam.power):.2;ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha*=.08;line(ctx,beam.x,beam.y,beam.x2,beam.y2,beam.color,19);ctx.globalAlpha*=.5;line(ctx,beam.x,beam.y,beam.x2,beam.y2,beam.color,39);ctx.globalAlpha=active?.75*beam.power:.1;line(ctx,beam.x,beam.y,beam.x2,beam.y2,'#a5f9ed',2.6);ctx.globalAlpha=.95*beam.power;line(ctx,beam.x,beam.y,beam.x2,beam.y2,'#f2ffdd',.8);
      const length=Math.hypot(beam.x2-beam.x,beam.y2-beam.y);ctx.fillStyle='#e2fff1';
      for(let d=(time*170)%55;d<Math.min(length,1700);d+=55) {ctx.globalAlpha=(.35+Math.sin(d+time)*.2)*beam.power;ctx.beginPath();ctx.arc(beam.x+beam.dx*d,beam.y+beam.dy*d,2.3,0,TAU);ctx.fill();}
      ctx.restore();
    }
    const source=world.source;glow(ctx,source.x,source.y,95,'#82fff0',.35);
    ctx.save();ctx.translate(source.x,source.y);ctx.rotate(time*.15);ctx.strokeStyle='#84d7c4';ctx.lineWidth=1;ctx.strokeRect(-27,-27,54,54);ctx.rotate(Math.PI/4);ctx.strokeStyle='#a2ffce66';ctx.strokeRect(-33,-33,66,66);ctx.restore();
    ctx.fillStyle='#e2ffe5';ctx.beginPath();ctx.arc(source.x,source.y,10,0,TAU);ctx.fill();
    ctx.font='10px ui-monospace, monospace';ctx.letterSpacing='2px';ctx.fillStyle='#8ab8b7';ctx.textAlign='center';ctx.fillText('HEARTLIGHT',source.x,source.y+64);
    for(const body of world.bodies) {
      if(body.type==='mirror') drawMirror(ctx,body,view,time);
      if(body.type==='receiver') drawFlower(ctx,body,optics.deposits.get(body.id)||0,time);
    }
    for(const mechanic of mechanics) mechanic.draw?.(ctx,world,{time,view,optics,glow});
    for(const particle of view.particles) {ctx.save();ctx.globalAlpha=Math.max(0,particle.life/particle.max);ctx.fillStyle=particle.color;ctx.translate(particle.x,particle.y);ctx.rotate(particle.life*3);ctx.fillRect(-particle.size/2,-particle.size/2,particle.size,particle.size);ctx.restore();}
    for(const ripple of view.ripples) {ctx.globalAlpha=ripple.life;ctx.strokeStyle=ripple.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(ripple.x,ripple.y,(1-ripple.life)*160,0,TAU);ctx.stroke();}ctx.globalAlpha=1;
    ctx.fillStyle='#b9d1d855';ctx.textAlign='right';ctx.font='10px ui-monospace,monospace';ctx.fillText(`CONSTELLATION ${String(world.seed).padStart(5,'0')} · DRIFT ${String(world.round).padStart(2,'0')}`,WIDTH-32,HEIGHT-24);
  };
}
function drawMirror(ctx,body,view,time) {
  const active=view.selected===body.id,hover=view.hover===body.id;glow(ctx,body.x,body.y,90,active?'#a9ffe5':'#6098bb',active?.2:.08);
  ctx.save();ctx.translate(body.x,body.y);
  ctx.strokeStyle=active?'#9bd8cf77':'#7497af22';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,body.length/2+15,0,TAU);ctx.stroke();
  if(active||hover) {ctx.setLineDash([2,7]);ctx.strokeStyle='#d2eee366';ctx.beginPath();ctx.arc(0,0,body.length/2+23,0,TAU);ctx.stroke();ctx.setLineDash([]);}
  ctx.rotate(body.angle);
  const gradient=ctx.createLinearGradient(0,-8,0,8);gradient.addColorStop(0,'#e2fff9');gradient.addColorStop(.35,'#89cacb');gradient.addColorStop(.5,'#253d52');gradient.addColorStop(1,'#6385a3');ctx.fillStyle=gradient;
  ctx.beginPath();ctx.moveTo(-body.length/2,0);ctx.lineTo(-body.length/2+15,-8);ctx.lineTo(body.length/2-15,-8);ctx.lineTo(body.length/2,0);ctx.lineTo(body.length/2-15,8);ctx.lineTo(-body.length/2+15,8);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#d4fff0';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#d9fff1';ctx.beginPath();ctx.arc(0,0,5,0,TAU);ctx.fill();
  if(active||hover) for(const direction of [-1,1]) {ctx.beginPath();ctx.arc(direction*(body.length/2+23),0,8,0,TAU);ctx.fillStyle='#112c38';ctx.fill();ctx.strokeStyle='#b7f4da';ctx.stroke();}
  ctx.restore();
  if(active) {ctx.font='10px ui-monospace,monospace';ctx.textAlign='center';ctx.fillStyle='#d4efe4';ctx.fillText(`${Math.round(body.angle*180/Math.PI)%360}°  ·  DRAG ENDS TO ROTATE`,body.x,body.y+body.length/2+44);}
}
function drawFlower(ctx,body,power,time) {
  const bloom=body.bloomed,charge=body.charge||0,r=body.radius||34,color=body.color||'#aaffc7';
  glow(ctx,body.x,body.y,bloom?135:85,color,bloom?.24:.1+charge*.18);
  ctx.save();ctx.translate(body.x,body.y);ctx.rotate(time*(bloom?.08:.025));
  for(let i=0;i<8;i++) {ctx.rotate(TAU/8);ctx.beginPath();ctx.ellipse(0,-(bloom?28:17),bloom?13:7,bloom?27:17,0,0,TAU);ctx.fillStyle=bloom?color:'#29404c';ctx.globalAlpha=bloom?.65:.6;ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=bloom?color:'#84a9ac55';ctx.lineWidth=1;ctx.stroke();}
  ctx.restore();ctx.fillStyle=bloom?'#f2ffe0':'#142f3c';ctx.beginPath();ctx.arc(body.x,body.y,bloom?10:8+charge*5,0,TAU);ctx.fill();
  ctx.strokeStyle='#adbec122';ctx.lineWidth=3;ctx.beginPath();ctx.arc(body.x,body.y,r+16,0,TAU);ctx.stroke();
  if(charge>0&&!bloom) {ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(body.x,body.y,r+16,-Math.PI/2,-Math.PI/2+TAU*charge);ctx.stroke();}
  ctx.textAlign='center';ctx.font='11px ui-monospace,monospace';ctx.fillStyle=bloom?color:power?'#e8fff1':'#a6bcc7';ctx.fillText(bloom?'BLOOMED':power?`DRINKING LIGHT · ${Math.floor(charge*100)}%`:'SLEEPING SEED',body.x,body.y+r+39);
}
function drawStone(ctx,body,time) {
  glow(ctx,body.x,body.y,body.radius+50,'#bc5688',.13);ctx.save();ctx.translate(body.x,body.y);ctx.rotate(.3);ctx.beginPath();for(let i=0;i<7;i++){const a=i*TAU/7,r=body.radius*(.8+Math.sin(i*14)*.15);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fillStyle='#17182b';ctx.fill();ctx.strokeStyle='#9c5b8166';ctx.lineWidth=2;ctx.stroke();ctx.restore();
}
