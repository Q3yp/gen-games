# Action: readable pressure and expressive control

## Promise and verbs

The player improves at move, aim, dodge, strike, block or time. Prioritize control response, spatial readability and recoverable learning. Load this as a secondary profile when real-time execution is a significant RPG or roguelike subsystem.

## Author the loop

- Establish input, movement and camera behavior before adding effects. Show hitboxes or reliable visual equivalents, attack windups, impact and recovery distinctly.
- Make threats readable early enough to respond. Distinguish taking damage, spending a resource and being unable to act; avoid effects that obscure the information needed to survive.
- Give tools different timing, range, positional or resource tradeoffs. Include a useful defensive response rather than reducing every encounter to racing damage numbers.
- Keep failed attempts short enough to learn from and restarts clear. Offer appropriate input alternatives and readable contrast; difficulty should not depend on ambiguous controls.

## State, context and live hosting

Serialize durable encounter/progression state; do not require the host to process individual frames. Summarize current threat, player condition, recent damage/failure cause and available tactical alternatives. Keep timing rules stable mid-encounter, guard inactive input and release held controls on focus loss where applicable. Publish disruptive changes at a safe boundary rather than during a committed attack.

Judge windups, parries, holds and release windows locally; the director authors circumstances and follows up on outcomes, not individual timed inputs. Use optional timed cues sparingly for a distinct clash or flourish. Leave enough ordinary control between them for mastery. Bound attack openings so repeated tapping is a deliberate tradeoff rather than the dominant answer to every threat.

Verify pause/blur/reload during a held cue: inactive input cannot progress the game, releasing while paused must not leave a stuck key, and resume must neither award a free hit nor synthesize a miss. Save gameplay progress, not an assumption that a physical key remains held. On a fresh-host return, inspect current encounter phase and capabilities before applying an older plan. Prepare new code/art separately and activate at a safe boundary; visual flourish must not obscure the next actionable cue.

## Play evaluation

Exercise controls under actual browser timing, including rapid inputs and a defensive maneuver. Can the player identify why they were hit before seeing a log? Compare two tools or movement strategies; distinguish tactical choice from execution difficulty. Verify that effects and UI do not conceal threats. A scripted command that wins an encounter does not validate action controls.

Check the easiest bypass as well as the intended technique. A fiddly optional
target plus a trivial exit may offer neither a worthwhile fight nor an interesting
choice. Earn continuation through the ordinary local activity, not a promised next
reveal. Prepare supported situations while the player acts; if new authoring is
not ready, offer a complete short stopping point rather than a long empty wait.

## When the player reports guesswork

Fix the visible cause and consequence before adding another encounter. A bright
windup alone is insufficient if closed armor, exposed vulnerability, impact and
recovery look interchangeable. Make resource loss readable without consulting a
log. Observe whether the player forms a prediction or merely repeats the same key.
Do not count an eventual win as resolution of this problem. Support a spatial or
preparatory idea when appropriate, and avoid repeating an identical solved loop
just because the first version is now reliable. Preserve an already announced
attack; activate revised behavior between attacks or while voluntarily paused.
