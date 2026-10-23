# Quiet engine shell (23 October 2026)

This change is limited to the engine and host instructions. It does not redesign
an existing host-authored game, prescribe a visual style, or install game widgets.

## Reusable changes

- The permanent toolbar becomes two 44px overlay controls: Game menu and Ask host.
- Saved worlds, fullscreen, help and Studio move into the menu. Session options
  and technical event history stay collapsed until requested. Legacy grid help is omitted for arbitrary code
  games, which own their own control vocabulary.
- Pending/working and failed requests retain visible status. A newly completed
  request acknowledges briefly, then yields the screen; its durable history is
  still available in Ask host. Old successful requests do not fill the play view.
- Controls retain accessible names, visible keyboard focus, hover/focus labels,
  touch-sized targets and device safe-area spacing. Modal keyboard input stays
  out of authored document-level gameplay handlers.
- Host guidance selects presentation and information density from the intended
  experience. Genre references are optional and nonexhaustive, without imposing
  a renderer, component catalogue, fixed HUD or visual hierarchy.

## Verification and boundaries

Manual cloud-browser checks covered the unchanged active game, menu open/close,
Ask host draft entry and dismissal, Escape returning focus, Studio entry and
return. No request was submitted and no gameplay action was taken. Syntax checks
covered all 220 JavaScript modules; no tests or test files were added.

The `games/` tree has no diff. The current persisted world remains JSON-identical
to `docs/demo/live-authoring/current-save.json`'s `save`, at world version 74;
its active authored release remains `3103253a1563586c79f8093b`. Normal browser
attachment updates runtime metadata, not earned game state. The existing game's
header, sidebar, art, map, rules and save were deliberately left alone.

The independent reviewer initially hit the existing startup ownership error when
an unpainted automation tab delayed activation. Reload followed immediately by a
screenshot recovered. Activation's animation-frame wait and 15-second lease are a
plausible cause, not a conclusively diagnosed fix. No speculative reconnect change
is included. Mobile viewport rendering and new terminal-request transitions were
not manually exercised in this pass; target sizing and status logic were reviewed.

This is a quieter shell plus authoring guidance. It does not retroactively make
all existing authored products immersive, and it does not claim a new game loop.

## Guidance correction

The initial “world-first” presentation wording was too prescriptive. The current
shared guide treats text, menus, dense controls, abstract and spatial interfaces
as valid choices, and separates universal continuity/workflow contracts from
optional design questions. Genre references can be combined or skipped. No game
product or engine behavior was changed by this instruction correction.
