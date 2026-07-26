import {
  action,
  actionId,
  actionProcedureParameterReference,
  activation,
  ally,
  applyEffect,
  cells,
  constant,
  contentPackSource,
  damage as applyDamage,
  defineActionDefinition,
  defineActionInvocationDefinition,
  defineActionProcedureDefinition,
  defineCharacterClassDefinition,
  defineCharacterFeatureDefinition,
  defineContentCatalog,
  defineContentPack,
  defineEffectDefinition,
  defineItemDefinition,
  defineParticipantProfileData,
  defineParticipantProfileDefinition,
  defineSupportDefinition,
  definitionReference,
  diamondArea,
  equippedItemAttribute,
  forEachTarget,
  heal,
  hostile,
  itemBoundedIntegerAttribute,
  itemCatalogReferenceAttribute,
  itemDiceAttribute,
  moveToCell,
  noRoll,
  onCheck,
  onOutcome,
  participantProfileDefense,
  participantProfileResource,
  participantProfileStat,
  participantProfileVitality,
  reactionId,
  reactionOptionId,
  readStat,
  scalarTest,
  spend,
} from '@asha-rpg/authoring';
import type {
  ContentItemDefinition,
  ContentParticipantProfileData,
} from '@asha-rpg/authoring';
import {
  RPG_CAPABILITY_VERSIONS,
  RPG_OPERATION_VERSIONS,
} from '@asha-rpg/ir';

import {
  contextTacticsBudgets,
  contextTacticsProfiles,
  contextTacticsSelectors,
  contextTacticsStackingGroups,
  contextTacticsValues,
} from '../../../rulesets/context-tactics/src/ruleset.js';

const packageId = 'asha.clean-room.context-tactics.content';
const sourceModule = 'content-packs/context-tactics/src/content-pack.ts';

export const contextTacticsCatalogs = defineContentCatalog({
  packageId,
  sourceModule,
  entries: {
    drive: {
      definitionId: 'drive',
      category: 'resource',
      id: 'drive',
      label: 'Drive',
    },
    kinetic: {
      definitionId: 'kinetic',
      category: 'damageType',
      id: 'kinetic',
      label: 'Kinetic',
    },
    reserve: {
      definitionId: 'reserve',
      category: 'resource',
      id: 'reserve',
      label: 'Reserve',
    },
    strain: {
      definitionId: 'strain',
      category: 'damageType',
      id: 'strain',
      label: 'Strain',
    },
  },
});

export const overlookCell = defineSupportDefinition({
  id: 'terrain.overlook',
  visibility: 'private',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'overlookCell' },
  presentation: {
    label: 'Overlook',
    description: 'A setup-owned cell flag used by contextual resolution.',
  },
  semantic: {
    catalog: 'cell-capability',
    id: 'terrain.overlook',
    data: { kind: 'flag' },
  },
});

const damage = { id: 'damage', type: 'formula' } as const;
const damageType = { id: 'damage-type', type: 'catalogReference' } as const;
const range = {
  id: 'range',
  type: 'boundedInteger',
  minimum: 1,
  maximum: 10,
} as const;
const secondaryDamage = {
  id: 'secondary-damage',
  type: 'formula',
} as const;
const secondaryDamageType = {
  id: 'secondary-damage-type',
  type: 'catalogReference',
} as const;
const braceReaction = reactionId('reaction.redirect-force');
const softenOption = reactionOptionId('soften');

const strikePacket = {
  kind: 'sequence',
  steps: [
    {
      kind: 'operation',
      operation: {
        kind: 'openReaction',
        reactionId: braceReaction,
        options: [
          {
            id: softenOption,
            label: 'Soften',
            damageReduction: 1,
            activation: activation({
              timing: 'reaction',
              costs: [
                { budget: contextTacticsBudgets.Response, amount: 1 },
              ],
            }),
          },
        ],
      },
    },
    {
      kind: 'operation',
      operation: {
        kind: 'damage',
        parts: [
          {
            id: 'kinetic',
            amount: actionProcedureParameterReference(damage),
            damageType: actionProcedureParameterReference(damageType),
            tags: ['implement'],
          },
          {
            id: 'strain',
            amount: actionProcedureParameterReference(secondaryDamage),
            damageType:
              actionProcedureParameterReference(secondaryDamageType),
            tags: ['pressure'],
          },
        ],
      },
    },
  ],
} as const;

export const contextStrikeProcedure = defineActionProcedureDefinition({
  id: 'procedure.context-strike',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'contextStrikeProcedure' },
  presentation: { label: 'Context strike procedure' },
  parameters: [
    damage,
    damageType,
    range,
    secondaryDamage,
    secondaryDamageType,
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
      check: scalarTest({
        profile: contextTacticsProfiles.FourStepTest,
        base: readStat('actor', contextTacticsValues.Insight),
        difficulty: {
          kind: 'targetDefense',
          defense: contextTacticsValues.Ward,
        },
      }),
      rollScope: 'perTarget',
      activation: activation({
        timing: 'action',
        costs: [{ budget: contextTacticsBudgets.Tempo, amount: 2 }],
      }),
      costs: [],
      program: {
        kind: 'atomic',
        body: {
          kind: 'onOutcome',
          branches: {
            advance: strikePacket,
            breakthrough: strikePacket,
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
});

const implementBinding = {
  id: 'implement',
  requiredTags: ['implement'],
  requiredTraits: ['measured'],
  slotIds: ['hand.main'],
} as const;
const [
  damageParameter,
  damageTypeParameter,
  rangeParameter,
] = contextStrikeProcedure.parameters;

export const contextStrike = defineActionInvocationDefinition({
  id: 'action.context-strike',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'contextStrike' },
  presentation: {
    label: 'Measured Contact',
    description:
      'Commit two tempo through an equipped measured implement.',
    tags: ['approach', 'implement'],
  },
  procedure: contextStrikeProcedure,
  binding: implementBinding,
  arguments: {
    damage: equippedItemAttribute(damageParameter, {
      bindingId: implementBinding.id,
      attributeId: 'damage',
    }),
    'damage-type': equippedItemAttribute(damageTypeParameter, {
      bindingId: implementBinding.id,
      attributeId: 'damage-type',
    }),
    range: equippedItemAttribute(rangeParameter, {
      bindingId: implementBinding.id,
      attributeId: 'range',
    }),
    'secondary-damage': constant(2),
    'secondary-damage-type': contextTacticsCatalogs.references.strain,
  },
});

export const contextMove = defineActionDefinition({
  id: 'action.context-move',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'contextMove' },
  action: action({
    id: actionId('action.context-move'),
    name: 'Shift Position',
    sourcePath: `${sourceModule}#contextMove`,
    tags: ['movement'],
    targets: cells({ range: 4 }),
    check: noRoll(),
    activation: activation({
      timing: 'action',
      costs: [{ budget: contextTacticsBudgets.Tempo, amount: 1 }],
    }),
    program: onCheck({
      noRoll: moveToCell({ maximumDistance: 4, provokes: true }),
    }),
  }),
});

export const centeredEffect = defineEffectDefinition({
  id: 'effect.centered-line',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'centeredEffect' },
  presentation: {
    label: 'Centered Line',
    description: 'A brief authority-owned improvement to contextual tests.',
  },
  effect: {
    rankMinimum: 1,
    rankMaximum: 1,
    stackingId: 'centered-line',
    stacking: 'refresh',
    durationAnchor: 'sourceTurnStart',
    durationCount: 2,
    contributions: [
      {
        id: 'centered-edge',
        selector: contextTacticsSelectors.ApproachTotal,
        stackingGroup: contextTacticsStackingGroups.Edge,
        value: { kind: 'constant', value: 4 },
        predicate: {
          kind: 'effectActive',
          subject: 'actor',
          definition: { definitionId: 'effect.centered-line' },
        },
      },
    ],
  },
});

export const centerLine = defineActionDefinition({
  id: 'action.center-line',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'centerLine' },
  action: action({
    id: actionId('action.center-line'),
    name: 'Center Line',
    sourcePath: `${sourceModule}#centerLine`,
    tags: ['preparation'],
    targets: ally({ range: 0 }),
    check: noRoll(),
    activation: activation({
      timing: 'action',
      costs: [{ budget: contextTacticsBudgets.Tempo, amount: 1 }],
    }),
    costs: [spend(contextTacticsCatalogs.references.drive, 1)],
    program: onCheck({
      noRoll: applyEffect({
        effect: definitionReference({ definitionId: centeredEffect.id }),
        rank: constant(1),
      }),
    }),
  }),
});

export const observeField = defineActionDefinition({
  id: 'action.observe-field',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'observeField' },
  action: action({
    id: actionId('action.observe-field'),
    name: 'Observe Field',
    sourcePath: `${sourceModule}#observeField`,
    tags: ['free'],
    targets: ally({ range: 0 }),
    check: noRoll(),
    activation: activation({ timing: 'action', costs: [] }),
    program: onCheck({ noRoll: heal({ amount: constant(0) }) }),
  }),
});

export const wardProbe = defineActionDefinition({
  id: 'action.ward-probe',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'wardProbe' },
  action: action({
    id: actionId('action.ward-probe'),
    name: 'Probe Ward',
    sourcePath: `${sourceModule}#wardProbe`,
    tags: ['test'],
    targets: hostile({ range: 4 }),
    check: scalarTest({
      profile: contextTacticsProfiles.FourStepTest,
      base: readStat('actor', contextTacticsValues.Insight),
      difficulty: {
        kind: 'targetDefense',
        defense: contextTacticsValues.Ward,
      },
    }),
    rollScope: 'perTarget',
    activation: activation({
      timing: 'action',
      costs: [{ budget: contextTacticsBudgets.Tempo, amount: 1 }],
    }),
    program: onOutcome({
      branches: {
        advance: heal({ amount: constant(0) }),
        breakthrough: heal({ amount: constant(0) }),
      },
      default: heal({ amount: constant(0) }),
    }),
  }),
});

export const contextBurst = defineActionDefinition({
  id: 'action.context-burst',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'contextBurst' },
  action: action({
    id: actionId('action.context-burst'),
    name: 'Crossing Burst',
    sourcePath: `${sourceModule}#contextBurst`,
    tags: ['area'],
    targets: diamondArea({
      range: 4,
      radius: 1,
      team: 'hostile',
      minimumTargets: 1,
      maximumTargets: 4,
    }),
    check: noRoll(),
    activation: activation({
      timing: 'action',
      costs: [{ budget: contextTacticsBudgets.Tempo, amount: 3 }],
    }),
    program: forEachTarget(
      4,
      onCheck({
        noRoll: applyDamage({
          parts: [
            {
              id: 'kinetic',
              amount: constant(4),
              type: contextTacticsCatalogs.references.kinetic,
              tags: ['area'],
            },
            {
              id: 'strain',
              amount: constant(2),
              type: contextTacticsCatalogs.references.strain,
              tags: ['pressure'],
            },
          ],
        }),
      }),
    ),
  }),
});

export const contextReader = defineCharacterFeatureDefinition({
  id: 'feature.context-reader',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'contextReader' },
  presentation: {
    label: 'Context Reader',
    description:
      'Expose actor, target, item, and cell facts through authority ledgers.',
  },
  characterFeature: {
    contributions: [
      {
        id: 'actor-ready',
        selector: contextTacticsSelectors.ApproachTotal,
        stackingGroup: contextTacticsStackingGroups.Edge,
        value: { kind: 'constant', value: 2 },
        predicate: {
          kind: 'namedValue',
          subject: 'actor',
          rulesetId: 'asha.clean-room.context-tactics',
          valueKind: 'stat',
          valueId: 'insight',
          comparison: 'greaterThanOrEqual',
          value: 4,
        },
      },
      {
        id: 'cell-overlook',
        selector: contextTacticsSelectors.ApproachTotal,
        stackingGroup: contextTacticsStackingGroups.Edge,
        value: { kind: 'constant', value: 1 },
        predicate: {
          kind: 'cellCapability',
          subject: 'actor',
          capability: { definitionId: overlookCell.id },
        },
      },
      {
        id: 'target-opening',
        selector: contextTacticsSelectors.ApproachTotal,
        stackingGroup: contextTacticsStackingGroups.Opening,
        value: { kind: 'constant', value: 1 },
        predicate: {
          kind: 'namedValue',
          subject: 'target',
          rulesetId: 'asha.clean-room.context-tactics',
          valueKind: 'defense',
          valueId: 'ward',
          comparison: 'lessThanOrEqual',
          value: 12,
        },
      },
    ],
    outcomeBandShifts: [
      {
        id: 'overlook-shift',
        profile: contextTacticsProfiles.FourStepTest,
        shift: 1,
        predicate: {
          kind: 'cellCapability',
          subject: 'actor',
          capability: { definitionId: overlookCell.id },
        },
      },
      {
        id: 'guarded-shift',
        profile: contextTacticsProfiles.FourStepTest,
        shift: -1,
        predicate: {
          kind: 'namedValue',
          subject: 'target',
          rulesetId: 'asha.clean-room.context-tactics',
          valueKind: 'defense',
          valueId: 'ward',
          comparison: 'greaterThanOrEqual',
          value: 14,
        },
      },
    ],
  },
});

export const layeredWard = defineCharacterFeatureDefinition({
  id: 'feature.layered-ward',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'layeredWard' },
  presentation: {
    label: 'Layered Ward',
    description: 'Apply ordered, damage-part-specific responses.',
  },
  characterFeature: {
    damageResponses: [
      {
        id: 'kinetic-scale',
        damageType: contextTacticsCatalogs.references.kinetic,
        requiredTags: [],
        bypassTags: ['bypass'],
        effect: { kind: 'scale', numerator: 1, denominator: 2 },
      },
      {
        id: 'kinetic-trim',
        damageType: contextTacticsCatalogs.references.kinetic,
        requiredTags: [],
        bypassTags: ['bypass'],
        effect: { kind: 'flat', value: -1 },
      },
      {
        id: 'strain-trim',
        damageType: contextTacticsCatalogs.references.strain,
        requiredTags: ['pressure'],
        bypassTags: [],
        effect: { kind: 'flat', value: -1 },
      },
    ],
  },
});

export const coordinatorClass = defineCharacterClassDefinition({
  id: 'class.coordinator',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'coordinatorClass' },
  presentation: { label: 'Coordinator' },
  characterClass: {
    featureDefinitions: [
      definitionReference({ definitionId: contextReader.id }),
    ],
  },
});

export const keeperClass = defineCharacterClassDefinition({
  id: 'class.keeper',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'keeperClass' },
  presentation: { label: 'Keeper' },
  characterClass: {
    featureDefinitions: [
      definitionReference({ definitionId: layeredWard.id }),
    ],
  },
});

export const calibratedRod = contextImplement({
  id: 'item.calibrated-rod',
  label: 'Calibrated Rod',
  sides: 10,
  calibrated: true,
});
export const plainRod = contextImplement({
  id: 'item.plain-rod',
  label: 'Plain Rod',
  sides: 8,
  calibrated: false,
});

const leadActions = [
  contextBurst.id,
  contextMove.id,
  contextStrike.id,
  centerLine.id,
  observeField.id,
  wardProbe.id,
];
const commonActions = [
  contextMove.id,
  contextStrike.id,
  observeField.id,
  wardProbe.id,
];

export const coordinatorProfileData = profileData({
  role: 'player',
  actions: leadActions,
  classDefinition: coordinatorClass.id,
  features: [contextReader.id],
  item: calibratedRod,
  itemInstanceId: 'coordinator-rod',
  insight: 4,
  ward: 13,
  vitality: 18,
  drive: 1,
  reserve: 2,
});

export const partnerProfileData = profileData({
  role: 'player',
  actions: [contextMove.id, observeField.id],
  insight: 2,
  ward: 11,
  vitality: 12,
  drive: 1,
  reserve: 1,
});

export const keeperProfileData = profileData({
  role: 'creature',
  actions: commonActions,
  classDefinition: keeperClass.id,
  features: [layeredWard.id],
  item: plainRod,
  itemInstanceId: 'keeper-rod',
  insight: 3,
  ward: 12,
  vitality: 20,
  drive: 1,
  reserve: 2,
});

export const roverProfileData = profileData({
  role: 'creature',
  actions: [contextMove.id, observeField.id],
  insight: 3,
  ward: 14,
  vitality: 11,
  drive: 1,
  reserve: 1,
});

export const coordinatorProfile = profileDefinition(
  'profile.coordinator',
  'coordinator',
  'Coordinator',
  coordinatorProfileData,
);
export const partnerProfile = profileDefinition(
  'profile.partner',
  'partner',
  'Partner',
  partnerProfileData,
);
export const keeperProfile = profileDefinition(
  'profile.keeper',
  'keeper',
  'Keeper',
  keeperProfileData,
);
export const roverProfile = profileDefinition(
  'profile.rover',
  'rover',
  'Rover',
  roverProfileData,
);

export const contextTacticsContentPack = defineContentPack({
  identity: { id: packageId, version: '1.0.0' },
  entry: { module: sourceModule, declaration: 'contextTacticsContentPack' },
  requirements: {
    operations: [
      {
        id: 'operation.applyEffect',
        version: RPG_OPERATION_VERSIONS['operation.applyEffect'],
      },
      {
        id: 'operation.changeResource',
        version: RPG_OPERATION_VERSIONS['operation.changeResource'],
      },
      {
        id: 'operation.damage',
        version: RPG_OPERATION_VERSIONS['operation.damage'],
      },
      {
        id: 'operation.heal',
        version: RPG_OPERATION_VERSIONS['operation.heal'],
      },
      {
        id: 'operation.moveToCell',
        version: RPG_OPERATION_VERSIONS['operation.moveToCell'],
      },
      {
        id: 'operation.openReaction',
        version: RPG_OPERATION_VERSIONS['operation.openReaction'],
      },
    ],
    capabilities: [
      {
        id: 'capability.activation-budgets',
        version: RPG_CAPABILITY_VERSIONS['capability.activation-budgets'],
      },
      {
        id: 'capability.defenses',
        version: RPG_CAPABILITY_VERSIONS['capability.defenses'],
      },
      {
        id: 'capability.effects',
        version: RPG_CAPABILITY_VERSIONS['capability.effects'],
      },
      {
        id: 'capability.position',
        version: RPG_CAPABILITY_VERSIONS['capability.position'],
      },
      {
        id: 'capability.random',
        version: RPG_CAPABILITY_VERSIONS['capability.random'],
      },
      {
        id: 'capability.reactions',
        version: RPG_CAPABILITY_VERSIONS['capability.reactions'],
      },
      {
        id: 'capability.resources',
        version: RPG_CAPABILITY_VERSIONS['capability.resources'],
      },
      {
        id: 'capability.stats',
        version: RPG_CAPABILITY_VERSIONS['capability.stats'],
      },
      {
        id: 'capability.vitality',
        version: RPG_CAPABILITY_VERSIONS['capability.vitality'],
      },
    ],
  },
  definitions: [
    ...contextTacticsCatalogs.definitions,
    overlookCell,
    contextStrikeProcedure,
    contextStrike,
    contextMove,
    centeredEffect,
    centerLine,
    observeField,
    wardProbe,
    contextBurst,
    contextReader,
    layeredWard,
    coordinatorClass,
    keeperClass,
    calibratedRod,
    plainRod,
    coordinatorProfile,
    partnerProfile,
    keeperProfile,
    roverProfile,
  ],
});

export const contextTacticsContentSource = contentPackSource(
  contextTacticsContentPack,
);

function contextImplement(input: {
  readonly id: string;
  readonly label: string;
  readonly sides: number;
  readonly calibrated: boolean;
}): ContentItemDefinition {
  return defineItemDefinition({
    id: input.id,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: { module: sourceModule, declaration: input.id },
    presentation: { label: input.label, tags: ['item', 'implement'] },
    item: {
      tags: input.calibrated
        ? ['calibrated', 'implement']
        : ['implement'],
      traits: ['measured'],
      allowedSlots: ['hand.main'],
      attributes: [
        itemDiceAttribute({ id: 'damage', count: 1, sides: input.sides }),
        itemCatalogReferenceAttribute(
          'damage-type',
          contextTacticsCatalogs.references.kinetic,
        ),
        itemBoundedIntegerAttribute({
          id: 'range',
          value: 1,
          minimum: 1,
          maximum: 10,
        }),
      ],
      contributions: input.calibrated
        ? [
            {
              id: 'calibrated-edge',
              selector: contextTacticsSelectors.ApproachTotal,
              stackingGroup: contextTacticsStackingGroups.Edge,
              value: { kind: 'constant', value: 3 },
              predicate: { kind: 'boundItemTag', tag: 'calibrated' },
            },
          ]
        : [],
    },
  });
}

function profileData(input: {
  readonly role: 'player' | 'creature';
  readonly actions: readonly string[];
  readonly classDefinition?: string;
  readonly features?: readonly string[];
  readonly item?: ContentItemDefinition;
  readonly itemInstanceId?: string;
  readonly insight: number;
  readonly ward: number;
  readonly vitality: number;
  readonly drive: number;
  readonly reserve: number;
}): ContentParticipantProfileData {
  const item =
    input.item === undefined || input.itemInstanceId === undefined
      ? []
      : [{
          id: input.itemInstanceId,
          definition: definitionReference({ definitionId: input.item.id }),
        }];
  return defineParticipantProfileData({
    role: input.role,
    definitionReferences: input.actions.map((definitionId) =>
      definitionReference({ definitionId }),
    ),
    classDefinition:
      input.classDefinition === undefined
        ? null
        : definitionReference({ definitionId: input.classDefinition }),
    featureDefinitions: (input.features ?? []).map((definitionId) =>
      definitionReference({ definitionId }),
    ),
    items: item,
    equipment:
      item.length === 0
        ? []
        : [{ slotId: 'hand.main', itemInstanceId: input.itemInstanceId ?? '' }],
    capabilities: [
      participantProfileVitality({
        current: input.vitality,
        max: input.vitality,
      }),
      participantProfileStat(contextTacticsValues.Insight, input.insight),
      participantProfileDefense(contextTacticsValues.Ward, input.ward),
      participantProfileResource(
        contextTacticsCatalogs.references.drive,
        { current: input.drive, max: input.drive },
      ),
      participantProfileResource(
        contextTacticsCatalogs.references.reserve,
        { current: input.reserve, max: input.reserve },
      ),
    ],
  });
}

function profileDefinition(
  id: string,
  profileId: string,
  label: string,
  profile: ContentParticipantProfileData,
) {
  return defineParticipantProfileDefinition({
    id,
    profileId,
    profile,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: { module: sourceModule, declaration: id },
    presentation: { label, tags: [profile.role, 'participant-profile'] },
  });
}
