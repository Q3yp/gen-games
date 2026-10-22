import {lineHit,circleHit,reflect,TAU} from '../geometry.js';

/** An opt-in law: branching light must form one stable, simultaneous circuit. */
export function toggleFork(world,body) {
  if(!world.prism?.enabled||body?.type!=='mirror')return false;
  body.fork=!body.fork;
  return true;
}
const prism={
  id:'prismatic-chord',
  install(world){world.prism||={enabled:false,chord:0,lit:0,complete:false};},
  trace(ray,world){
    if(!world.prism?.enabled)return;
    return world.bodies.filter(body=>body.type==='mirror'||body.type==='receiver').map(body=>body.type==='mirror'?lineHit(ray,body):circleHit(ray,body,body.radius||34)).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0];
  },
  scatter(ray,hit){
    if(hit.body.type==='receiver')return {deposits:[{id:hit.body.id,power:ray.power}],rays:[{...ray,x:hit.x,y:hit.y}]};
    const reflected=reflect(ray,hit);
    if(!hit.body.fork)return {rays:[reflected]};
    return {rays:[{...reflected,power:ray.power*.49,color:'#ffb5e9'},
      {x:hit.x,y:hit.y,dx:ray.dx,dy:ray.dy,power:ray.power*.49,color:'#8beaff'}]};
  },
  preview(world,optics){
    if(world.prism?.enabled)world.prism.lit=world.bodies.filter(body=>body.type==='receiver'&&(optics.deposits.get(body.id)||0)>=.09).length;
  },
  step(world,dt,optics){
    if(!world.prism?.enabled)return;
    const flowers=world.bodies.filter(body=>body.type==='receiver');
    world.prism.lit=flowers.filter(body=>(optics.deposits.get(body.id)||0)>=.09).length;
    const together=flowers.length>0&&world.prism.lit===flowers.length;
    // Breaking the circuit visibly releases its chord; there is no hidden grace timer.
    world.prism.chord=together?Math.min(2,world.prism.chord+dt):0;
    if(world.prism.chord>=2)world.prism.complete=true;
  },
  command(name,args,world){
    if(name!=='prism.toggle')return;
    const body=world.bodies.find(body=>body.id===args?.id);
    return toggleFork(world,body)?{id:body.id,fork:body.fork}:{error:'PRISM_NOT_AVAILABLE'};
  },
  draw(ctx,world,{time,optics,glow}){
    if(!world.prism?.enabled)return;
    ctx.save();
    for(const body of world.bodies.filter(body=>body.type==='mirror'&&body.fork)){
      glow(ctx,body.x,body.y,85,'#eab2ff',.23);
      ctx.save();ctx.translate(body.x,body.y);ctx.rotate(body.angle);
      const g=ctx.createLinearGradient(-body.length/2,0,body.length/2,0);g.addColorStop(0,'#91edff');g.addColorStop(.5,'#f4d8ff');g.addColorStop(1,'#ff9bda');
      ctx.strokeStyle=g;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-body.length/2,0);ctx.lineTo(body.length/2,0);ctx.stroke();
      ctx.rotate(-body.angle);ctx.fillStyle='#e9ceff';ctx.textAlign='center';ctx.font='bold 10px ui-monospace,monospace';ctx.fillText('FORK  ½ + ½',0,-body.length/2-25);ctx.restore();
    }
    const flowers=world.bodies.filter(body=>body.type==='receiver'),lit=flowers.filter(body=>(optics.deposits.get(body.id)||0)>=.09);
    for(const body of flowers){const power=optics.deposits.get(body.id)||0;ctx.fillStyle=power>=.09?body.color:power>0?'#ffb796':'#8da2bd';ctx.textAlign='center';ctx.font='10px ui-monospace,monospace';ctx.fillText(power>=.09?'IN CHORD':power>0?'TOO FAINT · FOCUS A BRANCH':'NEEDS LIGHT',body.x,body.y-(body.radius||34)-38);}
    for(const body of lit){ctx.strokeStyle=body.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(body.x,body.y,(body.radius||34)+23,0,TAU);ctx.stroke();}
    if(lit.length>1||world.prism.complete){
      const points=world.prism.complete?flowers:lit;
      ctx.strokeStyle=world.prism.complete?'#e5c7ff':'#c8afff55';ctx.lineWidth=world.prism.complete?2:1;ctx.setLineDash(world.prism.complete?[]:[4,8]);ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(points.length>2)ctx.closePath();ctx.stroke();ctx.setLineDash([]);
    }
    if(world.prism.chord>0&&!world.prism.complete){
      for(const body of flowers){ctx.strokeStyle='#fff4ca';ctx.lineWidth=4;ctx.beginPath();ctx.arc(body.x,body.y,(body.radius||34)+30,-Math.PI/2,-Math.PI/2+TAU*world.prism.chord/2);ctx.stroke();}
    }
    if(world.prism.complete){
      ctx.globalCompositeOperation='lighter';
      for(let band=0;band<9;band++){
        ctx.beginPath();for(let x=0;x<=1440;x+=18){const y=200+band*17+Math.sin(x*.004+time*.3+band*.18)*100+Math.sin(x*.008-time*.2)*30;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
        ctx.strokeStyle=`hsla(${145+band*15},85%,72%,${.025+Math.sin(time*.4+band)*.008})`;ctx.lineWidth=35;ctx.stroke();
      }
      for(const flower of flowers){glow(ctx,flower.x,flower.y,160,flower.color,.18);for(let i=0;i<8;i++){const a=time*.25+i*TAU/8,r=65+Math.sin(time+i)*7;ctx.fillStyle=flower.color;ctx.beginPath();ctx.arc(flower.x+Math.cos(a)*r,flower.y+Math.sin(a)*r,2,0,TAU);ctx.fill();}}
    }
    ctx.restore();
  }
};
export default prism;
