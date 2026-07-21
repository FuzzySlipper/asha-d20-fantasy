import {
  contentPackSource,
  defineContentPack,
} from '@asha-rpg/authoring';

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
