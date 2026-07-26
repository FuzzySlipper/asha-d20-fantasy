import {
  composePlayBundle,
  contentPackRequest,
  preparePlayBundle,
} from '@asha-rpg/authoring';

import {
  multiAxisPoolContentPack,
  multiAxisPoolContentSource,
} from '../content-packs/multi-axis-pool/src/content-pack.js';
import {
  multiAxisPoolRuleset,
} from '../rulesets/multi-axis-pool/src/ruleset.js';

export const multiAxisPoolPlayBundle = composePlayBundle({
  identity: {
    id: 'asha.clean-room.multi-axis-pool.play',
    version: '1.0.0',
  },
  ruleset: multiAxisPoolRuleset,
  base: contentPackRequest({
    id: multiAxisPoolContentPack.identity.id,
    version: multiAxisPoolContentPack.identity.version,
  }),
  add: [],
  overlays: [],
  configure: {},
});

export function prepareMultiAxisPoolPlayBundle() {
  return preparePlayBundle({
    bundle: multiAxisPoolPlayBundle,
    contentPacks: [multiAxisPoolContentSource],
  });
}
