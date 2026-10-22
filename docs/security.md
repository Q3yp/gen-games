# Trust and operational boundaries

## Trusted local code, untrusted game text

This is a local developer runtime. Server plugins execute normal JavaScript with the server process's privileges. UI modules execute same-origin JavaScript in the browser. A frozen snapshot and dispatch API improve architecture, but are **not a sandbox** and cannot protect against malicious modules, infinite loops, arbitrary network calls, or unsafe filesystem access by a server plugin.

Only load packs and code you trust. There is intentionally no `eval`, arbitrary JavaScript execution tool, shell execution tool, or remote package installer in the game API. Text sent through `narrative.say` is data; unmatched player input is explicitly marked untrusted in director requests. A coding agent must not treat player dialogue or imported content as instructions to change its own permissions or execute commands.

Built-in views escape authored text. Static routes stay inside `public` or `games`, resolve symlinks before serving, reject dotfiles and unsupported file types, and send content-type and framing protections. Custom views are constrained by the host to local `/games/*.js` module URLs, but trusted code may still do anything normal same-origin JavaScript can do.

## Local API

The server binds to `127.0.0.1` by default. Cross-origin mutations are rejected, JSON content type is required for POST, and unauthenticated hostnames must be localhost/loopback to reduce DNS-rebinding exposure. There is no permissive CORS header.

An optional `GEN_GAMES_TOKEN` protects POST requests with a bearer token. The CLI/MCP bridge supports it; the supplied browser UI does not have a token-entry flow. Non-loopback binding requires this token, but that is not a promise of production security. Do not expose the runtime directly to the public internet. There is no multi-user authentication, role-based access, rate limiter, TLS termination, upload scanner, or tenant separation. GET endpoints and static files are not private when reachable.

Director-only actions check the server-selected actor. `/actions` always executes as the player, regardless of a supplied actor string. Agent mutations go through `/api/tools`. This is a workflow boundary inside a trusted local environment, not an authorization system between hostile users: anyone with local API access may call the agent tools.

## Data and recovery

Saved sessions and event logs can contain free-text player input. They stay in `.data` unless you copy or back them up. Git ignores this directory. Do not commit saved worlds containing private information into a public repository.

Use one server process per database. Back up a stopped database, or use a proper SQLite backup including WAL state; copying only a live `.sqlite` file can omit recent transactions. Checkpoints are logical snapshots inside the same database, not disaster-recovery backups.

No action handler should perform external side effects. A database rollback cannot undo a network request or file write made by a trusted custom plugin. Run slow or external generation outside the transaction, then commit its proposed content through a fenced job.
