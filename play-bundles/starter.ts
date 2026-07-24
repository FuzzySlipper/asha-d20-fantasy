import {
  composePlayBundle,
  contentPackRequest,
  preparePlayBundle,
} from '@asha-rpg/authoring';

import {
  d20FantasyFoundationContentSource,
} from '../content-packs/foundation/src/content-pack.js';
import {
  d20FantasyStarterContentPack,
  d20FantasyStarterContentSource,
} from '../content-packs/starter/src/content-pack.js';
import { d20FantasyRuleset } from '../rulesets/d20-fantasy/src/ruleset.js';

export const d20FantasyStarterPlayBundle = composePlayBundle({
  identity: { id: 'asha.d20-fantasy.starter-play', version: '1.0.0' },
  ruleset: d20FantasyRuleset,
  base: contentPackRequest({
    id: d20FantasyStarterContentPack.identity.id,
    version: d20FantasyStarterContentPack.identity.version,
  }),
  add: [],
  overlays: [],
  configure: {},
});

export function prepareD20FantasyStarterPlayBundle() {
  return preparePlayBundle({
    bundle: d20FantasyStarterPlayBundle,
    contentPacks: [
      d20FantasyStarterContentSource,
      d20FantasyFoundationContentSource,
    ],
  });
}
