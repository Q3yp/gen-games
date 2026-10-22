# Research and product rationale

Research checked 22 October 2026. This document records the product needs and
design reasoning behind the engine. It is **not a claim that every recommended
capability is implemented**. See the README and architecture documentation for
the delivered interfaces and limitations.

## 1. What players and game authors need

The requested product is not a chat transcript with decorated buttons. It is a
running game, with authored interactive screens, which an agent can observe and
extend without freezing the player or repeatedly rereading the whole world.

The following are requirements inferred from the requested game formats and
established engine workflows, not findings from interviews or usability studies.

| Format | Meaningful playable loop | State that must survive | UI the author needs |
| --- | --- | --- | --- |
| Roguelike | Explore, encounter, choose a tactical action, collect loot, progress or restart | Seed/RNG state, map discovery, actor position, resources, equipment, run outcome | Map, targets, costs, enemy intent, combat feedback, loot decisions |
| RPG | Build a character, equip items, use abilities, converse, complete an objective | Character and item instances, party, quests, progression, relationships | Character sheet, inventory comparison, ability targeting, dialogue, journal |
| Adventure | Inspect a location, discover a fact or object, solve a condition, reach a new scene | Location, discovered facts, inventory, flags, interaction history | Scene art, inspectable objects, inventory actions, conditional choices |
| Conversation / visual novel | Read or hear a line, choose or type a response, see consequences, continue | Speaker, dialogue position, relationships, choices, seen content, narrative facts | Portraits, dialogue backlog, choices, text input, text speed, save/load |
| Generative hybrid | Make an unanticipated request, see that it was received, continue interacting while new material is prepared | Accepted inputs, pending generation, committed facts, generated content references | Pending/ready/error status, interrupt controls, normal game screens that remain usable |

Across these formats, the player needs predictable consequences, clear available
actions, understandable rejected actions, recovery from refresh/disconnection,
and readable controls. Basic accessibility should include keyboard operation,
visible focus, non-colour-only status, adjustable or skippable text animation,
reduced motion, and a replayable dialogue log. These are product requirements,
not optional decoration. [Game Accessibility Guidelines][accessibility] is a
useful checklist for validating the actual UI.

### Define “real time” honestly

For v1, “real time” means that player input is accepted and reflected promptly
while agent work can remain in progress. It does **not** mean that an LLM runs a
physics update or that narrative generation has frame-time latency.

Use three separate clocks:

1. **Presentation:** local animation, pointer feedback, audio, text reveal.
2. **Game:** validated commands, turns, explicit timers, durable consequences.
3. **Agent:** asynchronous planning, writing, asset preparation, and code changes.

A slow third clock must not block the first two. A combat animation is a cue
that an action occurred, not the authority that decides whether damage happened.

## 2. Architectural decisions

### One authority, multiple views

The session runtime should own committed game state. The browser and the agent
send commands; neither directly rewrites shared state. This matches the useful
part of [Colyseus's authoritative-state approach][colyseus]: clients request
changes and subscribe to updates. Colyseus also demonstrates property-level
patching, although this engine does not need to adopt its complete multiplayer
stack.

The important distinction is between:

- **A command:** an attempted action, which may be rejected.
- **An event:** an accepted fact, such as `item.equipped` or `choice.selected`.
- **A projection:** the information a particular consumer needs to render or
  reason, which need not include hidden narrative or opponent information.

A minimal local Node service with HTTP commands and an event stream is enough.
Server-sent events fit a browser that mostly receives updates and sends actions
through HTTP; SSE is one-way, so it does not replace the command endpoint.
WebSockets can be added if the input cadence or multiplayer requirements justify
them. [MDN's SSE documentation][sse] describes event IDs and reconnection.

### Normal code for UI, small capabilities for integration

The user specifically wants coded UIs. Do not make a fixed catalogue of JSON
widgets the only authoring surface. Data-driven built-in screens are useful
defaults, but an author must also be able to supply an ordinary browser module
with a documented lifecycle such as mount, update, and dispose.

Give a component a read-only view, dispatch function, asset resolver, and cleanup
facilities. Keep authoritative rules outside the component. A plain ESM/DOM
implementation is a credible lightweight starting point; React/Vite can be an
optional integration, not a compulsory dependency. React's
[useSyncExternalStore][react-store] is an established bridge for such a runtime.

Hot replacement should preserve the session and dispose old subscriptions and
timers. A malformed new component should not destroy the last usable screen.
[Vite's HMR API][vite-hmr] illustrates explicit acceptance and cleanup boundaries;
use its ecosystem if richer authoring is warranted rather than inventing a
second module compiler. Trusted local code is still executable code, not a
sandbox. Supporting arbitrary third-party code would require a separate security
design and is outside a small v1.

### Compose mechanics instead of creating a class for every character

Use stable entity IDs and separate templates from instances. A sword definition
describes the item; an owned sword instance has an owner and perhaps durability
or rolled modifiers. The same separation applies to character archetypes and
individual opponents.

Useful independent building blocks are:

- Numeric stats, bounds, and explicit derived-stat rules.
- Resource costs, target predicates, and cooldown/turn requirements.
- Effects such as damage, healing, adding/removing a status, or setting a flag.
- Abilities composed from those building blocks.
- Presentation cues referenced by an ability or its resulting events.
- Inventory, equipment slots, and equipment-supplied modifiers.

[Unreal's Gameplay Ability System][gas] provides a useful precedent for separating
attributes and gameplay effects. Borrow that separation, not Unreal's full
complexity. Specify modifier ordering and stacking rules, and make the stat
breakdown inspectable. Calculate randomness in the authoritative runtime, with
the generator state saved; avoid hidden `Math.random()` calls inside plugins.

### Narrative is a first-class game system, not a combat special case

A story-only game must not need hit points or a battle state. Its primitives are
scenes, speakers, text, choices, facts, conditions, and transitions. Free text is
an input event for an agent to interpret, not executable source code or automatic
permission to rewrite the world.

[ink's runtime][ink] separates continuing story content from choosing the next
branch. [Ren'Py's screens][renpy-screens] separate presentation and interaction
from the story. Those are useful boundaries even without embedding either
runtime. [Ren'Py's save/rollback documentation][renpy-save] also shows why saving
just a character sheet is insufficient: the current narrative position and
presentation-relevant state matter.

## 3. The agent contract

### Text-first results, structured data when useful

Machine-readable inputs and internal validation do not require verbose JSON
responses to the model. MCP explicitly supports text and structured tool results
and distinguishes tool failures from protocol failures. [MCP tools][mcp-tools]
is the relevant transport precedent.

A successful action can be as small as:

> OK r43 · Firebolt: ogre HP 18 → 10; hero mana 7 → 4. Cursor 109.

A useful error says what failed, whether anything changed, and how to recover:

> STALE_REVISION: expected 42, current 43. No changes. Read events after 108,
> then retry with the current revision.

Keep stable error codes for automation. Include entity IDs, field paths, and a
small set of valid alternatives where relevant. Do not return a stack trace or
entire world for an ordinary validation error. Offer explicit detailed output
for diagnosis rather than forcing that detail on every call.

A compact tool surface can cover these capabilities without one tool for every
game mechanic:

1. Discover installed systems, commands, schemas, and short examples.
2. Observe events after a cursor, optionally waiting for a bounded interval.
3. Inspect a selected entity, scene, job, or system.
4. Execute a registered command with concurrency and retry protection.
5. Validate/publish authoring changes or a content bundle.
6. Manage generation work and its cancellation/commit lifecycle.
7. Create and restore checkpoints.

These are capability categories, not promises about particular command names.

### Incremental context has a precise contract

A cursor is not just a convenience parameter. It is the boundary between facts
already delivered and facts still owed to a consumer.

- Keep session revision separate from event sequence: one atomic command can
  emit several events.
- Each consumer owns its own cursor. An agent reading an event must not consume
  it for the UI or another agent.
- Bootstrap state and its corresponding cursor must come from one consistent
  read, avoiding a gap while the session changes.
- A bounded page must return a continuation cursor and `hasMore`. Do not move
  the cursor to the global head while leaving undisclosed events behind.
- If filtering advances over irrelevant events, define that explicitly and
  bind the cursor to the same filter, or require a new subscription when the
  filter changes.
- An expired cursor must produce an explicit resynchronization requirement,
  not silently pretend that there were no changes.
- Use compact semantic events for the agent. Do not stream every animation
  frame or raw object replacement into its context.
- Keep large assets and historical prose behind references and scoped reads.
- Separate player-visible and author-only views before sending data, not just
  by hiding it in the rendered UI.

A useful agent cycle is: bootstrap once, observe changes, inspect only missing
context, prepare a bounded change, validate, commit, then return to observation.
Reading the whole session after every button press defeats this contract.

### Interruption is more than an abort signal

The player must be able to redirect a pending generation. Record work as a job
with an ID, status, originating scene/revision, and generation token. Cancel the
underlying work when possible, but also check that token when committing.

The crucial invariant is: **a canceled or superseded job cannot publish a late
result into the current scene**. A scene generation number is a simple fence;
targeted entity revisions can reduce unnecessary conflicts later. Do not hold a
session mutation lock while awaiting a model or asset service.

[MCP cancellation][mcp-cancel] explicitly acknowledges races between cancellation
and completion. Therefore a cancellation request alone cannot establish that no
result will arrive. Return a clear terminal status and make retries inspectable.

## 4. Persistence and operational invariants

The minimum reliable mutation boundary contains state changes, emitted events,
and the result associated with the command's idempotency key. Publish updates
only after that boundary is durable. Repeating the same key must return the
original result, including after a restart, rather than apply a second attack or
duplicate a choice.

[SQLite transactions][sqlite] are a strong default for a single-host runtime.
If using a file-backed journal instead, document its locking and durability
limits and prove recovery from a truncated final record. Independently writing a
state JSON file and then an event file is not atomic merely because both use
append or rename.

Save/checkpoint metadata should include the schema version, game/content and
plugin versions, RNG state, current scene, and pending jobs. After restart, a
previously running job should be explicitly interrupted or recoverable, not
falsely reported as still working. Restoring a checkpoint should invalidate old
generation tokens and preserve a well-defined event timeline, for example by
emitting a new restore event instead of silently reusing old event numbers.

Baseline acceptance cases for the implementation are:

- A duplicate command has one effect, even after restart.
- A rejected multi-operation change leaves no partial mutation or event.
- A reconnecting consumer receives all owed events exactly once in its local
  application, using sequence deduplication where the transport replays them.
- Two agents proposing edits against the same revision cannot silently clobber
  each other.
- Canceling or replacing a scene rejects a late generation commit.
- The same saved state and RNG state produce the same next game outcome.
- Invalid plugin/content/UI updates leave the last valid version usable.

## 5. Modern components and plugins without a framework inside a framework

A small plugin manifest can declare its ID, version, dependencies, command
handlers, validation, state initialization, projections, UI entry points, and
assets. Prefer explicit registration to hidden global side effects. Detect
duplicate IDs and missing/cyclic dependencies at load time. Specify hook order
where order affects results, and provide cleanup for subscriptions and timers.

Keep built-in systems on the same public contract that an external game pack
uses. Otherwise the plugin system is nominal while all meaningful behavior stays
hardcoded in the engine. Avoid a universal entity-component system, dependency
injection framework, or elaborate event middleware until actual game packs need
them. [Godot's organization guidance][godot] supports small, focused components
with explicit dependencies. [Vite's plugin guidance][vite-plugins] similarly
encourages using existing capabilities and starting locally before extracting a
package.

Assets should have stable logical IDs, resolved versions or content hashes,
type/dimensions, and a usable fallback. Separate “generation requested” from
“asset ready.” Do not put binary/base64 art in every event or tool result. A
manifest and asynchronous cache-aware loader are sufficient initially;
[PixiJS Assets][pixi-assets] is an available integration if a game later needs
spritesheets, texture bundles, and richer rendering.

## 6. Recommended v1 and deliberate exclusions

Prioritize a vertical slice over a catalogue of disconnected APIs:

1. A working local session server, durable commands, incremental observations,
   and an actual agent CLI or MCP transport using the same core.
2. A browser player with true authored component support, live updates, useful
   errors, save/load, and no dependence on an active agent for routine actions.
3. Reusable character, item, stat, ability/effect, inventory, and narrative
   primitives, independently enabled.
4. A combat/exploration example with target selection, resource costs, loot, and
   restart; a story/adventure example with choices, a persistent consequence,
   dialogue history, and free-text input.
5. A demonstrable external-agent round trip: observe a player's new input,
   publish valid new content, and see the running UI update without resetting
   the session. Include a canceled/stale completion demonstration.
6. Exact known limitations and reproducible validation commands.

Defer production multiplayer authority, high-frequency physics, an asset
marketplace, arbitrary untrusted-plugin execution, a general visual editor,
distributed event infrastructure, and mandatory vector-search memory. None is
necessary to establish the requested agent/game interaction model. External
model and image services should be optional adapters; an engine that only works
with one provider or a secret API key cannot be fully exercised locally.

## Sources

[colyseus]: https://docs.colyseus.io/state
[accessibility]: https://gameaccessibilityguidelines.com/full-list/
[sse]: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
[react-store]: https://react.dev/reference/react/useSyncExternalStore
[vite-hmr]: https://vite.dev/guide/api-hmr
[gas]: https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-attributes-and-gameplay-effects-for-the-gameplay-ability-system-in-unreal-engine?application_version=5.2
[ink]: https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md
[renpy-screens]: https://www.renpy.org/doc/html/screens.html
[renpy-save]: https://www.renpy.org/doc/html/save_load_rollback.html
[mcp-tools]: https://modelcontextprotocol.io/specification/2025-11-25/server/tools
[mcp-cancel]: https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/cancellation
[sqlite]: https://www.sqlite.org/transactional.html
[godot]: https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html
[vite-plugins]: https://vite.dev/guide/api-plugin
[pixi-assets]: https://pixijs.com/8.x/guides/components/assets
