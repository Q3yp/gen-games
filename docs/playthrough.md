# A player and a live director played together

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
