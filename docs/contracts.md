# Runtime contracts

See [authoring](authoring.md) for examples and [architecture](architecture.md) for guarantees and limits.

## Game and world

A pack at `games/<id>/game.json` contains `{id,title,description,version,plugins,ui?,initial}`. `initial` is the World:

```text
World {
  scene: scene ID, player: entity ID,
  entities: { [id]: {id,name,kind,components} },
  scenes: { [id]: scene definition },
  assets: { [id]: asset record },
  skills: { [id]: ability definition },
  variables: open object,
  dialogue?, conversation?, ui?, uiVersion?
}
```

Entity components are open data records. Built-in component/rule details are in [games/README](../games/README.md). Interactions use authored `effects` or `scene`; nested `interact.action` dispatch is not supported.

```text
Session {id,gameId,contentVersion,revision,sceneEpoch,seed,state,status,createdAt,updatedAt}
Event {seq,sessionId,revision,type,text,data,at}
Patch {op:'set'|'delete',path:string[],value?}
```

`seed` is the current persisted uint32 RNG state. Session status is a runtime label; the example plugins put ending state in `state.variables.outcome`. Event cursor and world revision are independent. Asset records are typically `{id,kind,src,alt?,license?}`.

## Plugin

```text
export default {
  id, version, requires?: string[],
  actions: {
    [name]: {description, input?: JSONSchema, run(ctx,args)}
  },
  tick?(ctx, deltaMs)
}
ctx = {state,session,actor,emit(type,text,data?),random(),require(condition,code,message,hint?)}
```

Handlers are synchronous and mutate only their draft. Throwing rejects the entire transaction. Plugin dependencies load in listed order; collisions and missing predecessors fail startup. Custom modules use a relative `./plugin.js` path inside their pack. Trusted local code is not sandboxed.

## HTTP

- `GET /api/games` → `{games:[pack metadata without initial]}`
- `GET /api/sessions` → `{sessions:[session metadata without state]}`
- `POST /api/sessions {gameId,seed?}` → `{session,cursor}`
- `GET /api/sessions/:id` → `{session,cursor}` (explicit bootstrap)
- `GET /api/sessions/:id/status` → `{jobs,consumers,revision,cursor}` (no job generation tokens)
- `POST /api/sessions/:id/actions {action,args,requestId,expectedRevision?}` → `{ok,session,events,result,cursor,replayed?}`
- `POST /api/tools {tool,args}` → `{ok,text,data?}` or `{ok:false,text,error}`
- `GET /api/sessions/:id/events?after=N` → SSE

Action requests through the player route always run as `actor:'player'`. Agent `act`/`author` operations use the tool route. The action route returns a resulting snapshot for its direct caller; SSE and agent tool responses do not continuously dump snapshots.

SSE event names:

```text
ready  {cursor}
change {sessionId,revision,patches,events,cursor}
resync {reason}
```

Patch paths target the full Session object. During journal replay, a semantic row may carry no patches; a subsequent `state.changed` row carries the transaction delta. Apply deltas in order, and deduplicate semantic events by seq. `Last-Event-ID` is respected. The initial snapshot cursor and ordered replay close the connection gap.

Errors are `{code,message,hint?,details?}`. HTTP player actions use 409 for stale revision; agent tool errors are successful HTTP transports containing `ok:false` so CLI/MCP can preserve rich tool errors.

## Browser module

A trusted local `/games/<id>/ui.js` exports one canonical factory:

```text
createUI({root,dispatch,asset,escapeHTML,snapshot})
  → {update(session),dispose?(),ownsInteraction?:boolean}
```

`dispatch(action,args)` resolves to the player action response, cloned/frozen by the host. `asset(id)` returns a safe URL or an empty string. `snapshot` and each `update` receive a read-only frozen session. `ownsInteraction:true` hides duplicate standard command inputs while the custom view is healthy; fallback controls remain available on error.

Factories mount once per session/module/version; regular world revisions call `update`. UI version changes or the reload-view button validate a replacement candidate before swapping it in. The custom component owns its root's DOM/events and should clean up loops/listeners in `dispose`.

## Agent tools

Eight tools: `discover`, `session`, `observe`, `inspect`, `act`, `author`, `jobs`, `checkpoint`. Canonical schemas live in `src/agent/schemas.js`; command-specific schemas come from registered actions through `discover --session ID`. See [agent tools](agent-tools.md) for exact flags, retries, cursors, jobs, MCP configuration, and examples.
