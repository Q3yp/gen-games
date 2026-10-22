# Lumen Weave: a starting point, not a schema

This pack is ordinary browser ESM. It owns its Canvas2D surface, mechanics, input,
state and timing. The runtime persists its JSON snapshot and swaps immutable code
releases; there is no fixed scene/choice/effect language involved.

## Player loop

Drag a shard by its center; drag either circular end handle to rotate. Mouse wheel
or Q/E rotates the selected shard. Keys 1/2/3 select, arrows move, Shift makes fine
adjustments. Route the visible heartlight into each sleeping seed long enough to
bloom it. A bloom replenishes energy. Retry preserves the constellation, next drift
changes its layout and introduces a blocking shadowstone. Pause/tinker holds time
while the optical preview stays live. Undo restores the previous manipulation.

## Small modules

- `main.js`: lifecycle, HUD, save and inspection, audio and effect triggers.
- `simulation.js`: default seed layout, beam traversal, charge/energy/win loop.
- `input.js`: pointer/keyboard manipulation. No server round trip per move.
- `paint.js`: Canvas2D garden, beams, shards, flowers and particles.
- `geometry.js`: geometric utilities only.
- `mechanics/index.js`: module composition point.
- `mechanics/optics.js`: current mirror, receiver and absorbing stone behaviors.

## Add a genuinely new mechanic

Create an ESM module, import it in `mechanics/index.js`, and append its object to
the exported array. A mechanic may implement any subset of:

- `id`: inspectable name.
- `install(world)`: migrate an existing save or add objects once by stable ID.
- `trace(ray, world)`: return the nearest hit belonging to this mechanic, with
  `distance`, `x`, `y`, and optionally `body`, normal or custom properties.
- `scatter(ray, hit, world)`: return `{rays, deposits}`. Each ray has x/y, unit dx/dy,
  power and color. Each deposit has an object ID and power. New ray types, splitters,
  absorbers, portals and time-dependent behavior can be implemented in real code.
- `step(world, dt)`: simulation time in seconds. Called while playing, not tinkering.
- `draw(ctx, world, {time, view, optics, glow})`: render in 1440 × 900 world units.
- `pointer(phase, point, world, view, event)`: return true to handle pointer-down
  instead of default shard manipulation; add further input in the pack as needed.
- `command(name, args, world)`: optional game-owned host command, returning a result
  when handled and undefined otherwise. The core has no gameplay command allowlist.

These hooks are conveniences in this example, not engine constraints. Rewrite
`main.js` or replace the entry point entirely for physics, 3D, a rhythm game, a
platformer, or different simulation semantics. Modules can import one another.

Publish the whole pack through the runtime's `publish` tool, then confirm
`runtime.activated` and the matching browser summary before claiming that it is
live. Existing saves reach the new module factory. Migrate conservatively and
preserve the player's puzzle/run unless a restart was agreed upon. An `install`
function must not duplicate new objects on every reload or undo.

## What the host can observe

`inspect()` includes the exact source, bodies, illuminated IDs/powers, energy,
score, move count, selected shard, installed mechanic IDs, and control descriptions.
Events include garden.manipulate, garden.bloom, garden.won/lost, garden.undo and
garden.run. Read the real viewport too: valid code and telemetry do not establish
that a mechanic is legible, satisfying, or fun.

## Opt-in experiment: Prismatic Chord

`mechanics/prism.js` is a source-authored rule, not a runtime effect. The player
explicitly chooses **Try prism challenge**, starting a new drift. F or Fork/Focus
switches a selected shard between one reflected ray and two half-power rays
(straight cyan and reflected pink). Flowers transmit light in this mode, including
after blooming. Winning requires all flowers to receive at least 9% source power
continuously for two seconds. Sequential aiming cannot lock a flower. Breaking
a branch resets the visible chord rings; pause preserves planning without charging.
Retry retains the chosen mode; old saves migrate with it disabled.

The module owns its ray splitting, transparent flower deposits, overlap rule,
per-flower feedback, fork markings and earned aurora. The small example hook
`preview(world, optics)` refreshes readable illumination during paused planning;
`step(world, dt, optics)` receives the current beam deposits. A stable circuit is
inspectable as `prism: { enabled, chord, lit, complete }`, and the existing
manipulation events include each shard's fork state. These hooks are pack code,
not additions to the runtime's host command vocabulary.

## Next material: Lantern Trial

The player can explicitly choose Lantern Trial after learning transparent flowers.
`mechanics/lantern.js` constructs four distinctly drawn absorbing receivers. Each
requires 20% source intensity, so the third half-power split in a serial chain is
too dim, while a balanced two-level tree delivers approximately 24% to each leaf.
The existing three manipulable mirrors suffice. Two shadowstones constrain routes.
The new requirement is shown before the player starts; ordinary Prism flowers
retain their transparent behavior and 9% threshold.

Seeded layouts vary within authored clear branch corridors, rather than placing
unvalidated random blockers across required paths. Shards begin unassembled. There
is no host solve command, auto-arrangement, inferred success or generated score;
the browser must trace an actual valid four-way circuit for two seconds. Receiver
`kind: 'lantern'` controls absorption and `requiredPower: .20` controls the visible
brightness requirement. Retry and next drift retain the chosen material mode.
