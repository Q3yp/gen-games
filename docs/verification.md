# Execution and play-through record

Verification date: 2026-10-22. No test suite or test files were created, per the project request. The checks below were performed against real running code; syntax checks are listed separately from gameplay.

## Code canvas runtime and actual browser play

A later iteration replaced the primary game path with browser-owned code modules.
Evidence below was reported by the primary browser player and the implementation
lead who played separately. The documentation reviewer inspected actual victory
screenshots, but did not independently operate these runs. This attribution
matters: visual review, player reports, and execution records are distinct evidence.

- The primary player completed six real browser wins: baseline drifts 1 and 2;
  Prism drift 3; Prism drift 4 using an 11-adjustment, three-mirror/two-fork route;
  a same-constellation replay using five adjustments and no forks; and the optional
  Lantern Trial in seven adjustments.
- The baseline runs took 13 rotations/46 seconds and 12 rotations/62 seconds
  respectively. Neither required moving a mirror. They established immediate,
  legible cause/effect but failed the desired strategy-depth bar. Tinker pauses
  were used while planning and during tool waits, so times are not a speed benchmark.
- A separate host authored a new Prism ESM mechanic in source and published it
  through the guarded release route. The new goal required all three flowers
  illuminated simultaneously for two seconds, instead of sequentially charging
  each once. Source publication and browser activation were checked during play.
- The implementation lead separately reported Prism wins in seven adjustments
  with two forks and four adjustments with a focused, zero-fork chain. Together
  with the primary player's 11-to-five replay, this is concrete evidence of
  alternative strategies and an optimization loop, not proof of long-term retention.
- The optional Lantern Trial introduced distinct absorbing receivers requiring
  at least 20% light simultaneously. The lead completed it in eight adjustments,
  deliberately over-split a ray to observe 12% and `TOO FAINT`, then used Undo to
  recover 24%. The primary player separately completed it in seven adjustments.
- In the lead's session a deliberately invalid published candidate produced
  `ui.failed` at event 249. The prior animated game and its Show result control
  remained usable. Restored healthy source produced `runtime.activated` at 251
  and `ui.recovered` at 252. Temporary broken source was removed.
- The visual reviewer inspected first-win, alternate-circuit, focused-chain,
  and Lantern victory screenshots. Revisions kept the earned garden sharp after
  victory, reduced the result overlay, distinguished decorative constellation
  links, and showed receiver power/thresholds directly in the scene.

A 35-second silent recording assembled from actual browser captures shows the
mechanics; thinking gaps were removed. It is an edited demonstration, not an
uninterrupted timed trial. Captures and local play databases are not bundled as
source assets. The narrative record is in [playthrough](playthrough.md).

The final source-formatting checkpoint at `9d612af` was reported by the primary
agent as passing syntax checks for 52 JavaScript modules and all three packs.
This is a reported static check, not a claim that the documentation reviewer
independently executed it.

The primary player subsequently stopped and restarted the Node host at 04:09:29
UTC, then reloaded the browser. Lantern drift 5 restored the correct circuit
geometry, four of four receivers lit, the completed two-second chord, seven
adjustments, and personal best seven, without a reload lease error. The readable
module release `a2ad4fef2ef127eb27f1f2cc` had already been activated in the recorded
254/255 activation/recovery sequence. Separately, the lead replayed Lantern after
formatting in ten adjustments; the previous personal best of eight remained
unchanged. Two extra adjustments deliberately exercised that record behavior.

### What this establishes, and what it does not

Observed: direct canvas interaction, executable mechanic extension, activation
feedback, different successful topologies, a deliberate failure/recovery loop,
and a visible new receiver rule that changes planning. The repeated same-puzzle
improvement supplies a credible reason to try again. It does not establish a
mature campaign, broad audience enjoyment, addiction, exhaustive puzzle solvability,
long-term replay value, mobile usability, or a full accessibility/security audit.

## Mossfall RPG browser play

These 2026-10-22 observations come from actual browser input by the primary
player and implementation lead. The documentation reviewer inspected real
captured frames, including the loot choice, Neri rescue aftermath, Archive threat
layout, spear outcome and Warden boss-clear view. It did not operate those runs.
No tests or test files were added; screenshots and attributed play traces are
manual evidence, not automated coverage.

- **Primary discovery run:** Wayfarer + spear; wolves cleared, spear selected
  against axe's damage tradeoff, Neri freed and first seal obtained. The same
  build and quest continued into the Archive. Pulse interruption and a
  two-tile spear strike were exercised, with visible maximum-health progression.
  The player returned the seed to Rowan at beat 153 and entered Bell Grove with
  the same character at beat 172. This run crossed live repairs to floor threat
  rendering, knight alignment and boss behavior; it is not a clean final-build
  walkthrough.
- **Post-fix author self-play:** a fresh Warden + axe run traversed the base
  chapter and cleared the boss using actual movement, pulse, brace and strikes.
  The knight stepped into alignment before telegraphing. At the boss, focus
  depletion made brace versus retreat a real choice; brace absorbed all but two
  damage and recovered focus. Boss clear at beat 83, seed pickup at 84:
  20/22 health, 12 amber, two tonics, two focus, zero deaths. This is the
  implementation author's informed self-play, not an uncoached external review.
- **Visual evidence:** the equipment choice states spear damage 3/reach 2 versus
  axe damage 5/reach 1; later frames retain oath, weapon and quest seals across
  areas. Threat cells and the next-beat panel are visible in the repaired view.
  The boss-clear screenshot retains Warden, axe, 2/2 seals and the instruction
  to bring the seed home. Save persistence beyond scene transitions is a
  separate check and is not established by these screenshots alone.

- **Optional nonlethal trial, primary player:** at beat 177 a living 9/9-health
  watchman was lured onto the circle and released by ringing the bell. Reaching
  the bell deliberately cost five health: 17/22 health, 12 amber, three tonics,
  no loot or XP. After return, visible Neri explicitly acknowledged the spared
  watchman. Hearth recovery restored 17 to 22 health at beat 201 without changing
  amber or tonic counts. The slain branch was not player-played.
- **Browser reload, primary player:** full reload retained exact beat 201,
  build, seals, resources, home location and completed quest state. Another
  conversation at beat 203 preserved Neri's spared-watchman acknowledgment.
  The browser showed the game running, without a stale-state error. The
  documentation reviewer inspected the resulting homecoming screenshot. This
  was a browser reload, not a claimed server-restart check for Mossfall.
- **Remaining input coverage:** the later contextual E-key repair was reviewed
  in source only; no separate post-repair player-input replay is claimed here.

Established: connected RPG progression, two tactically different equipped builds,
readable turn-based intentions, quest return and continuation after the initial
objective, a nonlethal NPC consequence surviving browser reload, plus modest
resource pressure in the Warden boss fight. Not
established by these traces: demanding attrition, many viable builds, exhaustive
quest outcomes, long-term campaign depth, or broad audience enjoyment. Live
repair evidence should not be confused with a complete post-fix regression pass.
Local saves, telemetry and capture media are not committed as source assets.

## Earlier legacy runtime and tool execution

Manual HTTP sessions, CLI processes, and MCP stdio calls exercised:

- Discover the two legacy packs and action-specific argument schemas.
- Create/open saved sessions with deterministic uint32 seeds.
- Player/agent actions, revision advancement, targeted entity/path inspection, and atomic authoring.
- Identical action retry returning the original result without executing again, including after closing/reopening the server database.
- Changed/old expected revision returning `STALE_REVISION`, with no state changes.
- An author batch that first changed a variable then deleted the required player: rejected with `INVALID_PLAYER`; the earlier variable edit was absent afterward.
- Observe bootstrap, independent consumers, delivered-versus-acknowledged cursors, two-row/256-character pagination, `hasMore`, valid acknowledgement, and rejection of a future acknowledgement.
- A content-mode asset job started, an unrelated tactical turn occurred, and the guarded asset committed successfully without overwriting world changes.
- A contextual job started, world revision changed, and late commit returned `STALE_JOB`.
- Cancellation followed by late commit returned `JOB_NOT_RUNNING`; a pending job was observed as `interrupted` after an actual server restart.
- Overlapping reads by one consumer preserved a newer acknowledgement when an older long-poll completed later; durable cursor writes merge monotonically.
- A synchronous clock plugin ran on a real 100 ms interval for five ticks (world revision 5, simulated 500 ms). A guarded asset job then committed at revision 6; the older context proposal was rejected.
- A two-second long-poll returned about 109 ms after a new player action woke it.
- Director mode bypassed a known Mara keyword, an atomic reply committed text plus an asset/flag edit, and an invalid scene edit rolled the entire reply back. Data-SVG was accepted; a javascript: asset returned `UNSUPPORTED_ASSET_URL` and a repair hint.
- Named checkpoint save, subsequent play, and restoration to a new revision with a monotonic event cursor.
- Newly authored opponent, item, skill, learned-skill entry, inventory entry, and asset registry record through the tools. The player cast the new skill, defeated the new opponent, used the new item, and inspected the resulting state.
- SSE subscription received revisioned patches and semantic events, without a full `session` snapshot in the stream payload.
- Browser diagnostics were also exercised through HTTP: repeated identical failures were deduplicated, failure/recovery stayed at the same gameplay revision, and duplicate suppression survived a real server restart.
- Malformed JSON-object shape returned `INVALID_REQUEST`, a cross-origin mutation returned `ORIGIN_REJECTED`, and static traversal probes returned 404. These are focused checks, not a security audit.
- MCP initialize, version negotiation, tool discovery/calls, ping, malformed JSON, unknown tools, and `isError`/rich stale-action responses.
- CLI JSON/file/stdin arguments, explicit-flag precedence, raw envelopes, transport errors, and success/failure exit codes.

Runtime data used for these checks was isolated from the browser play session. Source files contain no canned verification assertions or test suite.

## Playable-pack walkthroughs

Both walkthroughs executed ordinary registered actions against the actual Engine/Store, without editing game state to bypass progression:

- **Ember Vault, seed 42:** explored three floors, collected/equipped coat and saber, used authored springs, defeated gate enemies/Glasskeeper/Sentinel, and claimed the ember. Victory at tactical turn 97, with 32/46 health, 6 focus, and 18 gold remaining.
- **Signal House:** followed fifteen story choices to the homecoming ending with trust 4, repaired coil, the correct frequency, and the remembered pier.
- Unmatched speech produced a persisted pending request; agent-only `narrative.reply` produced a visible stored response. Neutral pending acknowledgement replaced an earlier misleading canned outcome.

## Real player + director iteration

A separate browser player and director agent shared the same live Signal House session. The director used the documented tools rather than reading implementation source:

1. Player entered original free text.
2. Director observed incremental events, inspected scene context, authored a new visual/choices/objective, and replied in-character.
3. Player continued with another original action; director responded again.

That exercise found concrete friction and drove changes: current-scene inspection defaults, IDs in bootstrap, changed-path summaries, explicit director routing instead of substring keyword interference, atomic reply plus world edits, wider player layout, hidden spoilers/inspector by default, no duplicate custom/shell inputs, and source-reload controls. After restart, the browser resumed the same live-authored branch; the new data-SVG loaded successfully and explicit director mode suppressed the old keyword response. The player improvised a tether rescue; the director added an interactive plate, a branch, and an epilogue, then atomically committed the rescue and ending. A delayed context proposal was rejected after player interruption; no proposed marker appeared. The player selected a reunion ending. In a spare browser session, an intentionally missing UI module retained the old working component; its existing Read sister letter control still committed a valid action. A final browser failure/recovery round also reached the agent feed: `#57 r4 ui.failed` named the missing module and repair hint; after restoring the override, `#60 r5 ui.recovered` reported healthy custom controls. Only the authored override restore advanced r4 to r5; neither diagnostic changed gameplay revision. The warning disappeared, controls remained usable, and the original completed story was untouched.

Browser combat interaction also exercised movement and a Spark attack; the opponent died and mana/experience updated. Source-refactored frontend routes, session persistence/status, movement, dialogue, choices, and inventory effects were exercised over HTTP.

A narrative account of the actual improvised story and which content remains transient is in [playthrough](playthrough.md).

## Static checks

The earlier legacy-build `npm run check` passed for all 36 JavaScript modules and both source packs (10 and 9 registered actions). It parses every JavaScript module with `node --check`, then loads all packs to validate required world shape, plugin dependencies, and action registration. This unbundled JavaScript project has no transpilation/build step and no TypeScript typecheck. Passing syntax and pack loading is not a claim of exhaustive gameplay correctness.

## Known coverage limits

No long-duration soak, public-network security audit, adversarial plugin sandbox test, multi-process server exercise, arbitrary third-party MCP-client certification, or full accessibility audit was performed. The legacy structured-world combat uses Manhattan range without line of sight and has no cooldown/AOE system; this does not describe every code pack's independently implemented combat rules. Story branch walkthroughs are not exhaustive coverage of every combination. The missing-module fallback was observed in-browser; an exception thrown partway through a custom update has not separately been induced in-browser.
