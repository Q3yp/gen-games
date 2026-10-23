# Optional engine-owned world

A code module can export `const stateMode = 'host'` to opt into `host.world`.
The world is a schema-free JSON object: its keys and nested JSON values belong to
the game, not to a mandatory character, item, scene, or stat model. Renderers and
rules may be replaced entirely while the host retains that world independently
of the renderer's `serialize()` output. Legacy modules keep their existing save
contract. A host-owned run cannot silently revert to legacy serialization.

## Game API

- `host.world.read(path = [])` returns the current immutable value at a key/index
  path, or `undefined` for a missing path. Reads reuse deeply frozen snapshots;
  a retained reference remains a snapshot of its version, not a live binding.
- `host.world.version` is a monotonically increasing integer.
- `host.world.transact(draft => { ... }, { expectedVersion } = {})` clones the
  current world, runs a synchronous mutation, validates it, and commits atomically.
  Callback return values do not replace the root. A thrown error, invalid JSON,
  stale expected version, nested transaction, or asynchronous callback does not
  commit. A no-op does not advance the version. Retained draft references cannot
  change the committed world. The return is `{ version, paths, truncated }`.
- `host.world.observe(sinceVersion = host.world.version)` returns
  `{ version, sinceVersion, resetRequired, changes }`. Each change contains its
  version and changed key/index paths. Paths locate changes, not their values:
  read those paths for current values. Deletions read as `undefined`.

For example, a game can change `draft.player.experience` in one transaction and
replace every renderer/rule in a later release without copying that field into
its new serializer. Names such as `player` and `experience` are examples only.
Initializing new fields should preserve existing data rather than replace it.

## Engine lifecycle and persistence

`createWorld(save, { canWrite, onChange })` creates a staged controller, exposing
`api`, `snapshot()`, `fork(options)`, `seal()`, `activate()`, and `revoke()`.
The game receives only `api`. A legacy save seeds the entire initial world;
a tagged save restores its world and version history. The reserved top-level
`$codeWorld` key identifies the strictly validated version-1 envelope:
`{ $codeWorld: 1, version, data, changes }`. A malformed or unknown envelope is
rejected, never silently treated as fresh state.

A candidate renderer receives a fork of the current world. Its construction
transactions remain isolated. The host seals that fork before sending its
activation snapshot, activates it only after durable acknowledgment, and revokes
the old handle. Failed/discarded candidates are revoked; the live world remains
unchanged. A sealed or revoked handle cannot write. Active writes also consult
the host's `canWrite` gate. `onChange` is an advisory scheduling hook, not proof
of durability. As with legacy saves, checkpoint/result/activation acknowledgment
establishes persistence; unsynced transactions can be lost on browser failure.

Activation, automatic checkpoints, and command results must use the controller's
snapshot, never the renderer's serializer. The existing server lease, run epoch,
release, and checkpoint sequence continue to fence durable writes. This contract
does not introduce a second transport or server-side game simulation.

## Bounds and preservation limits

World data is object-rooted JSON, with finite numbers and at most 100 nested
levels. The complete persisted envelope must fit the existing 2 MB save limit.
Reads are immutable and transactions copy/validate the world; this is intended
for bounded gameplay state, not media or very large frame-by-frame simulations.

The change cursor retains at most 64 transactions and 24 KB. Each transaction
reports at most 32 paths and 4 KB of path metadata; larger changes coarsen to the
root path `[]` with `truncated: true`. An expired cursor returns
`resetRequired: true` and no partial deltas; read the current world to resync.
The cursor is not a permanent narrative log. Gameplay history that must survive
belongs in game-defined world data, within the save bound, or in semantic events.

This prevents accidental loss from a replacement renderer omitting fields in
`serialize()`. It cannot infer which fields are earned progress, prevent trusted
game code from explicitly deleting/changing them in a transaction, or make an
incorrect migration correct. Several successful transactions before a command
throws remain committed; use one transaction for a command that needs atomicity.
Game-owned DOM, timers, audiovisual state, and transient variables are not part
of the world unless explicitly recorded there. Code remains trusted, not sandboxed.

## Focused host tools and requests

`inspect scope=world` reports version, checkpoint freshness and top-level keys.
Use `path` for an explicit value or `afterVersion` for bounded changed paths;
Repeated changed paths are coalesced in tool responses, with a transaction count;
expired cursors explicitly require targeted resync. `path: []` deliberately reads
the entire world. These reads are durable checkpoint data, not a live frame.

The engine adds the `world.patch` capability with the `$world` version scope.
Send it through the normal guarded command path with `expectedVersions.$world`.
It supports atomic add/replace/remove/test operations on explicit non-root paths.
Object add cannot overwrite a key; array add inserts at a numeric index. Authored
capabilities may use the `$world` guard, but may not override its version or the
`world.patch` command. Failed operations leave the transaction unchanged.

For new executable behavior, edit arbitrary source and publish normally. Keep
`stateMode='host'` in a replacement renderer; it receives the current world,
including arbitrary fields it does not yet understand. Construction can add
new fields transactionally. A deliberately authored migration can remove data;
the engine cannot infer which arbitrary fields represent earned progress.

The shell's Ask host sends durable `player.requested` intent without a per-game
form. `player_request list status=open` gives compact resumable pending work;
`get` retrieves full intent and original context. Status mutations require an
observed request version and the director token when that session is leased.
Use working for honest progress, then link a command or publication receipt.
Only durable command application/source activation produces applied status.
On application, the working note is archived as priorNote and replaced with a
verified status message, so an earlier “waiting” message cannot remain current.
Manual resolve is labeled a host report, not engine verification of fulfillment.
The browser keeps working while a host authors; there is no automatic model
invocation built into this channel. A host must consume the director/events loop.
Player text is untrusted intent, never source to evaluate automatically.

A rejoin or activation invalidates a turn for mutations, not for acknowledging its
already-delivered cursor. Finish that exact cursor after pending commands settle,
then wait for fresh context. This does not complete requests: recover open requests
and link their existing receipts rather than repeat source publication. Expired
leases still require reattachment.
