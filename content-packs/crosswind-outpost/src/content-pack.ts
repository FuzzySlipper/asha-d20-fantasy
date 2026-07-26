import {
  contentPackDependency,
  contentPackSource,
  defineContentPack,
} from '@asha-rpg/authoring';
import {
  RPG_CAPABILITY_VERSIONS,
  RPG_OPERATION_VERSIONS,
} from '@asha-rpg/ir';

import {
  ruleweaverTacticsValues,
} from '../../../rulesets/ruleweaver-tactics/src/ruleset.js';
import {
  ruleweaverFoundationContentPack,
} from '../../ruleweaver-foundation/src/content-pack.js';
import { crosswindOutpostActions } from './actions.js';
import {
  crosswindOutpostClasses,
  crosswindOutpostTalents,
} from './classes.js';
import { crosswindOutpostItems } from './items.js';
import { crosswindOutpostProfiles } from './profiles.js';

export const crosswindOutpostContentPack = defineContentPack({
  identity: {
    id: 'asha.clean-room.crosswind-outpost',
    version: '1.0.0',
  },
  entry: {
    module: 'content-packs/crosswind-outpost/src/content-pack.ts',
    declaration: 'crosswindOutpostContentPack',
  },
  dependencies: [
    contentPackDependency({
      id: ruleweaverFoundationContentPack.identity.id,
      version: ruleweaverFoundationContentPack.identity.version,
      importAs: 'foundation',
    }),
  ],
  requirements: {
    operations: [
      operation('operation.damage'),
      operation('operation.heal'),
    ],
    capabilities: [
      capability('capability.defenses'),
      capability('capability.position'),
      capability('capability.random'),
      capability('capability.resources'),
      capability('capability.stats'),
      capability('capability.vitality'),
    ],
    values: Object.values(ruleweaverTacticsValues).map(({ kind, id }) => ({
      kind,
      id,
    })),
    numericDomains: [
      'activation-points',
      'tactical-score',
    ],
  },
  definitions: [
    ...crosswindOutpostActions,
    ...crosswindOutpostTalents,
    ...crosswindOutpostClasses,
    ...crosswindOutpostItems,
    ...crosswindOutpostProfiles,
  ],
});

export const crosswindOutpostContentSource = contentPackSource(
  crosswindOutpostContentPack,
);

function operation(id: keyof typeof RPG_OPERATION_VERSIONS) {
  return { id, version: RPG_OPERATION_VERSIONS[id] };
}

function capability(id: keyof typeof RPG_CAPABILITY_VERSIONS) {
  return { id, version: RPG_CAPABILITY_VERSIONS[id] };
}
