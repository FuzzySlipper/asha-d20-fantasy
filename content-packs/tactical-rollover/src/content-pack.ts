import {
  action,
  actionId,
  actionProcedureParameterReference,
  applyEffect,
  ally,
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
  definitionReference,
  diamondArea,
  equippedItemAttribute,
  forEachTarget,
  hostile,
  heal,
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
  tacticalRolloverProfiles,
  tacticalRolloverSelectors,
  tacticalRolloverStackingGroups,
  tacticalRolloverValues,
} from '../../../rulesets/tactical-rollover/src/ruleset.js';

const packageId = 'asha.clean-room.tactical-rollover.content';
const sourceModule =
  'content-packs/tactical-rollover/src/content-pack.ts';

export const tacticalRolloverCatalogs = defineContentCatalog({
  packageId,
  sourceModule,
  entries: {
    impact: {
      definitionId: 'damage.impact',
      category: 'damageType',
      id: 'impact',
      label: 'Impact',
    },
    strain: {
      definitionId: 'damage.strain',
      category: 'damageType',
      id: 'strain',
      label: 'Strain',
    },
    focus: {
      definitionId: 'focus',
      category: 'resource',
      id: 'focus',
      label: 'Focus',
    },
    reserve: {
      definitionId: 'reserve',
      category: 'resource',
      id: 'reserve',
      label: 'Reserve',
    },
  },
});

const damage = { id: 'damage', type: 'formula' } as const;
const damageType = { id: 'damage-type', type: 'catalogReference' } as const;
const range = {
  id: 'range',
  type: 'boundedInteger',
  minimum: 1,
  maximum: 12,
} as const;
const secondaryDamage = {
  id: 'secondary-damage',
  type: 'formula',
} as const;
const secondaryDamageType = {
  id: 'secondary-damage-type',
  type: 'catalogReference',
} as const;
const guardReaction = reactionId('reaction.guard-choice');
const braceOption = reactionOptionId('brace');

const packet = {
  kind: 'sequence',
  steps: [
    {
      kind: 'operation',
      operation: {
        kind: 'openReaction',
        reactionId: guardReaction,
        options: [
          {
            id: braceOption,
            label: 'Brace',
            damageReduction: 1,
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
            id: 'impact',
            amount: actionProcedureParameterReference(damage),
            damageType: actionProcedureParameterReference(damageType),
            tags: ['weapon'],
          },
          {
            id: 'strain',
            amount: actionProcedureParameterReference(secondaryDamage),
            damageType:
              actionProcedureParameterReference(secondaryDamageType),
            tags: ['mental'],
          },
        ],
      },
    },
  ],
} as const;

export const tacticalStrikeProcedure = defineActionProcedureDefinition({
  id: 'procedure.tactical-strike',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'tacticalStrikeProcedure' },
  presentation: { label: 'Tactical strike procedure' },
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
        profile: tacticalRolloverProfiles.TacticalTest,
        base: readStat('actor', tacticalRolloverValues.Precision),
        difficulty: {
          kind: 'targetDefense',
          defense: tacticalRolloverValues.Guard,
        },
      }),
      rollScope: 'perTarget',
      costs: [],
      program: {
        kind: 'atomic',
        body: {
          kind: 'onOutcome',
          branches: {
            hit: packet,
            surge: packet,
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

const weaponBinding = {
  id: 'weapon',
  requiredTags: ['weapon'],
  requiredTraits: ['tactical'],
  slotIds: ['hand.main'],
} as const;
const [
  damageParameter,
  damageTypeParameter,
  rangeParameter,
] = tacticalStrikeProcedure.parameters;

export const tacticalStrike = defineActionInvocationDefinition({
  id: 'action.tactical-strike',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'tacticalStrike' },
  presentation: {
    label: 'Tactical Strike',
    description:
      'Use a compatible equipped item for a graded two-part strike.',
    tags: ['attack', 'weapon'],
  },
  procedure: tacticalStrikeProcedure,
  binding: weaponBinding,
  arguments: {
    damage: equippedItemAttribute(damageParameter, {
      bindingId: weaponBinding.id,
      attributeId: 'damage',
    }),
    'damage-type': equippedItemAttribute(damageTypeParameter, {
      bindingId: weaponBinding.id,
      attributeId: 'damage-type',
    }),
    range: equippedItemAttribute(rangeParameter, {
      bindingId: weaponBinding.id,
      attributeId: 'range',
    }),
    'secondary-damage': constant(2),
    'secondary-damage-type': tacticalRolloverCatalogs.references.strain,
  },
});

export const tacticalMove = defineActionDefinition({
  id: 'action.tactical-move',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'tacticalMove' },
  action: action({
    id: actionId('action.tactical-move'),
    name: 'Reposition',
    sourcePath: `${sourceModule}#tacticalMove`,
    tags: ['movement'],
    targets: cells({ range: 5 }),
    check: noRoll(),
    program: onCheck({
      noRoll: moveToCell({ maximumDistance: 5, provokes: true }),
    }),
  }),
});

export const measuredEffect = defineEffectDefinition({
  id: 'effect.measured',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'measuredEffect' },
  presentation: {
    label: 'Measured',
    description: 'A short-lived improvement to the next tactical test.',
  },
  effect: {
    rankMinimum: 1,
    rankMaximum: 1,
    stackingId: 'measured',
    stacking: 'refresh',
    tenure: {
      kind: 'fixed',
      anchor: 'sourceTurnStart',
      count: 2,
    },
    contributions: [
      {
        id: 'measured-bonus',
        selector: tacticalRolloverSelectors.ContestTotal,
        stackingGroup: tacticalRolloverStackingGroups.Situational,
        value: { kind: 'constant', value: 2 },
        predicate: {
          kind: 'effectActive',
          subject: 'actor',
          definition: { definitionId: 'effect.measured' },
        },
      },
    ],
  },
});

export const takeMeasure = defineActionDefinition({
  id: 'action.take-measure',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'takeMeasure' },
  action: action({
    id: actionId('action.take-measure'),
    name: 'Take Measure',
    sourcePath: `${sourceModule}#takeMeasure`,
    tags: ['focus'],
    targets: ally({ range: 0 }),
    check: noRoll(),
    costs: [spend(tacticalRolloverCatalogs.references.focus, 1)],
    program: onCheck({
      noRoll: applyEffect({
        effect: definitionReference({ definitionId: measuredEffect.id }),
        rank: constant(1),
      }),
    }),
  }),
});

export const guardTest = defineActionDefinition({
  id: 'action.guard-test',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'guardTest' },
  action: action({
    id: actionId('action.guard-test'),
    name: 'Test Guard',
    sourcePath: `${sourceModule}#guardTest`,
    tags: ['test'],
    targets: hostile({ range: 4 }),
    check: scalarTest({
      profile: tacticalRolloverProfiles.TacticalTest,
      base: readStat('actor', tacticalRolloverValues.Precision),
      difficulty: {
        kind: 'targetDefense',
        defense: tacticalRolloverValues.Guard,
      },
    }),
    rollScope: 'perTarget',
    program: onOutcome({
      branches: {
        hit: applyEffect({
          effect: definitionReference({ definitionId: measuredEffect.id }),
          rank: constant(1),
        }),
        surge: applyEffect({
          effect: definitionReference({ definitionId: measuredEffect.id }),
          rank: constant(1),
        }),
      },
      default: heal({ amount: constant(0) }),
    }),
  }),
});

export const areaSweep = defineActionDefinition({
  id: 'action.area-sweep',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'areaSweep' },
  action: action({
    id: actionId('action.area-sweep'),
    name: 'Pressure Sweep',
    sourcePath: `${sourceModule}#areaSweep`,
    tags: ['area'],
    targets: diamondArea({
      range: 4,
      radius: 1,
      team: 'hostile',
      minimumTargets: 1,
      maximumTargets: 4,
    }),
    check: noRoll(),
    program: forEachTarget(
      4,
      onCheck({
        noRoll: applyDamage({
          parts: [{
            id: 'strain',
            amount: constant(1),
            type: tacticalRolloverCatalogs.references.strain,
            tags: ['area'],
          }],
        }),
      }),
    ),
  }),
});

export const flankingDiscipline = defineCharacterFeatureDefinition({
  id: 'feature.flanking-discipline',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'flankingDiscipline' },
  presentation: {
    label: 'Flanking Discipline',
    description: 'Gain a tactical-test bonus while flanking the target.',
  },
  characterFeature: {
    contributions: [
      {
        id: 'flanking-bonus',
        selector: tacticalRolloverSelectors.ContestTotal,
        stackingGroup: tacticalRolloverStackingGroups.Situational,
        value: { kind: 'constant', value: 2 },
        predicate: { kind: 'actorFlanksTarget' },
      },
    ],
  },
});

export const impactWard = defineCharacterFeatureDefinition({
  id: 'feature.impact-ward',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'impactWard' },
  presentation: {
    label: 'Impact Ward',
    description: 'Reduce weapon-tagged impact damage unless it is precise.',
  },
  characterFeature: {
    damageResponses: [
      {
        id: 'impact-reduction',
        damageType: tacticalRolloverCatalogs.references.impact,
        requiredTags: ['weapon'],
        bypassTags: ['precise'],
        effect: { kind: 'flat', value: -2 },
      },
    ],
  },
});

export const tacticianClass = defineCharacterClassDefinition({
  id: 'class.tactician',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'tacticianClass' },
  presentation: { label: 'Tactician' },
  characterClass: {
    featureDefinitions: [
      definitionReference({ definitionId: flankingDiscipline.id }),
    ],
  },
});

export const responderClass = defineCharacterClassDefinition({
  id: 'class.responder',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'responderClass' },
  presentation: { label: 'Responder' },
  characterClass: {
    featureDefinitions: [
      definitionReference({ definitionId: impactWard.id }),
    ],
  },
});

export const balancedBlade = tacticalWeapon({
  id: 'item.balanced-blade',
  label: 'Balanced Blade',
  sides: 8,
});

export const compactHammer = tacticalWeapon({
  id: 'item.compact-hammer',
  label: 'Compact Hammer',
  sides: 6,
});

const commonActions = [
  areaSweep.id,
  guardTest.id,
  tacticalMove.id,
  tacticalStrike.id,
  takeMeasure.id,
];

export const tacticianProfileData = profileData({
  role: 'player',
  actions: commonActions,
  classDefinition: tacticianClass.id,
  features: [flankingDiscipline.id],
  item: balancedBlade,
  itemInstanceId: 'tactician-blade',
  precision: 5,
  guard: 14,
  vitality: 18,
  focus: 2,
  reserve: 1,
});

export const allyProfileData = profileData({
  role: 'player',
  actions: [tacticalMove.id],
  precision: 2,
  guard: 12,
  vitality: 12,
  focus: 1,
  reserve: 1,
});

export const wardedProfileData = profileData({
  role: 'creature',
  actions: commonActions,
  classDefinition: responderClass.id,
  features: [impactWard.id],
  item: compactHammer,
  itemInstanceId: 'warded-hammer',
  precision: 3,
  guard: 13,
  vitality: 16,
  focus: 1,
  reserve: 2,
});

export const scoutProfileData = profileData({
  role: 'creature',
  actions: [tacticalMove.id],
  precision: 4,
  guard: 11,
  vitality: 10,
  focus: 1,
  reserve: 1,
});

export const tacticianProfile = profileDefinition(
  'profile.tactician',
  'tactician',
  'Tactician',
  tacticianProfileData,
);
export const allyProfile = profileDefinition(
  'profile.ally',
  'ally',
  'Ally',
  allyProfileData,
);
export const wardedProfile = profileDefinition(
  'profile.warded',
  'warded',
  'Warded Rival',
  wardedProfileData,
);
export const scoutProfile = profileDefinition(
  'profile.scout',
  'scout',
  'Rival Scout',
  scoutProfileData,
);

export const tacticalRolloverContentPack = defineContentPack({
  identity: { id: packageId, version: '1.0.0' },
  entry: { module: sourceModule, declaration: 'tacticalRolloverContentPack' },
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
    ...tacticalRolloverCatalogs.definitions,
    tacticalStrikeProcedure,
    tacticalStrike,
    tacticalMove,
    takeMeasure,
    guardTest,
    areaSweep,
    measuredEffect,
    flankingDiscipline,
    impactWard,
    tacticianClass,
    responderClass,
    balancedBlade,
    compactHammer,
    tacticianProfile,
    allyProfile,
    wardedProfile,
    scoutProfile,
  ],
});

export const tacticalRolloverContentSource = contentPackSource(
  tacticalRolloverContentPack,
);

function tacticalWeapon(input: {
  readonly id: string;
  readonly label: string;
  readonly sides: number;
}): ContentItemDefinition {
  return defineItemDefinition({
    id: input.id,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: { module: sourceModule, declaration: input.id },
    presentation: { label: input.label, tags: ['item', 'weapon'] },
    item: {
      tags: ['weapon'],
      traits: ['tactical'],
      allowedSlots: ['hand.main'],
      attributes: [
        itemDiceAttribute({ id: 'damage', count: 1, sides: input.sides }),
        itemCatalogReferenceAttribute(
          'damage-type',
          tacticalRolloverCatalogs.references.impact,
        ),
        itemBoundedIntegerAttribute({
          id: 'range',
          value: 1,
          minimum: 1,
          maximum: 12,
        }),
      ],
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
  readonly precision: number;
  readonly guard: number;
  readonly vitality: number;
  readonly focus: number;
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
      participantProfileStat(
        tacticalRolloverValues.Precision,
        input.precision,
      ),
      participantProfileDefense(tacticalRolloverValues.Guard, input.guard),
      participantProfileResource(
        tacticalRolloverCatalogs.references.focus,
        { current: input.focus, max: input.focus },
      ),
      participantProfileResource(
        tacticalRolloverCatalogs.references.reserve,
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
