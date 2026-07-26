import { canonicalJson } from '@asha-rpg/authoring';

import {
  prepareTacticalRolloverPlayBundle,
  tacticalRolloverScenario,
} from '../dist/src/index.js';

const result = prepareTacticalRolloverPlayBundle();
if (!result.ok) {
  throw new Error(canonicalJson(result.diagnostics));
}

process.stdout.write(canonicalJson({
  prepared: result.prepared,
  scenario: tacticalRolloverScenario('compiled-by-consumer'),
}));
