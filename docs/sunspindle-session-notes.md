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
and finished at the balcony exit with four health. The caption claimed a garden,
but no new place actually appeared; the later player correctly rejected that ending. A thrown weight visibly reversed an
incoming warm bolt into a cyan-white comet, which traveled back to the remaining
kiln; recall finished it. The finite screen visibly cracked under fire. These are
readability/feasibility observations, not independent enjoyment evidence.

The fresh independent trial `d7239057-bef9-4a79-968f-22421866d5da` was invited at
10:32 UTC on release `815128558806a332c7ce5a09`. It has the same controls. The host incorrectly treated its caption-only
exit as a complete ending; the later independent verdict below corrects that claim. The host preview was paused and its own tab closed; the player
retains sole control of their separate campaign. Verdict pending.


## Rain Balcony verdict and engine audit

The independent player enjoyed a deliberate countershot/outbound/return combination
and asked to continue the same run, not restart another isolated room at full health.
They finished at two health. Ordinary pause made screenshot-based tactical planning
worthwhile; this does not validate human-speed reflex feel. A later mistimed recall
intercept was explicitly their decision rather than an observation-gap hit. The
caption-only garden ending was not visually convincing and is recorded as a failure.

A read-only fresh-host audit resumed the exact campaign from workspace, projection
and focused fields without a save dump or source inspection. Nine reads totaled
29,852 raw stdout bytes and 1,213 ms client time. Narrow path reads were 91–163 bytes,
but workspace sections repeated static metadata and discover repeated/truncated
projection/schema text. The subsequent formatter keeps HTTP data identical while
reducing captured v2 brief text from 2,356 to 746 bytes, decisions from 2,498 to 866, unresolved from 2,445 to 814,
metadata from 1,945 to 1,205, and discover from 3,283 to 1,508. It uses readable text and narrower-scope
pointers, not JSON as the required host surface. These backend edits require a
server restart and were isolated-validated, not loaded into the active player server.

Independent source allocation now has a minimal `library scaffold` operation.
Live registration already existed; the added operation creates a unique source
pack with optional lifecycle/save ownership and no renderer or gameplay schema.
Disposable validation covered concurrency, duplicate/traversal/symlink rejection,
retained-source recovery, unchanged existing pins, arbitrary JS publication and
fresh-process host resume. Browser activation was simulated for that validation.
The current player's browser was never used for engine checks.

## Connected garden and rejoin failure

The same player requested a concluding destination at 10:43 UTC. A complete garden
and warden were published, but queued route commands were canceled as the cloud
browser repeatedly discarded and reopened its tabs. Matching run guards behaved
as designed; the host chose the wrong delivery mechanism for a durable passage.
Repeated attempts exhausted momentum. This was another substantial authoring and
delivery wait, not responsive hosting.

Release `107c2207429abd06136db8d0` carries the authored continuation with its source.
Its initialization stages the destination only when the current balcony has no
pending or previously visited garden. It preserves health and existing progress.
Normal rejoin now works without a simultaneous host command: the independent
player confirmed the distinct green garden and unchanged 2/5 health at 11:01 UTC.
The roughly eighteen-minute gap remains a failure even though rejoining is fixed.
The concluding encounter and actual garden arrival remain under independent play.

A disposable direct initialization/step check exercised the exact exported balcony
save, entered the garden while paused, preserved two health, then repeated
initialization without replacing progress. The archive was extracted and rehashed
to its exact release ID. These are lifecycle and preservation checks, not fun claims.
