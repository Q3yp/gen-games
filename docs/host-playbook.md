# Host playbook: keep a live world responsive

Use the repository skill at `.agents/skills/game-host/SKILL.md` for the host role.
This playbook connects that role to operational evidence. Exact runtime contracts
live in [agent-tools.md](agent-tools.md) and [authoring.md](authoring.md); discover
the running server rather than assuming a saved example matches its version.

## Start with the live loop

Fresh installs open Live Canvas; valid remembered sessions stay selected. Resolve
the intended session, discover its capabilities once, and attach an actual agent.
Opening the page does not start a model. The game owns arbitrary code, local
controls, simulation and save shape; reusable transport and durability wiring do
not require a component catalog or scene schema.

Keep already-defined interaction and time-sensitive execution local. The director
reacts to meaningful requests and outcomes rather than every frame. Generative
conversation or improvisation may intentionally use host turns as part of play. Balance speed with creative and mechanical quality:
reduce redundant context and tool work, not the depth or expressiveness of the
game. An early consequence or progressive response is useful when it serves play,
not a requirement that every response be tiny. Complex visuals and mechanics may
legitimately take longer; explain what is being built and keep existing play usable. Ordinary plot changes and surprising
player intentions should use compact guarded commands. Do not regenerate the
whole game for each interaction or publish source just to change its story.

### The director's working loop

Use the exact CLI/MCP schemas in [live-runtime.md](live-runtime.md):

1. Attach with a stable, independent consumer and retain its connection token.
2. Wait for incremental events. A delivered turn includes its director token,
   release/run and versions; reuse that context and inspect only missing or stale
   focused state. Do not bootstrap or fetch history again on every turn.
3. Issue a discovered game command with the turn's director token, observed
   release/run, required scope versions and a unique request ID. Set top-level
   `causeEventId` to the triggering event's `data.eventId` for causal timing.
4. Await `runtime.command.result` or a compact receipt showing durable success.
   Queued is not applied. On stale guards, reassess current evidence; on uncertain
   delivery, check the same request ID before retrying.
5. Finish the delivered turn using its `nextCursor`, then wait again, including
   after empty timeouts. Detach when stopping; reattach after a restart/expired lease.

Listening means a wait is actually pending, not merely attached. Keep command
receipts small. `inspect --scope commands --id REQUEST_ID` locates one receipt;
use singular `command` inspection for full arguments only if needed. Never carry
base64 assets or the whole history through routine host turns.

### Spend context on the game, not repeated plumbing

Cache stable discovered capabilities and schemas by game/release. Refresh on
activation or evidence that the contract changed, not on every input; live scope
versions and run guards still come from current turn context. Consume deltas from
the delivered cursor and inspect only the scopes needed for the next decision.
Prefer the supported long-poll wait and delivered result events over repetitive
status polling; a pending command may need a focused receipt check, not a fresh
history dump. Reuse already valid source and assets instead of regenerating them.

Compact transport receipts and focused inspection leave more context for coherent
world state, rich prose, art direction and deeper mechanics. They are not content
length limits or an instruction to simplify the player's requested experience.

### Artwork and genuinely new behavior

Run asset creation and capability implementation independently when their
dependencies permit. Deliver useful intermediate results when available, but allow
necessary design, generation and integration time rather than substituting shallow
placeholders for the requested result. `work start` records guarded work; it does not launch
a worker. Confirm the assigned worker is actually running, especially when reusing
a completed task: sending a message alone may not restart it. Complete work only
with its matching token and still-valid target, then await command acknowledgment.

Import a generated file with `asset` and bind its immutable URL using the game's
existing command (or guarded work completion). This need not publish source or
remount the world. If the requested behavior really is new, edit and publish code
while preserving the current save, await activation, then exercise the new controls.
Never claim “hold left/right” works because that caption or a new choice appeared.
See [live-session-notes.md](live-session-notes.md) for the bounded evidence behind
these priorities, not a reusable game script.

## Presentation boundaries

The reusable shell occupies two small top-right controls: Game menu and Ask host.
Library/session/fullscreen/studio tools are on demand. Request progress remains
visible while queued/working or failed; successful updates briefly acknowledge
completion, then yield the screen. The request history remains in Ask host.

A host owns all game UI and can use any canvas, WebGL or DOM presentation. The
shell does not inject stats, prescribe a component library, rewrite authored CSS,
or hide game controls to manufacture an immersive screenshot. See the shared
skill's “Choose presentation for this game” guidance for experience-appropriate
interaction, information density and accessibility. Text, menus, abstract boards
and dense controls can be the intended game, just as a spatial canvas can. Engine-only refinement must
leave existing game source and saved progress unchanged.

## Use optional design references

Read the [shared host core](../.agents/skills/game-host/SKILL.md). The following
nonexhaustive references are optional, composable design questions. Use any that
help, or none; an unlisted genre needs no new engine category:

- [RPG](../.agents/skills/game-host/references/rpg.md): continuing identity,
  build, quests and world consequences.
- [Roguelike](../.agents/skills/game-host/references/roguelike.md): bounded runs,
  adaptation, risk and a clearly defined reset boundary.
- [Puzzle / sandbox](../.agents/skills/game-host/references/puzzle-sandbox.md):
  understanding rules or expressive construction.
- [Adventure](../.agents/skills/game-host/references/adventure.md): places,
  clues, discovery and environmental problem solving.
- [Conversation / visual novel](../.agents/skills/game-host/references/conversation-visual-novel.md):
  interpretation, expression, relationships and narrative consequence.
- [Action](../.agents/skills/game-host/references/action.md): responsive control,
  timing and readable real-time pressure.

Choose presentation and evaluation from the intended activity, not a required
primary/secondary genre hierarchy. Resolve conflicting assumptions about
continuity, pacing, information and player control explicitly. A genre reference
provides neither runtime APIs nor required mechanics, visuals, success conditions
or a save schema. Existing demos are examples, not default products to reproduce.

### Example starting prompt for a continuing RPG host

> Host the intended RPG session using the shared game-host skill and its RPG
> profile. Read AGENTS.md and this playbook. Run `node src/agent/cli.js discover`
> and `node src/agent/cli.js session --op list`; identify the intended session
> rather than selecting an unrelated one. Open it and discover its session
> schemas using the commands below. Observe current state before changing it.
> Preserve this character, build, inventory, quest outcomes and world changes.
> Identify the next interaction that suits this RPG and the player's intentions.
> Make its relevant choices and consequences understandable. Inspect the existing pack before deciding
> whether the encounter needs source changes. If publishing code, use the
> observed release guard and wait for activation as documented below. Do not
> invent a quest, combat or dialogue tool: use only the discovered contract and
> game-implemented commands. Validate through actual player controls, then
> record the consequence and a reachable next objective in a compact summary.

This is an optional RPG-specific prompt example, not a shared-host requirement or a claim that a session exists or that the runtime
already implements RPG features. The intended game/session must be resolved from
actual context. For action combat, load the action profile too; for a dialogue-led
RPG, load conversation only if that subsystem needs its guidance.

## First contact with a running world

From the repository root:

```sh
node src/agent/cli.js discover
node src/agent/cli.js session --op list
```

Use the returned session ID, not the first convenient session. Open the intended
one and discover its actual action schemas:

```sh
node src/agent/cli.js session --op open --session SESSION_ID
node src/agent/cli.js discover --session SESSION_ID
node src/agent/cli.js director --session SESSION_ID --op attach --consumer game-host
```

`SESSION_ID` is a placeholder. Continue with director wait and keep its delivered
cursor and turn context. For legacy structured-world packs, use `observe` with a
one-time bootstrap instead and inspect only relevant variables/entities. Acknowledge
only events actually read. Use a separate consumer for independent reviewers.

For code packs, frame simulation and save state are browser-local. Server metadata
tracks release activation, coarse checkpoints, command delivery, and events.
Legacy structured-world actions use revisions; code publication and commands use
their own release guards.

A revision conflict means another actor moved the world. Re-observe and reassess;
do not mechanically substitute a fresh revision into an old proposal. A transport
timeout may conceal a successful mutation: inspect before retrying, retaining the
original request ID for an identical retry.

## Frame a useful iteration

Before a substantial change, identify the intended player experience, what the
player can do or perceive, which state must persist, and what evidence would show
an improvement. Add only the questions relevant to this activity: a narrative may
need interpretation and consequence; a management game may need inspectable
systems; a timing game may need response windows. None is a universal template.

Choose the medium and information density accordingly. The game may be textual,
menu-driven, spatial, abstract, audiovisual or a hybrid. Do not add combat,
resource costs, failure, movement or alternative strategies merely to satisfy a
checklist. Preserve meaningful feedback and agency in the chosen form. Distinguish
a requested content edit from a requested new executable behavior; implement and
verify what was actually asked for.

## Source, activation, and recovery

The code-pack manifest declares `runtime: "code"`, an `entry` such as
`"./main.js"`, `saveVersion: 1`, and an arbitrary JSON `initial` save. The entry
exports `create(host, {save, release, previousRelease})` as its default factory.
Legacy code instances require `serialize()` and `dispose()`. With `stateMode = "host"`,
the engine supplies world serialization and lifecycle cleanup; optional authored hooks are
`step(dtSeconds)`, `render()`, `inspect()`, and `command(name, args)`.
The game owns canvas/WebGL/DOM and input listeners. Dispose listeners, animation
resources, and other owned state when the runtime replaces the module.

The host provides `root`, read-only `active`, `emit(type, text, data)`,
`asset(path)`, `checkpoint()`, `requestSave()`, and `notify(text)`. Guard every
player input handler with `host.active`: hidden candidates, replaced instances,
paused/faulted runtimes, and open shell dialogs must not accept gameplay input.
A game-owned tinker mode can still permit edits because it is not a host fault.
Do not use the active check to skip candidate construction, serialization, or its
initial render. Dispose owned listeners even though input is fenced. Keep summary/event payloads under the discovered limits
(current summary budget: 12 KB). Use game-specific event types rather than the
reserved `runtime.*` and `state.changed` names. Keep `inspect()` concise and useful for decisions, rather
than dumping frame state. Emit meaningful events such as a failed attempt,
completed construction, chosen upgrade, or changed objective. Do not emit a log
entry for every frame. Serialize everything needed for a faithful resume; make
migration between releases explicit rather than treating missing fields as
permission to reset progress.

Treat code as trusted local executable material, not safe because it arrived in
JSON. Never evaluate player text as code. Author source inside the game's pack,
then publish the whole tree as an immutable release:

```sh
node src/agent/cli.js inspect --session SESSION_ID --scope runtime
node src/agent/cli.js publish --json '{"sessionId":"SESSION_ID","expectedRelease":"OBSERVED_RELEASE","requestId":"UNIQUE_PUBLICATION_ID"}'
```

Replace placeholders with the actual session, observed `runtime.release`, and
unique request ID. Publication returns `PENDING`, not proof of successful
activation. Observe until `runtime.activated` or `ui.failed`; on failure, the old
runtime remains. Confirm the active release, inspect a browser screenshot, and
exercise the changed mechanic. Do not send follow-up commands against an assumed
new release.

When a game exposes inactive staging, use its guarded command to prepare supported
arrangements while the player still has useful local play. Await the durable
command result, then separately verify the game's safe-boundary entry event; staged
does not mean entered. Save pending content and carry the live player's condition
at entry, not a snapshot captured during staging. Audit upstream exit/recovery
rules too: a later transition cannot recover state already lost by an earlier rule.
Preserve or explicitly migrate staged factory versions across source publication.
These are game-defined commands, not a required engine scene catalog. Genuinely new
rules still need source. If authoring takes time, choose an honest waiting or
stopping experience appropriate to this game; do not promise a change before it is ready.

The running game's capabilities define its command vocabulary; do not invent a
command name from a caption. Use the director turn's release, run and scope guards
as above. Outside that loop, inspect `projection` for these guards before sending
a registered command. The summary/projection is bounded browser telemetry, not a
live frame read; correlate it with semantic events and a fresh browser view when
diagnosing play. A hosting command is not a substitute for player-control validation.

Keep the previous source version before publishing. A world checkpoint is not a
source-code backup. If using the existing checkpoint interface:

```sh
node src/agent/cli.js checkpoint --session SESSION_ID --op save --name before-mechanic
```

For code packs, checkpoint restore rewinds the saved release and save, and
increments `runEpoch`. It is not a routine visual reload.
Preserve the player's work and coordinate a restart or destructive rewind rather
than silently erasing progress. Read the exact activation contract: source saved,
module published, browser loaded, and gameplay exercised are different milestones.

A successful publication response is not sufficient. Confirm the requested
version is active, inspect a fresh screenshot, and use the new mechanic through
real player controls. Correlate the visible result with the latest game summary/events. If publication fails,
retain the last working view and report the exact failed step. Do not claim the
last-good view is the new build.

## Measure the response the player actually waits for

Correlate a real input with `command.causeEventId`, then inspect `timings` for the
matching browser `input-to-command-render` span after telemetry arrives. Record
release/run, start-kind and endpoint: semantic emission and physical input are not
identical starting points. Missing spans do not mean zero latency. Measure actual
model/host turnaround separately from local input feedback, event acknowledgment,
handler time, command acknowledgment and server queue-to-commit. Use each clock's
own elapsed durations, never subtract browser and server wall clocks. A fast
transport receipt does not establish an instant creative response, good controls,
or enjoyment. Track complex visual generation and mechanic design/implementation
separately from routine direction and engine delivery, including quality validation.
Compare like work with like work: a longer, richer generation is not automatically
a regression, and reduced output alone is not evidence of a tooling improvement.

## Independent experience review

Give the reviewer the visible premise and ordinary controls, not hidden state or
an optimal route. Let them participate naturally. Use only applicable questions
from any design references, and ask what they understood, what their actions
changed, what held their interest and what caused friction.

Gather evidence suited to the promise. A conversation may need coherent response
and remembered context; a simulation may need understandable consequences; a
rhythm game may need reliable timing feedback. Replay, strategy comparison,
failure recovery and a second encounter are useful only when relevant. Do not
turn a finite experience into a replay challenge just to validate it.

Correlate player input, visible/audible feedback and persisted consequences where
applicable. Verify the actual requested change and continuity. Separate this
reliability evidence from enjoyment; a scripted completion or attractive image is
not an independent player verdict. Label self-play and tool limitations honestly.
Report concrete friction, fix the most important demonstrated problem, and
recheck the affected interaction before expanding scope.

## Returning with a fresh agent

Start with `library list`, then `workspace read` using the intended stable host ID.
This returns bounded handoff context, source identity and exact save/release freshness;
read current capabilities and only missing saved fields before attaching. Preserve
the game's arbitrary state and established consequences through its own save/command
contract. Before leaving, update the workspace brief, decisions, unresolved work and
artifact references with its observed version. See [library-workspaces.md](library-workspaces.md)
for the full durable library and cross-session handoff workflow. Compare the brief's
`basedOn` freshness with current save, projection and active release. Treat an old
brief as intent/history, not permission to overwrite newer resources or outcomes.
If the source changed, rediscover capabilities before continuing an old plan.

## Optional example: local combat and timed rules

The director can invent an encounter or timed sequence, but local code executes
input judgment and consequences. Use the optional [timed-cue helper](live-runtime.md#optional-local-timed-cues)
when useful, or implement a different local mechanic. Do not wait for a model turn
between cues. Character stats, items, skills and effects remain game-owned code
and save data; [Iron Cadence](../games/iron-cadence/AUTHORING.md) is one extensible
example, not a fixed component schema. New tooltip text is not new executable logic.

For action combat, keep threats legible, openings bounded and defenses worthwhile;
for RPG combat, let those costs affect preparation and the next encounter. Avoid
turning every interaction into a timed sequence. Author new source/assets separately,
then bind or activate at a safe encounter boundary without changing a committed
attack's meaning. Validate rapid input, defense, resource costs, interruption and
resume through normal controls. See [combat-session-notes.md](combat-session-notes.md)
for measured live play and explicit limits on what it establishes.
