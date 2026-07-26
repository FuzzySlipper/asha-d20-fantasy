# ASHA d20 fantasy rules

This public repository is an independent consumer of ASHA RPG. Its authored
concepts are peer roots rather than one aggregate Ruleset directory:

```text
rulesets/d20-fantasy/
  src/ruleset.ts
rulesets/tactical-rollover/
  src/ruleset.ts
rulesets/context-tactics/
  src/ruleset.ts
rulesets/multi-axis-pool/
  src/ruleset.ts
rulesets/ruleweaver-tactics/
  src/ruleset.ts
content-packs/foundation/
  src/procedures.ts
content-packs/starter/
  src/
content-packs/tactical-rollover/
  src/
content-packs/context-tactics/
  src/
content-packs/multi-axis-pool/
  src/
content-packs/ruleweaver-foundation/
  src/
content-packs/crosswind-outpost/
  src/
play-bundles/
  starter.ts
  tactical-rollover.ts
  context-tactics.ts
  multi-axis-pool.ts
  ruleweaver-foundation.ts
  crosswind-outpost.ts
scenarios/
  starter-skirmish.ts
  tactical-rollover-skirmish.ts
  context-tactics-crossing.ts
  multi-axis-pool-crossing.ts
  crosswind-outpost-skirmish.ts
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

The Context Tactics kit is a second, mechanically distinct clean-room Ruleset.
It uses four ordered outcome bands, bounded contextual band shifts,
deterministic same-group suppression, separate action and reaction activation
budgets, a zero-cost activation ceiling, a short named effect, ordered
per-part responses, and bounded area selection. Its Rust witness records actor,
target, item, and cell facts as applied, inapplicable, or suppressed authority
decisions and proves budget reset, effect expiry, atomic rejection, and replay.

The Multi-Axis Pool kit is a third distinct clean-room Ruleset. It defines
original signal, focus, and drag dice with explicit face vectors, paired-axis
cancellation, an uncoupled axis, and one primary outcome band independent from
benefit and complication results. Its Rust witness reduces actor, exact bound
item, and active-effect sources in canonical order; proves both replacement and
fallback from the same item rule; records applied and inapplicable decisions;
spends one fixed resource while preserving a second; rejects mismatched typed
random evidence atomically; expires the short effect exactly; and replays to
the same authority hash and log.

The RuleWeaver Tactics foundation is an independent clean-room tactical
Ruleset and shared Content Pack. The Ruleset declares six explicit attributes,
four defenses, a natural-20 critical scalar profile, Standard/Bonus/Reaction
budgets, and weighted movement allowance. The foundation keeps shared
procedures, inert items, action invocations, typed conditions, a fixed spatial
source, talents, and class composition in separate source modules. It contains
no participant roster or scripted Scenario; representative content belongs to
a separate downstream Content Pack.

Crosswind Outpost is that separate representative slice: four original player
archetypes, four generic adversaries, inert melee/ranged/implement/defensive
equipment, one dependent Content Pack, one peer PlayBundle, and one setup-only
scenario. It reuses the foundation procedures for item-bound attacks,
movement, forced movement, healing, conditions, reactions, and a persistent
field; only its distinct cost-once area attack remains inline.

The engine is pinned as the `vendor/asha-rpg` submodule. Clone recursively, then
run:

```bash
npm install
npm test
npm run --silent emit:prepared > /tmp/d20-fantasy-prepared.json
npm run play:smoke
npm run play:tactical-rollover
npm run play:context-tactics
npm run play:multi-axis-pool
npm run --silent emit:ruleweaver-foundation > /tmp/ruleweaver-foundation.json
npm run --silent emit:crosswind-outpost > /tmp/crosswind-outpost.json
```

Source and licensing details are in [`SOURCES.md`](SOURCES.md).
