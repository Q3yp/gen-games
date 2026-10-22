import {validateEffects, runEffects} from './effects.js';
// These are game rules, not engine types. Add new stat/effect wiring here freely.
export const statKeys=['power','armor','maxHp','maxMp','parry'];
export const defaults={
  items:{
    'wayfarer-blade':{id:'wayfarer-blade',name:'Wayfarer blade',description:'A balanced blade. +2 power.',kind:'equipment',mods:{power:2}},
    'iron-ring':{id:'iron-ring',name:'Iron ring',description:'Hold the line. +3 armor; -2 power.',kind:'equipment',mods:{armor:3,power:-2}},
    'red-vial':{id:'red-vial',name:'Red vial',description:'Recover 35 HP. Consumed on use.',kind:'consumable',effects:{heal:35}}
  },
  skills:{
    'ember-edge':{id:'ember-edge',name:'Ember edge',description:'12 MP. Your next successful opening strike deals +24 damage.',mp:12,effects:{empower:24}},
    'second-breath':{id:'second-breath',name:'Second breath',description:'10 MP. Recover 30 stamina and 12 HP.',mp:10,effects:{stamina:30,heal:12}}
  }
};
export function migrateCharacter(s){
  s.character??={name:'Ash',title:'Wayfarer of the Cinder Road',level:1,xp:0,mp:40,base:{power:16,armor:2,maxHp:100,maxMp:40,parry:0},equipment:'wayfarer-blade',inventory:{'wayfarer-blade':1,'iron-ring':1,'red-vial':3},skills:['ember-edge','second-breath'],empower:0};
  s.content??=structuredClone(defaults);s.claimed??=[];s.location??='Cinder Gate · practice court';s.objective??='Learn the Sentinel’s cadence. Beyond the gate, a live host continues your journey.';
  s.encounterId??='training-sentinel';s.reward??={xp:60,items:{'red-vial':1}};s.versions.character??=1;s.versions.content??=1;s.chronicle??=[];
}
export function stats(s){const p=s.character,out={...p.base};const mods=s.content.items[p.equipment]?.mods||{};for(const k of statKeys)out[k]=(out[k]||0)+(mods[k]||0);out.power=Math.max(1,out.power);out.armor=Math.max(0,out.armor);out.maxHp=Math.max(20,out.maxHp);out.maxMp=Math.max(0,out.maxMp);return out;}
export function validateDefinition(d,type){
  if(!d||typeof d.id!=='string'||! /^[a-z0-9-]{1,48}$/.test(d.id)||typeof d.name!=='string'||d.name.length>80||typeof d.description!=='string'||d.description.length>300)throw Error('Definition needs id (1–48 lowercase letters/digits/hyphens), name (≤80), description (≤300).');
  if(type==='item'&&!['equipment','consumable'].includes(d.kind))throw Error('Item kind must be equipment or consumable.');
  if(type==='skill'&&(!Number.isFinite(d.mp)||d.mp<1||d.mp>100))throw Error('Skill mp must be 1–100.');
  for(const [key,value] of Object.entries(d.mods||{}))if(!statKeys.includes(key)||!Number.isFinite(value)||Math.abs(value)>100)throw Error('mods permits power, armor, maxHp, maxMp, parry; finite values -100 to 100.');
  validateEffects(d.effects);
  if(type==='skill'&&!Object.keys(d.effects||{}).length)throw Error('Skill needs at least one effect.');
  return structuredClone({id:d.id,name:d.name,description:d.description,...(type==='item'?{kind:d.kind}:{mp:d.mp}),...(d.mods?{mods:d.mods}:{}),...(d.effects?{effects:d.effects}:{})});
}
export function applyEffects(s,effects,combat){runEffects({state:s,stats:stats(s),combat},effects);}
export function award(s){
  if(s.claimed.includes(s.encounterId))return {xp:0,repeat:true};s.claimed.push(s.encounterId);const p=s.character;p.xp+=s.reward.xp;
  for(const [id,count]of Object.entries(s.reward.items||{}))p.inventory[id]=(p.inventory[id]||0)+count;
  const previous=p.level;while(p.xp>=p.level*100){p.xp-=p.level*100;p.level++;p.base.power+=2;p.base.maxHp+=8;p.base.maxMp+=4;}
  s.versions.character++;s.chronicle.push({id:s.encounterId,opponent:s.enemy.name,location:s.location,result:'victory'});s.chronicle=s.chronicle.slice(-30);
  return {xp:s.reward.xp,level:p.level,levelUp:p.level>previous,items:s.reward.items};
}
