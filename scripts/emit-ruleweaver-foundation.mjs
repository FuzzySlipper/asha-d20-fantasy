import { canonicalJson } from '@asha-rpg/authoring';

import {
  prepareRuleweaverFoundationPlayBundle,
} from '../dist/src/index.js';

const result = prepareRuleweaverFoundationPlayBundle();
if (!result.ok) {
  throw new Error(canonicalJson(result.diagnostics));
}

process.stdout.write(canonicalJson(result.prepared));
