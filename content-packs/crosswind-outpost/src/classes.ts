import {
  defineCharacterClassDefinition,
  defineCharacterFeatureDefinition,
  definitionReference,
} from '@asha-rpg/authoring';

import {
  ruleweaverTacticsSelectors,
  ruleweaverTacticsStackingGroups,
} from '../../../rulesets/ruleweaver-tactics/src/ruleset.js';
import {
  coordinatedPressureTalent,
  watchfulResponseTalent,
} from '../../ruleweaver-foundation/src/talents.js';

const sourceModule = 'content-packs/crosswind-outpost/src/classes.ts';

export const closeQuartersDiscipline =
  defineCharacterFeatureDefinition({
    id: 'talent.close-quarters-discipline',
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: {
      module: sourceModule,
      declaration: 'closeQuartersDiscipline',
    },
    presentation: {
      label: 'Close-Quarters Discipline',
      description:
        'Add an untyped attack contribution while two hostiles press adjacent cells.',
      tags: ['position', 'talent'],
    },
    characterFeature: {
      contributions: [{
        id: 'close-quarters-discipline',
        selector: ruleweaverTacticsSelectors.AttackTotal,
        stackingGroup: ruleweaverTacticsStackingGroups.UntypedBonus,
        value: { kind: 'constant', value: 1 },
        predicate: {
          kind: 'actorSurrounded',
          minimumHostiles: 2,
        },
      }],
    },
  });

export const measuredOpening = defineCharacterFeatureDefinition({
  id: 'talent.measured-opening',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'measuredOpening' },
  presentation: {
    label: 'Measured Opening',
    description:
      'Add an untyped attack contribution when an ally completes a flank.',
    tags: ['position', 'talent'],
  },
  characterFeature: {
    contributions: [{
      id: 'measured-opening',
      selector: ruleweaverTacticsSelectors.AttackTotal,
      stackingGroup: ruleweaverTacticsStackingGroups.UntypedBonus,
      value: { kind: 'constant', value: 1 },
      predicate: { kind: 'actorFlanksTarget' },
    }],
  },
});

export const wardAnchorClass = characterClass(
  'class.ward-anchor',
  'Ward Anchor',
  [
    closeQuartersDiscipline.id,
    watchfulResponseTalent.id,
  ],
);

export const pathfinderClass = characterClass(
  'class.pathfinder',
  'Pathfinder',
  [
    coordinatedPressureTalent.id,
    measuredOpening.id,
  ],
);

export const signalGuideClass = characterClass(
  'class.signal-guide',
  'Signal Guide',
  [
    measuredOpening.id,
    watchfulResponseTalent.id,
  ],
);

export const fieldShaperClass = characterClass(
  'class.field-shaper',
  'Field Shaper',
  [
    closeQuartersDiscipline.id,
    coordinatedPressureTalent.id,
  ],
);

export const crosswindOutpostTalents = Object.freeze([
  closeQuartersDiscipline,
  measuredOpening,
]);

export const crosswindOutpostClasses = Object.freeze([
  fieldShaperClass,
  pathfinderClass,
  signalGuideClass,
  wardAnchorClass,
]);

function characterClass(
  id: string,
  label: string,
  featureDefinitionIds: readonly string[],
) {
  return defineCharacterClassDefinition({
    id,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: { module: sourceModule, declaration: id },
    presentation: {
      label,
      description:
        'A clean-room tactical role assembled from separately selected talents.',
      tags: ['class', 'crosswind-outpost'],
    },
    characterClass: {
      featureDefinitions: featureDefinitionIds.map((definitionId) =>
        definitionReference({
          definitionId,
          ...(definitionId === coordinatedPressureTalent.id ||
          definitionId === watchfulResponseTalent.id
            ? { importAs: 'foundation' }
            : {}),
        })
      ),
    },
  });
}
