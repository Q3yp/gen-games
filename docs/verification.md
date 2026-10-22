# Execution and play-through record

Verification date: 2026-10-22. No test suite or test files were created, per the project request. The checks below were performed against real running code; syntax checks are listed separately from gameplay.

## Runtime and tool execution

Manual HTTP sessions, CLI processes, and MCP stdio calls exercised:

- Discover both installed packs and action-specific argument schemas.
- Create/open saved sessions with deterministic uint32 seeds.
- Player/agent actions, revision advancement, targeted entity/path inspection, and atomic authoring.
- Identical action retry returning the original result without executing again, including after closing/reopening the server database.
- Changed/old expected revision returning `STALE_REVISION`, with no state changes.
- An author batch that first changed a variable then deleted the required player: rejected with `INVALID_PLAYER`; the earlier variable edit was absent afterward.
- Observe bootstrap, independent consumers, delivered-versus-acknowledged cursors, two-row/256-character pagination, `hasMore`, valid acknowledgement, and rejection of a future acknowledgement.
- A content-mode asset job started, an unrelated tactical turn occurred, and the guarded asset committed successfully without overwriting world changes.
- A contextual job started, world revision changed, and late commit returned `STALE_JOB`.
- Cancellation followed by late commit returned `JOB_NOT_RUNNING`; a pending job was observed as `interrupted` after an actual server restart.
- A synchronous clock plugin ran on a real 100 ms interval for five ticks (world revision 5, simulated 500 ms). A guarded asset job then committed at revision 6; the older context proposal was rejected.
- A two-second long-poll returned about 109 ms after a new player action woke it.
- Director mode bypassed a known Mara keyword, an atomic reply committed text plus an asset/flag edit, and an invalid scene edit rolled the entire reply back. Data-SVG was accepted; a javascript: asset returned `UNSUPPORTED_ASSET_URL` and a repair hint.
- Named checkpoint save, subsequent play, and restoration to a new revision with a monotonic event cursor.
- Newly authored opponent, item, skill, learned-skill entry, inventory entry, and asset registry record through the tools. The player cast the new skill, defeated the new opponent, used the new item, and inspected the resulting state.
- SSE subscription received revisioned patches and semantic events, without a full `session` snapshot in the stream payload.
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

That exercise found concrete friction and drove changes: current-scene inspection defaults, IDs in bootstrap, changed-path summaries, explicit director routing instead of substring keyword interference, atomic reply plus world edits, wider player layout, hidden spoilers/inspector by default, no duplicate custom/shell inputs, and source-reload controls. After restart, the browser resumed the same live-authored branch; the new data-SVG loaded successfully and explicit director mode suppressed the old keyword response. Completion of the updated play flow and custom-component fallback recheck are recorded below when finished.

Browser combat interaction also exercised movement and a Spark attack; the opponent died and mana/experience updated. Source-refactored frontend routes, session persistence/status, movement, dialogue, choices, and inventory effects were exercised over HTTP.

## Static checks

`npm run check` parses every JavaScript module with `node --check`, then loads all packs to validate required world shape, plugin dependencies, and action registration. This unbundled JavaScript project has no transpilation/build step and no TypeScript typecheck. Passing syntax and pack loading is not a claim of exhaustive gameplay correctness.

## Known coverage limits

No long-duration soak, public-network security audit, adversarial plugin sandbox test, multi-process server exercise, arbitrary third-party MCP-client certification, or full accessibility audit was performed. Combat currently uses Manhattan range without line of sight; there is no cooldown/AOE system. Story branch walkthroughs are not exhaustive coverage of every combination. Local render smoothness and custom component error fallback require browser observation, not just API calls.
