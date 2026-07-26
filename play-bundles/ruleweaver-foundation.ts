import {
  composePlayBundle,
  contentPackRequest,
  preparePlayBundle,
} from '@asha-rpg/authoring';

import {
  ruleweaverFoundationContentPack,
  ruleweaverFoundationContentSource,
} from '../content-packs/ruleweaver-foundation/src/content-pack.js';
import {
  ruleweaverTacticsRuleset,
} from '../rulesets/ruleweaver-tactics/src/ruleset.js';

export const ruleweaverFoundationPlayBundle = composePlayBundle({
  identity: {
    id: 'asha.ruleweaver-tactics.foundation.play',
    version: '1.0.0',
  },
  ruleset: ruleweaverTacticsRuleset,
  base: contentPackRequest({
    id: ruleweaverFoundationContentPack.identity.id,
    version: ruleweaverFoundationContentPack.identity.version,
  }),
  add: [],
  overlays: [],
  configure: {},
});

export function prepareRuleweaverFoundationPlayBundle() {
  return preparePlayBundle({
    bundle: ruleweaverFoundationPlayBundle,
    contentPacks: [ruleweaverFoundationContentSource],
  });
}
