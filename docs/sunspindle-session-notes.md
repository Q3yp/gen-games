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

## Glassworks: unchanged voluntary replay

The separate retry `087204d2-9bb8-4ea1-9574-e375b5844ad1` used the exact same
`4c8f8277a1010f9a5a006cff` release. The player initially avoided the jars, missed a
long return through the charging beetles, then revised to a close-range throw after
they crossed the room and caught them clustered. They continued experimenting with
the kiln's incoming shots and finished with four health. They could not tell whether
a fireball was intercepted or missed, so no successful interception is claimed.
Both jars later broke incidentally; this was not a jar-free final save.

The player's verdict: the short loop held interest through one voluntary replay
and an actual revision of an unsuccessful idea. They would play a different
encounter with the weapon, not grind a third copy. This is a credible small playable
loop, not sustained campaign depth or overall engine success. The stopped retry's
portable save and exact played source archive are in `docs/demo/sunspindle/`.

## Rain Balcony: candidate trial, not a verdict

A new complete short situation responds to the player's interest in incoming shots:
fixed countershot sources, finite cover, and plainly colored reflected projectiles.
Ordinary hits do not cancel these sources' attack cycle; reflected hits can stagger.
The source is arbitrary campaign code, not an engine-wide component catalog.
Independent play and evaluation are still pending. Existing player sessions are
unchanged. Do not infer enjoyment from syntax checks or a host's feasibility clear.

Host preview `74a9012a-4c58-4e0f-b86d-11ddbc831821` used normal visible controls
and finished at the garden with four health. A thrown weight visibly reversed an
incoming warm bolt into a cyan-white comet, which traveled back to the remaining
kiln; recall finished it. The finite screen visibly cracked under fire. These are
readability/feasibility observations, not independent enjoyment evidence.

The fresh independent trial `d7239057-bef9-4a79-968f-22421866d5da` was invited at
10:32 UTC on release `815128558806a332c7ce5a09`. It has the same controls and no
unfinished exit. The host preview was paused and its own tab closed; the player
retains sole control of their separate campaign. Verdict pending.
