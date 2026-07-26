import { defineContentCatalog } from '@asha-rpg/authoring';

export const ruleweaverFoundationCatalogs = defineContentCatalog({
  packageId: 'asha.ruleweaver-tactics.foundation',
  sourceModule: 'content-packs/ruleweaver-foundation/src/catalogs.ts',
  entries: {
    focus: {
      definitionId: 'resource.focus',
      category: 'resource',
      id: 'focus',
      label: 'Focus',
    },
    impact: {
      definitionId: 'damage.impact',
      category: 'damageType',
      id: 'impact',
      label: 'Impact',
    },
    energy: {
      definitionId: 'damage.energy',
      category: 'damageType',
      id: 'energy',
      label: 'Energy',
    },
    resolve: {
      definitionId: 'damage.resolve',
      category: 'damageType',
      id: 'resolve',
      label: 'Resolve',
    },
  },
});
