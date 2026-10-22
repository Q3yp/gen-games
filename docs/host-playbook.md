# Host playbook: build a game, then learn from play

Use the repository skill at `.agents/skills/game-host/SKILL.md` for the host role.
This playbook connects that role to operational evidence. Exact runtime contracts
live in [agent-tools.md](agent-tools.md) and [authoring.md](authoring.md); discover
the running server rather than assuming a saved example matches its version.

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
node src/agent/cli.js observe --session SESSION_ID --consumer game-host --bootstrap
```

`SESSION_ID` is a placeholder. Keep the returned revision and delivered cursor.
Inspect only relevant state, for example `inspect --scope variables`, or the
specific entity and scene IDs you observed. Acknowledge only events actually read.
Use a separate consumer for independent reviewers.

For code packs, frame simulation and save state are browser-local. Server metadata
tracks release activation, coarse checkpoints, command delivery, and events.
Legacy structured-world actions use revisions; code publication and commands use
their own release guards.

A revision conflict means another actor moved the world. Re-observe and reassess;
do not mechanically substitute a fresh revision into an old proposal. A transport
timeout may conceal a successful mutation: inspect before retrying, retaining the
original request ID for an identical retry.

## The experiment card

Before a substantial change, write a small working note with:

- **Verb:** What can the player directly do?
- **Tradeoff:** What makes two plausible moves differ?
- **Readable consequence:** What changes on screen, and what state confirms it?
- **Failure and recovery:** What can go wrong, how will the player know why, and
  what can they try immediately afterward?
- **Novel code:** Which new rule or interaction requires executable source rather
  than a renamed choice or number adjustment?
- **Observation:** What would make you keep, revise, or discard this experiment?

For example, a resonator that converts rhythmic flashes into steering is a new
mechanic only if pulse timing actually affects movement. A glowing resonator that
merely triggers a predefined narrative choice is not the same experiment.

Do not require every game to use beams, puzzles, combat, or even a win condition.
A toy can succeed through expressive combinations and satisfying surprises. Its
interactions still need observable cause and effect.

## Source, activation, and recovery

The code-pack manifest declares `runtime: "code"`, an `entry` such as
`"./main.js"`, `saveVersion: 1`, and an arbitrary JSON `initial` save. The entry
exports `create(host, {save, release, previousRelease})` as its default factory.
Its return value requires `serialize()` and `dispose()`; optional hooks are
`step(dtSeconds)`, `render(alpha)`, `inspect(query?)`, and `command(name, args)`.
The game owns canvas/WebGL/DOM and input listeners. Dispose listeners, animation
resources, and other owned state when the runtime replaces the module.

The host provides `root`, `emit(type, text, data)`, `asset(path)`, and
`checkpoint(reason)`. Keep summary/event payloads under the discovered limits
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

The running game can expose its own command vocabulary and concise summary.
The summary is the latest bounded `inspect()` snapshot, not a live frame read.
Session state is likewise the latest durable coarse save. Correlate both with
events and a fresh browser view before diagnosing current play:

```sh
node src/agent/cli.js inspect --session SESSION_ID --scope summary
node src/agent/cli.js inspect --session SESSION_ID --scope commands
node src/agent/cli.js command --json '{"sessionId":"SESSION_ID","expectedRelease":"OBSERVED_ACTIVE_RELEASE","requestId":"UNIQUE_COMMAND_ID","name":"GAME_DEFINED_COMMAND","args":{}}'
```

Use the observed `runtime.activeRelease` and a command actually implemented by the
game. Delivery returns `PENDING`; observe `runtime.command.result` or inspect
commands before assuming execution. The `commands` scope is not permission to
invent a command name. Inspect source and the game's summary to understand its
supported vocabulary. A command can support hosting, but do not bypass the
player controls when validating whether the interaction is playable.

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
real player controls. Observe the authoritative result. If publication fails,
retain the last working view and report the exact failed step. Do not claim the
last-good view is the new build.

## Independent replay, not a scripted victory lap

Give the reviewer only the player-facing controls and goal. Let them discover the
mechanic before explaining its intended cleverness. Have them replay with a
meaningfully different strategy: alter timing, topology, resource allocation,
movement route, or combination of tools, not merely choose a different caption.

Capture a short evidence record:

| Question | Evidence to capture |
| --- | --- |
| Could the player find an action? | Screenshot and their first attempted input |
| Did the action feel immediate? | Visible feedback and matching event/state |
| Was the decision interesting? | Two viable alternatives and their consequences |
| Was failure understandable? | Cause visible before or at failure; recovery path |
| Did replay differ? | Second strategy and changed outcome or new insight |
| Did code authorship matter? | New mechanic's actual rule and exercised behavior |

If independent replay is unavailable, label the review self-play. Do not call a
successful scripted path independent validation. Do not invent player enjoyment.

End each iteration with a specific judgment such as: “Rotating the mirror gives
immediate beam feedback, but losing the boat gives no warning; add a danger wake
before tuning difficulty.” Avoid “Everything is fun and polished.” Fix the most
important evidenced problem and replay that interaction. Keep deeper architecture
changes tied to a concrete limitation in what the player or host can do.
