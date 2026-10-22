# gen-games

**A real game runtime for coding agents and human players.** Build a world with code and data, play it in a browser, and let a coding agent direct or extend that same running world without receiving a giant state dump every turn.

No model API, subscription, cloud service, bundler, or production dependency is required. Node.js **24+** supplies HTTP, SQLite, and the runtime.

## Run

```sh
npm start
```

Open **http://127.0.0.1:3000**. In a second terminal:

```sh
npm run agent -- discover
npm run agent -- session --op list
```

Select the browser's session ID, then follow [the agent quick loop](AGENTS.md) or [CLI/MCP setup](docs/agent-tools.md). A coding agent is not bundled or silently started: connect your own agent through the CLI, MCP stdio bridge, or HTTP tools.

## Two playable worlds, one engine

- **Ember Vault**: three tactical dungeon floors, deterministic combat, opponent pathfinding, equipment, consumables, authored skills, loot, locked progression, a boss, and victory/death.
- **Signal House**: a conversation-driven lighthouse mystery with eight scenes, relationship/flag conditions, inventory, branching endings, free-text player input, and a custom coded UI. Unknown speech becomes an explicit request for a connected director; an agent can respond live through `narrative.reply`.

Both packs are editable examples, not special cases hidden in the engine. The shared plugins implement movement, inventory, combat, narrative, conditions, and effects. Add a third pack or replace the UI without forking the runtime.

## What is implemented

- Browser input applies immediately through validated actions; CSS/animation rendering and plugin simulation do not wait for a model turn.
- SQLite saves world state, seeded RNG, ordered events, request-id results, independent consumer cursors, jobs, and named checkpoints.
- Eight concise agent tools: `discover`, `session`, `observe`, `inspect`, `act`, `author`, `jobs`, `checkpoint`.
- Bounded incremental observation, explicit acknowledge/resume, targeted inspection, rich repairable errors, stale-revision rejection, and durable retry deduplication.
- Atomic live authoring of characters, opponents, items, stats, scenes, choices, skills, and asset records.
- Fenced background proposals. Context jobs reject stale narrative; content jobs guard exact asset/skill targets and tolerate unrelated player movement.
- Browser bootstrap + persistent SSE patches rather than full snapshots on every event.
- Trusted local JavaScript plugins and ESM UI components with a clear lifecycle and fallback behavior.

## Author a game

Start with [the authoring guide](docs/authoring.md). Game data lives in `games/<id>/game.json`; reusable mechanics live in `src/plugins`; custom UI modules and media live beside their pack. An asset is a file/URL plus a registry entry, so agent-generated art can be imported without coupling the engine to an image vendor.

Use live `author` edits for the current session. Edit the pack's source JSON/code when the change should apply to future sessions. These are intentionally different operations. Server plugin/source-pack changes load on restart; existing saved sessions keep their own world state.

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

- [Architecture and guarantees](docs/architecture.md)
- [Authoring, plugins, assets, and coded UI](docs/authoring.md)
- [Agent tools and error recovery](docs/agent-tools.md)
- [Exact shared contracts](docs/contracts.md)
- [Security boundary and limitations](docs/security.md)
- [Design research and sources](docs/research.md)

## Scope

This is an extensible local-first v1, not a production multiplayer server or a universal game editor. JavaScript game packs are trusted local code, not sandboxed user uploads. There is no built-in LLM, remote matchmaking, automatic content migration, procedural dungeon generator, or automatic image generation. The current examples are tactical/adventure games; adding an action game's authoritative simulation is a plugin task, not a claim that all genres are already implemented.
