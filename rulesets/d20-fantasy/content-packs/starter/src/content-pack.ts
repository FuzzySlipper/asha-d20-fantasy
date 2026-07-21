import {
  contentPackSource,
  defineContentPack,
} from '@asha-rpg/authoring';

import { d20FantasyRuleset } from '../../../src/ruleset.js';
import {
  starterActionDefinitions,
  starterActionRelationships,
} from './actions.js';
import { starterCatalogs } from './catalogs.js';
import {
  starterItemDefinitions,
  starterProfileDefinitions,
} from './profiles.js';

export const d20FantasyStarterContentPack = defineContentPack({
  identity: { id: 'asha.d20-fantasy.starter', version: '1.0.0' },
  entry: {
    module: 'rulesets/d20-fantasy/content-packs/starter/src/content-pack.ts',
    declaration: 'd20FantasyStarterContentPack',
  },
  requirements: {
    operations: [
      { id: 'operation.applyModifier', version: 1 },
      { id: 'operation.damage', version: 1 },
      { id: 'operation.heal', version: 1 },
      { id: 'operation.openReaction', version: 1 },
    ],
    capabilities: [
      { id: 'capability.defenses', version: 1 },
      { id: 'capability.modifiers', version: 1 },
      { id: 'capability.position', version: 1 },
      { id: 'capability.random', version: 1 },
      { id: 'capability.reactions', version: 1 },
      { id: 'capability.resources', version: 1 },
      { id: 'capability.stats', version: 1 },
      { id: 'capability.vitality', version: 1 },
    ],
    values: d20FantasyRuleset.provides.values.map(({ kind, id }) => ({ kind, id })),
    numericDomains: d20FantasyRuleset.provides.numericDomains.map(({ id }) => id),
  },
  definitions: [
    ...starterCatalogs.definitions,
    ...starterActionDefinitions,
    ...starterItemDefinitions,
    ...starterProfileDefinitions,
  ],
  relationships: starterActionRelationships,
});

export const d20FantasyStarterContentSource = contentPackSource(
  d20FantasyStarterContentPack,
);

