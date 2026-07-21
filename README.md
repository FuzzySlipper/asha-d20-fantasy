# ASHA d20 fantasy rules

This public repository is an independent consumer of ASHA RPG. It contains one
complete ruleset root:

```text
rulesets/d20-fantasy/
  src/ruleset.ts
  content-packs/starter/src/
  play-bundles/starter.ts
  scenarios/starter-skirmish.ts
  SOURCES.md
```

The Ruleset declares semantic contracts and Rust bindings but no spells,
archetypes, creatures, items, or encounters. The starter Content Pack owns that
authored material. The starter PlayBundle selects the two, while Scenario files
remain setup-only documents for the compiled bundle.

The engine is pinned as the `vendor/asha-rpg` submodule. Clone recursively, then
run:

```bash
npm install
npm test
npm run --silent emit:prepared > /tmp/d20-fantasy-prepared.json
npm run play:smoke
```

Source and licensing details are in
[`rulesets/d20-fantasy/SOURCES.md`](rulesets/d20-fantasy/SOURCES.md).
