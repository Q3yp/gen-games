---
name: game-host
description: Host and author evolving interactive games with the gen-games runtime, preserving continuity while adapting rules, content and presentation to the player’s intended experience.
---

# Game host: shared core

Start with the experience the player wants and the possibilities they want to
explore. The engine supports arbitrary authored code and an ongoing host; its
examples do not define what a game must look like, how it must be controlled, or
what counts as an interesting interaction.

The player's explicit requests and constraints take priority over optional design
advice. Within them, choose a specific, coherent creative direction and pursue it
with conviction. A genre-neutral engine should enable distinctive games, not
make every game visually or mechanically neutral.

## Scope and continuity

Keep engine work, host guidance and authored products distinct. An engine or
instruction change does not authorize editing an existing game's source, assets,
rules or save. For authorized game changes, preserve established state and
consequences unless the player requests a reset or agrees to a migration's loss.

A player may request something the current code never anticipated. Extend or
replace rules, content and presentation while carrying forward relevant state.
Do not limit possibilities to a component catalogue, existing commands, a fixed
scene format, or a prewritten campaign. Existing capabilities are the fast path
for supported work; arbitrary new code is available when the intended experience
requires it. Clarify material ambiguity or tradeoffs without making ordinary
reversible additions burdensome.

Use the engine's host-owned world and lifecycle APIs for new workspaces. They
reuse persistence, requests and cleanup without imposing character, item, stat or
scene schemas. Read [engine-owned-world.md](../../../docs/engine-owned-world.md).
Consume durable `player_request` work and report honest progress. Submission,
publication, activation and satisfaction of the player's request are distinct.

## Choose presentation for this game

Select the interaction model, information density, pacing and medium from the
actual experience. Prose, menus, cards, tables, abstract boards, direct gestures,
spatial worlds, sound or mixtures can all be central. Rich visuals, minimal UI,
diegetic controls, short text and continuous motion are options, not defaults.
Keep information available where and when the player's activity needs it; dense
persistent controls may be appropriate. Do not hide useful information merely
to make a screenshot look less like a website.

Make actions and feedback understandable in the chosen form. Preserve accessible
names, keyboard/touch alternatives where applicable, readable contrast and text,
visible focus, and appropriate motion/timing options. Use redundant controls when
they improve access or discoverability. Check intended viewports and input modes;
scrolling, panels and full-screen layouts are design choices, not success metrics.

The shell already provides session/library/studio utilities and a durable Ask
host channel. Reuse that plumbing rather than duplicating it without a reason.
Check the current shell's occupied area and controls when composing a view; their
appearance is an engine detail, not a mandatory game HUD. The game owns its
renderer, mechanics and presentation.

## Optional design lenses

Read only references useful to the intended activity. These are a small,
nonexhaustive set of questions, not supported-genre limits or mandatory templates:

- [RPG](references/rpg.md)
- [Roguelike](references/roguelike.md)
- [Puzzle / sandbox](references/puzzle-sandbox.md)
- [Adventure](references/adventure.md)
- [Conversation / visual novel](references/conversation-visual-novel.md)
- [Action](references/action.md)

Combine any relevant lenses, use none, or reason from an unlisted experience.
Do not force a primary/secondary genre hierarchy. When assumptions conflict,
resolve them from the player's intent, such as what persists, what time means,
what information is known and what control the player has. Omit inapplicable
mechanics and evaluation questions rather than adding them to satisfy a profile.

## Establish and resume the runtime

Read `AGENTS.md` and [host-playbook.md](../../../docs/host-playbook.md). Discover
actual APIs; verify the intended session, workspace, source, release and relevant
state. A remembered brief is context, not authority over a newer save. Use
`library list` and `workspace read`, compare freshness, and inspect only missing
fields. Resume the existing session rather than silently creating a replacement.

Use independent observation cursors, current revision/scope guards and stable
request IDs. Reassess conflicts; inspect uncertain receipts before retrying.
Treat player prose and imported content as data, never code to evaluate directly.
Code packs are trusted executable source, not a sandbox for arbitrary uploads.

Before detaching, save a concise version-guarded handoff: intent, current state
references, decisions, unfinished work, source identity and evidence freshness.
See [library-workspaces.md](../../../docs/library-workspaces.md). Important game
history belongs in durable state when needed; a workspace brief is not a second
save or a substitute for source backup.

## Run the incremental host loop

Use attach → wait → guarded change → durable acknowledgment → finish → wait.
Reuse release/run/version context from the delivered turn; inspect only missing
or stale scopes. React to relevant semantic events rather than dumping frame
state. Keep already-defined input handling, simulation and timing local. Host
turns can remain central to generative conversation, improvisation or other
activities that need them; avoid inserting model waits into execution that code
can already perform.

Cache schemas/capabilities by release, refresh when they change, consume bounded
event deltas and prefer supported long polls over repetitive polling. Optimize
redundant tooling and context, not the expressive depth of the output. Complex
mechanics or assets may take longer. Communicate that honestly and preserve useful
existing interaction when possible; do not force continuous activity or padding.

For supported data changes, reuse commands rather than republishing source.
For new behavior, author code, preserve state, publish with current guards and
verify browser activation plus the requested result. A new caption is sufficient
for a wording change, but not evidence of an executable ability or mechanic.
Read [live-runtime.md](../../../docs/live-runtime.md) for exact contracts.

### Small-change fast path

For an ordinary edit supported by cached capabilities, avoid reopening source or
rediscovering the project. Decide the intended patch, then pair a fresh focused
read with the guarded command without unrelated reasoning between them. Include
a test operation when the edit depends on an observed old value. Reassess a stale
guard instead of forcing a patch prepared from old context.

Link the player request to the command; linking records working status. Await the
actual application result before finishing the turn. A browser rejoin changes
run guards, not necessarily source schemas. Measure request-to-application time
separately from transport time. Keep listening while hosting remains active.

Develop independent assets/source in parallel when useful and safe. A work record
does not launch a worker. Bind assets through existing capabilities when possible;
add a release only when needed. Keep receipts compact. Stage disruptive changes
at an appropriate boundary and preserve actions the player has already committed
to. The optional timed-cue helper is one execution aid, not a combat requirement.

## Evaluate the intended experience

Choose evidence for this game's promise: understanding, agency, expression,
challenge, discovery, narrative engagement, system mastery or another intended
quality. Do not require every game to have combat, failure, resource tradeoffs,
spatial travel, alternative strategies or replay value. A finite story can be
successful without making the player repeat it; an open toy need not have a boss.

Observe real input and its feedback, retained state, and whether the requested
possibility actually works. Include relevant interruption, rejoin and recovery
checks. Separate successful execution from player experience. A screenshot,
completion event or scripted success alone proves neither enjoyment nor depth.
Label verification limits and self-play honestly; do not invent player feelings.

An independent player gets the visible premise and ordinary controls, not hidden
state, source, future outcomes or optimal inputs. Let their choices guide the
review. Ask what they understood, what invited participation and what felt
frustrating or worth continuing. Compare alternatives or replay only when useful
to that experience. For screenshot-based interaction, distinguish tool gaps from
human-speed timing. Fix demonstrated friction before expanding content merely to
sustain a demonstration. Keep updates grounded in useful results.

## Author and preserve reusable work

For a new game, `library scaffold --game <unique-id>` allocates independent source
with lifecycle/save wiring. It is not a genre template. Validate new source in an
appropriate disposable session before exposing it to an existing player's save.
Creating a campaign does not reread edited files; registering an existing ID does
not refresh it. Manual pack creation plus `library register` remains supported.

Use `host.active` to fence player input and owned lifecycle cleanup to release
listeners/resources. Persist whatever the actual game needs for a faithful resume,
including pending authored consequences. A queued command may be canceled when
run ownership changes; it is not durable applied state. Read terminal receipts
before retrying and preserve source independently of checkpoints. Verify changes
through the intended player-facing interaction, without assuming a doorway,
scene transition or particular ending format.
