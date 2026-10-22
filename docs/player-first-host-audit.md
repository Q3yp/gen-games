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
