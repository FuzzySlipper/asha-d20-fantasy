import { defineContentCatalog } from '@asha-rpg/authoring';

export const ruleweaverFoundationCatalogs = defineContentCatalog({
  packageId: 'asha.ruleweaver-tactics.foundation',
  sourceModule: 'content-packs/ruleweaver-foundation/src/catalogs.ts',
  entries: {
    focus: {
      definitionId: 'resource.focus',
      category: 'resource',
      id: 'resource.focus',
      label: 'Focus',
    },
    impact: {
      definitionId: 'damage.impact',
      category: 'damageType',
      id: 'damage.impact',
      label: 'Impact',
    },
    energy: {
      definitionId: 'damage.energy',
      category: 'damageType',
      id: 'damage.energy',
      label: 'Energy',
    },
    resolve: {
      definitionId: 'damage.resolve',
      category: 'damageType',
      id: 'damage.resolve',
      label: 'Resolve',
    },
  },
});
