import {
  composePlayBundle,
  contentPackRequest,
  preparePlayBundle,
} from '@asha-rpg/authoring';

import {
  tacticalRolloverContentPack,
  tacticalRolloverContentSource,
} from '../content-packs/tactical-rollover/src/content-pack.js';
import {
  tacticalRolloverRuleset,
} from '../rulesets/tactical-rollover/src/ruleset.js';

export const tacticalRolloverPlayBundle = composePlayBundle({
  identity: {
    id: 'asha.clean-room.tactical-rollover.play',
    version: '1.0.0',
  },
  ruleset: tacticalRolloverRuleset,
  base: contentPackRequest({
    id: tacticalRolloverContentPack.identity.id,
    version: tacticalRolloverContentPack.identity.version,
  }),
  add: [],
  overlays: [],
  configure: {},
});

export function prepareTacticalRolloverPlayBundle() {
  return preparePlayBundle({
    bundle: tacticalRolloverPlayBundle,
    contentPacks: [tacticalRolloverContentSource],
  });
}
