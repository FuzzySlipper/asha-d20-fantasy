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

export const contextTacticsRuleset = defineRuleset({
  schema: { identity: 'asha.rpg.ruleset', major: 1 },
  identity: { id: 'asha.clean-room.context-tactics', version: '1.0.0' },
  language: { id: 'asha-rpg', version: '1.0.0' },
  models: {
    checks: { id: 'check.d20-roll-over', version: 1 },
    turns: { id: 'turn.ordered-one-action', version: 1 },
    initiative: { id: 'initiative.scenario-ordered', version: 1 },
    reactions: { id: 'reaction.before-damage-choice', version: 1 },
    actionEconomy: {
      id: 'action-economy.variable-activation-budgets',
      version: 1,
      acceptedActivationCeiling: 5,
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
      {
        kind: 'stat',
        id: 'insight',
        label: 'Insight',
        numericDomainId: 'test-score',
      },
      {
        kind: 'defense',
        id: 'ward',
        label: 'Ward',
        numericDomainId: 'test-score',
      },
    ],
    numericDomains: [
      { id: 'activation-points', minimum: 0, maximum: 3 },
      { id: 'test-score', minimum: -12, maximum: 36 },
    ],
    calculationSelectors: [
      {
        id: 'approach-total',
        version: 1,
        label: 'Approach total',
        numericDomainId: 'test-score',
      },
    ],
    contributionStackingGroups: [
      {
        id: 'edge',
        version: 1,
        label: 'Edge',
        policy: 'greatest',
      },
      {
        id: 'opening',
        version: 1,
        label: 'Opening',
        policy: 'sum',
      },
    ],
    scalarTestProfiles: [
      {
        id: 'four-step-test',
        version: 1,
        label: 'Four-step test',
        numericDomainId: 'test-score',
        dieSides: 20,
        contributionSelectorId: 'approach-total',
        bands: [
          { id: 'reverse', label: 'Reverse' },
          { id: 'stall', label: 'Stall' },
          { id: 'advance', label: 'Advance' },
          { id: 'breakthrough', label: 'Breakthrough' },
        ],
        marginRules: [
          { minimum: null, maximum: -5, bandId: 'reverse' },
          { minimum: -4, maximum: -1, bandId: 'stall' },
          { minimum: 0, maximum: 5, bandId: 'advance' },
          { minimum: 6, maximum: null, bandId: 'breakthrough' },
        ],
        naturalDieRules: [
          {
            id: 'low-turn',
            minimum: 1,
            maximum: 1,
            effect: { kind: 'shift', amount: -1 },
          },
          {
            id: 'high-turn',
            minimum: 20,
            maximum: 20,
            effect: { kind: 'shift', amount: 1 },
          },
        ],
      },
    ],
    activationBudgets: [
      {
        id: 'response',
        version: 1,
        label: 'Response',
        numericDomainId: 'activation-points',
        timing: 'reaction',
        resetBoundary: 'ownerTurnStart',
        initialAmount: 1,
      },
      {
        id: 'tempo',
        version: 1,
        label: 'Tempo',
        numericDomainId: 'activation-points',
        timing: 'action',
        resetBoundary: 'ownerTurnStart',
        initialAmount: 3,
      },
    ],
  },
});

export const contextTacticsValues: Readonly<{
  Insight: RulesetValueReference<'stat', string, string>;
  Ward: RulesetValueReference<'defense', string, string>;
}> = Object.freeze({
  Insight: rulesetStat(contextTacticsRuleset, 'insight'),
  Ward: rulesetDefense(contextTacticsRuleset, 'ward'),
});

export const contextTacticsSelectors: Readonly<{
  ApproachTotal: RulesetCalculationSelectorReference<string, string>;
}> = Object.freeze({
  ApproachTotal: rulesetCalculationSelector(
    contextTacticsRuleset,
    'approach-total',
  ),
});

export const contextTacticsStackingGroups: Readonly<{
  Edge: RulesetContributionStackingGroupReference<string, string>;
  Opening: RulesetContributionStackingGroupReference<string, string>;
}> = Object.freeze({
  Edge: rulesetContributionStackingGroup(contextTacticsRuleset, 'edge'),
  Opening: rulesetContributionStackingGroup(
    contextTacticsRuleset,
    'opening',
  ),
});

export const contextTacticsProfiles: Readonly<{
  FourStepTest: RulesetScalarTestProfileReference<string, string>;
}> = Object.freeze({
  FourStepTest: rulesetScalarTestProfile(
    contextTacticsRuleset,
    'four-step-test',
  ),
});

export const contextTacticsBudgets: Readonly<{
  Response: RulesetActivationBudgetReference<string, string>;
  Tempo: RulesetActivationBudgetReference<string, string>;
}> = Object.freeze({
  Response: rulesetActivationBudget(contextTacticsRuleset, 'response'),
  Tempo: rulesetActivationBudget(contextTacticsRuleset, 'tempo'),
});
