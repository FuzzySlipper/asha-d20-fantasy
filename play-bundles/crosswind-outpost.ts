import {
  composePlayBundle,
  contentPackRequest,
  preparePlayBundle,
} from '@asha-rpg/authoring';

import {
  crosswindOutpostContentPack,
  crosswindOutpostContentSource,
} from '../content-packs/crosswind-outpost/src/content-pack.js';
import {
  ruleweaverFoundationContentPack,
  ruleweaverFoundationContentSource,
} from '../content-packs/ruleweaver-foundation/src/content-pack.js';
import {
  ruleweaverTacticsRuleset,
} from '../rulesets/ruleweaver-tactics/src/ruleset.js';

export const crosswindOutpostPlayBundle = composePlayBundle({
  identity: {
    id: 'asha.clean-room.crosswind-outpost.play',
    version: '1.0.0',
  },
  ruleset: ruleweaverTacticsRuleset,
  base: contentPackRequest({
    id: ruleweaverFoundationContentPack.identity.id,
    version: ruleweaverFoundationContentPack.identity.version,
  }),
  add: [contentPackRequest({
    id: crosswindOutpostContentPack.identity.id,
    version: crosswindOutpostContentPack.identity.version,
  })],
  overlays: [],
  configure: {},
});

export function prepareCrosswindOutpostPlayBundle() {
  return preparePlayBundle({
    bundle: crosswindOutpostPlayBundle,
    contentPacks: [
      crosswindOutpostContentSource,
      ruleweaverFoundationContentSource,
    ],
  });
}
