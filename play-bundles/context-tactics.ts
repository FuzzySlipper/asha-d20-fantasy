import {
  composePlayBundle,
  contentPackRequest,
  preparePlayBundle,
} from '@asha-rpg/authoring';

import {
  contextTacticsContentPack,
  contextTacticsContentSource,
} from '../content-packs/context-tactics/src/content-pack.js';
import {
  contextTacticsRuleset,
} from '../rulesets/context-tactics/src/ruleset.js';

export const contextTacticsPlayBundle = composePlayBundle({
  identity: {
    id: 'asha.clean-room.context-tactics.play',
    version: '1.0.0',
  },
  ruleset: contextTacticsRuleset,
  base: contentPackRequest({
    id: contextTacticsContentPack.identity.id,
    version: contextTacticsContentPack.identity.version,
  }),
  add: [],
  overlays: [],
  configure: {},
});

export function prepareContextTacticsPlayBundle() {
  return preparePlayBundle({
    bundle: contextTacticsPlayBundle,
    contentPacks: [contextTacticsContentSource],
  });
}
