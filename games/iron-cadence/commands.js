import { resetRegent } from './regent.js';
import { validatePattern } from './combat.js';
import { validateDefinition, stats, statKeys } from './character.js';
import { qteSequenceSchema, validateQTE } from '/code-qte.js';
const object = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required
});
const str = (maxLength) => ({ type: 'string', maxLength });
const num = (minimum, maximum) => ({ type: 'number', minimum, maximum });
export const actions = ['strike', 'guard', 'dodge'];
export const capabilities = [
  {
    name: 'character.configure',
    description:
      'Optional patch to character identity, base stats, level/XP or HP/MP only between fights. Omitted fields preserve progress, inventory and skills. base supports power/armor/maxHp/maxMp/parry. Never use to silently erase earned progress.',
    scopes: ['character'],
    inputSchema: object(
      {
        name: str(40),
        title: str(120),
        base: { type: 'object' },
        level: { type: 'integer', minimum: 1, maximum: 99 },
        xp: { type: 'integer', minimum: 0, maximum: 9900 },
        hp: num(1, 1000),
        mp: num(0, 1000)
      },
      []
    )
  },
  {
    name: 'encounter.set',
    description:
      'Start the next connected encounter only while ready/victorious/defeated. Preserves character HP/MP, inventory, XP. Player starts it explicitly. Rewards once per stable id.',
    scopes: ['encounter'],
    inputSchema: object({
      id: str(80),
      name: str(80),
      hp: num(20, 1000),
      location: str(120),
      objective: str(300),
      pattern: { type: 'array' },
      reward: { type: 'object' }
    })
  },
  {
    name: 'pattern.queue',
    description:
      'Stage 1–12 attacks for the next safe recovery boundary. Each {kind:slash|thrust|sweep,windup:0.65–6,recovery:0.5–6,damage:1–30,label:string}. No mid-windup retcon.',
    scopes: ['pattern'],
    inputSchema: object({ pattern: { type: 'array' } })
  },
  {
    name: 'sequence.queue',
    description:
      'Stage a timed clash at the next recovery boundary. Actions strike/guard/dodge. Success/partial deals damage proportional to hits; misses cost HP proportional to misses. Timings multiplied by player setting. No replacement of active/queued sequence.',
    scopes: ['sequence'],
    inputSchema: object({
      sequence: qteSequenceSchema(actions),
      damage: num(0, 100),
      risk: num(0, 30)
    })
  },
  {
    name: 'arena.caption',
    description:
      'Change visible narration and objective without replacing rules or character.',
    scopes: ['narration'],
    inputSchema: object({ text: str(300), objective: str(300) }, ['text'])
  },
  {
    name: 'content.define',
    description:
      'Define or revise game-owned item/skill and optionally grant it. {type:item|skill,definition:{id,name,description,kind?,mods?,effects?,mp?},grant:0–20}. Equipment mods: power/armor/maxHp/maxMp/parry. Effects extensible in effects.js. Revisions apply only between fights; grants are immediate.',
    scopes: ['content', 'character'],
    inputSchema: object({
      type: { type: 'string', enum: ['item', 'skill'] },
      definition: { type: 'object' },
      grant: { type: 'integer', minimum: 0, maximum: 20 }
    })
  }
];
export function command(s, combat, name, args, emit) {
  if (name === 'character.configure') {
    if (!['ready', 'victory', 'defeat'].includes(s.phase))
      throw Error('Character configuration is allowed only between fights.');
    const patch = args.base || {};
    for (const [key, value] of Object.entries(patch))
      if (
        !statKeys.includes(key) ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1000
      )
        throw Error(
          'base permits power/armor/maxHp/maxMp/parry with values 0–1000.'
        );
    if (patch.maxHp !== undefined && patch.maxHp < 20)
      throw Error('base.maxHp must be at least 20.');
    const level = args.level ?? s.character.level,
      xp = args.xp ?? s.character.xp;
    if (xp >= level * 100)
      throw Error(
        'xp must be below level ×100; set level explicitly rather than triggering implicit authored levelups.'
      );
    const candidate = structuredClone(s);
    Object.assign(candidate.character.base, patch);
    const next = stats(candidate);
    if (args.hp > next.maxHp || args.mp > next.maxMp)
      throw Error(
        'Requested HP/MP exceeds resulting maximum; patch base.maxHp/maxMp first or in the same command.'
      );
    Object.assign(s.character.base, patch);
    for (const key of ['name', 'title', 'level', 'xp'])
      if (args[key] !== undefined) s.character[key] = args[key];
    s.hp = Math.min(args.hp ?? s.hp, next.maxHp);
    s.character.mp = Math.min(args.mp ?? s.character.mp, next.maxMp);
    s.versions.character++;
    emit('combat.character', 'Character configuration updated.', {
      name: s.character.name,
      level: s.character.level
    });
    return { name: s.character.name, level: s.character.level, stats: next };
  }
  if (name === 'encounter.set') {
    if (!['ready', 'victory', 'defeat'].includes(s.phase))
      throw Error(
        'Encounter in progress. Wait for victory/defeat; do not erase an active fight.'
      );
    const pattern = validatePattern(args.pattern),
      reward = args.reward;
    if (
      !reward ||
      !Number.isInteger(reward.xp) ||
      reward.xp < 0 ||
      reward.xp > 1000 ||
      !reward.items ||
      typeof reward.items !== 'object'
    )
      throw Error('reward must be {xp:integer 0–1000,items:{itemId:count}}.');
    for (const [id, n] of Object.entries(reward.items))
      if (!s.content.items[id] || !Number.isInteger(n) || n < 1 || n > 20)
        throw Error(`Reward ${id} must name a defined item with count 1–20.`);
    if (s.hp <= 0)
      throw Error(
        'Player must Retry or Rest to recover before a new encounter.'
      );
    s.encounterId = args.id;
    s.enemy = { name: args.name, hp: args.hp, maxHp: args.hp };
    s.location = args.location;
    s.objective = args.objective;
    s.reward = structuredClone(reward);
    s.pattern = pattern;
    resetRegent(s);
    s.pendingPattern = null;
    s.index = 0;
    s.paused = true;
    s.pendingSequence = null;
    s.sequence = null;
    s.qteSave = null;
    combat.clear();
    combat.phase('ready', 1.5);
    s.versions.encounter++;
    s.versions.pattern++;
    s.versions.sequence++;
    emit('combat.encounter', `${args.name} waits at ${args.location}.`, {
      id: args.id,
      objective: args.objective
    });
    return { id: args.id, phase: s.phase };
  }
  if (name === 'pattern.queue') {
    s.pendingPattern = validatePattern(args.pattern);
    s.versions.pattern++;
    return { queued: s.pendingPattern.length, boundary: 'next recovery end' };
  }
  if (name === 'sequence.queue') {
    if (s.pendingSequence || s.phase === 'qte')
      throw Error(
        'A sequence is already queued or active. Wait for combat.sequence outcome.'
      );
    validateQTE(args.sequence, actions);
    s.pendingSequence = structuredClone(args);
    s.versions.sequence++;
    return { queued: args.sequence.id, boundary: 'next recovery end' };
  }
  if (name === 'arena.caption') {
    s.caption = args.text;
    if (args.objective) s.objective = args.objective;
    s.versions.narration++;
    return { caption: s.caption };
  }
  if (name === 'content.define') {
    const d = validateDefinition(args.definition, args.type),
      bucket = args.type === 'item' ? s.content.items : s.content.skills;
    if (bucket[d.id] && !['ready', 'victory', 'defeat'].includes(s.phase))
      throw Error(
        'Existing content can change only between fights. New definitions/grants are allowed during play.'
      );
    bucket[d.id] = d;
    if (args.grant) {
      if (args.type === 'item')
        s.character.inventory[d.id] =
          (s.character.inventory[d.id] || 0) + args.grant;
      else if (!s.character.skills.includes(d.id))
        s.character.skills.push(d.id);
    }
    s.versions.content++;
    s.versions.character++;
    emit(
      'combat.content',
      `${d.name} ${args.grant ? 'acquired' : 'defined'}.`,
      { id: d.id, type: args.type }
    );
    return { id: d.id, granted: args.grant };
  }
  throw Error(
    `Unknown command ${name}. Discover encounter.set, pattern.queue, sequence.queue, arena.caption, content.define.`
  );
}
