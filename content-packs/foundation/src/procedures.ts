import {
  actionProcedureParameterReference,
  defineActionProcedureDefinition,
  reactionId,
  reactionOptionId,
} from '@asha-rpg/authoring';

const packageId = 'asha.d20-fantasy.foundation';
const sourceModule = 'content-packs/foundation/src/procedures.ts';

const attackBonus = { id: 'attack-bonus', type: 'formula' } as const;
const attackStat = {
  id: 'attack-stat',
  type: 'rulesetValueReference',
} as const;
const costs = { id: 'costs', type: 'costs' } as const;
const damage = { id: 'damage', type: 'formula' } as const;
const damageStat = {
  id: 'damage-stat',
  type: 'rulesetValueReference',
} as const;
const damageType = {
  id: 'damage-type',
  type: 'catalogReference',
} as const;
const defense = {
  id: 'defense',
  type: 'rulesetValueReference',
} as const;
const difficulty = { id: 'difficulty', type: 'formula' } as const;
const duration = {
  id: 'duration',
  type: 'boundedInteger',
  minimum: 1,
  maximum: 1_000,
} as const;
const healing = { id: 'healing', type: 'formula' } as const;
const maximumTargets = {
  id: 'maximum-targets',
  type: 'boundedInteger',
  minimum: 1,
  maximum: 32,
} as const;
const modifier = {
  id: 'modifier',
  type: 'catalogReference',
} as const;
const modifierValue = { id: 'modifier-value', type: 'formula' } as const;
const movementRange = {
  id: 'range',
  type: 'boundedInteger',
  minimum: 1,
  maximum: 64,
} as const;
const range = {
  id: 'range',
  type: 'boundedInteger',
  minimum: 0,
  maximum: 64,
} as const;
const stackingGroup = { id: 'stacking-group', type: 'identifier' } as const;

const defensiveGuard = reactionId('reaction.defensive-guard');
const brace = reactionOptionId('brace');

export const movementProcedure = defineActionProcedureDefinition({
  id: 'procedure.movement',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'movementProcedure' },
  presentation: { label: 'Movement' },
  parameters: [movementRange] as const,
  implementation: {
    kind: 'inline',
    template: {
      targets: {
        kind: 'cell',
        team: 'any',
        maximumRange: actionProcedureParameterReference(movementRange),
        maximumTargets: 1,
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

export const basicWeaponAttackProcedure = defineActionProcedureDefinition({
  id: 'procedure.basic-weapon-attack',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: {
    module: sourceModule,
    declaration: 'basicWeaponAttackProcedure',
  },
  presentation: { label: 'Basic weapon attack' },
  parameters: [
    attackStat,
    damage,
    damageStat,
    damageType,
    defense,
    range,
  ] as const,
  implementation: {
    kind: 'inline',
    template: {
      targets: {
        kind: 'participant',
        team: 'hostile',
        maximumRange: actionProcedureParameterReference(range),
        maximumTargets: 1,
      },
      check: {
        kind: 'attack',
        modifier: {
          kind: 'readStat',
          subject: 'actor',
          statId: actionProcedureParameterReference(attackStat),
        },
        defenseId: actionProcedureParameterReference(defense),
      },
      rollScope: 'perTarget',
      costs: [],
      program: {
        kind: 'atomic',
        body: {
          kind: 'onCheck',
          hit: {
            kind: 'sequence',
            steps: [
              {
                kind: 'operation',
                operation: {
                  kind: 'openReaction',
                  reactionId: defensiveGuard,
                  options: [
                    {
                      id: brace,
                      label: 'Brace',
                      damageReduction: 2,
                    },
                  ],
                },
              },
              {
                kind: 'operation',
                operation: {
                  kind: 'damage',
                  amount: {
                    kind: 'add',
                    terms: [
                      actionProcedureParameterReference(damage),
                      {
                        kind: 'readStat',
                        subject: 'actor',
                        statId:
                          actionProcedureParameterReference(damageStat),
                      },
                    ],
                  },
                  damageType: actionProcedureParameterReference(damageType),
                },
              },
            ],
          },
        },
      },
    },
  },
});

export const attackRollDamageProcedure = defineActionProcedureDefinition({
  id: 'procedure.attack-roll-damage',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: {
    module: sourceModule,
    declaration: 'attackRollDamageProcedure',
  },
  presentation: { label: 'Attack-roll damage' },
  parameters: [attackBonus, damage, damageType, defense, range] as const,
  implementation: {
    kind: 'inline',
    template: {
      targets: {
        kind: 'participant',
        team: 'hostile',
        maximumRange: actionProcedureParameterReference(range),
        maximumTargets: 1,
      },
      check: {
        kind: 'attack',
        modifier: actionProcedureParameterReference(attackBonus),
        defenseId: actionProcedureParameterReference(defense),
      },
      rollScope: 'perTarget',
      costs: [],
      program: {
        kind: 'atomic',
        body: {
          kind: 'onCheck',
          hit: {
            kind: 'operation',
            operation: {
              kind: 'damage',
              amount: actionProcedureParameterReference(damage),
              damageType: actionProcedureParameterReference(damageType),
            },
          },
        },
      },
    },
  },
});

export const savingThrowFullHalfDamageProcedure =
  defineActionProcedureDefinition({
    id: 'procedure.saving-throw-full-half-damage',
    ownerPackageId: packageId,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: {
      module: sourceModule,
      declaration: 'savingThrowFullHalfDamageProcedure',
    },
    presentation: { label: 'Saving throw with full or half damage' },
    parameters: [
      costs,
      damage,
      damageType,
      defense,
      difficulty,
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
          maximumTargets:
            actionProcedureParameterReference(maximumTargets),
        },
        check: {
          kind: 'savingThrow',
          difficulty: actionProcedureParameterReference(difficulty),
          defenseId: actionProcedureParameterReference(defense),
        },
        rollScope: 'perTarget',
        costs: actionProcedureParameterReference(costs),
        program: {
          kind: 'atomic',
          body: {
            kind: 'forEachTarget',
            maximum: actionProcedureParameterReference(maximumTargets),
            body: {
              kind: 'onCheck',
              failed: {
                kind: 'operation',
                operation: {
                  kind: 'damage',
                  amount: actionProcedureParameterReference(damage),
                  damageType:
                    actionProcedureParameterReference(damageType),
                },
              },
              saved: {
                kind: 'operation',
                operation: {
                  kind: 'damage',
                  amount: {
                    kind: 'half',
                    value: actionProcedureParameterReference(damage),
                  },
                  damageType:
                    actionProcedureParameterReference(damageType),
                },
              },
            },
          },
        },
      },
    },
  });

export const resourceSpendHealingProcedure = defineActionProcedureDefinition({
  id: 'procedure.resource-spend-healing',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: {
    module: sourceModule,
    declaration: 'resourceSpendHealingProcedure',
  },
  presentation: { label: 'Resource-spend healing' },
  parameters: [costs, healing, range] as const,
  implementation: {
    kind: 'inline',
    template: {
      targets: {
        kind: 'participant',
        team: 'ally',
        maximumRange: actionProcedureParameterReference(range),
        maximumTargets: 1,
      },
      check: { kind: 'noRoll' },
      rollScope: 'none',
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

export const attackRollDamageConditionProcedure =
  defineActionProcedureDefinition({
    id: 'procedure.attack-roll-damage-condition',
    ownerPackageId: packageId,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: {
      module: sourceModule,
      declaration: 'attackRollDamageConditionProcedure',
    },
    presentation: { label: 'Attack-roll damage and condition' },
    parameters: [
      attackBonus,
      damage,
      damageStat,
      damageType,
      defense,
      duration,
      modifier,
      modifierValue,
      range,
      stackingGroup,
    ] as const,
    implementation: {
      kind: 'inline',
      template: {
        targets: {
          kind: 'participant',
          team: 'hostile',
          maximumRange: actionProcedureParameterReference(range),
          maximumTargets: 1,
        },
        check: {
          kind: 'attack',
          modifier: actionProcedureParameterReference(attackBonus),
          defenseId: actionProcedureParameterReference(defense),
        },
        rollScope: 'perTarget',
        costs: [],
        program: {
          kind: 'atomic',
          body: {
            kind: 'onCheck',
            hit: {
              kind: 'sequence',
              steps: [
                {
                  kind: 'operation',
                  operation: {
                    kind: 'damage',
                    amount: {
                      kind: 'add',
                      terms: [
                        actionProcedureParameterReference(damage),
                        {
                          kind: 'readStat',
                          subject: 'actor',
                          statId:
                            actionProcedureParameterReference(damageStat),
                        },
                      ],
                    },
                    damageType:
                      actionProcedureParameterReference(damageType),
                  },
                },
                {
                  kind: 'operation',
                  operation: {
                    kind: 'applyModifier',
                    modifierId: actionProcedureParameterReference(modifier),
                    stackingGroup:
                      actionProcedureParameterReference(stackingGroup),
                    stacking: 'replace',
                    value:
                      actionProcedureParameterReference(modifierValue),
                    durationTurns:
                      actionProcedureParameterReference(duration),
                  },
                },
              ],
            },
          },
        },
      },
    },
  });

export const foundationActionProcedures = Object.freeze([
  movementProcedure,
  basicWeaponAttackProcedure,
  attackRollDamageProcedure,
  savingThrowFullHalfDamageProcedure,
  resourceSpendHealingProcedure,
  attackRollDamageConditionProcedure,
]);
