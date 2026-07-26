# Sources and licensing

The recognizable d20 terminology and baseline values in this repository are
adapted from the official System Reference Document 5.2.1. In particular, the
source was consulted for the semantic Ruleset's six ability scores and
modifiers, d20 tests, saving throws, Armor Class, initiative, reactions, and
turn/action plus six-square movement vocabulary, and for the starter Content
Pack's weapon damage dice, Fighter and Wizard vocabulary, and Goblin Warrior
and Skeleton statistics.

This starter is deliberately smaller than, and not a complete implementation
of, the source rules. ASHA RPG authority currently owns one ordered action per
turn, target-based checks, bounded modifiers, healing/damage, resources, and a
before-damage reaction choice. Unsupported source mechanics such as advantage,
critical hits, bonus actions, weapon mastery, resistance, and class progression
are not claimed or approximated here. Movement follows the deterministic
authority-selected path through intermediary cells, accounts for declared
terrain movement costs, and consumes the current turn. Opportunity attacks
remain a declared but currently unimplemented consequence of movement.

This work includes material from the System Reference Document 5.2.1 (“SRD
5.2.1”) by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.

The source document used for verification is the official SRD 5.2.1 PDF:
https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf

The Fighter and Wizard class names are attributable to that SRD source. The
Coordinated Flanker, Hold the Line, and Arcane Composure talent names,
descriptions, exact grid conditions, and numeric bonuses are original starter
content authored for this repository's ASHA RPG positional-resolution example;
they are released under this repository's CC BY 4.0 license and are not copied
from the SRD.

## Tactical Rollover clean-room kit

The Tactical Rollover Ruleset, Content Pack, PlayBundle, Scenario, names,
descriptions, identifiers, values, and worked encounter are original content
authored for this repository. They are not adapted from the SRD and do not
claim compatibility with D&D, Pathfinder, Foundry VTT, or any surveyed game
system.

The mechanical scope was selected from the sanitized K0 brief in ASHA RPG's
`docs/first-wave-primitive-catalog.md`, produced by Den task `#6179`. That
catalog used bounded architecture evidence from the `foundryvtt/dnd5e`
repository's `6.0.x` ref at
`65ee4f748f1d6d8d8cc00f2f7a81e67426927d5a`. The survey tool revision was
`rpg-primitive-survey@4fc9d28c7fe35d0d9e5a6010b886d72f13852d3e`.
Those handles are provenance for the mechanical study only. No source records,
text, names, catalogs, package structures, or stat blocks were copied or
converted.

The kit is pinned to ASHA RPG revision
`64a7c08815fa9856a1a8e95c767eca5096d74d9f`. It claims only the bounded
mechanical witness exercised by its checked-in tests and Rust consumer. It
does not claim rest recovery, summons, runtime progression, broad reaction
authoring, temporary vitality, inventory economy, line of effect, cover,
arbitrary templates, source-system critical damage rules, or source-system
content compatibility.

## Context Tactics clean-room kit

The Context Tactics Ruleset, Content Pack, PlayBundle, Scenario, names,
descriptions, identifiers, values, combinations, and encounter are original
content authored for this repository. They are not adapted from the SRD or a
surveyed content catalog and do not claim compatibility with Pathfinder,
Foundry VTT, or any other source system.

The mechanical scope was selected from the sanitized K1 brief in ASHA RPG's
`docs/first-wave-primitive-catalog.md`, produced by Den task `#6179`. The
architecture study used bounded evidence from the `foundryvtt/pf2e`
repository's `v14-dev` ref at
`91e5c792eeae4ee56610ff58fce28e65953ccbf9`. The survey tool revision was
`rpg-primitive-survey@4fc9d28c7fe35d0d9e5a6010b886d72f13852d3e`.
Those handles are mechanical provenance only. No source records, text, names,
rule-element vocabulary, catalogs, package structure, stat blocks, or
derived-document behavior were copied or converted.

The kit is pinned to ASHA RPG revision
`64a7c08815fa9856a1a8e95c767eca5096d74d9f`. It does not claim progression
trees, persistent-damage timing, arbitrary roll options, general schedulers or
reaction authoring, cones, elevation, cover, source-system critical rules, or
source-system content compatibility.

## Multi-Axis Pool clean-room kit

The Multi-Axis Pool Ruleset, Content Pack, PlayBundle, Scenario, die names,
face vectors, axes, cancellation pairs, distributions, source definitions,
identifiers, values, and encounter are original content authored for this
repository. They are not adapted from the SRD or a surveyed content catalog
and do not claim compatibility with a source game or Foundry VTT.

The mechanical scope was selected from the sanitized K2 brief in ASHA RPG's
`docs/first-wave-primitive-catalog.md`, produced by Den task `#6179`. The
architecture study used bounded implementation evidence from the
`StarWarsFoundryVTT/StarWarsFFG` repository's `main` ref at
`f989bf4fa8590ef83dd55d09bf0d15bf59690d18`. The survey tool revision was
`rpg-primitive-survey@4fc9d28c7fe35d0d9e5a6010b886d72f13852d3e`.
Those handles are mechanical provenance only. No source records, text, names,
icons, proprietary dice symbols, catalogs, package structure, character data,
or adventure content were copied or converted.

The kit is pinned to ASHA RPG revision
`64a7c08815fa9856a1a8e95c767eca5096d74d9f`. It claims only the checked-in
Rust-authoritative heterogeneous-pool witness. It does not claim initiative
derived from a pool, specialized pool user interface, probability analysis,
opposed pools, rerolls, upgrades outside the explicit replacement rule,
critical-result tables, equipment inventory workflows, source-system content,
or source-system compatibility.
