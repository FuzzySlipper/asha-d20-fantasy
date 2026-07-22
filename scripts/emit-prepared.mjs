import { canonicalJson } from '@asha-rpg/authoring';

import { prepareD20FantasyStarterPlayBundle } from '../dist/src/index.js';

const result = prepareD20FantasyStarterPlayBundle();
if (!result.ok) {
  throw new Error(canonicalJson(result.diagnostics));
}

process.stdout.write(canonicalJson(result.prepared));
