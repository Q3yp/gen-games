# Live arbitrary-code runtime

The game owns its JavaScript, DOM/canvas, frame simulation, save schema and
invariants. The engine owns event delivery, command fencing, durable acknowledgments,
agent cursors and immutable content. There is no required scene/entity catalog.
Existing code packs without the optional hooks still work.

## Optional game hooks

```js
return {
  serialize, dispose, step, render,
  inspect: () => ({ conversation: state.conversation, weather: state.weather }),
  versions: () => ({ conversation: state.conversationVersion }),
  capabilities: () => [{
    name: 'conversation.reply',
    description: 'Add a response to the current conversation.',
    inputSchema: {
      type: 'object', required: ['text'], additionalProperties: false,
      properties: { text: { type: 'string', maxLength: 1000 } }
    },
    scopes: ['conversation']
  }],
  command(name, args, context) {
    // Validate game-owned invariants BEFORE mutating. Keep handlers synchronous.
    // Update state, increment the relevant version, emit consequences, return.
  }
};
```

Versions are arbitrary game-defined string or finite-number tokens. Increment them
when the relevant meaning changes, not necessarily on every rendered frame.
Capability and action schemas support a small recursive subset: `type` (including
`null`, finite `number`/`integer`, and unions such as `['string', 'null']`), `anyOf`,
primitive `enum`, `minimum`/`maximum`, string `minLength`/`maxLength`, object
`properties`/`required`/`additionalProperties: false`, and array `items` (one schema)
plus `minItems`/`maxItems`. `anyOf` requires at least one matching option and does
not replace sibling constraints. Bounds apply only to numbers, lengths only to
strings/arrays; nullable values skip incompatible constraints. Errors identify
nested paths such as `enemies[0].kind`. This is not full JSON Schema: other keywords
(including `$ref`, `oneOf`, and `pattern`) are ignored. Games must still enforce
game-specific invariants in their handlers.

`host.emit(type, text, data)` returns a correlation ID and queues a bounded,
immediate semantic event, independently of the coarse save timer. Data and projection
are captured at emission. Use semantic interactions, not frame-by-frame telemetry.
The browser retries stable event IDs; the server durably deduplicates them. Pending
browser queues are memory-local, not an offline outbox surviving browser crashes.
Backpressure is reported rather than silently dropping a full queue.

`inspect projection` supplies summary, versions, release, runEpoch, observedAt and
telemetrySeq. This is timestamped browser telemetry, not a promise of current frame
state. Scope guards are checked on enqueue and again in the playing browser directly
before invoking a command. Newer telemetry sequences cannot be overwritten by slower
requests from the same run/release. `observe` returns bounded structured events;
large payloads indicate truncation and can be fetched via `inspect event`.

## Live commands, not source releases

```sh
node src/agent/cli.js discover --session SESSION --raw
node src/agent/cli.js inspect --session SESSION --scope projection --raw
node src/agent/cli.js command --json '{"sessionId":"SESSION","name":"conversation.reply","args":{"text":"The figure answers."},"expectedRelease":"OBSERVED_RELEASE","expectedRunEpoch":1,"expectedVersions":{"conversation":3},"requestId":"reply-unique-1"}' --raw
```

Every declared capability scope requires a version guard. Registered commands also
require a run guard. With a valid directorToken, omitted guards can inherit from
the exact delivered turn snapshot as described below; ordinary commands still
provide expectedVersions and expectedRunEpoch explicitly. Re-observe and reassess on STALE_SCOPE,
STALE_RUN or STALE_RELEASE; do not blindly replace guards on stale generated work.
Reusing a request ID with identical arguments returns its known state, not a second
application. Queued is not applied: wait for runtime.command.result.

The browser commits an application ID, result/error, resulting serialized save,
projection and command-emitted semantic events in one SQLite transaction. It keeps
an exact acknowledgment envelope for uncertain retries and pauses runtime-managed
input/frames until that save is acknowledged. Failed handlers may already have
mutated arbitrary game state: their captured state is persisted, not rolled back.
The game owns timers and side effects outside the runtime; the engine cannot undo
or cancel them. Detectable async registered handlers are rejected before invocation;
returning an unexpected Promise after invocation can already have effects. Use
external work instead. Legacy unregistered async commands remain compatible.

## Attach an actual director

The server does not invent an LLM connection. An actual coding agent, native agent,
or provider adapter continuously calls the director tool through CLI or MCP:

1. `director {op:"attach",sessionId,consumer:"host"}` returns a connection token.
2. `director {op:"wait",sessionId,token,waitMs:25000}` long-polls incremental events.
3. For a returned directorToken, inspect only needed scopes and issue commands with
   that directorToken, release/run and relevant versions. Wait for their results.
4. `director {op:"finish",sessionId,token,directorToken,cursor:nextCursor}` acknowledges
   the delivered turn. Repeat wait, including after empty timeout responses.
5. Detach when stopping. Expired leases/server restarts report offline; stable
   consumer acknowledgments survive restart and allow replay.

Listening means a real wait is pending; thinking means a delivered turn is active;
attached means connected but idle. No waiting tool alone is an autonomous director.
Tokens prevent old turns acting after replacement/expiry. A token-bearing command
gets a server authorization check directly before browser invocation; this is not a
distributed lock over arbitrary game code. A committed application remains durable
if the director subsequently disconnects.

## Background work and generated visuals

`work start` records a game command plus run/release/relevant-version guards and
returns immediately. The external agent starts the actual worker; no provider or
process is implicitly launched. `work complete` with its token and result arguments
queues the guarded game-defined completion command. Late, canceled or stale work
cannot bind to a changed target. Queued completion still requires browser acknowledgment.

`asset {sessionId,path:"assets/generated.png",requestId}` imports a raster/audio file
from this game's directory into immutable content-hash storage. Its returned /assets/
URL is independent of source releases. Bind that URL through a game-defined command,
possibly work complete. Existing running game code can load the visual without
remounting. Asset generation and bindings are deliberately not universal game objects.
Asset garbage collection and a durable browser offline outbox are not included.

## Latency evidence

Browser performance measures use the browser's monotonic clock for emission→next
render, event acknowledgment and command application/acknowledgment. Correlation IDs
connect these spans to events/commands. Server queueToCommitMs uses only server time.
Do not subtract browser and server wall clocks. Measure actual agent response time
separately; a transport benchmark is not a model or creative-generation benchmark.

### Correlate player input to a command render

Set top-level `command.causeEventId` to the triggering event's `data.eventId` from
`director wait` or `observe --raw`. The browser retains at most 500 local origins.
Synchronous DOM input→host.emit calls use the captured input-dispatch timestamp;
other emissions use semantic emission time and are labeled accordingly. On the
first normal render after a successful correlated command's durable acknowledgment,
`performance.getEntriesByName('gen-games.input-to-command-render')` exposes duration
and detail `{causeEventId, commandId, startKind, endpoint}`. All elapsed time uses
that tab's `performance.now()`. It measures a command render, not subjective useful
response quality, and includes durable acknowledgment delay. Missing/evicted origins,
other tabs and reconnects intentionally produce no span. The command hook context
also carries causeEventId. No game schema or mandatory correlation field is added.

### Keep command context incremental

Command replies, queued/result semantic events, and `inspect commands` contain
concise receipts, not original arguments or embedded assets. The default command
inspection includes pending commands plus the five latest completed receipts.
Use `inspect commands --id REQUEST_ID` for one compact receipt, or explicitly
`inspect command --id REQUEST_ID --raw` for that command's full durable arguments
and result. The playing browser privately retrieves a queued command by ID before
applying it; agent observation does not need to carry its executable inputs again.

`inspect --scope timings --raw` exposes up to 30 recent spans through normal browser
telemetry (usually the next checkpoint, not a per-frame event stream). Each includes
`clock: browser.performance.now`, correlation ID, durationMs, release/run, and causal
origin/endpoint labels where applicable. The enclosing observedAt is server receipt
time, not an operand for elapsed-time calculation. Timings from another run are
historical; absence of a matching causal span is not evidence of zero latency.

### Short director commands without weakening guards

A valid directorToken allows omitted expectedRelease, expectedRunEpoch, and required
expectedVersions entries to inherit from the immutable metadata delivered by that
turn's `director wait`. Only the command capability's declared scopes are inherited,
not unrelated asset or character scopes. This saves repeated guard tokens, not
creative content, and never reads newer state to repair stale work automatically.

```sh
node src/agent/cli.js command --json '{"sessionId":"SESSION","directorToken":"TURN_TOKEN","requestId":"reply-2","name":"conversation.reply","causeEventId":"INPUT_EVENT_ID","args":{"text":"A fully developed response can go here."}}' --raw
```

Explicit guards still override the corresponding inherited fields and are validated
normally. A partial expectedVersions object inherits only missing required scopes.
If a required scope was absent in the delivered snapshot, the request fails with
DIRECTOR_SNAPSHOT_MISSING. If that scope has since changed, it fails with STALE_SCOPE;
run/release changes invalidate the turn. Observe and reassess instead of patching
stale guards. A second command changing the same scope within one turn must supply
an explicitly re-observed version or start another turn; inheritance is not refreshed.

Commands without directorToken keep their existing explicit guard requirements.
Identical request-ID replay uses the original raw request fingerprint before token
validation, so an already-applied command still reports its durable receipt after
the turn expires. Changing omitted guards to explicit guards changes that raw request
and is not an identical retry. The snapshot is bounded metadata, not another world
save, and is not repeated in each command response.

## Optional local timed cues

`/code-qte.js` exports `createQTE`, `validateQTE` and `qteSequenceSchema(actions)`.
It is an opt-in input judge, not a renderer, combat model, scene catalog or timeline
language. Games choose action names, visuals, consequences and command names. The
agent sends readable cue data once; timing and judgment never wait for an LLM or
server response. See Iron Cadence for a complete game-owned integration.

```js
import { createQTE, qteSequenceSchema } from '/code-qte.js';
const actions = ['strike', 'guard', 'dodge'];
const qte = createQTE({ actions, onResult(result) {
  // Apply game-owned consequences synchronously, once per result.id.
  // Store the receipt and consequences TOGETHER in your serialized game state.
  // Cancellation is not a combat failure or reward.
  applyResultOnce(result);
  host.emit('combat.qte.result', 'Timed sequence resolved.', result);
  host.requestSave();
} });
// A game-defined guarded command, not a new engine command:
qte.start({ id: 'bridge-riposte-1', label: 'Break the guard', timeScale: 1.25,
  cues: [
    { action: 'guard', kind: 'hold', prepareMs: 900, windowMs: 1400, holdMs: 600 },
    { action: 'strike', kind: 'tap', prepareMs: 650, windowMs: 900 }
  ]
}, { expectedId: null });
// In the game's existing local step/input/save/dispose hooks:
qte.step(dt); // Seconds, active simulation time only.
qte.input('guard', true, { repeat: event.repeat });
qte.input('guard', false); // Deliver release edges even when host.active is false.
qte.status(); // Small presentation snapshot; do not emit it every frame.
qte.serialize(); // Include under any game-owned save field.
qte.dispose();
```

Declare the command's sequence property as `qteSequenceSchema(actions)` and scopes
such as `['encounter', 'qte']`. The host's simple validator is not a full nested JSON
Schema validator: the helper validates the entire sequence before replacing anything.
`INVALID_QTE` names the invalid field, including a cue index. Require observed scope
versions and bump the game-owned QTE version at meaningful boundaries (start, terminal,
cancel), not each frame. A local `expectedId` guard additionally prevents accidental
replacement: pass null for idle/completed state, or the exact active sequence ID.
`cancel(expectedId, reason)` requires that same active ID. A replacement emits one
cancelled result before installing the new, already-validated sequence. An identical
start of the helper's current/latest ID is a no-op; changed data under that ID fails.
Older IDs are not retained: use unique authored IDs and a game-owned receipt ledger.

Sequence contract:
- Required `id` (1–80 characters) and `cues` (1–24). Optional `label` (1–160),
  `prepareMs` (250–5000; default 800) and `timeScale` (0.5–3; default 1).
- Each cue requires an allowed `action`, `kind: 'tap' | 'hold'`, and `windowMs`
  (200–10000). Optional unique `id`, `label` and `prepareMs` override presentation
  or preparation. Holds require `holdMs` (100–8000), no longer than their window.
- All durations are multiplied by timeScale. Larger values are more forgiving.
  Show the complete upcoming cue during preparation, the remaining window and hold
  progress during execution; supply readable text and non-color-only feedback.
- Only a fresh press in the window counts. Repeats and already-held keys cannot
  satisfy a cue. Early presses and other actions are ignored, not penalized. A hold
  must begin in the window and finish before its deadline; early release misses.
  Release before pressing the same action again, including between adjacent cues.
- Each resolved cue advances to a new full preparation, without carrying frame
  overshoot forward. All cues play; terminal outcome is success, partial, failed,
  or cancelled. One bounded callback contains cue outcomes and reasons; there are
  no per-frame/per-key network messages. `offsetMs` is press time after window-open
  in scaled local simulation milliseconds, not server wall time.

Lifecycle and fair interruption:
- Call step only from the game simulation and fence press handling with `host.active`.
  The helper automatically pauses on blur or hidden document, never times out in a
  background tab, and owns/removes those two listeners. `pause(reason)` and `resume()`
  support game menus. Resume is explicit, never automatic; render a clear Resume
  control. The current cue restarts its full preparation; completed cue results stay.
- Pausing abandons partial hold progress without a miss. A key known to be held at
  pause may have been released outside the tab: explicit resume clears stale key
  tracking. Keyboard adapters must forward KeyboardEvent.repeat; a still-held key
  produces repeats, which cannot count, while a genuinely fresh press can. Do not
  synthesize fresh presses from polled held controls after resume.
  Explicit resume cannot run while the document is hidden. Input bindings and touch
  alternatives remain the game's responsibility; map all of them to semantic actions.
- `step(dt > 0.25)` pauses as `frame-gap` only when the caller supplies that large
  delta. The existing host caps dt and Iron Cadence uses fixed substeps: these paths
  do not detect real-time frame stalls. QTE time follows their slowed simulation,
  without a surprise timeout or free hold progress from wall-clock elapsed time.
  This helper has no monotonic wall-clock stall observer. No wall-clock timer
  runs while host frames are paused for durable command acknowledgment or a menu.
- `restore(serializedQte)` restores completed cue results, but resumes no live timer:
  unfinished sequences start paused with reason `restored`, then replay the current
  cue preparation on explicit resume. Terminal results are not callback-replayed.
  Reload never subtracts time spent outside the tab or resets unrelated world state.

Durability is deliberately the existing runtime contract, not a new event log.
Starting/cancelling in a synchronous game command is included in its atomic command,
save and event acknowledgment. Later local input outcomes request an ordinary
checkpoint; checkpoint and semantic event delivery are not atomic with one another.
Store reward receipt IDs and all world consequences in the same save, and deduplicate
external follow-up by sequence ID. A crash before that save reaches the server can
lose recent local progress and replay its unfinished cue on recovery; queued browser
events can also be lost. This helper does not claim crash-proof exactly-once rewards,
a durable offline outbox, or release-versioned helper code. Its root-relative module
is shared engine code; game source releases alone do not pin this helper's revision.
