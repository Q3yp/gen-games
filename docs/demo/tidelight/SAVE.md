# Recover the completed voyage

`voyage-save.json` preserves the paused end of the first Tidelight voyage: back
on the surface, with the freed swimmer accompanying the boat. It contains only
the game's serializable save and four provenance fields (`gameId`, `saveVersion`,
`sourceRelease`, `capturedAt`). It contains no connection credentials, director
state, workspace notes, or database dump. Its game history is in-game history,
not a transcript of the hosting conversation.

## Import from this repository

Use Node 24+. From the repository root, choose a **nonexistent** data directory
whose parent already exists. The importer refuses even an existing empty directory.
It never opens or updates the original campaign database.

```sh
node scripts/import-save.js docs/demo/tidelight/voyage-save.json "$HOME/tidelight-recovered" \
  --compatible-release 8868235e7cc6dcfe2283c4e5
GEN_GAMES_DATA="$HOME/tidelight-recovered" PORT=3001 npm start
```

The importer prints a new `sessionId` and `openPath`. Open
`http://127.0.0.1:3001` followed by that `openPath`. The saved voyage is paused;
resume it with the game's pause control when ready. Use another free port if
3001 is occupied. Keep this data directory for subsequent runs and start the
server with the same `GEN_GAMES_DATA` value. The import is a one-time operation,
not something to repeat each time the server starts.

## Explicit source compatibility

The captured save uses version 1 and source release
`67d05e3a4be666f97ac79cc2`. The repository source at preparation time hashes to
`8868235e7cc6dcfe2283c4e5`. A complete file comparison established that **only
AUTHORING.md changed**: its guidance now distinguishes publication release checks
from command world-version/director-turn checks. The executable source, styles,
and manifest are identical. The command above explicitly accepts this reviewed
release; it does not accept arbitrary future changes.

Without `--compatible-release`, the importer requires the installed whole-pack
hash to equal the export's `sourceRelease` exactly:

```sh
node scripts/import-save.js docs/demo/tidelight/voyage-save.json "$HOME/exact-tidelight-recovery"
```

The compatibility option must name the actual installed release hash. It never
bypasses a saveVersion mismatch, changes the save, or performs a migration. For
future source changes, restore the matching source or review compatibility before
explicitly naming a new hash. Matching saveVersion alone is not proof of behavior
compatibility. Packs are trusted local code; use a trusted checkout.

## Scope and validation

- Generic importer for code-runtime games, not legacy structured-world saves.
- Validates the envelope, JSON object state, finite numbers, size, saveVersion,
  installed game and source release. It cannot validate every game's semantics.
- Always creates a new UUID session using Engine, Store and registry APIs in a
  freshly created data directory. There is no existing-session or overwrite mode.
- Preserves game save only. Session IDs, runtime connections, event cursors,
  checkpoints, director state and workspace notes are intentionally not restored.
- Does not bundle source or media: retain this repository alongside the export.
  Commit/push these files to preserve them beyond the local workspace lifetime.
- A failed source check may leave a new directory with source snapshots but no
  imported session. Use a new destination on retry; existing directories are
  never reused or deleted automatically.

Manual validation on 2026-10-22 used only fresh temporary data directories:
syntax check passed; default source mismatch was refused; the explicitly reviewed
release imported successfully; reopened SQLite state deep-equaled the complete
export, remained paused, and contained exactly one new session; an import into
that existing directory was refused without changing it. The original live
campaign was accessed only through read-only save/runtime inspections and was
not changed. No browser replay or end-to-end visual verification of the recovered
copy was performed, and no tests or test files were added.
