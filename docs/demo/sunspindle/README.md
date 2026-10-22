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
