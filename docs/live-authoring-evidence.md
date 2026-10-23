# Live authoring evidence (22 October 2026)

This is an engine/workflow exercise, not another finished-game claim. The player
used only the visible game and ordinary controls. The host authored separately.
No test files or prewritten player-request solutions were used.

## Exercised with an unplanned player request

Workspace `ws-c4e4505d-3676-4d3e-a22d-3ee8c4db7224` began as a small paper clearing.
The player collected two objects, earned 10 XP, then used the engine's Ask host
control to request turning their blue feather into a living, named, rideable bird
with steering, takeoff, landing, MP-powered flaps and ground recovery.

The host received durable request event #1091, authored new game-specific flight
and drawing code, and published release `4f8368ad959ac4f6ab29819e` into the same
session. The engine carried the arbitrary world into the replacement renderer.
The authored migration transformed only the feather and added the companion.
The player verified riding, flapping, steering and landing; MP fell 8→6 and
recovered on the ground. Pip, 10 XP, 20 HP and the amber pebble remained.
Events #1097–1099 independently record two flaps and a landing.

A second unplanned request renamed the same companion from Comet to Nimbus.
The host used the engine's generic guarded `world.patch`, not a bespoke rename
command or a new release. The player verified the visible name and retained
character values/inventory after normal rejoin. Request completion was linked
to the durable command application, not the initial queue receipt.

## Timing, including the slow parts

- Flight request: 18:53:46.430 UTC; source ready: 18:58:55.567 (309 seconds).
- Browser activation: 19:00:10.248, after normal rejoin. Source-ready to actual
  activation was another 75 seconds. Publication alone was not completion.
- Rename request: 19:01:14.712; queued 19:02:26.928; committed 19:02:26.974.
  Queue-to-commit was **46 ms**, but end-to-end host handling took **72 seconds**.
  These are different measurements. Fast transport did not make host reasoning
  or authoring instantaneous.

The rename's first stale world-version attempt was rejected without mutation.
A fresh focused read and new guarded attempt succeeded. Browser rejoin/release
changes also invalidated director turns, requiring explicit reattachment.

## Reusable engine support versus this example

Engine-owned: unrestricted JSON world persistence, transactional mutation,
renderer-independent saved continuity, owned lifecycle/input cleanup, durable
player requests, resumable director cursors/leases, scoped reads and bounded
change cursors, generic guarded patches, staged source activation, and receipts
that distinguish queued work from browser commitment.

Authored example only: Pip, the clearing, collectibles, XP/HP/MP field names,
Comet/Nimbus, flight physics, ground regeneration, companion drawing and the
feather transformation. None is a required engine entity or component schema.

## Fresh-host recovery and substantial redraw

A fresh host attached using only the workspace/session locator, engine access
instructions, persisted APIs and source, with no custom recap of current state.
It recovered both applied requests without replaying them and became ready at
19:04:43 UTC. The player then requested a turn-based sky-island expedition.
Release `3103253a1563586c79f8093b` replaced the presentation and rules in the same
save while preserving all preexisting world branches and adding expedition data.

The player verified retained Pip level 1, 10 XP, HP20/20, MP8/8, Nimbus and the
amber pebble, then scouted (+2 XP), flew to the observatory (3 MP), scouted (+5 XP)
and used the original pebble to unlock a free route (+7 XP, pebble retained).
A normal rejoin retained 24 XP, MP5/8, turn4, observatory location, Nimbus,
inventory and the unlocked route. This demonstrates an old item gaining a new
playable use, not just a new caption or cosmetic reskin.

Third request: 19:05:53.543 UTC; publication 19:09:44.742; durable activation
19:09:59.384. Request→source ready was 231.199 seconds; request→activation was
245.841 seconds, including 14.642 seconds after publication.

Recorded fresh-host tool responses totaled 25,075 characters / 25,128 UTF-8
bytes: workspace read 3,387/3,395; attach 3,955/3,969; capabilities 2,126/2,126;
focused world 2,756/2,758; request list 1,557/1,565; discover 2,743/2,764; initial
director wait 8,551/8,551. These are measured raw response sizes, not token counts
or total model context; source, docs and tool-wrapper text are excluded.

## Small-change latency diagnosis

The slow rename was mostly host work, not a queued-browser wait. The request at
19:01:14.712 was read by the host at approximately 19:01:20.339 (5.627 seconds).
Source/schema lookup then aged an inspected guard; a command at 19:02:11.963
failed safely with STALE_SCOPE. The eventual fresh focused read began at
19:02:26.614 and the change committed at 19:02:26.974: that final adjacent
read→queue→commit path took 360 ms. Total request→commit remained 72.262 seconds.

The host skill now has a small-change fast path: reuse cached schemas, avoid
source inspection for supported data edits, decide the patch before its final
focused read, and compose read + guarded command without another reasoning gap.
Linking supplies working status without a separate status round trip. A further
ordinary player request exercised this fast path: Pip→Juniper, with no source
read, new release, guard conflict or retry. It arrived 19:17:42.225 UTC, was
delivered at 19:17:42.245, queued at 19:17:57.795 and committed at 19:17:57.843.
End-to-end was **15.618 seconds**, versus 72.262 seconds before; browser commit
was **48 ms**. The player independently observed the applied change within
19.1 seconds and verified unchanged earned progress. Remaining latency was
host/tool orchestration, not transport. The delivery response measured 1,338
characters/bytes; the focused read was 408 characters / 410 UTF-8 bytes. These
are response sizes, not token counts. No instant-response claim is warranted.

## Narrow tooling fixes from the exercise

The updated runtime allows finishing an exact delivered cursor after rejoin or
activation, while retaining strict mutation guards, lease checks and the pending
command fence. A small inline protocol probe verified stale mutations remain
rejected and pending commands still block acknowledgment. Repeated changed paths
are coalesced in host observations; the live inspection endpoint was checked.
Working notes are archived when a linked change applies instead of leaving an
old “waiting” note as the current status. These are engine fixes, not new content.

## Remaining boundaries

- Arbitrary presentation/rules can be replaced, but retained data still needs
  intentionally correct authored migrations. The engine cannot identify which
  schema-free fields mean earned progress or prohibit deliberate deletion.
- Saved inspection can lag live motion. The global `$world` guard can conflict
  with unrelated movement; hosts must refresh/reassess rather than force writes.
- Mutation turn guards intentionally become stale across rejoin/source changes.
  Finish the observed cursor and wait for fresh context; expired leases still
  require reattachment.
- Change cursors are bounded changed paths, not a permanent narrative log.
  Important authored history must be persisted explicitly.
- Source activation still replaces the renderer instance. Durable state survives;
  transient DOM, animation and unsaved state do not automatically survive.
- A host agent must continuously consume requests. The engine does not start a
  model itself. This exercise does not establish general unattended hosting,
  arbitrary-code sandboxing, multi-player authority or large-world performance.
