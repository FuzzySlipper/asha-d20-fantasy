import {
  defineCharacterClassDefinition,
  definitionReference,
} from '@asha-rpg/authoring';

import {
  coordinatedPressureTalent,
  watchfulResponseTalent,
} from './talents.js';

const sourceModule = 'content-packs/ruleweaver-foundation/src/classes.ts';

export const tacticalFoundationClass = defineCharacterClassDefinition({
  id: 'class.tactical-foundation',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'tacticalFoundationClass' },
  presentation: {
    label: 'Tactical Foundation',
    description:
      'A minimal setup-time class and talent composition contract.',
    tags: ['class', 'foundation'],
  },
  characterClass: {
    featureDefinitions: [
      definitionReference({
        definitionId: coordinatedPressureTalent.id,
      }),
      definitionReference({
        definitionId: watchfulResponseTalent.id,
      }),
    ],
  },
});

export const ruleweaverFoundationClasses = Object.freeze([
  tacticalFoundationClass,
]);
