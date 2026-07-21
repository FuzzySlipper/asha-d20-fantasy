import {
  RPG_CAPABILITY_VERSIONS,
  RPG_OPERATION_VERSIONS,
} from '@asha-rpg/ir';

import {
  derivedRulesetValue,
  defineRuleset,
  floorDivideRulesetValues,
  readRulesetValue,
  rulesetDefense,
  rulesetStat,
  rulesetValueConstant,
  subtractRulesetValues,
} from '@asha-rpg/authoring';
import type {
  RulesetValueReference,
  RulesetValueSource,
} from '@asha-rpg/authoring';

type D20StatReference = RulesetValueReference<'stat', string, string>;
type D20DefenseReference = RulesetValueReference<'defense', string, string>;

export interface D20FantasyValueReferences {
  readonly Strength: D20StatReference;
  readonly Dexterity: D20StatReference;
  readonly Constitution: D20StatReference;
  readonly Intelligence: D20StatReference;
  readonly Wisdom: D20StatReference;
  readonly Charisma: D20StatReference;
  readonly StrengthModifier: D20StatReference;
  readonly DexterityModifier: D20StatReference;
  readonly ConstitutionModifier: D20StatReference;
  readonly IntelligenceModifier: D20StatReference;
  readonly WisdomModifier: D20StatReference;
  readonly CharismaModifier: D20StatReference;
  readonly MeleeAttackBonus: D20StatReference;
  readonly SpellAttackBonus: D20StatReference;
  readonly Initiative: D20StatReference;
  readonly ArmorClass: D20DefenseReference;
  readonly StrengthSave: D20DefenseReference;
  readonly DexteritySave: D20DefenseReference;
  readonly ConstitutionSave: D20DefenseReference;
  readonly IntelligenceSave: D20DefenseReference;
  readonly WisdomSave: D20DefenseReference;
  readonly CharismaSave: D20DefenseReference;
}

const d20FantasyValueVocabulary = defineRuleset({
  schema: { identity: 'asha.rpg.ruleset', major: 1 },
  identity: { id: 'asha.d20-fantasy', version: '1.0.0' },
  language: { id: 'asha-rpg', version: '1.0.0' },
  models: {
    checks: { id: 'check.d20-roll-over', version: 1 },
    turns: { id: 'turn.ordered-one-action', version: 1 },
    initiative: { id: 'initiative.scenario-ordered', version: 1 },
    reactions: { id: 'reaction.before-damage-choice', version: 1 },
    actionEconomy: { id: 'action-economy.one-action-plus-reaction', version: 1 },
  },
  provides: {
    operations: Object.entries(RPG_OPERATION_VERSIONS).map(([id, version]) => ({
      id,
      version,
    })),
    capabilities: Object.entries(RPG_CAPABILITY_VERSIONS).map(([id, version]) => ({
      id,
      version,
    })),
    values: [
      abilityScore('strength', 'Strength'),
      abilityScore('dexterity', 'Dexterity'),
      abilityScore('constitution', 'Constitution'),
      abilityScore('intelligence', 'Intelligence'),
      abilityScore('wisdom', 'Wisdom'),
      abilityScore('charisma', 'Charisma'),
      signedStat('strength-modifier', 'Strength modifier'),
      signedStat('dexterity-modifier', 'Dexterity modifier'),
      signedStat('constitution-modifier', 'Constitution modifier'),
      signedStat('intelligence-modifier', 'Intelligence modifier'),
      signedStat('wisdom-modifier', 'Wisdom modifier'),
      signedStat('charisma-modifier', 'Charisma modifier'),
      signedStat('melee-attack-bonus', 'Melee attack bonus'),
      signedStat('spell-attack-bonus', 'Spell attack bonus'),
      signedStat('initiative', 'Initiative'),
      defense('armor-class', 'Armor Class', 'armor-class'),
      defense('strength-save', 'Strength save'),
      defense('dexterity-save', 'Dexterity save'),
      defense('constitution-save', 'Constitution save'),
      defense('intelligence-save', 'Intelligence save'),
      defense('wisdom-save', 'Wisdom save'),
      defense('charisma-save', 'Charisma save'),
    ],
    numericDomains: [
      { id: 'ability-score', minimum: 1, maximum: 30 },
      { id: 'armor-class', minimum: 0, maximum: 50 },
      { id: 'signed-bonus', minimum: -20, maximum: 30 },
    ],
  },
});

const vocabularyValues = Object.freeze({
  Strength: rulesetStat(d20FantasyValueVocabulary, 'strength'),
  Dexterity: rulesetStat(d20FantasyValueVocabulary, 'dexterity'),
  Constitution: rulesetStat(d20FantasyValueVocabulary, 'constitution'),
  Intelligence: rulesetStat(d20FantasyValueVocabulary, 'intelligence'),
  Wisdom: rulesetStat(d20FantasyValueVocabulary, 'wisdom'),
  Charisma: rulesetStat(d20FantasyValueVocabulary, 'charisma'),
  DexterityModifier: rulesetStat(
    d20FantasyValueVocabulary,
    'dexterity-modifier',
  ),
});

const derivedValueSources: Readonly<Record<string, RulesetValueSource>> =
  Object.freeze({
    'strength-modifier': deriveAbilityModifier(vocabularyValues.Strength),
    'dexterity-modifier': deriveAbilityModifier(vocabularyValues.Dexterity),
    'constitution-modifier': deriveAbilityModifier(
      vocabularyValues.Constitution,
    ),
    'intelligence-modifier': deriveAbilityModifier(
      vocabularyValues.Intelligence,
    ),
    'wisdom-modifier': deriveAbilityModifier(vocabularyValues.Wisdom),
    'charisma-modifier': deriveAbilityModifier(vocabularyValues.Charisma),
    initiative: derivedRulesetValue(
      readRulesetValue(vocabularyValues.DexterityModifier),
    ),
  });

export const d20FantasyRuleset = defineRuleset({
  ...d20FantasyValueVocabulary,
  provides: {
    ...d20FantasyValueVocabulary.provides,
    values: d20FantasyValueVocabulary.provides.values.map((value) => ({
      ...value,
      source: derivedValueSources[value.id] ?? value.source,
    })),
  },
});

export const d20FantasyValues: D20FantasyValueReferences = Object.freeze({
  Strength: rulesetStat(d20FantasyRuleset, 'strength'),
  Dexterity: rulesetStat(d20FantasyRuleset, 'dexterity'),
  Constitution: rulesetStat(d20FantasyRuleset, 'constitution'),
  Intelligence: rulesetStat(d20FantasyRuleset, 'intelligence'),
  Wisdom: rulesetStat(d20FantasyRuleset, 'wisdom'),
  Charisma: rulesetStat(d20FantasyRuleset, 'charisma'),
  StrengthModifier: rulesetStat(d20FantasyRuleset, 'strength-modifier'),
  DexterityModifier: rulesetStat(d20FantasyRuleset, 'dexterity-modifier'),
  ConstitutionModifier: rulesetStat(d20FantasyRuleset, 'constitution-modifier'),
  IntelligenceModifier: rulesetStat(d20FantasyRuleset, 'intelligence-modifier'),
  WisdomModifier: rulesetStat(d20FantasyRuleset, 'wisdom-modifier'),
  CharismaModifier: rulesetStat(d20FantasyRuleset, 'charisma-modifier'),
  MeleeAttackBonus: rulesetStat(d20FantasyRuleset, 'melee-attack-bonus'),
  SpellAttackBonus: rulesetStat(d20FantasyRuleset, 'spell-attack-bonus'),
  Initiative: rulesetStat(d20FantasyRuleset, 'initiative'),
  ArmorClass: rulesetDefense(d20FantasyRuleset, 'armor-class'),
  StrengthSave: rulesetDefense(d20FantasyRuleset, 'strength-save'),
  DexteritySave: rulesetDefense(d20FantasyRuleset, 'dexterity-save'),
  ConstitutionSave: rulesetDefense(d20FantasyRuleset, 'constitution-save'),
  IntelligenceSave: rulesetDefense(d20FantasyRuleset, 'intelligence-save'),
  WisdomSave: rulesetDefense(d20FantasyRuleset, 'wisdom-save'),
  CharismaSave: rulesetDefense(d20FantasyRuleset, 'charisma-save'),
});

function abilityScore(id: string, label: string) {
  return { kind: 'stat' as const, id, label, numericDomainId: 'ability-score' };
}

function signedStat(id: string, label: string) {
  return { kind: 'stat' as const, id, label, numericDomainId: 'signed-bonus' };
}

function defense(id: string, label: string, numericDomainId = 'signed-bonus') {
  return { kind: 'defense' as const, id, label, numericDomainId };
}

function deriveAbilityModifier(score: D20StatReference): RulesetValueSource {
  return derivedRulesetValue(
    floorDivideRulesetValues(
      subtractRulesetValues(
        readRulesetValue(score),
        rulesetValueConstant(10),
      ),
      rulesetValueConstant(2),
    ),
  );
}
