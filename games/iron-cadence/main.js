import {initial,makeCombat} from './combat.js';
import {migrateCharacter,stats,applyEffects} from './character.js';
import {capabilities,command,actions} from './commands.js';
import {paint} from './paint.js';
import {createQTE} from '/code-qte.js';
export default function create(host,{save}){
 const s=initial(save);migrateCharacter(s);let time=0,disposed=false,skillLock=0;
 const fx={kind:'',life:0},held=new Set(),cleanups=[];
 const root=document.createElement('section');root.className='ic';const css=document.createElement('link');css.rel='stylesheet';css.href=host.asset('./style.css');root.append(css);
 const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=650;canvas.tabIndex=0;canvas.setAttribute('aria-label','Iron Cadence combat arena. J strike, hold K guard, Space dodge, Q and E skills, R potion, P pause, Enter resume.');root.append(canvas);const ctx=canvas.getContext('2d');
 const cueStrip=document.createElement('div');cueStrip.className='ic-cue';const cueText=document.createElement('span');cueText.setAttribute('role','status');cueText.setAttribute('aria-live','polite');const cueTime=document.createElement('output');cueTime.setAttribute('aria-live','off');cueStrip.append(cueText,cueTime);root.append(cueStrip);let lastCue='',lastTimer='';
 const controls=document.createElement('div');controls.className='ic-controls';root.append(controls);
 const settings=document.createElement('div');settings.className='ic-settings';root.append(settings);
 const note=document.createElement('div');note.className='ic-note';note.setAttribute('aria-live','polite');root.append(note);
 const kit=document.createElement('div');kit.className='ic-kit';root.append(kit);
 const help=document.createElement('div');help.className='ic-help';help.innerHTML='<b>Read the blade:</b> Crosscut = guard or dodge. Thrust = dodge. Sweep = guard. Press guard just before impact to parry (+8 damage and a longer opening). Strike during OPENING for full power, otherwise only 3 damage. Breath recovers while not guarding.<br><b>Q / E</b> first two skills · <b>R</b> first red vial · <b>P</b> pause · <b>Enter</b> start/resume. Skills and consumables take one action beat; offensive skills require an opening. Rest and equipment changes are safe between fights. Reload pauses, preserving progress; an interrupted QTE repeats only its current cue preparation.';root.append(help);host.root.append(root);
 const emit=(type,text,data)=>{host.emit(type,text,data);host.requestSave();};
 const combat=makeCombat(s,emit,(kind)=>{fx.kind=kind;fx.life=1;});
 const qte=createQTE({actions,onResult(result){
  if(result.outcome==='cancelled')return;
  const hits=result.cues.filter(c=>c.outcome==='hit').length,total=result.cues.length,sequence=s.sequence;
  const damage=Math.round((sequence?.damage||0)*hits/total),hurt=Math.round((sequence?.risk||0)*(total-hits)/total);
  s.enemy.hp=Math.max(0,s.enemy.hp-damage);s.hp=Math.max(0,s.hp-hurt);s.versions.sequence++;combat.phase('recovery',2*s.timing);
  combat.record('sequence',`${result.outcome.toUpperCase()} · ${hits}/${total} cues · ${damage} damage dealt${hurt?`, ${hurt} received`:''}`,{...result,damage,hurt});combat.settle();updateKit();
 }});
 if(s.qteSave)qte.restore(s.qteSave);
 function listen(target,type,fn){target.addEventListener(type,fn);cleanups.push(()=>target.removeEventListener(type,fn));}
 function say(text){note.textContent=text;}
 function clear(){for(const action of held)qte.input(action,false);held.clear();combat.clear();}
 function pause(reason='player'){clear();s.paused=true;qte.pause(reason);host.requestSave();}
 function resume(){if(!host.active||['victory','defeat'].includes(s.phase))return;s.paused=false;qte.resume();say('');host.requestSave();canvas.focus();}
 function safe(){return ['ready','victory','defeat'].includes(s.phase);}
 function retry(){if(!host.active||s.phase!=='defeat')return;s.attempts++;s.hp=stats(s).maxHp;s.character.mp=stats(s).maxMp;s.character.empower=0;s.stamina=100;s.enemy.hp=s.enemy.maxHp;s.index=0;s.paused=true;s.sequence=null;s.pendingSequence=null;s.qteSave=null;s.versions.encounter++;combat.phase('ready',1.5);clear();combat.record('retry','Back on your feet. Learned rewards and character remain.',{attempt:s.attempts});updateKit();}
 function rest(){if(!host.active||!safe())return say('Rest is available between fights.');s.hp=stats(s).maxHp;s.character.mp=stats(s).maxMp;s.stamina=100;s.versions.character++;say('Restored HP, MP and breath.');host.requestSave();updateKit();}
 function use(type,id){
  if(!host.active||s.paused||['qte','defeat','victory'].includes(s.phase)||skillLock>0)return;
  const p=s.character,d=type==='skill'?s.content.skills[id]:s.content.items[id];if(!d)return;
  if(type==='skill'&&p.mp<d.mp)return say('Not enough MP. Rest between encounters.');
  if(type==='item'&&!(p.inventory[id]>0))return say('No charges remain.');
  if(d.effects?.damage&&s.phase!=='recovery')return say('That offensive skill needs an opening.');
  if(type==='skill')p.mp-=d.mp;else p.inventory[id]--;applyEffects(s,d.effects,combat);skillLock=.65;s.versions.character++;combat.record('ability',`${d.name} used.`,{id,type,mp:p.mp,hp:s.hp,enemyHp:s.enemy.hp});combat.settle();updateKit();
 }
 function equip(id){if(!host.active||!safe())return say('Change equipment between fights.');s.character.equipment=id;s.hp=Math.min(s.hp,stats(s).maxHp);s.character.mp=Math.min(s.character.mp,stats(s).maxMp);s.versions.character++;host.requestSave();updateKit();}
 function input(action,down){
  if(!down){held.delete(action);combat.release(action);qte.input(action,false);return;}
  if(!host.active||s.paused||held.has(action))return;held.add(action);
  if(s.phase==='qte')qte.input(action,true);else combat.press(action);
 }
 function btn(label,fn,parent=controls){const b=document.createElement('button');b.textContent=label;listen(b,'click',()=>{if(host.active)fn();});parent.append(b);return b;}
 for(const [action,label]of [['strike','J · Strike'],['guard','K · Hold guard'],['dodge','Space · Dodge']]){
  const b=document.createElement('button');b.textContent=label;b.dataset.action=action;controls.append(b);
  listen(b,'pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);input(action,true);});listen(b,'pointerup',()=>input(action,false));listen(b,'pointercancel',()=>input(action,false));listen(b,'lostpointercapture',()=>input(action,false));
 }
 btn('Start / Resume',resume);btn('Pause',()=>pause());btn('Retry',retry);btn('Rest',rest);
 const label=document.createElement('label');label.textContent='Timing assistance ';const select=document.createElement('select');for(const [value,text]of [[1,'Standard ×1'],[1.5,'Relaxed ×1.5'],[2,'Wide ×2']]){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}select.value=s.timing;label.append(select);settings.append(label);
 listen(select,'change',()=>{if(!host.active)return;if(s.phase==='qte'){select.value=s.timing;return say('Finish this clash before changing its timing. You can pause or resume safely.');}if(!s.paused&&!safe()){select.value=s.timing;return say('Pause first to change timing; current threats restart fairly.');}s.timing=Number(select.value);if(s.phase==='windup'){s.remaining=combat.threat().windup*s.timing;s.phaseTotal=s.remaining;}say('Timing updated. Resume when ready.');host.requestSave();});
 const identity=document.createElement('input');identity.value=s.character.name;identity.maxLength=40;identity.setAttribute('aria-label','Character name');settings.append(identity);btn('Name character',()=>{if(!safe())return say('Rename between fights.');s.character.name=identity.value.trim()||s.character.name;s.versions.character++;host.requestSave();},settings);
 function updateKit(){kit.replaceChildren();const st=stats(s),p=s.character;const summary=document.createElement('p');summary.textContent=`${p.title} · XP ${p.xp}/${p.level*100} · Power ${st.power} · Armor ${st.armor} · Parry +${st.parry}ms · ${s.objective}`;kit.append(summary);
  // Kit buttons are replaced only on discrete actions, never during a held defense.
  for(const id of p.skills){const d=s.content.skills[id];if(!d)continue;const b=document.createElement('button');b.textContent=`${d.name} · ${d.mp} MP`;b.title=d.description;b.onclick=()=>use('skill',id);kit.append(b);}
  for(const [id,n]of Object.entries(p.inventory)){const d=s.content.items[id];if(!d||n<=0)continue;const b=document.createElement('button');b.textContent=d.kind==='equipment'?`${p.equipment===id?'◆ ':'Equip '}${d.name}`:`${d.name} ×${n}`;b.title=d.description;b.onclick=()=>d.kind==='equipment'?equip(id):use('item',id);kit.append(b);}
 }
 listen(window,'keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)||!host.active)return;
  const key=e.key.toLowerCase(),action={j:'strike',k:'guard',' ':'dodge'}[key];if(action){e.preventDefault();if(!e.repeat)input(action,true);return;}if(e.repeat)return;
  if(key==='p'){e.preventDefault();s.paused?resume():pause();}if(key==='enter')resume();if(key==='q')use('skill',s.character.skills[0]);if(key==='e')use('skill',s.character.skills[1]);if(key==='r')use('item','red-vial');
 });
 listen(window,'keyup',e=>{const action={j:'strike',k:'guard',' ':'dodge'}[e.key.toLowerCase()];if(action)input(action,false);});
 listen(window,'blur',()=>pause('focus lost'));listen(document,'visibilitychange',()=>{if(document.hidden)pause('hidden');});
 updateKit();
 return {
  serialize(){return {...structuredClone(s),qteSave:qte.serialize()};},
  step(dt){if(disposed||!host.active)return;time+=dt;fx.life=Math.max(0,fx.life-dt*2.5);if(s.paused)return;skillLock=Math.max(0,skillLock-dt);
   if(s.phase==='qte'){if(qte.status().phase==='paused'){s.paused=true;clear();return;}qte.step(dt);return;}
   combat.tick(dt,()=>{if(!s.pendingSequence)return false;s.sequence=s.pendingSequence;s.pendingSequence=null;s.versions.sequence++;clear();combat.phase('qte',0);qte.start({...s.sequence.sequence,timeScale:s.timing},{expectedId:null});combat.record('sequence-start',s.sequence.sequence.label||'A clash begins.',{id:s.sequence.sequence.id});return true;});
  },
  render(){
   const q=qte.status();paint(ctx,s,combat,time,fx,q);
   let cue,timer='';
   if(s.paused)cue='Paused. Enter or Start resumes. Release held controls first.';
   else if(s.phase==='windup'){const a=combat.threat();cue=`${a.kind.toUpperCase()}: ${a.label}. ${a.kind==='thrust'?'Space: dodge':a.kind==='sweep'?'K: hold guard':'K guard or Space dodge'}.`;timer=`Impact in ${Math.max(0,s.remaining).toFixed(1)} seconds`;}
   else if(s.phase==='recovery'){cue='OPENING: J strike for full damage. Skills are available.';timer=`${Math.max(0,s.remaining).toFixed(1)} seconds remaining`;}
   else if(s.phase==='qte'){cue=`Clash cue ${(q.index||0)+1} of ${q.total}: ${q.phase.toUpperCase()}. ${q.cue?.label||q.cue?.action||''}. ${q.cue?.kind==='hold'?'Hold through the window.':'Press when the window opens.'}`;timer=`${(Math.max(0,q.remainingMs||0)/1000).toFixed(1)} seconds${q.cue?.kind==='hold'?` · Hold ${Math.round((q.holdProgress||0)*100)}%`:''}`;}
   else cue=s.phase==='victory'?'Victory. Progress saved; rest and prepare for the next encounter.':s.phase==='defeat'?'Defeated. Retry restores this opponent without erasing your character.':'Ready. The opponent is preparing.';
   if(cue!==lastCue){cueText.textContent=cue;lastCue=cue;}if(timer!==lastTimer){cueTime.textContent=timer;lastTimer=timer;}
  },
  versions(){return {...s.versions};},capabilities(){return capabilities;},
  inspect(){return {progress:{label:`${s.character.name} · level ${s.character.level}`,location:s.location,objective:s.objective,victories:s.victories,encounter:s.enemy.name,status:s.phase},character:{...s.character,stats:stats(s),hp:s.hp,stamina:Math.floor(s.stamina)},encounter:{id:s.encounterId,enemy:s.enemy,phase:s.phase,paused:s.paused,timing:s.timing,next:combat.threat(),queuedPattern:!!s.pendingPattern},sequence:{active:s.phase==='qte'?qte.status():null,queued:s.pendingSequence?.sequence.id||null},content:{items:Object.values(s.content.items).map(({id,name,kind,mods,effects})=>({id,name,kind,mods,effects})),skills:Object.values(s.content.skills).map(({id,name,mp,effects})=>({id,name,mp,effects}))},latest:s.outcomes.slice(-4),chronicle:s.chronicle.slice(-4),caption:s.caption};},
  command(name,args){const result=command(s,combat,name,args,emit);updateKit();return result;},
  dispose(){disposed=true;clear();qte.dispose();for(const cleanup of cleanups)cleanup();root.remove();}
 };
}
