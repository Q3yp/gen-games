# Actual play: from narrative director to code canvas

## Lumen Weave: a different game, not a prettier chat

On 2026-10-22 the primary browser player and an implementation lead separately
played the new canvas prototype. The account here attributes their direct reports;
the documentation reviewer inspected actual screenshots, not the inputs firsthand.

The first version was a pleasing optical toy: rotate a shard and see the beam
change immediately; hold it on a seed and watch it bloom. The primary player won
the first two drifts with 13 and 12 rotations, without moving a mirror. A new stone
changed the view but did not force a different plan. The honest conclusion was
“responsive and attractive, but not enough strategy,” so iteration continued.

An independent host then wrote and published a new executable Prism mechanic.
A selected shard could split light into a straight and reflected branch, while
the goal changed to illuminating all three transparent flowers together for two
seconds. This made the circuit, not the order of three clicks, the object of play.
The player completed a first Prism drift and then built an 11-adjustment network
with three mirrors and two forks on another constellation.

The same constellation invited a cleaner route. On retry the player instead
threaded a focused beam through the transparent flowers, winning in five
adjustments with no forks. The lead independently reported a seven-adjustment
forked solution and a four-adjustment focused chain. These were different
successful topologies, not merely different captions or reduced waiting. The
focused solution was preserved as valid mastery rather than patched away.

Next, the player opted into a distinct Lantern Trial. Lanterns absorb rather than
pass light onward, and each needs at least 20% power. The familiar focused-chain
strategy therefore remains valid for flowers but does not solve this new material.
The primary player built a balanced circuit and won in seven adjustments. The
lead separately won in eight, deliberately made a branch too faint at 12%, saw
the explicit warning, and used Undo to restore 24%. That supplied a concrete
prediction, failure, explanation, and recovery loop.

### Presentation changes driven by these runs

The first victory modal blurred and obscured the garden the player had just made.
It became a small result plaque; the earned circuit stays sharp and can still be
inspected and manipulated. Decorative constellation links were distinguished from
powered beams. Lanterns received different silhouettes, power labels, threshold
rings, and explicit faint/bright states. Menus and Studio remain secondary to the
full-viewport world and direct controls.

A deliberately bad code release also exercised the actual fallback: the lead's
old animated world and Show result control kept working, while failure and later
healthy activation/recovery appeared in the observation feed. This was a real
browser exercise, not merely a mocked tool result.

### Current verdict

There is now evidence for a playable optical sandbox and a small replay loop:
learn a rule, build a circuit, discover a different topology, and improve the
same puzzle. The host demonstrated changing executable mechanics rather than
only supplying narration. The Lantern Trial adds a meaningful new constraint.
This is still a short prototype, not evidence of a mature progression system or
lasting enjoyment across many players. The 35-second silent demo uses actual
browser capture with thinking gaps removed; it is not a continuous speedrun.

After the final readable module release, the primary player restarted the Node
host and reloaded the browser. The completed Lantern circuit, four lit receivers,
seven-adjustment result, and personal best all returned without a lease error.
The lead separately replayed after formatting and confirmed a slower completion
did not overwrite the better record.

Source mechanics and reusable fixes belong in the repository. Individual saves,
telemetry, and capture media remain local artifacts unless separately delivered.
See [verification](verification.md) for exact reported run counts and limitations.

## Earlier legacy experiment: Signal House

On 2026-10-22, a browser player and a separate coding-agent GM shared one real Signal House session. The GM used the documented CLI/tool surface, not implementation source. This was improvised play against the running server, not a prerecorded dialogue or a mocked tool response.

## What happened

1. The player folded a letter into a paper boat and tried it against the lighthouse beam. The GM observed the new speech, authored a new SVG visual, objective, and choices, and answered in character.
2. The player pursued an improvised sea-door route and used a tether to reach Mara. The GM created a branch with an interactive plate and a new scene instead of insisting on the pack's original puzzle sequence.
3. A delayed proposal was deliberately left outstanding while the player changed scene and spoke again. The old commit was rejected; its proposed marker did not appear in the world.
4. The GM committed rescue prose and seven world edits in one `narrative.reply`: the rescue, resolved signal, epilogue, scene, and player placement arrived together.
5. The player chose a reunion ending. The final browser view showed branch-specific progress (Mara rescued, a new route found, and June’s promise kept), accurate ending notes, and no contradictory alternative ending choice. The browser retained the live branch across a server restart, and the GM-authored SVG rendered successfully.

The player found the revised flow engaging. The GM independently reported that the unplanned boat and tether genuinely changed the route, without implementation-source reads; remaining effort was composing nested JSON and making ending choices mutually exclusive. The exercise also exposed enough friction to change the engine, rather than merely validating the original design.

## Changes driven by play

- Current scene/player IDs in baselines; singular scene inspection defaults to the current scene.
- Bounded changed-path summaries, including atomic director replies, and semantic scene-change events.
- Explicit director routing so offline substring keywords do not contradict a live GM.
- Atomic prose plus world edits, avoiding a race between new choices and their explanation.
- Neutral waiting acknowledgement instead of an invented outcome.
- Wide player mode, hidden spoilers, no duplicate controls, and natural-height story layout.
- Supported SVG data assets and explicit unsupported-URL repair errors.
- Authorable scene progress/ending copy for branches beyond the stock puzzles.
- Clear stale-job guidance: discard and start fresh, never force an old proposal through with a new revision.
- UI failure/recovery diagnostics in the agent's semantic feed.

A separate browser session deliberately selected a missing UI module. The old working component remained visible, its warning identified the failure, and its existing “Read sister letter” control still advanced the game. This checked actual fallback behavior, not only an HTTP error response. In the final round, the GM independently received `ui.failed` with the missing path and repair hint through `observe`. Restoring the override produced `ui.recovered`, the browser warning disappeared, and healthy controls remained. Diagnostics advanced the event cursor, not gameplay revision. The temporary broken-module override was removed.

## What is saved in this repository

The reusable runtime fixes, editable original packs, documentation, and authored pack assets are committed. The improvised rescue branch and its SVG were **live session state**, not changes to the original Signal House source pack. They remain in the local SQLite data directory, which is ignored by Git; no play database or private player transcript is packaged here.

To reproduce the workflow, start the server, open Signal House, follow [AGENTS.md](../AGENTS.md), enable director mode, and use `narrative.reply` with atomic operations. The exact story can be different. See [verification](verification.md) for execution coverage and limits.
