# ASHA d20 fantasy rules

This public repository is an independent consumer of ASHA RPG. Its authored
concepts are peer roots rather than one aggregate Ruleset directory:

```text
rulesets/d20-fantasy/
  src/ruleset.ts
rulesets/tactical-rollover/
  src/ruleset.ts
content-packs/foundation/
  src/procedures.ts
content-packs/starter/
  src/
content-packs/tactical-rollover/
  src/
play-bundles/
  starter.ts
  tactical-rollover.ts
scenarios/
  starter-skirmish.ts
  tactical-rollover-skirmish.ts
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

The starter pack also publishes sealed Fighter and Wizard class definitions
plus data-only positional talents. Profiles explicitly select their class and
talents. The `Positional Talents` Scenario begins with the Fighter flanking one
hostile while adjacent to two, allowing Rust to explain the Basic Attack's
base modifier, flanking bonus, and surrounded bonus as separate structured
contributions. TypeScript does not evaluate those board conditions.

The separate Tactical Rollover kit is a deliberately small clean-room
mechanical witness. Its original Ruleset, Content Pack, PlayBundle, and
setup-only Scenario exercise the engine's generic scalar outcome bands,
contextual contribution ledger, item-bound procedure invocation, fixed
resource cost, selected-cell movement, short effect lifecycle, typed two-part
damage and responses, before-damage choice, bounded area projection, atomic
rejection, checkpoint, and replay. The Rust consumer drives the interaction;
the TypeScript source only authors immutable intent and setup.

The engine is pinned as the `vendor/asha-rpg` submodule. Clone recursively, then
run:

```bash
npm install
npm test
npm run --silent emit:prepared > /tmp/d20-fantasy-prepared.json
npm run play:smoke
npm run play:tactical-rollover
```

Source and licensing details are in [`SOURCES.md`](SOURCES.md).
