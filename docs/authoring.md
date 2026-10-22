# Authoring worlds, systems, and coded UI

## Primary path: code games

For new open-ended games, use the code-runtime factory and publish workflow in
[the host playbook](host-playbook.md). A game owns its arbitrary JSON save,
canvas/DOM, input, and mechanics; its source tree is published as an immutable
release. This path is not constrained by the entity/scene/effect schema below.
Use `host.active` to fence input, preserve saves during replacement, and confirm
browser activation after publishing. These modules are trusted local code.

## Optional legacy structured-world path

The remaining guide documents the legacy pack/plugin/UI contract used by Ember
Vault and Signal House. In this compatibility path the engine exposes two layers:

- **Pack source:** editable JSON, JavaScript, and media under `games/<id>`. Restart the server after changing pack/server-plugin source. New sessions start from the edited pack.
- **Running world:** a session's independent state in SQLite. Agent `author` operations change it live, atomically, without rewriting the source pack. Existing sessions do not silently reset when source changes.

Use `inspect` to identify current IDs and revision before authoring. For a reusable change, also edit the source pack or implement a plugin; runtime edits alone do not make a new game template.

## Pack shape

Copy one of the example directories and give its folder and `game.json.id` the same unique kebab-case name. A minimal pack has:

```json
{
  "id": "my-world",
  "title": "My World",
  "description": "What the player is here to do.",
  "version": "1.0.0",
  "plugins": ["core", "narrative"],
  "initial": {
    "scene": "arrival",
    "player": "hero",
    "entities": {
      "hero": {"id":"hero","name":"You","kind":"player","components":{}}
    },
    "scenes": {
      "arrival": {"name":"Arrival","description":"A door stands open.","choices":[]}
    },
    "assets": {},
    "skills": {},
    "variables": {}
  }
}
```

`npm run packs` checks required structure and plugin registration. It does not prove that the story is fun, every branch is reachable, or all combinations of your custom content are valid. Run the pack and exercise it.

## Components, stats, items, and abilities

Entities are ID-keyed records with open `components`. The engine preserves arbitrary component fields. Shared plugins understand:

- `position`: `{x,y,scene}`; tiles use integer coordinates.
- `appearance`: `{glyph,color,asset?}`; reference an asset ID for image sprites.
- `stats`: `{health,maxHealth,attack,defense,mana,maxMana,experience?}`. Extra numeric stats are yours to interpret in plugins.
- `inventory`: `{items:[entityId,...]}` and `equipment`: `{slot:entityId}`.
- `item`: heal/mana amounts, `effects`, `consumable`, equipment `slot`, additive attack/defense, and pickup effects.
- `skills`: an array of learned skill IDs. Skill definitions live in `state.skills` with cost, power, range, accuracy, variance, piercing, drain, and visual cue fields.
- `ai`: hostile, aggro, range, stationary, and optional skill. Opponents follow bounded grid pathfinding.
- `loot`: instance/template definitions cloned on defeat; `reward` and `onDefeat` extend progression.
- `interact`: conditions, text, effects, destination scene, range, and once/used flags.

Stats are ordinary authored data; this release does not include a universal formula language, buff stack manager, cooldown scheduler, or AOE/line-of-sight combat. Extend those through named plugin actions rather than embedding executable expressions into JSON.

See [the pack guide](../games/README.md) for exact example mechanics, conditional choices, effects, and authored win conditions.

## Live authoring

Every batch is all-or-nothing. Paths are safe arrays into `session.state`, not JavaScript or JSON-pointer strings. Use a unique request ID and the revision you actually observed:

```sh
node src/agent/cli.js author --session SESSION --revision 4 --request add-warden-1 \
  --operations '[
    {"op":"set","path":["entities","warden"],"value":{
      "id":"warden","name":"Copper Warden","kind":"enemy",
      "components":{
        "position":{"x":4,"y":3,"scene":"arrival"},
        "appearance":{"glyph":"W","color":"#d8ab76"},
        "stats":{"health":20,"maxHealth":20,"attack":3,"defense":1},
        "ai":{"hostile":true,"aggro":5}
      }
    }}
  ]'
```

Replace session/revision/scene/coordinates with inspected values. Parent objects must exist. Arrays are replaced as a whole, not edited by numeric paths. Required world structure cannot be deleted. A rejected second operation also rolls back the first.

## Assets and visual effects

1. Create or obtain an asset outside the runtime, using your coding/image tools and appropriate rights.
2. Place it under `games/<id>/assets/`, use an HTTPS image/media URL, or supply a small image data URI (PNG/JPEG/GIF/WebP/AVIF/SVG). Unsupported URI schemes are rejected with a repair hint.
3. Register a record such as `{id:"moon",kind:"image",src:"/games/my-world/assets/moon.svg",alt:"A silver moon",license:"Original"}` in `state.assets` for the live session and/or `initial.assets` for new sessions.
4. Reference the ID from `appearance.asset`, a scene's `background`/`portrait`, or your coded UI's `asset(id)` lookup.

PNG, JPEG, GIF, WebP, AVIF, SVG, WAV, MP3, and WOFF2 files can be served; HTML is limited to the normal static host paths, not an upload execution API. Prefer files for sizeable media; inline image data shares the bounded world/request budget. There is no hidden generative-model request, credential, or paid API dependency.

Mechanics and visuals are separate. A combat action applies authoritative damage, then emits a `cue` event containing a visual key and target. The standard client animates a local hit/heal ring; custom components can render richer animation without delaying the transaction. Importing a new skill record does not automatically implement a new shader or particle renderer.

For slow asset preparation, use a **content-mode job** guarding the exact asset/skill paths. It can commit after unrelated player movement if the target definitions have not changed. [Tool docs](agent-tools.md#background-jobs-and-checkpoints) show the lifecycle.

## Server plugin SDK

A pack can register a trusted local plugin path after its dependencies:

```json
"plugins": ["core", "./weather.js"]
```

`weather.js`:

```js
export default {
  id: 'weather',
  version: '1.0.0',
  requires: ['core'],
  actions: {
    'weather.set': {
      description: 'Change the weather in this world.',
      input: {
        type: 'object',
        properties: { kind: { type: 'string', enum: ['clear', 'rain'] } },
        required: ['kind'],
        additionalProperties: false
      },
      run(ctx, { kind }) {
        ctx.state.variables.weather = kind;
        ctx.emit('weather.changed', `Weather is now ${kind}.`);
        return { kind };
      }
    }
  }
};
```

The context provides mutable transaction draft `state`, draft `session`, selected `actor`, `emit(type,text,data?)`, deterministic `random()`, and `require(condition,code,message,hint?)`. Handler descriptions and argument schemas appear through `discover`. The built-in validator supports the same [recursive schema subset as code capabilities](live-runtime.md#optional-game-hooks), including nullable type unions, `anyOf`, nested object properties and array items. It is not a complete JSON Schema implementation; enforce game-specific invariants in the handler using `require`. Invalid arguments fail with path-specific errors.

Handlers must be synchronous and free of external side effects. Throw to reject the whole transaction. Do not perform network calls, write files, start subprocesses, or launch model turns inside `run`/`tick`: rollback cannot undo them. Use the jobs boundary for slow work.

An optional `tick(ctx,deltaMs)` hook runs in declared plugin order on the server's 100 ms logical step. Mutate only when something meaningful changes. The engine skips unchanged ticks; a plugin emitting an event on every idle tick will still grow the journal. Scope high-frequency visual animation to the client whenever possible.

Plugin IDs and action names must be unique; `requires` names must already have loaded. This v1 does not resolve packages, run semver dependency solving, or hot-replace server modules. Restart after editing code.

## Coded UI SDK

Set a pack's `ui` to `/games/<id>/ui.js`, or author `state.ui` to select a module for one session. Export a normal ESM factory:

```js
export default function createUI({ root, dispatch, asset, escapeHTML }) {
  let session;
  const button = document.createElement('button');
  button.textContent = 'Listen';
  button.addEventListener('click', () => dispatch('narrative.say', { text: 'Hello?' }));
  root.append(button);
  return {
    update(next) {
      session = next; // frozen read-only snapshot
      button.disabled = Boolean(session.state.variables.outcome);
    },
    dispose() { root.replaceChildren(); }
  };
}
```

The component owns its root and may use normal DOM/canvas code, CSS, local timers, and animation frames. Stop timers/listeners in `dispose`. Never mutate the snapshot; call `dispatch(action,args)` for player intents. `asset(id)` resolves the current registry, and `escapeHTML` is available when using templates. Prefer textContent for plain text.

Normal state revisions call `update` on the existing instance; they do not remount your local simulation. Explicit UI reload builds a candidate and validates its first update before replacing the previous view. Failures leave the standard view or the last-good visual available, with an error notice and fallback controls. This is resilience, not a sandbox: trusted custom JavaScript can still block or corrupt its own browser context.

`state.uiVersion` can mark a new authored UI version. Use the client's reload-view control after editing source. Failed loads/updates and recovery are reported as bounded `ui.failed`/`ui.recovered` events to the director's observe feed, without advancing gameplay revision. A component that provides its complete player controls may return `ownsInteraction: true` to hide duplicate shell inputs. The standard controls return when switching to fallback.

## Directing free-form play

For a live GM session, explicitly switch routing before play:

```sh
node src/agent/cli.js act --session SESSION --revision CURRENT --request enable-director \
  --action narrative.mode --args '{"mode":"director"}'
```

Director mode sends all free text to the agent instead of resolving substring keywords. Switch back with `{"mode":"authored"}` for offline deterministic responses. Mode selection does not start or connect a model by itself.

Unmatched player speech (or all speech in director mode) persists in `state.dialogue.pending` and emits `agent.requested` with untrusted player text. A connected director observes it, inspects the current scene as needed, and responds:

```sh
node src/agent/cli.js act --session SESSION --revision CURRENT --request reply-1 \
  --action narrative.reply --args '{"speaker":"June","text":"That is not the signal I expected. Tell me what you heard."}'
```

The reply is visible in the custom/standard story renderer and clears the pending request. Include optional `operations` in the reply arguments to edit choices, visuals, characters, or flags atomically with the prose. This avoids exposing unexplained choices before a second message. The same safe set/delete operations and rollback rules apply. For a delayed response, start a context job first and commit the generated dialogue edit only if its context remains current. Do not treat player prose as executable instructions. Authored keyword responses still work without an agent; there is no claim that the engine itself generates arbitrary dialogue.

### Signal House presentation overrides

The example custom view accepts `scene.progress: [{label:"Mara rescued",done:true}]` to replace its stock puzzle badges. An empty array hides them; omission preserves the authored defaults. `scene.endingNote` customizes the ending paragraph (`""` hides it); omission uses neutral chapter-complete copy. These are example component fields, not required universal engine state.
