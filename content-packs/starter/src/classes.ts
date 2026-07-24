import {
  defineCharacterClassDefinition,
  defineCharacterFeatureDefinition,
  definitionReference,
} from '@asha-rpg/authoring';

const sourceModule = 'content-packs/starter/src/classes.ts';

export const coordinatedFlankerTalent = defineCharacterFeatureDefinition({
  id: 'feature.coordinated-flanker',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'coordinatedFlankerTalent' },
  presentation: {
    label: 'Coordinated Flanker',
    description:
      'Gain a +2 attack bonus while a living ally helps flank the selected target.',
    tags: ['fighter', 'positional', 'talent'],
  },
  characterFeature: {
    rollContributions: [
      {
        id: 'coordinated-flanker',
        selector: 'attack',
        condition: { kind: 'actorFlanksTarget' },
        amount: 2,
      },
    ],
  },
});

export const holdTheLineTalent = defineCharacterFeatureDefinition({
  id: 'feature.hold-the-line',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'holdTheLineTalent' },
  presentation: {
    label: 'Hold the Line',
    description:
      'Gain a +1 attack bonus while at least two living hostiles occupy adjacent cells.',
    tags: ['fighter', 'positional', 'talent'],
  },
  characterFeature: {
    rollContributions: [
      {
        id: 'hold-the-line',
        selector: 'attack',
        condition: {
          kind: 'actorSurrounded',
          minimumHostiles: 2,
        },
        amount: 1,
      },
    ],
  },
});

export const arcaneComposureTalent = defineCharacterFeatureDefinition({
  id: 'feature.arcane-composure',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'arcaneComposureTalent' },
  presentation: {
    label: 'Arcane Composure',
    description:
      'Gain a +1 attack bonus while at least three living hostiles occupy adjacent cells.',
    tags: ['positional', 'talent', 'wizard'],
  },
  characterFeature: {
    rollContributions: [
      {
        id: 'arcane-composure',
        selector: 'attack',
        condition: {
          kind: 'actorSurrounded',
          minimumHostiles: 3,
        },
        amount: 1,
      },
    ],
  },
});

export const fighterClass = defineCharacterClassDefinition({
  id: 'class.fighter',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'fighterClass' },
  presentation: {
    label: 'Fighter',
    description:
      'A martial class whose starter talents reward coordinated and pressured melee positions.',
    tags: ['class', 'fighter'],
  },
  characterClass: {
    featureDefinitions: [
      definitionReference({ definitionId: coordinatedFlankerTalent.id }),
      definitionReference({ definitionId: holdTheLineTalent.id }),
    ],
  },
});

export const wizardClass = defineCharacterClassDefinition({
  id: 'class.wizard',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'wizardClass' },
  presentation: {
    label: 'Wizard',
    description:
      'An arcane class whose starter talent rewards maintaining focus under close pressure.',
    tags: ['class', 'wizard'],
  },
  characterClass: {
    featureDefinitions: [
      definitionReference({ definitionId: arcaneComposureTalent.id }),
    ],
  },
});

export const starterCharacterFeatureDefinitions = Object.freeze([
  arcaneComposureTalent,
  coordinatedFlankerTalent,
  holdTheLineTalent,
]);

export const starterCharacterClassDefinitions = Object.freeze([
  fighterClass,
  wizardClass,
]);
