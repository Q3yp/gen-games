# Architecture

The authoritative Node runtime owns game state, transactions, persistence, and an ordered event journal. Browser renderers subscribe to state deltas and render independently. Coding agents use bounded incremental event reads, on-demand inspection, and revision-checked authoring transactions. Game packs supply data, server plugins, and optional browser components. Trusted local JavaScript is explicitly not a sandbox.

Detailed contracts and verified limitations will be documented alongside the implementation.
