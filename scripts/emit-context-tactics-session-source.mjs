import { canonicalJson } from '@asha-rpg/authoring';

import {
  contextTacticsScenario,
  prepareContextTacticsPlayBundle,
} from '../dist/src/index.js';

const result = prepareContextTacticsPlayBundle();
if (!result.ok) {
  throw new Error(canonicalJson(result.diagnostics));
}

process.stdout.write(canonicalJson({
  prepared: result.prepared,
  scenario: contextTacticsScenario('compiled-by-consumer'),
}));
