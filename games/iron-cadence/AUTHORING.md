# Iron Cadence: a character beside a live host

Primary RPG, secondary action. The hypothesis: defending a readable attack with a
well-timed guard or costly dodge creates an opening worth exploiting, while MP,
equipment, and persistent rewards change the next encounter. This is a starter
court, not a prewritten campaign. The live host owns subsequent encounters,
locations, objectives, rewards and new mechanics. Nothing in the engine requires
this pack's stats, effect registry, encounter model or rendering.

## Play

- J / Strike: 16 breath, 0.48s recovery. Full Power during OPENING, otherwise 3.
- Hold K / Guard: drains 7 breath/s; catches slash and sweep for 12 breath.
  A fresh press within 300ms of impact (scaled by timing + equipment Parry ms)
  parries for 4 breath, deals 8 damage and extends the opening by 0.6s.
- Space / Dodge: 25 breath; evade slash/thrust for 0.46s, recovery 0.65s.
  Low sweeps catch dodges. Thrusts pierce guard. Threat text and shape name both.
- Breath recovers 19/s when not guarding. No passive MP refill in combat.
- Q / E: first two owned skills; all skills have on-screen buttons and descriptions
  on hover. R: red vial. Skill/item actions have a 0.65s cooldown; direct-damage
  effects require an opening. Ember edge imbues the next opening strike; second
  breath exchanges MP for health/breath. Switching equipment is between fights.
- Enter / Start: explicit resume. P: pause. Blur/hidden pauses and releases controls.
- Timing ×1, ×1.5, ×2 deliberately expands windows, including QTE holds, and enemy
  recovery. Default ×1.5 is comfortable practice, not automated-player timing.
  Pause before changing; changing a committed windup restarts it fairly. An active
  QTE's timing cannot change until it ends.
- Defeat: Retry restores this opponent and player HP/MP, preserves identity,
  inventory, XP and earlier world results. Items already consumed stay consumed.
  Rest between fights restores resources. Victory does not autoheal.

Character name, base stats, XP, levels, equipment, consumables, learned skills,
resources, encounter, pending commands and chronicle serialize. Reload always
pauses. An active QTE preserves previous cue results, restarts only its current
cue preparation on explicit resume, never awards a saved terminal outcome again.
XP threshold is current level ×100; level grants +2 Power, +8 max HP, +4 max MP.
Each encounter's stable ID pays rewards once, including after retries/revisits.

## Host commands

Use the existing runtime attach/wait/command/result/finish loop. Discover once per
release, then guard only declared scopes (director snapshot inference supported).
Queued command is not applied; await durable runtime.command.result. Do not
publish source to change patterns, captions, item values or cue sequences.

`character.configure` (character scope) patches the character only between fights.
Optional name, title, base stats (power/armor/maxHp/maxMp/parry), level, xp, hp, mp;
omitted fields preserve values, inventory and skills. Base values 0–1000 (maxHp
at least20), level1–99, xp below level×100, HP/MP cannot exceed derived maxima.
Use this for intentional authored character setup/development, never silently
rewrite earned progress. Example:

```json
{"name":"Ash","title":"Cinder Gate courier","base":{"power":17,"armor":1,"maxHp":104,"maxMp":48},"hp":104,"mp":48}
```

`encounter.set` (scope encounter) is accepted only while ready/victory/defeat and
player HP > 0. It preserves character resources; let the player rest. It pauses
the next encounter so the player can read and start it. Fields:

```json
{"id":"gate-duelist-01","name":"Gate Duelist","hp":120,"location":"Cinder Gate · outer stair","objective":"Earn the keeper’s passage beyond the gate.","pattern":[{"kind":"slash","windup":1.7,"recovery":1.4,"damage":16,"label":"Rising crosscut · guard or dodge"},{"kind":"thrust","windup":1.2,"recovery":1.9,"damage":20,"label":"Point forward · dodge the lunge"}],"reward":{"xp":70,"items":{"red-vial":1}}}
```

Pattern contains 1–12 entries: kind slash/thrust/sweep, windup 0.65–6 seconds,
recovery 0.5–6 seconds, damage 1–30, label ≤100 chars. `pattern.queue` (pattern
scope) takes `{pattern:[...]}` and applies at the END of the next recovery,
never in the middle of an announced attack. Author unusual rhythm through varied
windup/recovery, not unreadable unannounced exceptions.

`sequence.queue` (sequence scope) accepts one pending clash; rejects replacing an
active/queued one. It begins at a safe recovery boundary, suspends normal combat,
then returns to an opening. Damage/risk are proportional to hits/misses, so failure
is recoverable and partial execution matters. No MP/breath is consumed by QTE
inputs. Wrong action is ignored, early held input does not count, key-repeat does
not count. Hold begins during the window and must complete before it closes.

```json
{"sequence":{"id":"keeper-lock-01","label":"The keeper locks your blade","prepareMs":800,"cues":[{"action":"guard","kind":"hold","windowMs":1400,"holdMs":650,"label":"K · Hold against the lock"},{"action":"dodge","kind":"tap","prepareMs":600,"windowMs":850,"label":"Space · Slip the return"},{"action":"strike","kind":"tap","prepareMs":700,"windowMs":1000,"label":"J · Cut through"}]},"damage":36,"risk":12}
```

QTE timing uses the PLAYER timing setting, overriding authored timeScale. See
`/code-qte.js`/docs/live-runtime.md for the optional helper. The helper is only a
cue judge: this pack owns presentation, pause UI, outcomes, damage and saves.

`arena.caption` (narration scope): `{text:"...",objective:"..."}`. Objective is
optional. This changes prose only; do not pretend it creates executable mechanics.

`content.define` (content AND character scopes) defines an item or skill and
optionally grants it. Existing definitions can change only between fights. New
content can be authored/granted during play. The player chooses when to use it.

```json
{"type":"item","definition":{"id":"keeper-sign","name":"Keeper’s Sign","description":"A parrying token: +80ms parry tolerance, -3 Power.","kind":"equipment","mods":{"parry":80,"power":-3}},"grant":1}
```

```json
{"type":"skill","definition":{"id":"cinder-reserve","name":"Cinder Reserve","description":"14 MP: recover 45 breath, imbue the next opening strike for +12 damage.","mp":14,"effects":{"stamina":45,"empower":12}},"grant":1}
```

Definitions: lowercase id ≤48, name ≤80, description ≤300. Item kind equipment or
consumable. Equipment mods currently Power, Armor, maxHp, maxMp, Parry (ms), each
−100…100. Skill mp 1–100. Standard effect values 0–100: heal, damage, stamina,
empower, mp. `grant` integer 0–20; skills learned once, items counted. Consumable
items apply effects and consume one. One equipment slot makes tradeoffs explicit.

## Add genuinely new rules

`effects.js` is an editable local-code registry, not an engine catalog. Each entry
owns validation and application. Add a module exporting an effect, import it into
effects.js and register its key. Its interface:

```js
export const yourEffect = {
  validate(value) { /* throw a clear error before anything changes */ },
  apply({ state, stats, combat }, value) { /* synchronous game-owned state */ }
};
```

`combat` provides phase(name,seconds), threat(), settle(), record(kind,text,data),
clear(), press(), release(), tick(), view(). Read combat.js before using these.
A skill may store persistent custom fields on `state.character` or `state`; add
explicit migration defaults when needed. Stats themselves are game-owned in
character.js. If a new effect needs continuous simulation or distinct visuals,
wire that explicitly in combat.js/main.js/paint.js rather than pretending a number
creates behavior. Prefer one cohesive module and the minimum clear hook points.
Validate all invariants before mutation; arbitrary code is not transactional.
Publish once for genuinely new executable behavior, preserve saves, verify browser
activation, then author/tune instances with content.define. The live GM should
actually demonstrate one new mechanism after initial controls are evaluated.

## Compact host evidence

inspect() supplies progress (library-readable, game-owned), character/derived stats,
owned inventory/skills, encounter/next attack, queued QTE ID or active cue status,
compact definition values, latest four outcomes and chronicle entries. Versions
change on semantic boundaries, not frames. `combat.strike`, `block`, `parry`,
`evade`, `hurt`, `ability`, `sequence-start`, `sequence`, `victory`, `defeat`,
`retry`, `encounter`, `pattern`, `content` are bounded semantic events. No held-key
or frame event stream. Reward receipts include XP/level/item changes.

## Verification status at initial handoff

All pack JavaScript syntax checked. Pure combat/character transitions manually
exercised via Node. Browser visuals, actual key/pointer timing, focus loss, real
QTE hold/miss/resume, source activation and reload still require root/player
validation. Do not call the initial pack independently play-tested.
