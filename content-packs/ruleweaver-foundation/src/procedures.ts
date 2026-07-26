import {
  actionProcedureParameterReference,
  activation,
  defineActionProcedureDefinition,
} from '@asha-rpg/authoring';

import {
  ruleweaverTacticsBudgets,
  ruleweaverTacticsProfiles,
} from '../../../rulesets/ruleweaver-tactics/src/ruleset.js';
import { ruleweaverFoundationCatalogs } from './catalogs.js';

const packageId = 'asha.ruleweaver-tactics.foundation';
const sourceModule =
  'content-packs/ruleweaver-foundation/src/procedures.ts';

const attackStat = {
  id: 'attack-stat',
  type: 'rulesetValueReference',
} as const;
const costs = { id: 'costs', type: 'costs' } as const;
const damage = { id: 'damage', type: 'formula' } as const;
const damageType = {
  id: 'damage-type',
  type: 'catalogReference',
} as const;
const defense = {
  id: 'defense',
  type: 'rulesetValueReference',
} as const;
const distance = {
  id: 'distance',
  type: 'boundedInteger',
  minimum: 1,
  maximum: 12,
} as const;
const healing = { id: 'healing', type: 'formula' } as const;
const maximumTargets = {
  id: 'maximum-targets',
  type: 'boundedInteger',
  minimum: 1,
  maximum: 12,
} as const;
const movementRange = {
  id: 'range',
  type: 'boundedInteger',
  minimum: 1,
  maximum: 32,
} as const;
const range = {
  id: 'range',
  type: 'boundedInteger',
  minimum: 0,
  maximum: 32,
} as const;

const strikeDamagePacket = {
  kind: 'operation',
  operation: {
    kind: 'damage',
    parts: [{
      id: 'primary',
      amount: actionProcedureParameterReference(damage),
      damageType: actionProcedureParameterReference(damageType),
      tags: ['attack'],
    }],
  },
} as const;

export const ruleweaverTacticalStrikeProcedure =
  defineActionProcedureDefinition({
  id: 'procedure.tactical-strike',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'tacticalStrikeProcedure' },
  presentation: { label: 'Tactical strike procedure' },
  parameters: [
    attackStat,
    costs,
    damage,
    damageType,
    defense,
    maximumTargets,
    range,
  ] as const,
  implementation: {
    kind: 'inline',
    template: {
      targets: {
        kind: 'participant',
        team: 'hostile',
        maximumRange: actionProcedureParameterReference(range),
        maximumTargets: actionProcedureParameterReference(maximumTargets),
        lineOfEffect: 'required',
      },
      check: {
        kind: 'scalarTest',
        profile: ruleweaverTacticsProfiles.AttackTest,
        base: {
          kind: 'readStat',
          subject: 'actor',
          statId: actionProcedureParameterReference(attackStat),
        },
        difficulty: {
          kind: 'targetDefense',
          defenseId: actionProcedureParameterReference(defense),
        },
      },
      rollScope: 'perTarget',
      activation: activation({
        timing: 'action',
        costs: [
          { budget: ruleweaverTacticsBudgets.Standard, amount: 1 },
        ],
      }),
      costs: actionProcedureParameterReference(costs),
      program: {
        kind: 'atomic',
        body: {
          kind: 'forEachTarget',
          maximum: actionProcedureParameterReference(maximumTargets),
          body: {
            kind: 'onOutcome',
            branches: {
              critical: strikeDamagePacket,
              hit: strikeDamagePacket,
            },
            default: {
              kind: 'operation',
              operation: {
                kind: 'heal',
                amount: { kind: 'constant', value: 0 },
              },
            },
          },
        },
      },
    },
  },
});

export const tacticalHealingProcedure = defineActionProcedureDefinition({
  id: 'procedure.tactical-healing',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'tacticalHealingProcedure' },
  presentation: { label: 'Tactical healing procedure' },
  parameters: [costs, healing, range] as const,
  implementation: {
    kind: 'inline',
    template: {
      targets: {
        kind: 'participant',
        team: 'ally',
        maximumRange: actionProcedureParameterReference(range),
        maximumTargets: 1,
        lineOfEffect: 'required',
      },
      check: { kind: 'noRoll' },
      rollScope: 'none',
      activation: activation({
        timing: 'action',
        costs: [{ budget: ruleweaverTacticsBudgets.Bonus, amount: 1 }],
      }),
      costs: actionProcedureParameterReference(costs),
      program: {
        kind: 'atomic',
        body: {
          kind: 'onCheck',
          noRoll: {
            kind: 'operation',
            operation: {
              kind: 'heal',
              amount: actionProcedureParameterReference(healing),
            },
          },
        },
      },
    },
  },
});

export const tacticalMovementProcedure = defineActionProcedureDefinition({
  id: 'procedure.tactical-movement',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'tacticalMovementProcedure' },
  presentation: { label: 'Tactical movement procedure' },
  parameters: [movementRange] as const,
  implementation: {
    kind: 'inline',
    template: {
      targets: {
        kind: 'cell',
        team: 'any',
        maximumRange: actionProcedureParameterReference(movementRange),
        maximumTargets: 1,
        lineOfEffect: 'ignored',
      },
      check: { kind: 'noRoll' },
      rollScope: 'none',
      activation: activation({ timing: 'action', costs: [] }),
      costs: [],
      program: {
        kind: 'atomic',
        body: {
          kind: 'onCheck',
          noRoll: {
            kind: 'operation',
            operation: {
              kind: 'moveToCell',
              maximumDistance:
                actionProcedureParameterReference(movementRange),
              provokes: true,
            },
          },
        },
      },
    },
  },
});

export const tacticalPushProcedure = defineActionProcedureDefinition({
  id: 'procedure.tactical-push',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'tacticalPushProcedure' },
  presentation: { label: 'Tactical push procedure' },
  parameters: [distance] as const,
  implementation: {
    kind: 'inline',
    template: {
      targets: {
        kind: 'participant',
        team: 'hostile',
        maximumRange: 1,
        maximumTargets: 1,
        lineOfEffect: 'required',
      },
      check: { kind: 'noRoll' },
      rollScope: 'none',
      activation: activation({
        timing: 'action',
        costs: [
          { budget: ruleweaverTacticsBudgets.Standard, amount: 1 },
        ],
      }),
      costs: [],
      program: {
        kind: 'atomic',
        body: {
          kind: 'onCheck',
          noRoll: {
            kind: 'operation',
            operation: {
              kind: 'push',
              subject: 'target',
              distance: actionProcedureParameterReference(distance),
            },
          },
        },
      },
    },
  },
});

export const tacticalSlideProcedure = defineActionProcedureDefinition({
  id: 'procedure.tactical-slide',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'tacticalSlideProcedure' },
  presentation: { label: 'Tactical slide procedure' },
  parameters: [distance] as const,
  implementation: {
    kind: 'inline',
    template: {
      targets: {
        kind: 'participant',
        team: 'hostile',
        maximumRange: 1,
        maximumTargets: 1,
        lineOfEffect: 'required',
      },
      check: { kind: 'noRoll' },
      rollScope: 'none',
      activation: activation({
        timing: 'action',
        costs: [
          { budget: ruleweaverTacticsBudgets.Standard, amount: 1 },
        ],
      }),
      costs: [],
      program: {
        kind: 'atomic',
        body: {
          kind: 'onCheck',
          noRoll: {
            kind: 'operation',
            operation: {
              kind: 'slide',
              subject: 'target',
              maximumDistance: actionProcedureParameterReference(distance),
            },
          },
        },
      },
    },
  },
});

export const leaveResponseProcedure = defineActionProcedureDefinition({
  id: 'procedure.leave-response',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'leaveResponseProcedure' },
  presentation: { label: 'Leave-adjacency response procedure' },
  parameters: [damage, damageType, range] as const,
  implementation: {
    kind: 'inline',
    template: {
      targets: {
        kind: 'participant',
        team: 'hostile',
        maximumRange: actionProcedureParameterReference(range),
        maximumTargets: 1,
        lineOfEffect: 'required',
      },
      check: { kind: 'noRoll' },
      rollScope: 'none',
      activation: activation({
        timing: 'reaction',
        costs: [
          { budget: ruleweaverTacticsBudgets.Reaction, amount: 1 },
        ],
      }),
      costs: [],
      program: {
        kind: 'atomic',
        body: {
          kind: 'onCheck',
          noRoll: strikeDamagePacket,
        },
      },
    },
  },
});

export const spatialPulseProcedure = defineActionProcedureDefinition({
  id: 'procedure.spatial-pulse',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'spatialPulseProcedure' },
  presentation: { label: 'Spatial pulse procedure' },
  parameters: [] as const,
  implementation: {
    kind: 'inline',
    template: {
      targets: {
        kind: 'participant',
        team: 'any',
        maximumRange: 32,
        maximumTargets: 1,
        lineOfEffect: 'ignored',
      },
      check: { kind: 'noRoll' },
      rollScope: 'none',
      costs: [],
      program: {
        kind: 'atomic',
        body: {
          kind: 'onCheck',
          noRoll: {
            kind: 'operation',
            operation: {
              kind: 'damage',
              parts: [{
                id: 'pressure',
                amount: { kind: 'constant', value: 1 },
                damageType:
                  ruleweaverFoundationCatalogs.references.energy,
                tags: ['spatial-source'],
              }],
            },
          },
        },
      },
    },
  },
});

export const ruleweaverFoundationProcedures = Object.freeze([
  leaveResponseProcedure,
  spatialPulseProcedure,
  tacticalHealingProcedure,
  tacticalMovementProcedure,
  tacticalPushProcedure,
  tacticalSlideProcedure,
  ruleweaverTacticalStrikeProcedure,
]);
