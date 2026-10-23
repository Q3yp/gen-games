# Demo records and local artifacts

These folders retain written play observations and recovery descriptions. Recorded
video, capture images, release archives and exported runtime saves/reports are
generated artifacts: they stay local or in separate artifact storage, not in the
source repository. Historical reports may name those artifact paths; a fresh clone
does not include them. Request the matching artifact bundle before following a
recovery instruction that depends on one. Never substitute a reset or invented save.

Game source and required game assets under `games/` remain versioned. The ignore
rules are scoped to demo output, not to images, video or JSON across the project.
Local runtime databases and active saves remain under the ignored `.data/` folder.
