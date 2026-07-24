import {
  contentPackDependency,
  contentPackSource,
  defineContentPack,
} from '@asha-rpg/authoring';

import {
  d20FantasyFoundationContentPack,
} from '../../foundation/src/content-pack.js';
import {
  starterActionDefinitions,
} from './actions.js';
import { starterCatalogs } from './catalogs.js';
import {
  starterItemDefinitions,
  starterProfileDefinitions,
} from './profiles.js';

export const d20FantasyStarterContentPack = defineContentPack({
  identity: { id: 'asha.d20-fantasy.starter', version: '1.0.0' },
  entry: {
    module: 'content-packs/starter/src/content-pack.ts',
    declaration: 'd20FantasyStarterContentPack',
  },
  dependencies: [
    contentPackDependency({
      id: d20FantasyFoundationContentPack.identity.id,
      version: d20FantasyFoundationContentPack.identity.version,
      importAs: 'foundation',
    }),
  ],
  definitions: [
    ...starterCatalogs.definitions,
    ...starterActionDefinitions,
    ...starterItemDefinitions,
    ...starterProfileDefinitions,
  ],
});

export const d20FantasyStarterContentSource = contentPackSource(
  d20FantasyStarterContentPack,
);
