# Mossfall: host notes

Read the RPG genre profile before directing this game. This pack is an independent
code-runtime RPG, not a skin on Lumen Weave's optics. `world.js` defines connected
places and stable NPC, enemy, chest and quest identifiers. `rules.js` implements
turn resolution. `interactions.js` owns NPC choices, loot and quest consequences.
`paint.js` orchestrates cohesive drawing modules in `render/`. `main.js`
bridges player input, durable saves, inspect summaries and lifecycle disposal.

## Player-facing contract

Move with WASD/arrows or click a destination. In peaceful space, click travel
continues until reaching it or approaching an enemy. Near enemies, every click
moves one beat. Bump an enemy to strike, or click it within weapon reach. E or
click interacts with nearby people and objects. Q is a lantern pulse; Space
braces and restores focus; R drinks a tonic. Time advances only on these actions.
An amber tile is an attack that resolves on the next player beat. Walking away,
interrupting with a pulse, or bracing are distinct responses.

The first free oath at the hearth changes pulse cost/damage/positioning. A chest
in Briar Hollow offers a two-tile spear or a stronger adjacent axe, and can be
revisited to switch. Defeated enemies, taken seals, equipment and quest state
persist across travel, defeat, reload and hot publication. Rest costs one amber
when available, never prevents recovery, and never respawns cleared enemies.
Defeat loses up to three amber and heals surviving enemies, but preserves kills,
loot, build and quests. Seals restore health and focus. The boss's cross and
horizontal sweep use learned dodge/interrupt/brace rules.

## Inspect and source authoring

`inspect()` returns concise current area, character build, objective, seals,
claimed loot, enemies and next attacks. Commands `help` and `journal` are read-only.
Add optional content by editing explicit stable-ID content in `world.js`, then
publish with the observed runtime release. Current saves already contain area
state; adding enemies requires an explicit save migration, never silently
replacing a saved area's enemies. New objects in an existing area appear from
content automatically and respect the saved claimed-object IDs. New quest
behaviors belong in `interact`/`choose` in `interactions.js`, not a disguised eval or DSL.

Do not alter an ongoing enemy's telegraph meaning or reset progress to showcase a
new scene. Offer new challenges on an optional side route or through a deliberate
NPC choice. The independent player should reach a second encounter with a real
persistent difference before judging RPG feel.

## Optional Bell Grove

This side trail responds to a player experimenting with spacing and Wayfarer
pushes, without changing the current story enemies or requiring a restart. The
southern Hollow exit leads to `grove`; entry lazily creates only the missing
area save. Existing enemies, loot, seals, gear and ongoing combat are untouched.
`bell-guide` and `bell-vow` disclose the bargain; only choosing the vow spawns
`grove-watchman`. The player must keep it alive, lure or push it to `root-circle`
at (10,4), then interact with `mercy-bell`. The bell checks the actual living
enemy position, not a dialogue answer. Defeating the knight is a valid alternative.

The persistent `watchman` state is absent/unmet, active, spared, or slain.
Sparing removes the knight without XP or amber and makes hearth rest permanently
free; killing keeps normal loot and closes that benefit. Rowan acknowledges
both outcomes while preserving main-quest guidance. Retreat stays available.
This trial reuses the same knight telegraphs and player verbs; its new mechanic
is a spatial non-lethal objective with a lasting world consequence.

After the living seed is returned, `neri-home` becomes visible in the sanctuary
through the shared `objectsIn` story filter. Her dialogue acknowledges the
watchman outcome. The ending does not claim an unimplemented water-state change.
