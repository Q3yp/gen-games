# Live combat evidence: Iron Cadence

This records one live-directed browser session, not a benchmark, independent
human review or guarantee of enjoyment. The host authored the character and
encounters; the reviewing agent played using normal browser controls and visible
cues. No hidden-state inputs or direct HP edits were used to obtain play outcomes.
Authored setup and game-code changes are distinguished from earned results below.

## Character, combat and new executable behavior

- The live host authored Iona, custom Raincord equipment and the Measured Breath
  skill through the game's own flexible character/item/skill wiring. These are
  authored content, not evidence that the engine supplies a universal RPG schema.
- Tarn and Vey were actually defeated through controls, with XP and item rewards.
  Early openings allowed repeated strikes to dominate. Iteration shortened clash
  aftermath and limited each ordinary opening to two full-power normal hits;
  later normal strikes glance at the usual breath cost. This addresses an
  observed exploit, not proof that every build is balanced.
- Bell Return was implemented as a new source module during the session, not
  merely a renamed ability. Arming spent 12 MP; a real block, hold and release
  dealt 35 damage. This distinguishes authored executable mechanics from commands
  that only adjust existing values or display prose.
- A three-cue clash produced a partial 1/3 result: 10 damage dealt and 8 HP lost.
  A shorter hold-and-tap sequence was subsequently completed 2/2 and dealt 20
  damage. The different sequence shapes are not a controlled difficulty study.
- The player interrupted a held cue at a visible 10%, paused while the physical K
  key remained held, released while paused, then reloaded. Explicit resume
  restarted that cue's preparation; completing the sequence yielded 2/2 without
  a synthetic miss. This is a specific interruption path, not exhaustive coverage
  of every input device, focus transition or crash.

## Persistence and a fresh host

Library/Continue after two engine restarts preserved Iona at level 2, inventory,
skills and progress. The previous GM wrote workspace version 5 and detached. A
fresh agent without inherited conversation history recovered context from the
stored workspace, live save and source, and took over preparation for the boss
finale. This exercises durable cross-agent context rather than merely keeping a
long conversation alive.

## Verified boss finale

The fresh host authored and hosted the Regent finale using the durable workspace,
save and source rather than inherited conversation history. The reviewing agent
then completed approximately 25 seconds of continuous boss combat using visible
UI cues and normal inputs, at the **Relaxed ×1.5 timing setting**. The extra timing
window is part of this evidence; this is not a claim of unassisted ×1 play. There
was no host combat intervention or direct HP rewrite during the battle.

The Regent went from 180 HP to 0 across two phases and five defended threats;
a final slash parry finished the fight. Semantic receipts recorded:

- Bell Return: 34 damage at 50% charge.
- An Ember-empowered strike: 40 damage.
- Sweep guard plus thrust evade: one crown break, 24 damage and 20 breath restored.
- Phase II: a local transition at the next recovery boundary, not a mid-windup
  host substitution.
- Victory: 180 XP and exactly one Oathglass signet.

The durable final state was Iona level 3, XP 100/300, HP 120/128, MP 24/52,
breath 94.48, five vials, all four skills and Raincord equipped. Four claimed
encounters include the zero-XP lesson. Workspace version 8 records completion.
This completes the requested run through the boss; it does not erase the earlier
partial clash, overly generous openings or the subsequent retuning documented
above. After presentation-only extraction/formatting and reload, the actual UI
still showed campaign completion, level 3, XP 100/300, HP 120/128, MP 24/52,
breath 94 (display-rounded), five vials, Raincord equipped and the Oathglass
signet in equipment. The fresh host also compared full durable values before and
after that refactor and found them unchanged. This is a verified reload of the
finished campaign, not a new run or evidence for every possible migration.

## Measured response, not a latency promise

For one successful local sequence, result-to-render measured **8.8 ms** and event
acknowledgment **36.7 ms**. The subsequent GM caption took **31.736 s**, including
monitoring and thinking. An earlier partial outcome measured **3.8 ms** locally,
with a separate GM follow-up of **11.073 s**. These are observed samples with
different work and endpoints, not a general latency guarantee or additive
breakdown. Local timing judgment and damage do not wait for the later GM prose.
They also do not measure the complete duration of authoring a new mechanic.

## Boundaries and next checks

This supports local timed execution, game-owned custom abilities, normal-control
combat rewards, one interrupted-cue recovery and a fresh-host boss completion. It
does not establish universally enjoyable combat, independent player usability,
network multiplayer correctness or complete fault recovery. Future changes still
need actual play, especially a different strategy and input-device coverage.

Game modules are trusted local JavaScript, not a sandbox for untrusted source or
player text. Persistence is local to the configured data directory and source
checkout, not cloud synchronization. An old workspace brief is context, not a
live frame snapshot or authority to overwrite current progress. See
[library/workspace boundaries](library-workspaces.md), the
[optional timed-cue contract](live-runtime.md#optional-local-timed-cues), and
[Iron Cadence authoring](../games/iron-cadence/AUTHORING.md) for implementation
contracts; these play notes deliberately do not duplicate them.
