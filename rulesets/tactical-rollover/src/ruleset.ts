import {
  RPG_CAPABILITY_VERSIONS,
  RPG_OPERATION_VERSIONS,
} from '@asha-rpg/ir';

import {
  defineRuleset,
  rulesetCalculationSelector,
  rulesetContributionStackingGroup,
  rulesetDefense,
  rulesetScalarTestProfile,
  rulesetStat,
} from '@asha-rpg/authoring';
import type {
  RulesetCalculationSelectorReference,
  RulesetContributionStackingGroupReference,
  RulesetScalarTestProfileReference,
  RulesetValueReference,
} from '@asha-rpg/authoring';

export const tacticalRolloverRuleset = defineRuleset({
  schema: { identity: 'asha.rpg.ruleset', major: 1 },
  identity: { id: 'asha.clean-room.tactical-rollover', version: '1.0.0' },
  language: { id: 'asha-rpg', version: '1.0.0' },
  models: {
    checks: { id: 'check.d20-roll-over', version: 1 },
    turns: { id: 'turn.ordered-one-action', version: 1 },
    initiative: { id: 'initiative.scenario-ordered', version: 1 },
    reactions: { id: 'reaction.before-damage-choice', version: 1 },
    actionEconomy: {
      id: 'action-economy.one-action-plus-reaction',
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
      {
        kind: 'stat',
        id: 'precision',
        label: 'Precision',
        numericDomainId: 'contest-score',
      },
      {
        kind: 'defense',
        id: 'guard',
        label: 'Guard',
        numericDomainId: 'contest-score',
      },
    ],
    numericDomains: [
      { id: 'contest-score', minimum: -10, maximum: 30 },
    ],
    calculationSelectors: [
      {
        id: 'contest-total',
        version: 1,
        label: 'Contest total',
        numericDomainId: 'contest-score',
      },
    ],
    contributionStackingGroups: [
      {
        id: 'situational',
        version: 1,
        label: 'Situational',
        policy: 'sum',
      },
    ],
    scalarTestProfiles: [
      {
        id: 'tactical-test',
        version: 1,
        label: 'Tactical test',
        numericDomainId: 'contest-score',
        dieSides: 20,
        contributionSelectorId: 'contest-total',
        bands: [
          { id: 'miss', label: 'Miss' },
          { id: 'hit', label: 'Hit' },
          { id: 'surge', label: 'Surge' },
        ],
        marginRules: [
          { minimum: null, maximum: -1, bandId: 'miss' },
          { minimum: 0, maximum: 9, bandId: 'hit' },
          { minimum: 10, maximum: null, bandId: 'surge' },
        ],
        naturalDieRules: [
          {
            id: 'natural-low',
            minimum: 1,
            maximum: 1,
            effect: { kind: 'shift', amount: -2 },
          },
          {
            id: 'natural-high',
            minimum: 20,
            maximum: 20,
            effect: { kind: 'shift', amount: 2 },
          },
        ],
      },
    ],
  },
});

export const tacticalRolloverValues: Readonly<{
  Precision: RulesetValueReference<'stat', string, string>;
  Guard: RulesetValueReference<'defense', string, string>;
}> = Object.freeze({
  Precision: rulesetStat(tacticalRolloverRuleset, 'precision'),
  Guard: rulesetDefense(tacticalRolloverRuleset, 'guard'),
});

export const tacticalRolloverSelectors: Readonly<{
  ContestTotal: RulesetCalculationSelectorReference<string, string>;
}> = Object.freeze({
  ContestTotal: rulesetCalculationSelector(
    tacticalRolloverRuleset,
    'contest-total',
  ),
});

export const tacticalRolloverStackingGroups: Readonly<{
  Situational: RulesetContributionStackingGroupReference<string, string>;
}> = Object.freeze({
  Situational: rulesetContributionStackingGroup(
    tacticalRolloverRuleset,
    'situational',
  ),
});

export const tacticalRolloverProfiles: Readonly<{
  TacticalTest: RulesetScalarTestProfileReference<string, string>;
}> = Object.freeze({
  TacticalTest: rulesetScalarTestProfile(
    tacticalRolloverRuleset,
    'tactical-test',
  ),
});
