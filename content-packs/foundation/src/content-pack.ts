import {
  contentPackSource,
  defineContentPack,
} from '@asha-rpg/authoring';

import { foundationActionProcedures } from './procedures.js';

export const d20FantasyFoundationContentPack = defineContentPack({
  identity: { id: 'asha.d20-fantasy.foundation', version: '1.0.0' },
  entry: {
    module: 'content-packs/foundation/src/content-pack.ts',
    declaration: 'd20FantasyFoundationContentPack',
  },
  definitions: foundationActionProcedures,
});

export const d20FantasyFoundationContentSource = contentPackSource(
  d20FantasyFoundationContentPack,
);
