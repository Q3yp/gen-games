# Architecture and guarantees

## One world, three clocks

The Node server is the single authority. Players, CLI callers, and MCP clients operate on the same session through named commands. SQLite is the durable source of truth; the browser never writes authoritative state directly.

1. **Presentation clock:** browser rendering, CSS motion, and custom UI animation loops remain local. They need not wait for an agent or emit simulation noise into its context.
2. **Simulation clock:** player actions execute synchronously as small transactions. Registered plugin `tick(ctx, deltaMs)` hooks are scheduled every 100 ms; idle hooks create no commits. The supplied combat example is tactical, so opponents act after successful player actions, not on a wall-clock timer.
3. **Agent clock:** an external coding agent observes semantic changes and submits actions, content edits, or asynchronous job proposals when ready. No model service runs inside the engine.

`deltaMs` is currently the configured logical step (100), not measured elapsed wall time. There is no catch-up accumulator or lockstep networking. Tick hooks are synchronous trusted code and must stay cheap; an expensive hook can block the Node event loop.

## Modules

- `src/core/registry.js`: validates pack identity, plugin order/dependencies, and action collisions.
- `src/core/engine.js`: action context, seeded RNG, transaction/revision boundary, and scheduler hooks.
- `src/core/store.js`: SQLite storage, WAL, atomic commits, checkpoints, consumers, and persisted request results.
- `src/core/context.js`: bounded semantic observation and resume/ack semantics.
- `src/core/jobs.js`: generation fencing and exact-target content guards.
- `src/core/tools.js`: concise tool-facing operations; no full-world response by default.
- `src/core/validate.js` / `patches.js`: invariant validation, safe author paths, and incremental browser patches.
- `src/plugins/`: reusable world, combat, narrative, and declarative effect rules.
- `src/server/`: HTTP, static pack assets, SSE, and startup/shutdown.
- `src/agent/`: CLI and MCP adapters, both calling the same HTTP tools.
- `public/`: standard studio client and custom component host.
- `games/`: editable source packs, trusted custom modules, and media.

## Transaction contract

An action or authoring mutation supplies a stable `requestId`. Agent actions also supply `expectedRevision`; ordinary player intents may omit it and are validated against current state.

Within `BEGIN IMMEDIATE` the engine:

1. Looks up a previously committed request. An identical request returns its original result; a changed payload with the same ID returns `IDEMPOTENCY_CONFLICT`.
2. Reads the current session and verifies the expected revision.
3. Clones the session and invokes its synchronous handler against the isolated draft.
4. Validates required world structure and applies no external side effects.
5. Advances revision, updates the player-context epoch when applicable, calculates patches, and writes session, semantic events, state delta, and retry result atomically.
6. Commits SQLite, then broadcasts to connected browser streams.

A thrown validation/rule/plugin error rolls back the entire database transaction. Random-number changes roll back too because RNG state is part of the draft. Request result replay returns the original revision, not a new execution; the browser does not roll back a newer local view to an old replay.

The epoch advances on every accepted player intent and scene transition, so delayed dialogue cannot accidentally target an earlier player context. Revision and event sequence are separate: job metadata can create an event without changing world revision, and one action can emit many events.

Only successful mutation results are stored. Failed validation can be repaired and retried, but use a new request ID for changed logical work. Session creation, job start/cancel, and checkpoint save are administrative operations, not request-id-deduplicated actions; adapters never automatically retry them.

## Incremental context

`observe` returns semantic event lines, a world revision, `nextCursor`, and `hasMore`. Default limits are 20 journal rows and 4,000 characters, with explicit upper bounds of 100 rows and 12,000 characters. One unusually long event line may be abbreviated; inspect its exact event ID on demand. Pure browser patch records and visual cues are skipped by the semantic feed, but their cursor positions are consumed.

The returned cursor is the last consumed row, never an unreturned head. If the page fills, continue from `nextCursor`. Event sequences are database-global and may have gaps within a session; subtracting cursors is not an event count.

Named consumers persist two independent positions:

- `delivered`: the furthest cursor actually delivered to that reader.
- `ack`: the furthest delivered cursor the reader explicitly confirms processing.

A later read defaults to the reader's `ack`, so a crash before acknowledgement re-delivers context rather than losing it. Acknowledgement cannot move backward or exceed that reader's delivered position. An explicit bootstrap establishes a compact current baseline and cursor, without acknowledging it. Each reader has its own cursor; one agent cannot drain another's feed.

Logs currently retain all events. There is no silent truncation, compaction, vector retrieval, or automatic prose summarization. Invalid/future cursors fail with a repair hint. Long-poll reads can wait up to 30 seconds and wake on the next session commit.

## Jobs: slow work without stale outcomes

A job is a persisted generation fence, not a scheduler that launches a model. The agent or external worker owns the actual computation.

- **Context mode (default):** captures world revision and player/scene epoch. Commit needs the matching generation token, active status, unchanged base context, and revision. Changed context, cancellation, restart, or checkpoint restoration rejects late work.
- **Content mode:** explicitly guards up to 30 individual `assets/<id>` or `skills/<id>` targets by digest. Commit may omit a global revision and proceed after unrelated player/tick changes, but only exact guarded paths are editable and all digests must still match. This narrow exception does not rebase arbitrary story or combat changes.

Running jobs are marked `interrupted` when the server restarts. Checkpoint restore cancels running jobs and advances revision/epoch. Canceled work is never reactivated by a late completion.

## Browser synchronization and coded components

The browser fetches one `{session,cursor}` snapshot, then receives `change` SSE messages containing patches and semantic events. Patch paths are arrays into the full Session object. Arrays are replaced atomically; object fields are diffed recursively. Semantic event history and state patch records share the ordered journal.

Reconnect starts from a fresh snapshot when needed. More than 1,000 pending SSE records triggers an explicit `resync`, not a silently incomplete view. Agent tools do not consume browser patches or receive snapshots with every action.

A custom ESM module exports `createUI({root,dispatch,asset,escapeHTML})` and returns `update(session)` plus optional `dispose()`. The host supplies a frozen snapshot and named-action dispatch, not a mutable server world. The built-in renderer remains available if a custom module fails. Local UI code is trusted, not a security sandbox; see [security](security.md).

## Persistence and limits

By default `.data/games.sqlite` stores sessions, full successful retry results, all journal events, consumer positions, jobs, and named checkpoints. `GEN_GAMES_DATA` selects a different directory. The data directory is git-ignored and contains private player input; back it up separately if needed. Checkpoints restore world/RNG state, not source files or active computations.

This release is designed for **one server process**. SQLite protects transactions, but broadcast listeners and scheduling are process-local. Do not run two servers against one database. There are no cross-process leases, distributed pub/sub, autoscaling, or multiplayer authorization roles.

World state is capped at 2 MB; request bodies at 512 KB; author batches at 100 operations; emitted events at 200 per transaction. Media belongs in files/URLs. Journal and dedupe tables do not yet compact; disk usage grows with play. Structural validation does not prove that authored story branches are all reachable or every custom rule is semantically correct. Play the game and inspect failures.
