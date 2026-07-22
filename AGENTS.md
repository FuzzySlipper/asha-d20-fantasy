# AGENTS.md

This repository owns independent Rulesets, Content Packs, PlayBundles, and
Scenarios for ASHA RPG.

- `rulesets/d20-fantasy` owns only the semantic Ruleset.
- `content-packs/starter` owns authored actions, profiles, items, conditions,
  and presentation.
- `play-bundles` owns explicit Ruleset plus Content Pack compositions.
- `scenarios` owns setup-only documents bound to a PlayBundle.
- Keep these as peer roots. Do not nest Content Packs, PlayBundles, or
  Scenarios beneath a Ruleset directory.
- Rust in the pinned `vendor/asha-rpg` submodule owns validation, gameplay
  semantics, state mutation, random evidence, reactions, turns, and replay.
- TypeScript here may declare immutable Ruleset, Content Pack, PlayBundle, and
  Scenario data only. It must not evaluate gameplay semantics or mutate an
  authority session.
- Use the public `@asha-rpg/authoring` API. Do not import package internals or
  edit the vendored engine.
- Keep externally derived mechanics and terminology attributable through the
  repository-root `SOURCES.md`.
- Project work is tracked in Den under project `asha-rpg` unless a task says
  otherwise. Resolve live guidance before substantial changes.
