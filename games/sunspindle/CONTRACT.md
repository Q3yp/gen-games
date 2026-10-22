# Sunspindle module contract

This is a generated campaign's implementation, not an engine component API.
New behavior may use arbitrary new source modules. These fields describe the
current game, not a schema that all future games must follow.

## Lifecycle and input

- World: 1200 × 800. Playable bounds: x90–1110, y160–710.
- `paint(ctx, state, view)` owns letterboxing; input uses the same transform.
- `initial(save)` resumes serializable state; `projection(state)` reports focused
  progress, threats, props, recent semantic events, and scope versions.
- `simulation(state, emit)` exposes `step(dt)`, `throwOrRecall(point)`, and `keys`.
- WASD/arrows move, click throws or recalls, P pauses. No dash or key-sequence UI.
- Initial entry and new-room transitions are paused. First click resumes only.
- Main owns input/listener/audio lifecycle and removes it on disposal.

## Current state

State contains player position/health, the sunweight, enemies, breakable props,
shots, effects, room/entry/exit, local clock, pause state, rescued bird, progress,
recent story events, prior-room snapshots/departures, a pending room, entered stage
IDs, and `versions.world`/`versions.route`. No nonserializable objects live in saves.

The sunweight has held, outbound, resting, and returning states. Recall follows
the player's current position. Swept collision prevents tunneling; each target is
hit once per flight. Most hits shove and interrupt enemies. Ordinary hits on rain kilns deal damage without canceling their attack; reflected bolts can stagger them. Committed lunges can hurt
the player once per attack, even when hostile time slows.

Player movement and weight flight run locally. Hostile movement, projectiles,
and timers use 0.06× time while the player is stationary with a held/resting
weight, and 1× while moving or throwing/recalling. Reflected friendly rainbolts use real time so their payoff stays prompt. Recovery keeps broken objects
and defeated enemies instead of resetting the room.

## Authored rooms

Room 1 is the Sun Court: ram, archer, hanging crystal. Breaking the crystal frees
a companion and opens the east arch regardless of surviving guards.

Room 2, the Threadmill, was authored after the player chose to continue. A bronze
guardian turns slowly, commits to its lunge, and deflects frontal hits. Two sunseals
hold separate gate bars; destroying both opens escape without requiring a kill.
The renderer reflects actual shield direction, block/damage feedback, cords and
individual bars. No text tells the player the combat solution.

The earlier Glassworks short trial starts in room 3,
with a rescued bird, fixed artillery, moving guards and finite blast jars. Clearing
the threats opens its garden exit. Existing saves retain their own room/progress;
the old Sun Court-to-Threadmill migration remains guarded by `threadmillEntered`.
Do not publish into stopped player campaigns to start a new trial.

The current fresh-save path starts in room 5, the Rain Balcony: fixed rain kilns,
one breakable stone screen, and a complete garden exit. Moving weight can reflect
large rainbolts back to their original kiln. Held/resting weight does not shield.
Screens block projectiles and weight in nearest-contact order and break after two
impacts. A stopped weight can be recalled away without re-hitting the same contact.
`exitOnClear`, `finishAtExit`, `clearNotice`, and `endNotice` are campaign-owned room
fields. A finished exit reports `complete`, not a promise of unfinished content.

`rooms.js` snapshots each departure in `rooms[String(from)]` and records health,
companion status, living/defeated guards and broken props in `departures`. Entry
carries the player's current health and companion, resets transient combat/input,
and pauses. Room-aware recovery keeps destroyed objects and defeated guards.
Reaching an exit no longer heals the player; death recovery and the initial bird
rescue still do. No return-travel command is implemented merely by saving old rooms.

## Inactive passage staging

Discover `passage.stage`; its guard scope is `route`. All five fields are required:
`stageId`, `fromRoom`, `expectedStageId`, `roomKey`, `config`. Use a unique stage ID,
the current room, explicit `null` for an empty pending slot (or its observed ID),
and an unvisited destination `config.room`. `threadmill` accepts room ≥2, name,
entry/exit points, guardian position/angle, exactly two seals, and notice;
`glassworks` accepts room ≥3, name, entry/exit points, 1–6 enemies of kind
ram/archer/artillery, and 0–4 jars. `rain-balcony` accepts room ≥3, name, entry/exit, 1–4 kiln positions, and a screen position or null. Room numbers cap at 9999. Other settings default;
the factories validate bounds, spacing and unsupported fields before mutation.

The command persists one inactive, materialized room and increments `route`;
it does not remount source or change the current encounter. Reusing an identical
stage ID is a no-op; changed content requires a new ID and observed pending ID.
Visited rooms and already-entered stage IDs are rejected. The initial Sun Court
passage is reserved for its existing Threadmill transition.

On a later local step, the stage enters only from its departure room at the open,
requested exit, within 76 units, with a living player and no recovery underway.
This check also runs while game-paused. Entry clears the pending slot, records the
stage ID, increments `route`, and emits `room.entered`. A durable command result
reporting `staged` therefore does not prove entry. Inspect compact `route.pending` and the
entry event, not the whole save. `route.atSafeExit` uses the actual living-player,
recovery, and position gate. `route.pending.blockedReason` explains incompatible
factory versions or changed/visited destinations without dumping the save.

Pending stages survive saves but require the same registered factory version to
enter. A missing/mismatched version leaves the stage pending with a compact blocker:
preserve compatibility across publication or deliberately replace/migrate it. These factories are local authoring conveniences, not an engine room catalog;
new mechanics may use arbitrary campaign source.

## Host boundary

Emit bounded semantic events for first uses, distinctive collisions, defeat,
objective changes, recovery, and decision points. Do not emit every held key or
tick. Player controls never wait for a host model response. Stage already-supported
arrangements during play; publish genuinely new executable behavior at a safe
boundary with save continuity. Read the live capabilities, not an older document.

Glassworks is a bounded trial with a complete stopping point. New source reports
`complete` when its gate is reached without staged content. The independently
played pinned release still reports `awaiting-next-room`; its workspace explicitly
records that this is a stop, not permission or a promise to append content.

Host previews and player saves are separate. A source publication receipt is not
proof of activation or enjoyable play. Preserve player choices during migration;
never manipulate a player's controls, health, or future state to stage evidence.

Crown garden factory accepts room, name, entry, exit, boss {x,y}, and screens [{x,y}]
(up to two). It supplies no player health. The final garden arrival is a persistent
world change (`gardenArrived`, animated `gardenBloom`), not only a completion caption.

The connected voyage's authored route is now carried in continuation.js with its
source release. Initializing from a balcony save materializes the inactive garden
without replacing an existing pending/visited destination. Normal safe-exit entry
then works even after browser loss; it needs no live host command window. This is
game-authored source evolution, not a generic engine room rule. Ordinary queued
commands remain run-guarded and can be canceled when browser ownership changes.
