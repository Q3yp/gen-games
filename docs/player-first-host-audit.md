# Player-first live-host audit

The prior Iron Cadence run demonstrated timing/persistence and boss completion,
not player enjoyment. Its fixed next-key instructions and heavy status presentation
encouraged developer validation rather than exploration. The shared host skill
already permitted arbitrary code and incremental changes; another generic promise
was less useful than separating the player from implementation knowledge.

## Changes

- The host owns code, private state, audits and debugging. The independent player
  receives ordinary controls, visible premise and the live world only.
- Newly authored independent game IDs register without a server restart. Existing
  IDs retain their registry entry; existing sessions remain pinned to releases.
- Tidelight is generated campaign source, not an engine template. Initial play
  uses local sailing, lift/release of living light, a boat bell and creature motion.
  Subsequent executable behavior is authored while the player experiments, with
  the same save preserved across publication.
- A place becoming an embodied moving creature was introduced in response to the
  player's attempt to bring light to a ruin. It was not part of the opening pack.
  The player subsequently chose to distinguish light-following from bell-following
  through their own experiment. This is evidence of curiosity, not a universal
  claim that the game is fun or addictive.

## Friction still observed

The first bell was too subtle and the tower not visually distinct. Larger pulse
rings and a hanging bell/waterline knocking cue were added. Novel behavior took
host authoring time; source activation itself was quick, but delivery latency is
not a substitute for a satisfying local loop. Whole-instance source replacement
still requires serialize/dispose continuity and cautious timing. Source directories
are authored by the coding agent, not yet allocated by an integrated editor.

Judge each next iteration through the player's voluntary choices and candid
feedback. Do not turn the observations above into a prescribed test route.

## Independent play observations, continued

The player voluntarily led a procession back to the empty arch, returned when it
bloomed, and tried to sail through it. A glowing but initially non-traversable
entrance caused frustration. A real, saved undertide region was then authored;
the player described the ribbed interior as a good change of scale and wanted to
investigate its long, shell-covered creature. Entering was not part of the opening
source pack. The saved surface remains available on return.

Combat was less successful. The player could chip shells but could not reliably
read why a bell worked, and initially could not see damage cost. They voluntarily
paused rather than grind the final shell. Five small hull lights were added;
shells now visibly open around luminous cores before lunging, fractures burst
outward, and freed creatures retain an embodied presence. The next player verdict
is still required. These changes are not evidence that combat is now enjoyable.

A real engine defect surfaced during live publication: replayed historical release
events overwrote newer desired runtime state, attempted stale activation and left
a large failure notice over an already updated game. The host runtime now refreshes
authoritative state, abandons obsolete candidates and clears only its owned stale
notice. Genuine failures remain visible and dismissible. A browser reload preserved
the player's position, three hull lights and remaining shell; a later new browser
tab also resumed that save. This establishes continuity, not enjoyment.

Per-lunge diagnostic events were unnecessarily filling the host cursor while no
new player decision occurred. Tidelight now emits the first target-directed charge
and target changes, plus actual hits, releases and player actions; continuous
animation remains in saved local simulation. No fixed combat component was added
to the generic engine. Source registration and stale-publication repair are generic;
Tidelight mechanics and art remain generated campaign-owned modules.
