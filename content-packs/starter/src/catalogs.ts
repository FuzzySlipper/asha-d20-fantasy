import { defineContentCatalog } from '@asha-rpg/authoring';

const packageId = 'asha.d20-fantasy.starter';

export const starterCatalogs = defineContentCatalog({
  packageId,
  sourceModule: 'content-packs/starter/src/catalogs.ts',
  entries: {
    slashing: {
      definitionId: 'slashing',
      category: 'damageType',
      id: 'slashing',
      label: 'Slashing',
    },
    piercing: {
      definitionId: 'piercing',
      category: 'damageType',
      id: 'piercing',
      label: 'Piercing',
    },
    bludgeoning: {
      definitionId: 'bludgeoning',
      category: 'damageType',
      id: 'bludgeoning',
      label: 'Bludgeoning',
    },
    fire: {
      definitionId: 'fire',
      category: 'damageType',
      id: 'fire',
      label: 'Fire',
    },
    thunder: {
      definitionId: 'thunder',
      category: 'damageType',
      id: 'thunder',
      label: 'Thunder',
    },
    secondWind: {
      definitionId: 'second-wind',
      category: 'resource',
      id: 'second-wind',
      label: 'Second Wind',
    },
    spellSlot: {
      definitionId: 'spell-slot',
      category: 'resource',
      id: 'spell-slot',
      label: 'Spell slot',
    },
    prone: {
      definitionId: 'prone',
      category: 'modifier',
      id: 'prone',
      label: 'Prone',
      description: 'A turn-bounded condition marker applied by a successful shove.',
      tags: ['condition'],
    },
  },
});
