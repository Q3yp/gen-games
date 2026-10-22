# Agent tools: CLI and MCP

The browser, CLI, and MCP bridge use one authoritative running HTTP server. Neither
adapter owns a second world, evaluates agent-supplied code, or retries mutations.
Node 24 or newer is required; no third-party packages are needed.

## Start and discover

Run the server from the repository root in one terminal:

```sh
npm start
```

In another terminal:

```sh
node src/agent/cli.js discover
node src/agent/cli.js session --op create --game ember-vault --seed 42
node src/agent/cli.js session --op list
```

Use the returned session ID below. `session --op open --session ID` opens a
concise existing-session summary, without resetting the game. `discover --session
ID` includes that game's action descriptions and schemas. The browser and agents
can share the same session.

`GEN_GAMES_URL` defaults to `http://127.0.0.1:3000`; `--url` overrides it. Use a
trusted server URL. This is a trusted-code, loopback-first runtime, not a hardened
public service. If the server requires a bearer token, set the same
`GEN_GAMES_TOKEN` in the CLI/MCP environment; it is sent only in the Authorization
header and never printed. `GEN_GAMES_SESSION` supplies an optional CLI-only default session ID.

## Small-context observe → inspect → act loop

```sh
export GEN_GAMES_SESSION='PASTE_SESSION_ID'
node src/agent/cli.js observe --consumer coder --bootstrap
node src/agent/cli.js inspect --scope variables
node src/agent/cli.js inspect --scope path --path '["player"]'
```

1. Bootstrap once for a compact current baseline, revision, and delivered cursor.
2. Request focused details with `inspect` only when the baseline is insufficient.
3. Submit a mutation with the exact observed revision and a unique request ID.
4. Read bounded changes. Acknowledge a cursor only after processing that delivery.

For example, after actually observing revision `4`:

```sh
node src/agent/cli.js act --action world.move --args '{"dx":1,"dy":0}' \
  --revision 4 --request move-east-1
```

To observe after a delivered cursor of `7`, then acknowledge it:

```sh
node src/agent/cli.js observe --consumer coder --after 7 --limit 12 --chars 3000 --wait 15000
node src/agent/cli.js observe --consumer coder --ack 7 --limit 12 --chars 3000
```

Use your actual returned cursors, not these example numbers. Observation has two
important boundaries:

- A delivered cursor means those events were returned, not that the agent processed
  them. Named consumers do not automatically acknowledge delivery or bootstrap.
- The server's head cursor can be ahead of a truncated page. Continue from the
  delivered cursor, never the head, or you could skip events.

Without `--after`, observation resumes from the named consumer's acknowledged
cursor, or zero for an unnamed observer. `--ack` requires `--consumer`. Keeping
separate names for independent agents avoids cursor interference. An invalid cursor returns a repair hint; bootstrap a fresh baseline when needed
instead of pretending no events occurred.

Inspect supports `session`, `entity`, `scene`, `asset`, `skill`, `entities`,
`scenes`, `assets`, `skills`, `variables`, `dialogue`, `path`, and `event` scopes.
Use `--id` for a named item. For a numeric event sequence, full JSON is unambiguous:

```sh
node src/agent/cli.js inspect --json '{"scope":"event","id":7}'
```

## Atomic authoring

Authoring paths are arrays into `session.state`, not dotted strings or JavaScript.
Edits apply atomically and must pass the authoritative server's validation.
A small example, replacing `4` with the current revision:

```sh
node src/agent/cli.js author --revision 4 --request weather-1 \
  --operations '[{"op":"set","path":["variables","weather"],"value":"rain"}]'
```

Use `op: "delete"` without a value to remove a field. Do not delete required world
structure or modify protected prototype paths. Prefer supported game actions for
normal play; use authoring to build or refine the game world.

Every field can also be supplied as a generic JSON object:

```sh
node src/agent/cli.js author --file edit.json --raw
printf '%s\n' '{"op":"list"}' | node src/agent/cli.js session --file -
node src/agent/cli.js act --json '{"sessionId":"SESSION","action":"world.move","args":{"dx":1,"dy":0},"expectedRevision":4,"requestId":"move-east-1"}'
```

`--json` means the entire tool argument object; `--args` means nested action
arguments. JSON/file objects merge left-to-right; explicit flags override all
objects, regardless of flag placement. `--file -` reads stdin once. No shell
expressions or JSON contents are evaluated. Generic JSON is passed through to the
server, so new supported fields do not need new CLI flags.

## Background jobs and checkpoints

Start a job against the revision used to generate its proposed edits:

```sh
node src/agent/cli.js jobs --op start --revision 4 --label 'Build a side room'
node src/agent/cli.js jobs --op list
```

Keep the returned job ID and token. To commit, provide them, the job's expected
revision, a request ID, and the proposed operations:

```sh
node src/agent/cli.js jobs --op commit --id JOB_ID --token JOB_TOKEN \
  --revision 4 --request room-job-1 \
  --operations '[{"op":"set","path":["variables","sideRoomReady"],"value":true}]'
node src/agent/cli.js jobs --op cancel --id JOB_ID
```

The default `context` mode fences work by its starting revision and scene. A
cancelled or stale context job cannot commit. Do not change its revision to the
latest number just to bypass a conflict. Re-observe, reassess the proposal, and
start fresh work if needed. Transport cancellation only stops the local wait; use
the `jobs` tool to cancel an actual background job.

For independent generated assets or skills, start a `content` job with exact
guarded target paths. Replace revision `4` with the current revision:

```sh
node src/agent/cli.js jobs --op start --revision 4 \
  --json '{"mode":"content","paths":[["assets","new-art"],["skills","new-skill"]]}'
```

Content mode snapshots target digests rather than fencing every player/tick
change. Commit can omit `expectedRevision`, but must provide the job ID/token,
request ID, and operations only on the exact guarded asset/skill paths. Changed
targets or cancelled jobs are still rejected. This is not a way to merge arbitrary
world-state changes.

```sh
node src/agent/cli.js checkpoint --op save --name before-edit
node src/agent/cli.js checkpoint --op list
node src/agent/cli.js checkpoint --op restore --name before-edit \
  --revision 5 --request restore-before-edit-1
```

Restore creates a new revision and invalidates stale work. Checkpoints persist
in the server's SQLite database and include world state and RNG. They do not save
source game files or resume live job execution.

## Output, failures, and limits

- Normal output is readable server text, bounded to at most 12,000 characters.
  `--chars` controls the observe/display budget, from 256 through 12,000. Terminal
  control characters are removed from the readable rendering.
- `--raw` prints the complete JSON result envelope, without display truncation.
  It preserves server `data`, error codes, hints, and details. Server-side scope/page
  limits still apply; `--raw` does not request a full-world snapshot.
- Successful/help output exits `0`; tool/transport failure exits `1`; malformed CLI
  input exits `2`. Readable errors use stderr; raw envelopes always use stdout.
- `GEN_GAMES_TIMEOUT_MS` or `--timeout` controls the HTTP timeout (30,000 ms by
  default). A requested long poll automatically gets at least `waitMs + 5,000` ms.
  The server accepts `waitMs` through 30,000 and observation limits of 1–100 rows.
- The bridge rejects HTTP responses larger than 8 MiB. Use focused inspection and
  observation rather than relying on a full-world dump.

Errors have the same shape for both adapters:

```json
{
  "ok": false,
  "text": "CODE: explanation\nHint: suggested repair",
  "error": { "code": "CODE", "message": "explanation", "hint": "suggested repair" }
}
```

Follow the returned server hint rather than guessing. Typical repairs:

- Missing/unknown session: run `session --op list`, or create one from `discover`.
- Invalid action/arguments: read `discover --session ID` and use its schema.
- Revision conflict: observe again and decide a new action against the new state.
  Do not blindly patch the revision on previously generated work.
- Duplicate request with changed arguments: keep IDs stable only for identical
  retries; use a new ID for a genuinely different mutation.
- Transport error, timeout, or cancellation: the request may already have applied.
  Inspect/observe before retrying, preserving the original request ID and arguments.
- Malformed JSON or unsupported flag: run `node src/agent/cli.js TOOL --help`, or
  use `--file` to avoid shell quoting problems.

## MCP stdio configuration

Start the same HTTP server separately, then configure your MCP client with an
absolute path to the bridge. Typical client configuration:

```json
{
  "mcpServers": {
    "gen-games": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/gen-games/src/agent/mcp.js"],
      "env": { "GEN_GAMES_URL": "http://127.0.0.1:3000" }
    }
  }
}
```

The exact enclosing configuration location is MCP-client-specific. The bridge
supports `initialize`, `notifications/initialized`, `ping`, `tools/list`,
`tools/call`, and `notifications/cancelled`. Its eight tools map directly to the HTTP
`POST /api/tools` endpoint with `{ "tool": "NAME", "args": {} }`. Tool schemas are
available without a live HTTP server; tool execution requires it.

The transport follows the MCP newline-delimited stdio protocol, with one JSON-RPC
object per line and no log output on stdout. It advertises protocol `2025-06-18`,
with `2025-03-26` and `2024-11-05` compatibility. For newer/unknown requested
versions, initialization proposes `2025-06-18`; the client decides compatibility.
This is a stdio adapter, not an MCP HTTP endpoint or legacy Content-Length server.

Tool results contain bounded readable text and `isError`. Under protocol
`2025-06-18`, `structuredContent` also retains the complete HTTP result. Older
protocols receive the readable text only. Server/tool failures are tool results;
malformed JSON-RPC, unknown tools/methods, and invalid protocol parameters are
JSON-RPC errors. Cancellation does not guarantee a server-side mutation was undone.
The input limit is 2 MiB per line, with at most 32 concurrent tool calls. Closing
stdin allows already-running, timeout-bounded requests to finish; signals cancel
local waits and stop the bridge.

Protocol references: [stdio transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports),
[lifecycle/version negotiation](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle),
and [tool discovery/results](https://modelcontextprotocol.io/specification/2025-06-18/server/tools).
