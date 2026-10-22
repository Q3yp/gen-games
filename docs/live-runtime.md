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
Capability schemas currently support the runtime's simple object-property validator
(types, required, enum, bounds, lengths, additionalProperties); this is not a full
JSON Schema implementation. Games must enforce nested invariants themselves.

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

Every declared capability scope requires an expectedVersions entry. Registered
commands also require expectedRunEpoch. Re-observe and reassess on STALE_SCOPE,
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
