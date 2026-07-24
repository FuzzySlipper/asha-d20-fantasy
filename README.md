# ASHA d20 fantasy rules

This public repository is an independent consumer of ASHA RPG. Its authored
concepts are peer roots rather than one aggregate Ruleset directory:

```text
rulesets/d20-fantasy/
  src/ruleset.ts
content-packs/foundation/
  src/procedures.ts
content-packs/starter/
  src/
play-bundles/
  starter.ts
scenarios/
  starter-skirmish.ts
src/index.ts                    # repository package facade
SOURCES.md
```

The Ruleset declares semantic contracts and Rust bindings but no spells,
archetypes, creatures, items, or encounters. The foundation Content Pack owns
reusable d20 action procedures. The dependent starter Content Pack owns nouns,
data-only items, participant profiles, and concrete procedure invocations. The
starter PlayBundle composes both packs with the Ruleset, while Scenario files
remain setup-only documents for the compiled bundle.

Weapons, shields, and focuses do not grant action definitions or contain action
programs. Profiles create item instances and equip them into named slots. Rust
materializes the shared `action.basic-attack` once per compatible weapon and
requires proposals to identify the exact equipped item binding.

The engine is pinned as the `vendor/asha-rpg` submodule. Clone recursively, then
run:

```bash
npm install
npm test
npm run --silent emit:prepared > /tmp/d20-fantasy-prepared.json
npm run play:smoke
```

Source and licensing details are in [`SOURCES.md`](SOURCES.md).
