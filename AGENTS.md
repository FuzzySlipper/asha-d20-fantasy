# AGENTS.md

This repository owns independent Rulesets and Content Packs for ASHA RPG.

- The complete d20 fantasy root is `rulesets/d20-fantasy`.
- Rust in the pinned `vendor/asha-rpg` submodule owns validation, gameplay
  semantics, state mutation, random evidence, reactions, turns, and replay.
- TypeScript here may declare immutable Ruleset, Content Pack, PlayBundle, and
  Scenario data only. It must not evaluate gameplay semantics or mutate an
  authority session.
- Use the public `@asha-rpg/authoring` API. Do not import package internals or
  edit the vendored engine.
- Keep externally derived mechanics and terminology attributable through the
  relevant ruleset root's `SOURCES.md`.
- Project work is tracked in Den under project `asha-rpg` unless a task says
  otherwise. Resolve live guidance before substantial changes.

