# Authoring a game pack

Both examples run on the same `core`, `combat`, and `narrative` plugins. Copy a
pack folder, change its folder name and `game.json` ID, and author JSON. Runtime
plugins do not contain either game's entity IDs, story text, or map coordinates.
The `assets` registries refer to ordinary, replaceable files. All bundled SVGs are
original artwork provided under CC0-1.0.

## Pack fields

A pack has `id`, `title`, `description`, `version`, `plugins`, optional `ui`, and
`initial`. Load `core` before `combat` or `narrative`. Initial state contains:

- `scene`: active scene ID; `player`: player entity ID.
- `entities`: an ID-keyed entity dictionary. Each has matching `id`, `name`,
  `kind`, and an open `components` object.
- `scenes`: an ID-keyed scene dictionary.
- `assets`: `{id,kind,src,alt,license}` entries. Put files under the pack's assets
  directory; registry sources are `/games/<pack>/assets/<filename>`.
- `skills`: authored combat moves; `variables`: flags, counters, relationships.
- Optional `dialogue`: default keyword intents and fallback response.

The runtime session owns revision, event cursor, random seed, and persistence.
Do not maintain a second browser-only gameplay state. Cosmetic UI state such as
an unfinished text draft can stay local.

## Scenes and exploration

Scenes use `name`, `description`, optional `map` (equal-width rows), `entry`
`{x,y}`, `choices`, `exits`, and optional presentation metadata. `#` blocks
movement. Other tiles are open unless `tiles[character].solid` is true.
`tiles[character].effects` apply when stepped on. No map means an open 20 × 14
area, configurable with `width` and `height`.

An exit is `{x,y,scene,position?,when?,lockedText?}`. Entering it transitions when
its condition passes. New scene `entry` supplies the default arrival position.
Entity position components are `{x,y,scene}`. Living hostile entities block tiles;
props and items do not unless they have `components.solid: true`.

An interaction component is `{text?,effects?,scene?,position?,range?,once?,when?,
lockedText?,usedText?}`. Default range is one Manhattan tile. `once` tracks `used`
on that interaction. Interactions use declarative effects or scene transitions,
not nested action dispatch; `interact.action` is rejected explicitly.

## Combat and items

- Stats: `health`, `maxHealth`, `attack`, `defense`, `mana`, `maxMana`.
- Hostiles: `ai: {hostile:true,aggro:7,range:1,stationary:false,skill?}`. One
  opposing turn follows each successful move, attack, use, equip, wait, or world
  interaction. Enemies use bounded pathfinding and never take time-based turns.
- Skills: `{id,name,cost,power,range,variance?,accuracy?,piercing?,visual?,drain?}`.
  Optional entity `components.skills` limits learned skill IDs. `enemyOnly` hides
  an opponent move from player use. Range is Manhattan distance; the default
  combat plugin does not implement line of sight, area damage, or cooldowns.
- Equipment: player `inventory: {items:[entityId,...]}` and
  `equipment: {weapon:entityId,armor:entityId}`. Item components support `attack`,
  `defense`, `slot` (or `equipSlot`), `heal`, `mana`, `effects`, `description`, and
  `consumable`. Consumables default to consumed; set `consumable:false` for
  readable/reusable objects. Equipping applies bonuses without mutating base
  stats. Item entities leave the map when picked up.
- Items may have `onPickup` effects and `consumeOnPickup:true` for coins or clues.
- Enemy `loot` is an array of `{chance,entity}` templates (or `{chance,item}`
  referring to a template entity). Drops receive unique IDs and the defeated
  entity's position. `reward:{experience,gold}` updates the player and variables.
  `onDefeat` effects support gated progress. Dead enemies remain inspectable.

Random combat variance and loot use the session's deterministic random stream.
Health zero sets `variables.outcome` to `defeat`. Authors can set another truthy
outcome for any ending; gameplay actions then reject with `GAME_FINISHED`.
Create a new session to replay.

## Choices, conditions, and effects

A scene choice has `{id,label,text?,speaker?,next?,effects?,when?,requires?,once?}`.
`when` controls visibility; `requires` rejects selection with `lockedText` if
unmet. Once-only choices are tracked at `variables.visitedChoices[choiceId]`, so
choice IDs should be unique throughout a pack.

Conditions are data, never code. They support:

- `{path:["variables","trust"],gte:2}` and `equals`, `notEquals`, `gt`, `lt`,
  `lte`, `includes`, or `exists` comparisons. No comparator means truthiness.
- `{all:[condition,...]}`, `{any:[condition,...]}`, `{not:condition}`; a bare array
  is also an all-of condition.
- `{hasItem:"entity-id"}` and `{entityAlive:"entity-id"}`.

An effect is `{type:operation,...}` (`op` is also accepted), optionally with
`when`. Supported operations:

| Type | Fields |
| --- | --- |
| `set` | `path` array, `value` |
| `increment` | `path` array, `amount` (default 1) |
| `damage` / `heal` | `target`, `amount`; heal accepts `resource:"mana"` |
| `spawn` | complete new `entity` |
| `remove` | `target`; also removes carried/equipped references |
| `transition` | `scene`, optional arrival `position` |
| `narrate` | `text`, optional `speaker` |
| `cue` | `visual`, optional `target` and `color` |
| `branch` | `condition`, `then` effect array, optional `else` effect array |

`target:"player"` and `target:"self"` resolve safely to the current entity.
Paths are bounded arrays of safe string keys, not JavaScript or dot-separated
expressions. Prototype-related keys are rejected. Failures throw rich error
codes and roll back the complete authoritative transaction.

## Conversation and a live director

Scene `dialogue` overrides world-level `dialogue`. Each has `speaker`
and `intents:[{id,keywords,text,speaker?,when?,effects?,next?}]`. Keyword matching
is case-insensitive substring matching, in declaration order. It is deliberately
small and deterministic, not a built-in LLM. Writing an arbitrary sentence does
not grant permission to run tools or mutate state.

An agent can call `narrative.mode` with `{mode:"director"}` to persist
`state.dialogue.mode` and route **all** subsequent free text to a director, even
when it contains an authored keyword. No canned NPC answer is generated in that
mode. `{mode:"authored"}` restores deterministic matching (the default). This
action requires actor `agent`; it does not launch or attach an agent. Signal
House displays the current director routing mode and explains the connection
requirement. Authored scene choices remain available in either mode.

`narrative.say` records speech and any matching authored response. An unmatched
sentence, or any free text in director mode, emits a neutral waiting
acknowledgement rather than an invented NPC reply, plus `agent.requested` with `{source:"player",untrusted:true,text,scene}`
and sets `state.dialogue.pending`. A connected director can inspect it and call
`narrative.reply` as actor `agent` with `{speaker,text,operations?}`. Optional
`operations` are 1–100 safe `set`/`delete` path edits, using the same validated
format as the runtime authoring tool. Edits and reply commit in one transaction,
so new choices never appear before their explanation. A failed edit rolls back
the complete turn, including the reply. That action clears the pending request
and persists `state.dialogue.reply`. Narration, choices, player
speech, and director replies are also recorded in the last 48
`state.conversation` entries. A director can author other state fields through
the runtime's revision-checked tools; player dialogue is only story input.

## Normal-coded custom UI

Signal House's `ui.js` is an ordinary trusted ESM module demonstrating
`createUI({root,dispatch,asset,escapeHTML}) -> {update(session),dispose(),ownsInteraction:true}`.
`dispatch(actionName,args)` submits the same authoritative named actions used by
an agent. `asset(id)` resolves registered media. The UI escapes authored text,
preserves typed drafts across state updates, supports keyboard input and small
containers with CSS container queries, and renders persisted director replies. The
`ownsInteraction` flag lets a host shell hide its duplicate generic controls. It does not evaluate text.
Changing its module changes only presentation; the same pack can use the default
renderer by removing `ui`.

## Playable examples

**Ember Vault** is a three-floor tactical dungeon. Explore for equipment, keep
healing/focus stations until useful, defeat the Glasskeeper to unlock the vault,
and claim the living ember after defeating its sentinel. Seed 42 supports a
complete ordinary-action route without state edits.

**Signal House** is an eight-scene conversational adventure with three endings.
The homecoming route needs a properly repaired coil, the true frequency, a
shared memory, and at least two trust. The crossing and vigil remain alternative
choices. Returning between rooms does not consume clues or soft-lock the story.
