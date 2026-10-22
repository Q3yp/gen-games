# Preserved Sunspindle iteration

`stopped-threadmill-save.json` is the actual independent player's paused save at
room 2's exit, not a successful-run fixture. The player chose to stop: a useful
return-throw idea in room 1 did not survive room 2's fiddly guardian pursuit,
trivial alternative seal shots, and the preceding nine-minute authoring wait.

- Original campaign: `604270b0-a9d6-4e13-9972-ec28a0afd0e1`.
- Pinned source: `7c5bf2d7e380c8102a86b4f3`, save version 1.
- Source checkpoint: commit `b7f064a759b7201aaac5d31d14542f65d5aae825`.
- Captured read-only through the `inspect` save scope. The original player session
  was not reset or advanced. This old version healed at exits, hence five health
  in the captured save despite the player taking a hit during the encounter.

Use `scripts/import-save.js` with a brand-new data directory. It refuses an
existing directory and mismatched source unless an explicitly reviewed installed
release is supplied with `--compatible-release`. An import into newer source is
not exact historical replay; use the source checkpoint for that purpose.

No screenshots or video were fabricated for this run. Tidelight's separate demo
retains its own genuine player-view frames and failed-iteration verdict.

`glassworks-first-clear-save.json` preserves the first complete Glassworks attempt
at its garden gate. Source release `4c8f8277a1010f9a5a006cff`; campaign
`9e29436f-07c9-4847-92bb-dcbe4b567a83`. The player reached it with full health,
voluntarily requested one unchanged retry, and explicitly did not call the easy
clear proof of sustained challenge or overall success. The original is retained.

## Exact played source and recovery checks

`releases/` contains deterministic archives of the actual immutable played packs,
including their original authoring documents. Extracted copies were rehashed with
the engine's snapshot routine: the two historical packs reproduced their named release IDs exactly.
These historical packs differ from later source-only safety/observability fixes.

- `4c8f8277a1010f9a5a006cff.tar.gz` SHA-256:
  `4759fb201a983d27f9d0632762eca4b27cc2671ab6a08fda6a495cfd854d13e9`
- `7c5bf2d7e380c8102a86b4f3.tar.gz` SHA-256:
  `5cf9757425202232f5fdd87661887bfaaba1130ef3ba98e5493de1704f27a2a8`

Both saves were imported into separate new offline data directories with reviewed
then-installed release `aeee58578b2c9aac0d0d0ffb` (not a claim about the current mutable pack). The importer verified exact save data
and created distinct session IDs. Calling the new source's migration preserved
room, player position and health; it labeled the Glassworks ending `complete`.
This was an offline recovery check, not a browser replay of the recovered runs.
The original live sessions were untouched.


`glassworks-unchanged-retry-save.json` preserves the requested unchanged replay,
campaign `087204d2-9bb8-4ea1-9574-e375b5844ad1`, same `4c8f8277a1010f9a5a006cff`
source. The player finished with four health after revising a missed long return
to a close-range attack. They would try a different encounter, not grind a third
copy. This earned a bounded small-loop verdict, not campaign or engine success.

`815128558806a332c7ce5a09.tar.gz` preserves the newly invited Rain Balcony source.
Its independent trial is still being evaluated; it is not a success recording.
