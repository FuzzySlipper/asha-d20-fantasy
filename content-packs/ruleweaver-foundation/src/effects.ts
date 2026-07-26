import { defineEffectDefinition } from '@asha-rpg/authoring';

import {
  ruleweaverTacticsSelectors,
  ruleweaverTacticsStackingGroups,
} from '../../../rulesets/ruleweaver-tactics/src/ruleset.js';

const sourceModule = 'content-packs/ruleweaver-foundation/src/effects.ts';

export const heldCondition = defineEffectDefinition({
  id: 'effect.held',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'heldCondition' },
  presentation: {
    label: 'Held',
    description: 'A short fixed-tenure restriction on voluntary movement.',
  },
  effect: {
    rankMinimum: 1,
    rankMaximum: 1,
    stackingId: 'held',
    stacking: 'refresh',
    tenure: {
      kind: 'fixed',
      anchor: 'targetTurnStart',
      count: 2,
    },
    condition: { clauses: [{ kind: 'forbidMovement' }] },
  },
});

export const unsettledCondition = defineEffectDefinition({
  id: 'effect.unsettled',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'unsettledCondition' },
  presentation: {
    label: 'Unsettled',
    description: 'A save-ends penalty that restricts precision actions.',
  },
  effect: {
    rankMinimum: 1,
    rankMaximum: 1,
    stackingId: 'unsettled',
    stacking: 'refresh',
    tenure: { kind: 'targetTurnEndSave' },
    condition: {
      clauses: [{ kind: 'forbidActionTag', actionTag: 'control' }],
    },
    contributions: [
      {
        id: 'unsettled-penalty',
        subject: 'actor',
        selector: ruleweaverTacticsSelectors.AttackTotal,
        stackingGroup: ruleweaverTacticsStackingGroups.Penalty,
        value: { kind: 'constant', value: -2 },
        predicate: {
          kind: 'effectActive',
          subject: 'actor',
          definition: { definitionId: 'effect.unsettled' },
        },
      },
    ],
  },
});

export const ruleweaverFoundationEffects = Object.freeze([
  heldCondition,
  unsettledCondition,
]);
