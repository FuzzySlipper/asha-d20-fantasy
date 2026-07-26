import {
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
import { ruleweaverFoundationActions } from './actions.js';
import { ruleweaverFoundationCatalogs } from './catalogs.js';
import { ruleweaverFoundationClasses } from './classes.js';
import { ruleweaverFoundationEffects } from './effects.js';
import { ruleweaverFoundationItems } from './items.js';
import { ruleweaverFoundationProcedures } from './procedures.js';
import { ruleweaverFoundationSpatialSources } from './spatial-sources.js';
import { ruleweaverFoundationTalents } from './talents.js';

export const ruleweaverFoundationContentPack = defineContentPack({
  identity: {
    id: 'asha.ruleweaver-tactics.foundation',
    version: '1.0.0',
  },
  entry: {
    module: 'content-packs/ruleweaver-foundation/src/content-pack.ts',
    declaration: 'ruleweaverFoundationContentPack',
  },
  requirements: {
    operations: [
      operation('operation.applyEffect'),
      operation('operation.createSpatialSource'),
      operation('operation.damage'),
      operation('operation.heal'),
      operation('operation.moveToCell'),
      operation('operation.push'),
      operation('operation.slide'),
    ],
    capabilities: [
      capability('capability.activation-budgets'),
      capability('capability.defenses'),
      capability('capability.effects'),
      capability('capability.position'),
      capability('capability.random'),
      capability('capability.reactions'),
      capability('capability.resources'),
      capability('capability.spatial-sources'),
      capability('capability.stats'),
      capability('capability.vitality'),
    ],
    values: Object.values(ruleweaverTacticsValues).map(({ kind, id }) => ({
      kind,
      id,
    })),
    numericDomains: [
      'activation-points',
      'effect-magnitude',
      'tactical-score',
    ],
  },
  definitions: [
    ...ruleweaverFoundationCatalogs.definitions,
    ...ruleweaverFoundationProcedures,
    ...ruleweaverFoundationItems,
    ...ruleweaverFoundationEffects,
    ...ruleweaverFoundationSpatialSources,
    ...ruleweaverFoundationActions,
    ...ruleweaverFoundationTalents,
    ...ruleweaverFoundationClasses,
  ],
});

export const ruleweaverFoundationContentSource = contentPackSource(
  ruleweaverFoundationContentPack,
);

function operation(id: keyof typeof RPG_OPERATION_VERSIONS) {
  return { id, version: RPG_OPERATION_VERSIONS[id] };
}

function capability(id: keyof typeof RPG_CAPABILITY_VERSIONS) {
  return { id, version: RPG_CAPABILITY_VERSIONS[id] };
}
