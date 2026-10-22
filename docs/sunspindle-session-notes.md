# Sunspindle play iteration

This is an ongoing prototype, not a completed successful game or evidence of
"addiction." Tidelight remains preserved as an unsuccessful earlier iteration.

## First courtyard: 2026-10-22

The independent player threw at the beetle, moved out of its marked charge, then
noticed the return line crossed the crystal prison. They recalled through it,
killed the archer on a return throw, freed the bird, and chose to spare the beetle.
They reached the exit with full health.

Their verdict: they would voluntarily play another encounter with these controls.
Repositioning to create a useful return line was rewarding and readable. The room
was too easy to require revising a plan. Another identical room would wear out;
more variety and meaningful pressure were needed before judging the whole game.

## Second chamber: failed continuation

The Threadmill changes the spatial problem with a turning directional shield and
separate physical gate cords. The player's health, companion, and prior-room
choices persist. Entry is paused. The host's separate preview confirmed room
transition, a visible shield rebound, a broken sunseal, and its lifted gate bar.
These were reliability observations, not evidence of enjoyment.

The player broke the upper seal, tried to arrange rear hits on the guardian, and
found its disappearing angle fiddly rather than satisfying. They took one hit,
broke the other seal, and left the guardian alive. Their verdict was to stop this
run: optional fiddly pursuit or two straightforward seal shots did not deepen the
first room's enjoyable control. They would try a materially revised short
encounter, not another chamber of this version. Preserve this exit and do not
rewrite it into a victory or publish another encounter into the stopped run.

A serious pacing limitation remains: the player reached the first arch around
09:32 UTC, and the new chamber was published around 09:41. Source publication took
about 100 ms; new rule/art authoring, integration, and review dominated the wait.
This is not yet the responsive continuing host experience requested. More useful
local play needs to be prepared while playing, with fast game-owned staging of
already-supported situations and arbitrary source additions for genuinely new
behavior. Shrinking generation or calling a long idle wait "real time" is not a fix.

No test suite or test files were written. Validation used syntax/pack checks and
normal browser controls in a separate host preview. The player operated their own
session and received no hidden mechanics or solution instructions.

## Glassworks: fresh short trial

A separate campaign starts a fully available short encounter instead of extending
the stopped run. Campaign-authored additions include fixed interruptible kiln
artillery, finite explosive glass vessels, readable projectiles, and bright open
arcade art. Existing throw/recall controls remain. The cleared garden gate is a
valid stopping point, not an instruction to wait for another room.

The host's normal-controls preview cleared the encounter with four health. A
`passage.stage` command committed in 35 ms while play continued, kept its room
inactive, and installed it only at the actual safe exit with entry paused. That
transition exposed the previous exit's silent full-heal. The heal was removed
before inviting the independent player; post-removal cross-room health carry has
source/syntax validation, not another browser replay. Static review also tightened
legacy transition guards against entering with zero health or while respawning.
Those later guards were not published into the live player trial.

Independent trial session: `9e29436f-07c9-4847-92bb-dcbe4b567a83`, pinned release
`4c8f8277a1010f9a5a006cff`. Invitation at 10:02 UTC. The player first aimed at a star
jar behind the beetles, stepped north, and saw both beetles gone and the jar
shattered. They described this as a useful environmental idea with a clear result.
The player cleared the kiln by stepping between firing lines and hitting it on
the outward and returning path, reaching the gate with full health. They found
this more enjoyable than the guardian room and voluntarily requested one fresh,
unchanged retry to attempt return-line kills on the beetles instead of removing
them immediately with the jar. No substantial plan revision was needed: the
opening idea worked immediately and the firing lanes were straightforward. This
is evidence of a voluntary replay, not sustained challenge or overall engine
success. The retry uses exactly the same pinned source, in a separate campaign.
