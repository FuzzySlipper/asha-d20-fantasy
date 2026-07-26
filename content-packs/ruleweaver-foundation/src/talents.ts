import {
  defineCharacterFeatureDefinition,
  definitionReference,
} from '@asha-rpg/authoring';

import {
  ruleweaverTacticsSelectors,
  ruleweaverTacticsStackingGroups,
} from '../../../rulesets/ruleweaver-tactics/src/ruleset.js';
import { leaveAdjacencyResponse } from './actions.js';

const sourceModule = 'content-packs/ruleweaver-foundation/src/talents.ts';

export const coordinatedPressureTalent =
  defineCharacterFeatureDefinition({
    id: 'talent.coordinated-pressure',
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: {
      module: sourceModule,
      declaration: 'coordinatedPressureTalent',
    },
    presentation: {
      label: 'Coordinated Pressure',
      description:
        'Contribute a typed bonus when the actor flanks the selected target.',
      tags: ['talent', 'position'],
    },
    characterFeature: {
      contributions: [
        {
          id: 'coordinated-pressure',
          selector: ruleweaverTacticsSelectors.AttackTotal,
          stackingGroup: ruleweaverTacticsStackingGroups.TypedBonus,
          value: { kind: 'constant', value: 2 },
          predicate: { kind: 'actorFlanksTarget' },
        },
      ],
    },
  });

export const watchfulResponseTalent = defineCharacterFeatureDefinition({
  id: 'talent.watchful-response',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'watchfulResponseTalent' },
  presentation: {
    label: 'Watchful Response',
    description:
      'Register one human-choice response to voluntary adjacency departure.',
    tags: ['reaction', 'talent'],
  },
  characterFeature: {
    movementReactions: [
      {
        id: 'watchful-response',
        trigger: 'voluntaryLeavesAdjacency',
        responseAction: definitionReference({
          definitionId: leaveAdjacencyResponse.id,
        }),
        activationBudgetId: 'reaction',
        activationCost: 1,
        maximumUses: 1,
        duration: 'encounter',
        reach: 1,
        requiresLineOfEffect: true,
      },
    ],
  },
});

export const ruleweaverFoundationTalents = Object.freeze([
  coordinatedPressureTalent,
  watchfulResponseTalent,
]);
