import { defineSpatialSourceDefinition } from '@asha-rpg/authoring';

import { spatialPulseProcedure } from './procedures.js';

const sourceModule =
  'content-packs/ruleweaver-foundation/src/spatial-sources.ts';

export const staticPressureField = defineSpatialSourceDefinition({
  id: 'spatial-source.pressure-field',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'staticPressureField' },
  presentation: {
    label: 'Pressure Field',
    description:
      'A fixed bounded field whose trigger procedure remains Rust-owned.',
  },
  spatialSource: {
    shape: { kind: 'diamond', radius: 1 },
    targetFilter: 'hostiles',
    stackingId: 'pressure-field',
    stacking: 'independentBySource',
    tenure: {
      kind: 'fixed',
      anchor: 'sourceTurnStart',
      count: 2,
    },
    triggers: [
      { boundary: 'enter', procedure: spatialPulseProcedure },
      { boundary: 'startTurn', procedure: spatialPulseProcedure },
    ],
  },
});

export const ruleweaverFoundationSpatialSources = Object.freeze([
  staticPressureField,
]);
