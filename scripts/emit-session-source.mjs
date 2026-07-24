import { canonicalJson } from '@asha-rpg/authoring';

import {
  positionalTalentsScenario,
  prepareD20FantasyStarterPlayBundle,
  starterSkirmishScenario,
} from '../dist/src/index.js';

const result = prepareD20FantasyStarterPlayBundle();
if (!result.ok) {
  throw new Error(canonicalJson(result.diagnostics));
}

process.stdout.write(canonicalJson({
  prepared: result.prepared,
  positionalScenario: positionalTalentsScenario('compiled-by-consumer'),
  scenario: starterSkirmishScenario('compiled-by-consumer'),
}));
