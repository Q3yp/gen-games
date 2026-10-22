import mechanics from './mechanics/index.js';
import {toggleFork} from './mechanics/prism.js';
import {newWorld,trace,step,WIDTH,HEIGHT} from './simulation.js';
import {createPainter} from './paint.js';
import {bindInput} from './input.js';
import {TAU} from './geometry.js';
/** The host supplies a surface and persistence, not the game's mechanics. */
export default function create(host,{save}) {
  let world=save?.bodies?structuredClone(save):newWorld(save?.seed||8421,save?.round||1,save?.best||0);
  let time=0,hudClock=0,lastStatus=world.status,disposed=false,audio=null,muted=true,undo=[],paused=Boolean(world.tinkering),showHelp=false;
  const view={selected:'shard-a',hover:null,mode:'move',particles:[],ripples:[]};
  for(const mechanic of mechanics) mechanic.install?.(world);
  const css=host.asset('./ui.css');
  host.root.innerHTML=`<link rel="stylesheet" href="${css}"><section class="lumen-weave" aria-label="Lumen Weave optical garden"><canvas tabindex="0" aria-label="Optical garden. Drag mirrors. Drag their end handles or use Q and E to rotate. Select mirrors with 1, 2, 3; move with arrow keys."></canvas><header class="lw-hud"><p class="lw-eyebrow">LUMEN WEAVE <span>01</span></p><h1>Make the dark bloom.</h1><p class="lw-objective">Bend light into all three sleeping seeds.</p><div class="lw-progress"></div></header><div class="lw-energy"><span>HEARTLIGHT</span><div><i></i></div><strong></strong></div><div class="lw-tools"><button data-action="mode" title="Switch drag action">↔ Move</button><button data-action="left" aria-label="Rotate selected mirror left">↶</button><button data-action="right" aria-label="Rotate selected mirror right">↷</button><button data-action="fork" hidden>Fork · F</button><button data-action="prism">Try prism challenge</button><button data-action="undo" title="Undo last manipulation">Undo</button><button data-action="pause">Pause / tinker</button><button data-action="reset">Retry</button><button data-action="sound" aria-label="Toggle sound">Sound off</button><button data-action="help" aria-label="Show game controls">?</button></div><div class="lw-hint"><b>Drag a shard. Turn its end handles.</b><span>Mouse wheel or Q / E rotates · 1 / 2 / 3 selects · arrows move</span></div><div class="lw-result"></div><div class="lw-toast" role="status" aria-live="polite"></div></section>`;
  const root=host.root.querySelector('.lumen-weave'),canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),paint=createPainter();
  let optics=trace(world,mechanics),toastTime=0;
  function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(canvas.width/WIDTH,0,0,canvas.height/HEIGHT,0,0);}
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  function toast(text){root.querySelector('.lw-toast').textContent=text;toastTime=3;}
  function checkpoint(reason){void (host.checkpoint?.(reason)||host.requestSave?.());}
  function note(type,text,data={}){host.emit?.(type,text,data);}
  function tone(frequency=440,duration=.15){if(muted)return;try{audio||=new AudioContext();void audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequency,audio.currentTime);gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.06,audio.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}catch{/* Sound is optional. */}}
  function burst(body){for(let i=0;i<90;i++){const angle=Math.random()*TAU,speed=40+Math.random()*180;view.particles.push({x:body.x,y:body.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:1+Math.random()*1.5,max:2.5,size:2+Math.random()*4,color:body.color});}view.ripples.push({x:body.x,y:body.y,life:1,color:body.color});tone(330+world.combo*110,.65);toast(`${world.combo} / ${world.bodies.filter(item=>item.type==='receiver').length} seeds blooming · +7 heartlight`);note('garden.bloom','A seed bloomed.',{id:body.id,elapsed:world.elapsed,moves:world.moves,score:world.score});checkpoint('bloom');}
  function changed(phase,body){
    if(phase==='begin'){undo.push(structuredClone(world));if(undo.length>30)undo.shift();if(world.status==='ready')world.status='playing';}
    if(phase==='end'){world.moves++;tone(180+Math.abs(body?.angle||0)*60,.05);note('garden.manipulate','A shard was moved or rotated.',{id:body?.id,x:body?.x,y:body?.y,angle:body?.angle,fork:Boolean(body?.fork),moves:world.moves});}
    optics=trace(world,mechanics);drawHUD();
  }
  const unbind=bindInput(canvas,()=>world,view,changed,mechanics,()=>host.active !== false);
  function reset(next=false){const best=world.best,prism=world.prism?.enabled;world=newWorld(world.seed,next?world.round+1:world.round,best);for(const mechanic of mechanics)mechanic.install?.(world);if(world.prism)world.prism.enabled=Boolean(prism);view.particles=[];view.ripples=[];undo=[];paused=false;showHelp=false;lastStatus='ready';view.selected='shard-a';optics=trace(world,mechanics);drawHUD();note('garden.run',next?'A new drift began.':'The constellation was retried.',{round:world.round,seed:world.seed});checkpoint('new-run');}
  function drawHUD(){
    const count=world.bodies.filter(body=>body.type==='receiver'&&body.bloomed).length,total=world.bodies.filter(body=>body.type==='receiver').length;
    const prism=world.prism?.enabled;
    root.querySelector('.lw-objective').textContent=prism?`Hold light on all ${total} flowers together for 2 seconds.`:`Bend light into all ${total} sleeping seeds.`;
    root.querySelector('[data-action="prism"]').hidden=Boolean(prism);
    const forkButton=root.querySelector('[data-action="fork"]');forkButton.hidden=!prism;forkButton.textContent=world.bodies.find(body=>body.id===view.selected)?.fork?'Focus · F':'Fork · F';
    root.querySelector('.lw-hint b').textContent=prism?'Fork a shard: half straight, half reflected.':'Drag a shard. Turn its end handles.';
    root.querySelector('.lw-hint span').textContent=prism?'F toggles fork / focus · Flowers pass light onward · Pause to plan your circuit':'Mouse wheel or Q / E rotates · 1 / 2 / 3 selects · arrows move';
    root.querySelector('.lw-eyebrow span').textContent=`DRIFT ${String(world.round).padStart(2,'0')}`;
    root.querySelector('.lw-progress').innerHTML=Array.from({length:total},(_,i)=>`<i class="${i<(prism?world.prism.lit:count)?'lit':''}">✧</i>`).join('')+`<span>${prism?`${world.prism.lit} / ${total} lit · ${(world.prism.chord||0).toFixed(1)} / 2s chord`:`${count} / ${total} bloomed`}</span>`;
    root.querySelector('.lw-energy i').style.width=`${world.energy}%`;root.querySelector('.lw-energy strong').textContent=paused?'TINKERING':world.status==='ready'?'READY':`${Math.ceil(world.energy)}s`;
    root.querySelector('.lw-energy').classList.toggle('low',world.energy<20);
    root.querySelector('[data-action="pause"]').textContent=paused?'Resume light':'Pause / tinker';
    root.querySelector('[data-action="mode"]').textContent=view.mode==='move'?'↔ Move':'↻ Rotate';
    root.querySelector('[data-action="undo"]').disabled=!undo.length;
    root.querySelector('.lw-hint').hidden=world.status==='lost'||(world.moves>=2&&!showHelp);
    root.classList.toggle('lw-won',world.status==='won');
    const result=root.querySelector('.lw-result');
    if(world.status==='won')result.innerHTML=`<section><p class="lw-eyebrow">CONSTELLATION ALIVE</p><h2>${prism?'A star chord. Yours.':'The dark remembers.'}</h2><p>${world.moves} adjustments · ${prism?'stable circuit':`${Math.round(world.elapsed)} active seconds`}<br>Keep playing with the light, or drift onward.</p><p class="lw-score">${world.score.toLocaleString()} light gathered</p><div><button data-action="next">Next drift <span>↗</span></button><button data-action="reset">Try a cleaner route</button>${!prism?'<button data-action="prism">Try prism challenge</button>':''}</div></section>`;
    else if(world.status==='lost')result.innerHTML=`<section><p class="lw-eyebrow">THE LIGHT RESTS</p><h2>Another way through.</h2><p>${count} seeds bloomed. The mirrors remember what you learned.</p><div><button data-action="reset">Try again ↻</button><button data-action="practice">Tinker without a timer</button></div></section>`;
    else result.replaceChildren();
  }
  function click(event){const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;
    if(action==='reset')reset();if(action==='next')reset(true);
    if(action==='prism'){reset(true);world.prism.enabled=true;drawHUD();toast('A new law: fork the light. All flowers must shine together.');note('garden.prism.start','The player opted into a new simultaneous-light challenge.',{round:world.round});checkpoint('prism-challenge');}
    if(action==='fork'&&world.status!=='lost'){const body=world.bodies.find(body=>body.id===view.selected);if(body){changed('begin',body);toggleFork(world,body);changed('end',body);}}
    if(action==='practice'){world.status='playing';world.energy=85;paused=true;drawHUD();toast('Timer paused. Move the shards, then resume to grow seeds.');}
    if(action==='pause'){paused=!paused;drawHUD();toast(paused?'Time is held. Plan your route in the light.':'The garden is listening again.');}
    if(action==='mode'){view.mode=view.mode==='move'?'rotate':'move';drawHUD();}
    if(action==='help'){showHelp=!showHelp;drawHUD();}
    if(action==='sound'){muted=!muted;event.target.textContent=muted?'Sound off':'Sound on';tone(440,.3);}
    if(action==='undo'&&undo.length){world=undo.pop();for(const mechanic of mechanics)mechanic.install?.(world);optics=trace(world,mechanics);drawHUD();note('garden.undo','The player undid a manipulation.');}
    if(action==='left'||action==='right'){const body=world.bodies.find(body=>body.id===view.selected);if(body&&world.status!=='lost'){changed('begin',body);body.angle+=(action==='left'?-1:1)*.065;changed('end',body);}}
  }
  root.addEventListener('click',click);drawHUD();
  return {
    step(dt){if(disposed)return;time+=dt;hudClock+=dt;optics=trace(world,mechanics);if(!paused)step(world,dt,optics,mechanics,burst);
      for(const particle of view.particles){particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vx*=1-dt*.5;particle.vy+=14*dt;particle.life-=dt;}view.particles=view.particles.filter(p=>p.life>0);
      for(const ripple of view.ripples)ripple.life-=dt*.65;view.ripples=view.ripples.filter(r=>r.life>0);
      if(toastTime>0){toastTime-=dt;if(toastTime<=0)root.querySelector('.lw-toast').textContent='';}
      if(world.status!==lastStatus){lastStatus=world.status;drawHUD();if(['won','lost'].includes(world.status)){note(`garden.${world.status}`,world.status==='won'?'All seeds bloomed.':'The heartlight ran out.',{score:world.score,moves:world.moves,elapsed:world.elapsed,round:world.round,prism:world.prism});checkpoint('run-finished');}}
      if(hudClock>.2){hudClock=0;drawHUD();}
    },
    render(){paint(ctx,world,optics,view,time,mechanics);},
    serialize(){return {...structuredClone(world),tinkering:paused};},
    inspect(){return {goal:world.prism?.enabled?'Keep every flower illuminated together for 2 seconds. Fork shards split light straight and reflected.':'Route light into all seeds before energy reaches zero.',status:world.status,paused,prism:world.prism,round:world.round,seed:world.seed,energy:world.energy,score:world.score,moves:world.moves,selected:view.selected,source:world.source,bodies:world.bodies,lit:[...optics.deposits],mechanics:mechanics.map(m=>m.id),controls:'Drag shard centers; drag end handles or wheel/Q/E to rotate. 1/2/3 selects, arrows move. Pause/tinker holds timer. In prism challenge, F forks selected shard into straight and reflected branches; flowers transmit light.'};},
    command(name,args){for(const mechanic of mechanics){const result=mechanic.command?.(name,args,world);if(result!==undefined)return result;}return {error:'UNKNOWN_COMMAND',message:'Author a mechanic module to add commands.'};},
    dispose(){disposed=true;observer.disconnect();unbind();root.removeEventListener('click',click);void audio?.close();host.root.replaceChildren();}
  };
}
