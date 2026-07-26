import {
  RPG_CAPABILITY_VERSIONS,
  RPG_OPERATION_VERSIONS,
} from '@asha-rpg/ir';

import {
  defineRuleset,
  rulesetActivationBudget,
  rulesetCalculationSelector,
  rulesetContributionStackingGroup,
  rulesetDefense,
  rulesetScalarTestProfile,
  rulesetStat,
} from '@asha-rpg/authoring';
import type {
  RulesetActivationBudgetReference,
  RulesetCalculationSelectorReference,
  RulesetContributionStackingGroupReference,
  RulesetScalarTestProfileReference,
  RulesetValueReference,
} from '@asha-rpg/authoring';

type TacticalStatReference = RulesetValueReference<'stat', string, string>;
type TacticalDefenseReference = RulesetValueReference<
  'defense',
  string,
  string
>;

export interface RuleweaverTacticsValueReferences {
  readonly Might: TacticalStatReference;
  readonly Finesse: TacticalStatReference;
  readonly Acuity: TacticalStatReference;
  readonly Intellect: TacticalStatReference;
  readonly Conviction: TacticalStatReference;
  readonly Spirit: TacticalStatReference;
  readonly Armor: TacticalDefenseReference;
  readonly Grit: TacticalDefenseReference;
  readonly Wits: TacticalDefenseReference;
  readonly Nerve: TacticalDefenseReference;
}

export const ruleweaverTacticsRuleset = defineRuleset({
  schema: { identity: 'asha.rpg.ruleset', major: 1 },
  identity: { id: 'asha.ruleweaver-tactics', version: '1.0.0' },
  language: { id: 'asha-rpg', version: '1.0.0' },
  models: {
    checks: { id: 'check.d20-roll-over', version: 1 },
    turns: { id: 'turn.ordered-one-action', version: 1 },
    initiative: { id: 'initiative.scenario-ordered', version: 1 },
    reactions: { id: 'reaction.before-damage-choice', version: 1 },
    actionEconomy: {
      id: 'action-economy.variable-activation-budgets',
      version: 1,
      acceptedActivationCeiling: 8,
    },
    lineOfEffect: {
      id: 'line-of-effect.square-grid-supercover',
      version: 1,
    },
  },
  provides: {
    operations: Object.entries(RPG_OPERATION_VERSIONS).map(([id, version]) => ({
      id,
      version,
    })),
    capabilities: Object.entries(RPG_CAPABILITY_VERSIONS).map(
      ([id, version]) => ({ id, version }),
    ),
    values: [
      stat('might', 'Might'),
      stat('finesse', 'Finesse'),
      stat('acuity', 'Acuity'),
      stat('intellect', 'Intellect'),
      stat('conviction', 'Conviction'),
      stat('spirit', 'Spirit'),
      defense('armor', 'Armor'),
      defense('grit', 'Grit'),
      defense('wits', 'Wits'),
      defense('nerve', 'Nerve'),
    ],
    numericDomains: [
      { id: 'activation-points', minimum: 0, maximum: 12 },
      { id: 'effect-magnitude', minimum: 0, maximum: 256 },
      { id: 'tactical-score', minimum: -20, maximum: 60 },
    ],
    calculationSelectors: [
      {
        id: 'attack-total',
        version: 1,
        label: 'Attack total',
        numericDomainId: 'tactical-score',
      },
    ],
    contributionStackingGroups: [
      {
        id: 'typed-bonus',
        version: 1,
        label: 'Typed bonus',
        policy: 'greatest',
      },
      {
        id: 'untyped-bonus',
        version: 1,
        label: 'Untyped bonus',
        policy: 'sum',
      },
      {
        id: 'penalty',
        version: 1,
        label: 'Penalty',
        policy: 'sum',
      },
    ],
    scalarTestProfiles: [
      {
        id: 'attack-test',
        version: 1,
        label: 'Attack test',
        numericDomainId: 'tactical-score',
        dieSides: 20,
        contributionSelectorId: 'attack-total',
        bands: [
          { id: 'miss', label: 'Miss' },
          { id: 'hit', label: 'Hit' },
          { id: 'critical', label: 'Critical' },
        ],
        marginRules: [
          { minimum: null, maximum: -1, bandId: 'miss' },
          { minimum: 0, maximum: null, bandId: 'hit' },
        ],
        naturalDieRules: [
          {
            id: 'natural-twenty',
            minimum: 20,
            maximum: 20,
            effect: { kind: 'setBand', bandId: 'critical' },
          },
        ],
      },
    ],
    activationBudgets: [
      budget('standard', 'Standard', 'action', 1),
      budget('bonus', 'Bonus', 'action', 1),
      budget('reaction', 'Reaction', 'reaction', 1),
      budget('movement', 'Movement', 'action', 6),
    ],
    movementAllowanceBudgetId: 'movement',
  },
});

export const ruleweaverTacticsValues: RuleweaverTacticsValueReferences =
  Object.freeze({
    Might: rulesetStat(ruleweaverTacticsRuleset, 'might'),
    Finesse: rulesetStat(ruleweaverTacticsRuleset, 'finesse'),
    Acuity: rulesetStat(ruleweaverTacticsRuleset, 'acuity'),
    Intellect: rulesetStat(ruleweaverTacticsRuleset, 'intellect'),
    Conviction: rulesetStat(ruleweaverTacticsRuleset, 'conviction'),
    Spirit: rulesetStat(ruleweaverTacticsRuleset, 'spirit'),
    Armor: rulesetDefense(ruleweaverTacticsRuleset, 'armor'),
    Grit: rulesetDefense(ruleweaverTacticsRuleset, 'grit'),
    Wits: rulesetDefense(ruleweaverTacticsRuleset, 'wits'),
    Nerve: rulesetDefense(ruleweaverTacticsRuleset, 'nerve'),
  });

export const ruleweaverTacticsSelectors: Readonly<{
  AttackTotal: RulesetCalculationSelectorReference<string, string>;
}> = Object.freeze({
  AttackTotal: rulesetCalculationSelector(
    ruleweaverTacticsRuleset,
    'attack-total',
  ),
});

export const ruleweaverTacticsStackingGroups: Readonly<{
  TypedBonus: RulesetContributionStackingGroupReference<string, string>;
  UntypedBonus: RulesetContributionStackingGroupReference<string, string>;
  Penalty: RulesetContributionStackingGroupReference<string, string>;
}> = Object.freeze({
  TypedBonus: rulesetContributionStackingGroup(
    ruleweaverTacticsRuleset,
    'typed-bonus',
  ),
  UntypedBonus: rulesetContributionStackingGroup(
    ruleweaverTacticsRuleset,
    'untyped-bonus',
  ),
  Penalty: rulesetContributionStackingGroup(
    ruleweaverTacticsRuleset,
    'penalty',
  ),
});

export const ruleweaverTacticsProfiles: Readonly<{
  AttackTest: RulesetScalarTestProfileReference<string, string>;
}> = Object.freeze({
  AttackTest: rulesetScalarTestProfile(
    ruleweaverTacticsRuleset,
    'attack-test',
  ),
});

export const ruleweaverTacticsBudgets: Readonly<{
  Standard: RulesetActivationBudgetReference<string, string>;
  Bonus: RulesetActivationBudgetReference<string, string>;
  Reaction: RulesetActivationBudgetReference<string, string>;
  Movement: RulesetActivationBudgetReference<string, string>;
}> = Object.freeze({
  Standard: rulesetActivationBudget(ruleweaverTacticsRuleset, 'standard'),
  Bonus: rulesetActivationBudget(ruleweaverTacticsRuleset, 'bonus'),
  Reaction: rulesetActivationBudget(ruleweaverTacticsRuleset, 'reaction'),
  Movement: rulesetActivationBudget(ruleweaverTacticsRuleset, 'movement'),
});

function stat(id: string, label: string) {
  return {
    kind: 'stat' as const,
    id,
    label,
    numericDomainId: 'tactical-score',
  };
}

function defense(id: string, label: string) {
  return {
    kind: 'defense' as const,
    id,
    label,
    numericDomainId: 'tactical-score',
  };
}

function budget(
  id: string,
  label: string,
  timing: 'action' | 'reaction',
  initialAmount: number,
) {
  return {
    id,
    version: 1 as const,
    label,
    numericDomainId: 'activation-points',
    timing,
    resetBoundary: 'ownerTurnStart' as const,
    initialAmount,
  };
}
