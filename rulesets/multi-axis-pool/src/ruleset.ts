import {
  RPG_CAPABILITY_VERSIONS,
  RPG_OPERATION_VERSIONS,
} from '@asha-rpg/ir';

import {
  defineRuleset,
  rulesetContributionStackingGroup,
  rulesetHeterogeneousPoolProfile,
} from '@asha-rpg/authoring';
import type {
  RulesetContributionStackingGroupReference,
  RulesetHeterogeneousPoolProfileReference,
} from '@asha-rpg/authoring';

const vector = (
  ...entries: readonly (readonly [axisId: string, value: number])[]
) => entries
  .map(([axisId, value]) => ({ axisId, value }))
  .sort((left, right) => left.axisId.localeCompare(right.axisId));

export const multiAxisPoolRuleset = defineRuleset({
  schema: { identity: 'asha.rpg.ruleset', major: 1 },
  identity: { id: 'asha.clean-room.multi-axis-pool', version: '1.0.0' },
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
    capabilities: Object.entries(RPG_CAPABILITY_VERSIONS).map(
      ([id, version]) => ({ id, version }),
    ),
    values: [],
    numericDomains: [],
    calculationSelectors: [],
    contributionStackingGroups: [
      {
        id: 'pool-sum',
        version: 1,
        label: 'Pool sum',
        policy: 'sum',
      },
      {
        id: 'pool-peak',
        version: 1,
        label: 'Pool peak',
        policy: 'greatest',
      },
    ],
    heterogeneousPoolProfiles: [
      {
        id: 'signal-crossing',
        version: 1,
        label: 'Signal crossing',
        dieTypes: [
          {
            id: 'drag',
            label: 'Drag',
            sides: 6,
            faces: [
              { value: 1, vector: vector(['setback', 1]) },
              { value: 2, vector: vector(['complication', 1]) },
              {
                value: 3,
                vector: vector(['setback', 1], ['complication', 1]),
              },
              { value: 4, vector: [] },
              { value: 5, vector: vector(['setback', 2]) },
              { value: 6, vector: vector(['complication', 2]) },
            ],
          },
          {
            id: 'focus',
            label: 'Focus',
            sides: 8,
            faces: [
              { value: 1, vector: vector(['progress', 1]) },
              { value: 2, vector: vector(['benefit', 1]) },
              {
                value: 3,
                vector: vector(['progress', 1], ['benefit', 1]),
              },
              { value: 4, vector: vector(['progress', 2]) },
              {
                value: 5,
                vector: vector(['progress', 1], ['complication', 1]),
              },
              { value: 6, vector: vector(['benefit', 2]) },
              { value: 7, vector: vector(['progress', 2], ['benefit', 1]) },
              { value: 8, vector: vector(['echo', 1]) },
            ],
          },
          {
            id: 'signal',
            label: 'Signal',
            sides: 4,
            faces: [
              { value: 1, vector: [] },
              { value: 2, vector: vector(['progress', 1]) },
              { value: 3, vector: vector(['benefit', 1]) },
              {
                value: 4,
                vector: vector(['progress', 1], ['benefit', 1]),
              },
            ],
          },
        ],
        axes: [
          { id: 'benefit', label: 'Benefit' },
          { id: 'complication', label: 'Complication' },
          { id: 'echo', label: 'Echo' },
          { id: 'progress', label: 'Progress' },
          { id: 'setback', label: 'Setback' },
        ],
        cancellations: [
          {
            id: 'benefit-complication',
            positiveAxisId: 'benefit',
            negativeAxisId: 'complication',
          },
          {
            id: 'progress-setback',
            positiveAxisId: 'progress',
            negativeAxisId: 'setback',
          },
        ],
        bands: [
          { id: 'blocked', label: 'Blocked' },
          { id: 'progress', label: 'Progress' },
        ],
        outcomeRules: [
          {
            id: 'progress',
            bandId: 'progress',
            requirements: [
              { axisId: 'progress', minimum: 1, maximum: null },
            ],
          },
        ],
        defaultBandId: 'blocked',
      },
    ],
  },
});

export const multiAxisPoolStackingGroups: Readonly<{
  PoolPeak: RulesetContributionStackingGroupReference<string, string>;
  PoolSum: RulesetContributionStackingGroupReference<string, string>;
}> = Object.freeze({
  PoolPeak: rulesetContributionStackingGroup(
    multiAxisPoolRuleset,
    'pool-peak',
  ),
  PoolSum: rulesetContributionStackingGroup(
    multiAxisPoolRuleset,
    'pool-sum',
  ),
});

export const multiAxisPoolProfiles: Readonly<{
  SignalCrossing: RulesetHeterogeneousPoolProfileReference<string, string>;
}> = Object.freeze({
  SignalCrossing: rulesetHeterogeneousPoolProfile(
    multiAxisPoolRuleset,
    'signal-crossing',
  ),
});
