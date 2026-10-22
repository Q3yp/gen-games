# Durable campaigns and host workspaces

Open `/library.html` for a dedicated library outside the game canvas. “Library” in
the player toolbar returns there. Campaign cards show a meaningful title, custom
progress, last saved play, and stable copyable host IDs. Continue opens the exact
campaign via `/?session=SESSION_ID`; it never creates or resets a save.

## Three identities, one persistence system

- **Game definition:** `gameId`, editable `games/<gameId>/`, immutable source
  releases. No universal character, item, skill or stats schema is imposed.
- **Campaign/save:** existing `sessionId`, arbitrary durable `session.state`,
  existing checkpoints, run epoch, command receipts and consumer cursors.
- **Workspace:** stable `ws-<sessionId>`, one bounded handoff per campaign, stored
  in the same SQLite database. It is context for a host, not a second game state.

Existing sessions automatically have discoverable version-zero workspaces with
default titles. No session rewrite or destructive migration is needed. A title or
handoff update persists a workspace row. Restarting the server or changing agents
preserves saves, handoffs and cursors; director connection tokens intentionally
expire on server restart. Back up the configured `GEN_GAMES_DATA` directory
(including immutable releases/assets) and the editable `games/` source directory.
`GEN_GAMES_DATA` may point outside a disposable checkout to a durable directory.
Keep its SQLite database (including WAL files while running), immutable releases
and imported assets together; use a SQLite-safe backup or stop the server before
copying. A fresh agent can attach to the same stored engine. This is local durable
storage, not cloud synchronization: deleting that directory destroys that storage.
Browser local storage only remembers selection, not campaign data. Source paths
are computed from the current game identity, not saved absolute machine paths.

Campaigns of the **same gameId share editable source files**. Publishing targets
one session, while other sessions keep their existing immutable releases. Current
editable files may differ from either the pinned active release or save release;
check the returned release identities before changing source. For
independent authored games, use `library --op scaffold --game <unique-id>` to
allocate a new source pack and register it live. Alternatively, author a distinct
game directory with a matching manifest ID and use the existing
`library --op register --game <unique-id>` flow. Neither requires a server restart
or inheriting an example's renderer/mechanics. Creating another campaign
alone isolates save state, not source. This intentionally avoids a new branching,
cloud-sync or multi-user source management framework.

Creating a campaign uses the running registry's cached release and manifest, not
an automatic reread of edited files. `register` on an existing game ID does not
refresh it. For a fresh campaign from revised source, first publish into a
disposable preview session, verify that release there, then create the player
campaign and verify its release. Publication updates that game ID's creation
default even though other existing sessions remain pinned. Never use a preserved
player ending as the preview target. Registration snapshots a genuinely new ID;
server startup also snapshots source, so a restart may change new-campaign defaults.

## Fresh agent: discover, open, attach

```sh
node src/agent/cli.js library --op list --raw
node src/agent/cli.js library --op create --game iron-cadence --title 'My expedition' --raw
node src/agent/cli.js workspace --op read --workspace ws-SESSION_ID --raw
node src/agent/cli.js discover --session SESSION_ID
node src/agent/cli.js inspect --session SESSION_ID --scope capabilities
node src/agent/cli.js inspect --session SESSION_ID --scope path --path '["character"]'
node src/agent/cli.js workspace --op attach --workspace ws-SESSION_ID --consumer fresh-host --raw
```

Use **list/open** for an existing campaign; the create line is only for a new one.
List returns structured entries, game definitions, total and `nextOffset`; pass
`--offset N --limit N` to page (default 30, maximum 100). It never dumps saves.
Read/open returns source paths, current desired/active/save releases, run epoch,
checkpoint sequence/timestamps, projection freshness, versions, director status,
state root keys and exact scoped tool calls. Use `discover` and `inspect capabilities`
for the current game's executable contracts, not remembered APIs. `inspect save`
explicitly returns the full saved JSON; prefer `inspect path` for focused fields.
A save or projection is durable/last-observed evidence, not a live frame snapshot.

Attach returns the existing director protocol's connection token in
`data.connection.token`. Continue `director wait → command → receipt → finish → wait`
using the returned session ID and token. Attach never starts an LLM or takes over
another live director: `DIRECTOR_BUSY` means wait or ask that host to detach. A
fresh host with a new consumer can bootstrap/ack via the existing observation
protocol; a stable consumer resumes its durable acknowledged cursor. The workspace
itself never advances consumer cursors or replays commands.

## Bounded handoff updates

```sh
node src/agent/cli.js workspace --json '{"op":"update","workspaceId":"ws-SESSION_ID","expectedVersion":0,"patch":{"title":"The northern expedition","progress":"Level 4; forge gate unlocked","brief":"Player wants tactical action and persistent build choices.","decisions":["Keep the spear build and earned equipment."],"unresolved":["Add a shield-counter encounter."],"references":[{"path":"games/iron-cadence/main.js","purpose":"Editable game entry"}]}}' --raw
node src/agent/cli.js workspace --json '{"op":"read","workspaceId":"ws-SESSION_ID","scope":"unresolved","afterVersion":0}' --raw
```

When attached, add `token` with your current **connection** token to updates.
A different host cannot overwrite an active director's handoff. Every update
requires `expectedVersion` from read; `STALE_WORKSPACE` means re-read and merge,
not blindly replace the guard. Patches replace only supplied sections. Empty
arrays/strings clear a section. `afterVersion` returns only changed sections;
metadata and current freshness always remain visible. Reading never resets play.
On a timed-out update, read before deciding whether to retry; compare the returned
version and content. Handoff mutations do not increment game revisions or emit
fake player events.

Title ≤120 characters, progress ≤500, brief ≤6000. Decisions, unresolved work and
references are each ≤40 JSON entries and ≤8 KB; total workspace ≤30 KB. Reference
files, immutable release URLs and artifacts rather than embedding transcripts or
media. `basedOn` records game freshness at handoff writing so a later host can see
whether play has advanced; handoff prose is not authoritative live state.

Keep a resume brief to the useful minimum: player intent and latest play verdict;
exact campaign/source identity; desired/active/save release and freshness; current
objective, resources and preserved choices; pending authored work and its guard;
next permitted action or explicit stopping condition. Distinguish a completed
trial from a request for another room, and host feasibility checks from independent
play judgment. Link detailed source/artifacts instead of copying logs or save JSON.

Game code may expose a compact `inspect().progress` string or object. The library
displays this as game-owned progress, separate from the agent's optional handoff
progress note. Shape and meaning belong to the game. Character, items, skills,
HP/MP, level and arbitrary stats remain in the game's existing serializable save.

### Allocate independent source without copying a game

```sh
node src/agent/cli.js library --op scaffold --game moon-garden --title 'Moon Garden' --raw
node src/agent/cli.js library --op create --game moon-garden --title 'Moon Garden preview' --raw
```

`scaffold` allocates `games/moon-garden/` and registers its initial release live.
It returns the editable path, release and file names, not a new campaign or save.
The files are a minimal code manifest, an executable `main.js` placeholder, and
an optional local `lifecycle.js`. The placeholder deliberately is not a game:
replace its visual mark with your own controls, renderer and executable rules
before sharing play. Its initial save is `{}`; the engine imposes no scene,
character, item, action or component catalog. Canvas, WebGL, DOM and any other
trusted game code remain available.

The optional helper owns cleanup callbacks and listeners, fences `input()` with
`host.active`, exposes unfenced `listen()` for release/cancel edges, and forwards
`save()` to the existing runtime. It supplies no simulation or transport. Register
each owned resource with `own(cleanup)` and dispose it with the game instance.
Its local copy is included in that game's immutable releases; edit or remove it
freely. Saves, semantic events, command acknowledgments and director guards still
use the existing runtime, not a second persistence system.

Source IDs for scaffold are 1–80 lowercase letters/numbers separated by single
hyphens, such as `moon-garden`. An existing registry ID, file, directory or symlink
is rejected as `GAME_SOURCE_EXISTS`, even if empty. The operation reserves its
directory atomically and exposes the manifest only after all source files exist.
Concurrent allocations cannot overwrite each other. No existing sessions,
workspaces, active releases or save-release pins are changed.

This is a create-only operation, not an idempotent overwrite. If a response is
lost, inspect the exact ID with `library list` and the returned/expected source
directory before retrying. Retrying an existing ID fails safely. If allocation
was interrupted or file creation failed, partial source is retained for inspection
and repair, never recursively removed; finish its manifest and files, then call
`register`. If snapshot/registration failed after creation, the error says
`SOURCE_REGISTRATION_FAILED` and retains the complete source for the same recovery.
Read the nested cause for the specific error. Registering incomplete source returns
`GAME_SOURCE_NOT_READY`. Do not delete a directory another author may be using.

`create` still starts a campaign from the registry's cached release. After editing
the scaffold, create a disposable preview and publish using its observed
`runtime.release`, or use a preview you already created. Observe activation and
exercise actual controls before creating a player campaign from the verified
release. An independent fresh host can then find and attach that exact campaign
through `library list` and `workspace attach`; its editable root is tied to its
new gameId. A second campaign under that same gameId intentionally shares source.

### Register already-authored source without restarting

Author an arbitrary code game under a new `games/<unique-id>/` directory with its
matching manifest, then call `library --op register --game <unique-id>`. Registration
validates and snapshots that source into the running registry without replacing
existing IDs or sessions. Create the campaign after registration. An already-open
play-page New run selector refreshes on reload/navigation; the Library Refresh
control refreshes its own game list.

Source authoring still happens in the coding workspace. Registration is discovery
and immutable snapshotting, not an integrated source editor, model generator or
fixed component factory. Use `publish` for an existing campaign's live release.
Simulation, controls, mechanics, rendering and save schema remain game-owned;
the engine provides lifecycle, persistence, observation and guarded delivery.
Acceptance is not browser activation, and activation is not evidence of good play.
