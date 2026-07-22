import { canonicalJson } from '@asha-rpg/authoring';

import {
  prepareD20FantasyStarterPlayBundle,
  starterSkirmishScenario,
} from '../dist/src/index.js';

const result = prepareD20FantasyStarterPlayBundle();
if (!result.ok) {
  throw new Error(canonicalJson(result.diagnostics));
}

process.stdout.write(canonicalJson({
  prepared: result.prepared,
  scenario: starterSkirmishScenario('compiled-by-consumer'),
}));
