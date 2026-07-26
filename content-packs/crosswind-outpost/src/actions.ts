import {
  action,
  actionId,
  activation,
  damage,
  diamondArea,
  dice,
  defineActionDefinition,
  forEachTarget,
  heal,
  onOutcome,
  readStat,
  scalarTest,
  spend,
} from '@asha-rpg/authoring';

import {
  ruleweaverTacticsBudgets,
  ruleweaverTacticsProfiles,
  ruleweaverTacticsValues,
} from '../../../rulesets/ruleweaver-tactics/src/ruleset.js';
import {
  ruleweaverFoundationCatalogs,
} from '../../ruleweaver-foundation/src/catalogs.js';

const sourceModule = 'content-packs/crosswind-outpost/src/actions.ts';

const sweepDamage = damage({
  parts: [{
    id: 'energy',
    amount: dice({ count: 1, sides: 6, bonus: 1 }),
    type: ruleweaverFoundationCatalogs.references.energy,
    tags: ['area', 'implement'],
  }],
});

export const crosswindSweep = defineActionDefinition({
  id: 'action.crosswind-sweep',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'crosswindSweep' },
  action: action({
    id: actionId('action.crosswind-sweep'),
    name: 'Crosswind Sweep',
    sourcePath: `${sourceModule}#crosswindSweep`,
    tags: ['area', 'attack', 'implement'],
    targets: diamondArea({
      range: 5,
      radius: 1,
      team: 'hostile',
      minimumTargets: 1,
      maximumTargets: 4,
    }),
    check: scalarTest({
      profile: ruleweaverTacticsProfiles.AttackTest,
      base: readStat('actor', ruleweaverTacticsValues.Intellect),
      difficulty: {
        kind: 'targetDefense',
        defense: ruleweaverTacticsValues.Wits,
      },
    }),
    rollScope: 'perTarget',
    activation: activation({
      timing: 'action',
      costs: [{
        budget: ruleweaverTacticsBudgets.Standard,
        amount: 1,
      }],
    }),
    costs: [spend(ruleweaverFoundationCatalogs.references.focus, 1)],
    program: forEachTarget(
      4,
      onOutcome({
        branches: {
          critical: sweepDamage,
          hit: sweepDamage,
        },
        default: heal({ amount: { kind: 'constant', value: 0 } }),
      }),
    ),
  }),
});

export const crosswindOutpostActions = Object.freeze([
  crosswindSweep,
]);
