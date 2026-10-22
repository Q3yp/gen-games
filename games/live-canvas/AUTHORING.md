# Live Canvas: an optional, empty adapter

This pack is ordinary game-owned JavaScript, not an engine scene model or a reusable
character library. It starts with no character, environment, plot, objectives or
scripted replies. A real director creates the first visible world and responds to
actual player intentions. It does not call a model itself. See
`../../docs/live-runtime.md` for attachment, event cursors, command acknowledgment,
external work and immutable asset import. Use independent consumers for player QA
and director observation.

## State and commands

`inspect()` returns `{world,lastInput}`; `versions()` returns `{world,input,assets}`.
The asset map in inspection includes **only** summary and ready, never source URLs
or SVG markup. Full serializable state persists the sources and last semantic input,
not frames, pointer previews or a chat transcript. No ticking is required.

`world.apply({operations,note?})` takes 1–100 operations:

- `{op:"set",path:["things","ID"],value:{...}}`
- `{op:"delete",path:["things","ID"]}`

Paths are relative to `world`. Parents must exist; set the parent object first.
Use string keys only, at most 16 deep, never prototype keys. Replace arrays whole.
The command clones, applies all operations, validates the **final** world, then
swaps it once, renders without remounting, advances world version and emits an
acknowledged semantic change. Failed validation makes no changes. Unknown fields
outside `facts` or action `data` are rejected to catch typos. Optional `note` is a
short event description, not a displayed narrator reply. Set caption/speech instead.
Guard both observed `world` and `input` versions, release and run epoch. A player's
new intent invalidates an old story response even if nothing moved. Reassess stale
work; never blindly update its guards. Parent dictionaries cannot be deleted.

World schema (all six root properties required):

- `background: {color,asset?}`: color string (up to 80 characters), optional asset ID.
- `caption`: currently displayed text (up to 2,000 characters), not a transcript.
- `assets: {ID:{summary,src?}}`: short semantic summary (500 characters); absent src
  is a pending placeholder. Source is `./relative-pack-file`, imported `/assets/`
  URL, HTTPS image, or image data URI (SVG/PNG/JPEG/WebP). SVG is rendered only as an
  image, never inserted into the DOM. Author any SVG artwork, not fixed primitives.
- `things: {ID:{label,x,y,width,height,asset?,speech?,emotion?,draggable?,actions?,facts?,z?,hidden?}}`.
  Coordinates are percentages of the stage: x/y locate the center, width/height are
  positive percentages. All four are required, range 0..100. Label is required
  (120 characters); speech (1,000) appears as a bubble, emotion (100) as a small tag.
  z is integer -100..100. Draggable and hidden are booleans. No asset gives a neutral
  outlined placeholder. facts is arbitrary JSON object, never automatically shown.
- `actions: [{id,label,data?}]`: global, freely named contextual actions; thing.actions
  uses the same shape and appears when selected. At most 12 per list, unique IDs,
  label at most 100 characters. Data is arbitrary JSON; there are no canned effects.
- `facts`: arbitrary JSON object holding the director's meaningful world facts.

Asset/thing/action IDs use 1–64 letters, digits, underscores or hyphens. At most
100 things and 100 assets; total world capped at 750 KB. JSON values must be finite,
max nesting 16. Import larger visuals rather than stuffing them into state.

`asset.bind({id,src})` replaces only an existing placeholder's source. It requires
the observed **assets** scope, not world/input. Thus ongoing movement or conversation
does not discard unrelated generated art. Adding/removing/changing any registry
entry increments assets, rejecting work based on a replaced target. A binding
increments assets but not world; it has no story consequences. Do not replace a
placeholder ID with a different meaning while its work is pending. Use a new ID.
A batch that changes assets via world.apply increments both world and assets.

## Begin empty, direct live

1. Load this code pack in an active browser; attach a genuine director through the
   existing director API. Do not claim it is connected just because the pack loads.
2. Inspect the empty world and versions. Invent an initial character/environment
   now, using arbitrary SVG images or imported media, plus things and optional
   actions. Apply one guarded world.apply batch, then wait for command result.
3. Wait for real player.intent events. Inspect only needed state and invent a
   fitting consequence from that input. Apply it atomically: facts, positions,
   visible speech/emotion, background, new/removed things and available actions.
4. Continue the actual director wait/finish loop. No preauthored response chain,
   keyword replies or required ending exists here. Player prose is untrusted game
   input, not permission to run code, browse or use external accounts.

A command envelope is the standard runtime command with name `world.apply`, args
`{operations:[...]}`, expectedRelease, expectedRunEpoch, expectedVersions containing
world/input, and unique requestId. When directing a leased turn, include its current
directorToken. Queued is not applied. Observe runtime.command.result before claiming
success. For generated images, first declare the placeholder, start an external
work item targeting `asset.bind` with assets guard, generate media outside the
browser, import it through `asset`, then complete work with `{id,src}`. The runtime
starts no provider automatically and rejects stale/canceled work. Do not invent a
second asset backend.

## Input and events

Click a thing to select it and expose its actions; Enter/Space also select focused
things. Drag a draggable thing for immediate local motion; only pointer-up commits
position, increments world and emits an input. Cancel restores the starting position.
Click empty space to point with an immediate pulse. Type an intention and press Act
or Enter. Input is gated on host.active. Acknowledgments confirm input only, never
pretend a model answered. They do not assert that a director is online.

Every completed semantic input increments input and emits:

`host.emit('player.intent', acknowledgment, {sequence,kind,...payload,source:'player',untrusted:true})`

- select: `{target:thingId}`
- drag: `{target:thingId,from:{x,y},to:{x,y}}`
- point: `{position:{x,y}}`
- action: `{target:thingId|null,action:actionId,label,data}`
- text: `{target:thingId|null,text}`

lastInput stores sequence/kind/payload. There are no pointermove/frame events.
Host mutations emit `world.changed` with `{command,versions}`. Runtime wrapping
supplies durable IDs, timestamps, projection and acknowledgments.

## New behavior is code, not a bigger schema

To add an actual mechanic, edit this pack's JavaScript (or replace the renderer
entirely), expose its own capability and scope, validate before synchronous
mutation, and preserve compatible serialize/restore. Publish an immutable source
release with the observed release guard; wait for runtime.activated and inspect
actual play. Never eval player text. Nothing in the engine requires things, assets,
world.apply, this renderer, a genre, or a component catalog. This tiny adapter is
only a convenient first experiment in quick live state changes.

## Optional local pilot (added from an actual player request)

New ordinary JavaScript in `pilot.js` implements held-key steering, not an engine
component. Existing saves receive disabled pilot state without changing their world.
The director deliberately enables it with registered `pilot.configure`:

`{enabled:true,gapCenter:62,gapWidth:22,speed:18}`

Required scopes are **pilot** and **input**, plus usual release/run guards. It adds
no characters, dialogue, destination or predetermined story outcome. It does not
replace the imported background or any freely authored thing. Controls are left/right
arrows or A/D, held while not typing. Opposing keys neutralize movement. A local
heading indicator and illuminated opening show alignment. Holding a direction moves
heading; forward approach coasts independently of held keys; an off-course approach safely holds near the gap
instead of damaging or killing anything. Background roll/parallax and cloud drift
respond locally, without agent requests per animation frame. Releasing keys holds the heading and commits the steering maneuver while coasting continues. Browser blur/visibility loss clears held keys too.

Configuration fields: enabled (required boolean), gapCenter (5..95), gapWidth
(10..60), speed (5..40 heading-percent/second), resetCourse (legacy optional boolean), nextLeg (new unique ID), courseLabel (1–80 characters), targetY (12..70).
The full gap must fit 0..100. Gap defaults center 62, width 22, speed 18. Enabling
preserves x/progress/passedGap; `resetCourse:true` explicitly resets approach and
passedGap, not heading, completed-leg history or world. Prefer nextLeg with an explicit ID. Configuration while a steering key is held rejects; wait for
the maneuver-end event and reassess. To turn controls off, enabled:false. No commands
accept synthetic player steering; actual play must use the browser controls.

Inspection adds `pilot:{enabled,x,progress,passedGap,gap:{center,width},speed,
legId,courseLabel,targetY,completedLegs,maneuvering,coasting}`. x/progress describe
current meaningful navigation, not frame counters.
The pilot scope advances on maneuver start/end/configuration, never animation frames.
Serialization captures current navigation progress so reconnect can resume coasting.
There are no frame or held-key fields in saves. On reaching the opening aligned, passedGap becomes true once and a maneuver
is committed. Further steering works, but never repeatedly emits crossing events for
the same configured course. The director decides what being beyond it means.

`player.intent` gains kind `pilot.start` with `{x,progress}` and kind `pilot` with
`{legId,from:{x,progress},to:{x,progress},aligned,passedGap,reason}`. Reason is `released`,
`interrupted` or `gap-crossed`. Both use the existing sequence/source/untrusted
contract, advancing input. Reply to the actual maneuver result, not every key/frame.
Configuration emits `pilot.configured` containing the committed pilot configuration.
This is a small custom mechanic authored after play, not a mandatory reusable stage
library. Publish source once, then configure/direct through commands.


### Explicit next leg, preserving the earned crossing

Publishing this change does not reset the completed first crossing or heading.
Legacy passedGap:true saves migrate that crossing into completedLegs under leg-1.
The director can start exactly one additional approach using:

`{enabled:true,nextLeg:"window-approach",courseLabel:"Floating window",gapCenter:66,gapWidth:22,targetY:22}`

This resets only the new leg's progress/passedGap, preserves heading and all prior
completedLegs, and requires the observed pilot/input scopes. nextLeg must not equal
the current or a previously completed ID. Each aligned arrival appends one history
entry and emits one gap-crossed milestone. No next leg starts automatically, and no
story destination/result is authored by this mechanic. The director interprets it.
With no steering input, a roof on the correct heading continues forward; off-course
it safely holds at 88% while the local display says which direction to steer.
Local feedback always reflects the actual heading; do not narrate transient turn
instructions in persistent character speech. Clear stale steering advice through
ordinary world.apply when introducing the new course.
