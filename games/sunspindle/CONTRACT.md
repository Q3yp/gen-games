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
recent story events, and `versions.world`. No nonserializable objects live in saves.

The sunweight has held, outbound, resting, and returning states. Recall follows
the player's current position. Swept collision prevents tunneling; each target is
hit once per flight. Hits shove and interrupt enemies. Committed lunges can hurt
the player once per attack, even when hostile time slows.

Player movement and weight flight run locally. Hostile movement, projectiles,
and timers all use 0.06× time while the player is stationary with a held/resting
weight, and 1× while moving or throwing/recalling. Recovery keeps broken objects
and defeated enemies instead of resetting the room.

## Authored rooms

Room 1 is the Sun Court: ram, archer, hanging crystal. Breaking the crystal frees
a companion and opens the east arch regardless of surviving guards.

Room 2, the Threadmill, was authored after the player chose to continue. A bronze
guardian turns slowly, commits to its lunge, and deflects frontal hits. Two sunseals
hold separate gate bars; destroying both opens escape without requiring a kill.
The renderer reflects actual shield direction, block/damage feedback, cords and
individual bars. No text tells the player the combat solution.

`rooms.js` preserves the actual prior room under `rooms['1']`, including the spared
guard, and migrates an awaiting-exit save exactly once. It retains health and the
rescued bird, clears transient shots, and enters paused. `threadmillEntered`
prevents later releases from resetting the chamber. Room-aware entry controls
recovery. The next unopened destination is deliberately not authored yet.

## Host boundary

Emit bounded semantic events for first uses, distinctive collisions, defeat,
objective changes, recovery, and decision points. Do not emit every held key or
tick. Player controls never wait for a host model response. New authored content
currently uses source publication at a safe boundary. Staging focused game-owned
commands is a next improvement, not an existing capability.

Host previews and player saves are separate. A source publication receipt is not
proof of activation or enjoyable play. Preserve player choices during migration;
never manipulate a player's controls, health, or future state to stage evidence.
