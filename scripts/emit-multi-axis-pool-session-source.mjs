import {
  canonicalJson,
} from '@asha-rpg/authoring';

import {
  multiAxisPoolScenario,
  prepareMultiAxisPoolPlayBundle,
} from '../dist/src/index.js';

const result = prepareMultiAxisPoolPlayBundle();
if (!result.ok) {
  throw new Error(canonicalJson(result.diagnostics));
}

process.stdout.write(canonicalJson({
  prepared: result.prepared,
  scenario: multiAxisPoolScenario('compiled-by-script'),
}));
