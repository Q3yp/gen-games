# Engine readiness and evidence boundaries

This is a local-first host for trusted, agent-authored games. It does not guarantee
that arbitrary generated games are entertaining or that novel mechanics arrive
quickly enough to sustain a live session.

## What the engine owns

- Generic DOM/canvas lifecycle, local frame/input execution, arbitrary JSON-object
  saves, durable checkpoints, immutable release pins and acknowledged publication.
- Game-defined commands with release/run/version guards and compact errors;
  reliable semantic events, independent observation cursors and bounded inspection.
- Campaign library and versioned handoff sections. Independent source workspaces
  allocate a game ID and directory, without imposing a scene or component catalog.
- An optional local timed-cue helper. Timing uses simulation time, not a guarantee
  of human-speed wall-clock reaction performance on stalled/background browsers.

Character identity, items, skills, HP/MP, levels, stats, combat, rendering and their
wiring remain game-owned code. Iron Cadence demonstrates one vocabulary; its
finite effect commands are not an engine restriction. The host can add executable
behavior rather than merely add a tooltip or data row.

## What has been demonstrated

The repository records live character/ability/QTE persistence and an independent
host continuing an existing Iron Cadence save. Sunspindle and Tidelight demonstrate
arbitrary generated rendering and local mechanics. Exact source archives and actual
saves have been restored into separate offline data directories without modifying
original campaigns. These are bounded observations, not universal coverage.

Source scaffolding, compact tool responses and the shared nullable/anyOf validator
have isolated/direct validation. The server was reloaded only after the frozen
Homeward trial completed. Live discovery and short corrective argument errors were
then verified, and the completed save still matched its export exactly. A separate
fresh Homeward replay mounted successfully in the real cloud browser at 5/5 health
and “Click to enter,” with no gameplay input. Scaffold-specific activation remains
simulated rather than exercised in a real browser.

Tidelight's final verdict was unsuccessful despite isolated rewarding discoveries.
The initial Sunspindle continuation also failed. Later short encounters earned
voluntary replay and experimentation, but a roughly eighteen-minute gate repair
broke the connected run's momentum. The frozen complete Homeward journey then earned an independent verdict of a
satisfying small arcade journey: all transitions worked without host intervention
and learned combinations justified the voluntary replay. The player would choose
new encounters, not repeat the mastered route. This is not evidence of deep RPG
progression, addiction, or live novel-content generation speed.
See [session notes](sunspindle-session-notes.md) and the actual demo/save records.

## Remaining boundaries

- Source replacement recreates an instance. Generated code owns migration,
  cleanup, input continuity and invariants; arbitrary timers are not managed.
- Registered commands pause runtime-managed controls until durable acknowledgment.
  A failed handler may retain partial changes; handlers are not automatic rollback
  transactions. Recover from actual state rather than assuming failure means no-op.
- Source isolation is directory/game-ID separation, not sandboxing. Same-ID
  campaigns share editable source, while existing sessions keep immutable pins.
- Storage is local, single-server-process SQLite, not cloud sync or multiplayer
  authorization. Journal/deduplication tables do not yet compact.
- Context is bounded and incremental, but hosts still choose relevant scopes,
  maintain handoffs and resolve stale evidence. No automatic narrative memory
  subsystem decides what matters to a player.
- Semantic event/projection preflight now rejects invalid generated output before
  queue insertion, preserving valid event acknowledgments and correcting source
  publication. Direct lifecycle/SQLite checks exercised failed-command durability,
  ambiguous acknowledgments, exact retry envelopes and owned-notice dismissal.
  Normal mounting was verified in the real browser; browser fault/recovery injection
  was not. An invalid queue already held by an older loaded client still needs reload.

Genre profiles separate continuity and evaluation priorities, not mandatory
mechanics. Read only the relevant primary/secondary profiles. The core host skill
requires independent player judgment, observable consequences and truthful waits;
finishing a boss, receiving a success receipt or making attractive screenshots
alone does not pass that judgment.

## Final checkpoint validation

On 2026-10-22, syntax checks passed for 206 JavaScript modules and all nine game
packs registered. No test files or automated test suite were added. Engine-only
changes were loaded after play; frozen Homeward source stayed at
`2ec34aa92b754f49f16d6a17`. The real-play demo is in
[Homeward evidence](demo/homeward/README.md), with capture gaps and pauses disclosed.
