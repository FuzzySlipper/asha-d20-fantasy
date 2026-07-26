import { canonicalJson } from '@asha-rpg/authoring';

import {
  crosswindOutpostScenario,
  prepareCrosswindOutpostPlayBundle,
} from '../dist/src/index.js';

const result = prepareCrosswindOutpostPlayBundle();
if (!result.ok) {
  throw new Error(canonicalJson(result.diagnostics));
}

process.stdout.write(canonicalJson({
  prepared: result.prepared,
  scenario: crosswindOutpostScenario('compiled-by-consumer'),
}));
