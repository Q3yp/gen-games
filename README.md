# gen-games

**Live wiring for coding agents and human players.** Keep arbitrary game code running in the browser while an attached agent responds to player interactions through scoped commands and compact state, without publishing a new game for every turn.

No model API, subscription, cloud service, bundler, or production dependency is required. Node.js **24+** supplies HTTP, SQLite, and the runtime.

## Run

```sh
npm start
```

Open **http://127.0.0.1:3000**. A fresh browser opens **Live Canvas**, an empty
game-owned surface awaiting a live director, not a scripted demo. Any valid
remembered session takes precedence. Authored examples remain available in Menu.
In a second terminal:

```sh
npm run agent -- discover
npm run agent -- session --op list
```

Select the browser's session ID, then follow [the live director contract](docs/live-runtime.md), [the agent quick loop](AGENTS.md), or [CLI/MCP setup](docs/agent-tools.md). A coding agent is not bundled or silently started: connect your own agent through the CLI, MCP stdio bridge, or HTTP tools.

## An open canvas for game-making agents

The primary runtime is a **code game**: a trusted JavaScript module owns its
canvas/WebGL/DOM presentation, direct input, simulation, and serializable save.
The host agent can author a new mechanic in source, publish an immutable release,
and observe whether the playing browser activated it. It is not limited to a
fixed genre, choice schema, effect list, or chat interface.

- **Live Canvas** is the small engine-first probe: an empty world with optional
  projection, version, and command hooks. Its own display/object choices are not
  engine schemas. Attach a real director to create a character/environment and
  react to player input; no model or canned plot starts automatically.
- **Mossfall** is a code-owned continuing RPG: explore connected areas, choose
  an oath, trade weapon reach against damage, read enemy intentions, rescue a
  keeper and bring the living seed home. The same character and world continue
  beyond that objective. Its game module owns the RPG rules; the runtime stays
  genre-agnostic. See [actual play](docs/playthrough.md#mossfall-a-continuing-rpg).
- **Lumen Weave** is an optical puzzle/sandbox code-runtime example. Its game-specific module is
  independent of the runtime's legacy world/scene schema. Treat gameplay quality
  as something to establish through actual play, not a guarantee of this API.
- **Ember Vault** and **Signal House** remain optional structured-world examples:
  tactical dungeon combat and a conversation-driven lighthouse mystery. Their
  server plugins, named actions, structured authoring, and custom UI remain
  available for compatibility; they do not define what new games must be.

## Runtime boundaries

Code games run continuously in the browser without waiting for model turns.
The browser owns frame state; the server persists periodic saves and atomic
command applications (save, result, and emitted events together), source release
metadata, compact versioned projections, and immediate semantic events. A saved summary is not an authoritative live frame read. Legacy packs
instead retain server-authoritative transactions and incremental state patches.

Agent tools include `discover`, `session`, `observe`, `inspect`, `publish`,
`command`, `director`, `work`, `asset`, and `checkpoint`. Legacy packs additionally use `act`, `author`, and
`jobs`. Discovery supplies the current schemas. Publication and command delivery
are asynchronous: a `PENDING` response does not prove activation or execution.
Inspect acknowledgments and the actual browser before reporting success.

Observation is incremental and bounded, with independent consumer cursors.
Code releases snapshot the game tree so relative imports remain versioned.
Trusted local game code can use arbitrary mechanics; it is not sandboxed and can
still block its browser. Source publication is not automatic migration, and a
new module must preserve or deliberately migrate its own save.

## Author and host a game

Start with [the game-host skill](.agents/skills/game-host/SKILL.md) and
[host playbook](docs/host-playbook.md). Load only the relevant genre profile:
[RPG](.agents/skills/game-host/references/rpg.md),
[roguelike](.agents/skills/game-host/references/roguelike.md),
[puzzle/sandbox](.agents/skills/game-host/references/puzzle-sandbox.md),
[adventure](.agents/skills/game-host/references/adventure.md),
[conversation/visual novel](.agents/skills/game-host/references/conversation-visual-novel.md),
or [action](.agents/skills/game-host/references/action.md). Choose one primary
promise and add a secondary profile only for a relevant subsystem, rather than
loading every genre into each turn. These guide the host, not the engine schema.

Declare `runtime: "code"`, `entry`,
`saveVersion`, and an arbitrary JSON `initial` save in `games/<id>/game.json`.
The entry exports a factory with required `serialize` and `dispose` hooks and
optional simulation, rendering, inspection, and game-defined command hooks.

Start the live director loop and respond through discovered commands first.
Keep player input and local frames responsive while external work runs separately.
Publish source when adding genuinely new behavior, preserving the current save;
then exercise it through player controls. Inspect a screenshot after activation and replay with a different
strategy. Visual polish, syntax checks, and successful publication are useful
evidence, but none alone demonstrates enjoyable play.

The [authoring guide](docs/authoring.md) also documents the legacy plugin/UI and
structured-data route. Legacy server plugin changes load on restart; code-runtime
publication is a distinct operation and does not require treating gameplay as
server-side structured edits.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Run the persistent local server |
| `npm run dev` | Run with Node's source-file watcher |
| `npm run agent -- --help` | CLI usage and examples |
| `npm run mcp` | Start the MCP stdio adapter; server runs separately |
| `npm run check` | JavaScript syntax and pack/plugin validation |
| `npm run packs` | Validate pack structure and registration |

The repository intentionally has no test suite or test files. Actual manual runtime and play-through coverage is recorded in [verification](docs/verification.md); syntax validation is not presented as gameplay execution.

## Read next

- [Live director, commands, scopes, and background work](docs/live-runtime.md)
- [Architecture and guarantees](docs/architecture.md)
- [Authoring, plugins, assets, and coded UI](docs/authoring.md)
- [Agent tools and error recovery](docs/agent-tools.md)
- [Exact shared contracts](docs/contracts.md)
- [Security boundary and limitations](docs/security.md)
- [Actual player + director playthrough](docs/playthrough.md)
- [Design research and sources](docs/research.md)

## Scope

This is an extensible local-first v1, not a production multiplayer server or a universal game editor. JavaScript game packs are trusted local code, not sandboxed user uploads. There is no built-in LLM, remote matchmaking, automatic content migration, procedural dungeon generator, or automatic image generation. The open code runtime permits game-specific simulations; it does not supply every genre's physics, networking, editor, or mechanics out of the box.
