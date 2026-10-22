import {stats, award} from './character.js';
export const training = [
  {kind:'slash', windup:1.8, recovery:1.7, damage:12, label:'Crosscut · guard or dodge'},
  {kind:'thrust', windup:2, recovery:1.9, damage:16, label:'Piercing lunge · dodge'},
  {kind:'sweep', windup:1.9, recovery:1.8, damage:14, label:'Low sweep · hold guard'}
];
export function initial(save) {
  const base = {schema:1, hp:100, stamina:100, enemy:{name:'The Brass Sentinel',hp:90,maxHp:90}, pattern:training, pendingPattern:null, index:0, phase:'ready', remaining:1.5, phaseTotal:1.5, timing:1.5, paused:true, caption:'A practice blade, a patient opponent. Start when ready.', victories:0, attempts:0, outcomes:[], versions:{encounter:1,pattern:1,sequence:1,narration:1}, sequence:null, pendingSequence:null, qteSave:null};
  const s=save?.schema===1 ? {...base,...structuredClone(save)} : base;
  s.paused=true; // Reload never advances threats behind the player's back.
  return s;
}
export function validatePattern(value) {
  if(!Array.isArray(value)||value.length<1||value.length>12) throw Error('pattern must contain 1–12 attacks.');
  return value.map((a,i)=>{
    if(!a||!['slash','thrust','sweep'].includes(a.kind)) throw Error(`pattern[${i}].kind must be slash, thrust or sweep.`);
    for(const [key,min,max] of [['windup',0.65,6],['recovery',0.5,6],['damage',1,30]]) if(!Number.isFinite(a[key])||a[key]<min||a[key]>max) throw Error(`pattern[${i}].${key} must be ${min}–${max}.`);
    if(typeof a.label!=='string'||a.label.length>100) throw Error(`pattern[${i}].label must be a string up to 100 characters.`);
    return {kind:a.kind,windup:a.windup,recovery:a.recovery,damage:a.damage,label:a.label};
  });
}
export function makeCombat(s, emit, effect) {
  let guard=false, guardAge=99, dodge=0, cooldown=0;
  const threat=()=>s.pattern[s.index%s.pattern.length];
  function record(kind,text,data={}) { s.outcomes.push({kind,text,...data}); s.outcomes=s.outcomes.slice(-6); emit('combat.'+kind,text,data); effect(kind); }
  function phase(name,duration) {s.phase=name;s.remaining=duration;s.phaseTotal=duration;}
  function settle() {
    if(s.hp<=0){s.hp=0;phase('defeat',0);s.versions.encounter++;record('defeat','Your guard breaks. Retry restores both fighters; previous outcomes remain.');}
    else if(s.enemy.hp<=0){s.enemy.hp=0;phase('victory',0);s.victories++;s.versions.encounter++;record('victory',`${s.enemy.name} yields.`,{victories:s.victories,reward:award(s)});}
  }
  function press(action) {
    if(s.paused||['victory','defeat','qte'].includes(s.phase))return;
    if(action==='guard'){if(!guard)guardAge=0;guard=true;return;}
    if(action==='dodge'&&cooldown<=0&&s.stamina>=25){s.stamina-=25;dodge=.46*s.timing;cooldown=.65*s.timing;guard=false;effect('dodge');}
    if(action==='strike'&&cooldown<=0&&s.stamina>=16){
      guard=false;s.stamina-=16;cooldown=.48;const open=s.phase==='recovery';
      const damage=open?stats(s).power+s.character.empower:3;if(open)s.character.empower=0;s.enemy.hp=Math.max(0,s.enemy.hp-damage);effect(open?'hit':'glance');
      record('strike',open?'Clean hit through the opening.':'Steel glances off a closed guard.',{damage,opening:open,enemyHp:s.enemy.hp});settle();
    }
  }
  function release(action){if(action==='guard')guard=false;}
  function clear(){guard=false;guardAge=99;dodge=0;}
  function tick(dt,onBoundary) {
    if(s.paused||['victory','defeat','qte'].includes(s.phase))return;
    guardAge+=dt;dodge=Math.max(0,dodge-dt);cooldown=Math.max(0,cooldown-dt);
    s.stamina=Math.min(100,Math.max(0,s.stamina+(guard?-7:19)*dt));if(s.stamina===0)guard=false;
    s.remaining-=dt;if(s.remaining>0)return;
    if(s.phase==='ready'||s.phase==='recovery'){
      if(s.pendingPattern){s.pattern=s.pendingPattern;s.pendingPattern=null;s.index=0;s.versions.pattern++;record('pattern','The opponent changes cadence.');}
      if(onBoundary?.())return;
      const a=threat();phase('windup',a.windup*s.timing);return;
    }
    if(s.phase==='windup'){
      const a=threat(); let outcome,damage=0;
      if(dodge>0&&a.kind!=='sweep'){outcome='evade';record('evade','The blade cuts empty air.',{attack:a.kind});}
      else if(guard&&s.stamina>=12&&a.kind!=='thrust'){
        const parry=guardAge<=(.30+stats(s).parry/1000)*s.timing;s.stamina-=parry?4:12;outcome=parry?'parry':'block';
        if(parry)s.enemy.hp=Math.max(0,s.enemy.hp-8);
        record(outcome,parry?'Perfect parry · their stance opens!':'Guard catches the blow.',{attack:a.kind,enemyHp:s.enemy.hp});
      }else{outcome='hurt';damage=Math.max(1,a.damage-stats(s).armor);s.hp=Math.max(0,s.hp-damage);record('hurt',a.kind==='thrust'?'A thrust pierces guard. Dodge this attack.':a.kind==='sweep'?'A low sweep catches a dodge. Guard this attack.':'The crosscut connects.',{attack:a.kind,damage,hp:s.hp});}
      phase('recovery',a.recovery*s.timing+(outcome==='parry'?.6:0));s.index=(s.index+1)%s.pattern.length;settle();
    }
  }
  return {press,release,clear,tick,threat,phase,settle,record,view:()=>({guard,guardAge,dodge,cooldown})};
}
