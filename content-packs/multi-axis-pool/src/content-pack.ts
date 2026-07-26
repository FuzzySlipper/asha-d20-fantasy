import {
  action,
  actionId,
  actionProcedureParameterReference,
  applyEffect,
  contentPackSource,
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
  equippedItemAttribute,
  heterogeneousPool,
  hostile,
  itemBoundedIntegerAttribute,
  noRoll,
  onCheck,
  participantProfileResource,
  participantProfileVitality,
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
  multiAxisPoolProfiles,
  multiAxisPoolStackingGroups,
} from '../../../rulesets/multi-axis-pool/src/ruleset.js';

const packageId = 'asha.clean-room.multi-axis-pool.content';
const sourceModule =
  'content-packs/multi-axis-pool/src/content-pack.ts';

export const multiAxisPoolCatalogs = defineContentCatalog({
  packageId,
  sourceModule,
  entries: {
    charge: {
      definitionId: 'charge',
      category: 'resource',
      id: 'charge',
      label: 'Charge',
    },
    reserve: {
      definitionId: 'reserve',
      category: 'resource',
      id: 'reserve',
      label: 'Reserve',
    },
  },
});

const range = {
  id: 'range',
  type: 'boundedInteger',
  minimum: 1,
  maximum: 8,
} as const;

export const trailingSignal = defineEffectDefinition({
  id: 'effect.trailing-signal',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'trailingSignal' },
  presentation: {
    label: 'Trailing Signal',
    description:
      'A short authority-owned source that alters the target’s next pool.',
  },
  effect: {
    rankMinimum: 1,
    rankMaximum: 1,
    stackingId: 'trailing-signal',
    stacking: 'refresh',
    tenure: {
      kind: 'fixed',
      anchor: 'targetTurnStart',
      count: 2,
    },
    poolContributions: [
      {
        id: 'effect-add-signal',
        profile: multiAxisPoolProfiles.SignalCrossing,
        stackingGroup: multiAxisPoolStackingGroups.PoolSum,
        effect: { kind: 'addDice', dieTypeId: 'signal', delta: 1 },
        predicate: { kind: 'always' },
      },
      {
        id: 'effect-add-echo',
        profile: multiAxisPoolProfiles.SignalCrossing,
        stackingGroup: multiAxisPoolStackingGroups.PoolSum,
        effect: { kind: 'addAxis', axisId: 'echo', value: 1 },
        predicate: { kind: 'always' },
      },
    ],
  },
});

export const primeTrailingSignal = defineActionDefinition({
  id: 'action.prime-trailing-signal',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'primeTrailingSignal' },
  action: action({
    id: actionId('action.prime-trailing-signal'),
    name: 'Prime Trailing Signal',
    sourcePath: `${sourceModule}#primeTrailingSignal`,
    tags: ['effect', 'preparation'],
    targets: hostile({ range: 3 }),
    check: noRoll(),
    program: onCheck({
      noRoll: applyEffect({
        effect: definitionReference({ definitionId: trailingSignal.id }),
        rank: { kind: 'constant', value: 1 },
      }),
    }),
  }),
});

export const signalCrossingProcedure = defineActionProcedureDefinition({
  id: 'procedure.signal-crossing',
  ownerPackageId: packageId,
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'signalCrossingProcedure' },
  presentation: { label: 'Signal crossing procedure' },
  parameters: [range] as const,
  implementation: {
    kind: 'inline',
    template: {
      targets: {
        kind: 'participant',
        team: 'hostile',
        maximumRange: actionProcedureParameterReference(range),
        maximumTargets: 1,
      },
      check: heterogeneousPool({
        profile: multiAxisPoolProfiles.SignalCrossing,
        baseDice: [
          { dieTypeId: 'drag', count: 1 },
          { dieTypeId: 'signal', count: 1 },
        ],
        automaticAxes: [],
      }),
      rollScope: 'shared',
      costs: [spend(multiAxisPoolCatalogs.references.charge, 1)],
      program: {
        kind: 'atomic',
        body: {
          kind: 'onOutcome',
          branches: {
            progress: {
              kind: 'operation',
              operation: {
                kind: 'heal',
                amount: { kind: 'constant', value: 0 },
              },
            },
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

const instrumentBinding = {
  id: 'instrument',
  requiredTags: ['instrument'],
  requiredTraits: ['aligned'],
  slotIds: ['hand.main'],
} as const;
const [rangeParameter] = signalCrossingProcedure.parameters;

export const signalCrossing = defineActionInvocationDefinition({
  id: 'action.signal-crossing',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'signalCrossing' },
  presentation: {
    label: 'Cross Signals',
    description:
      'Spend one charge and resolve an item-bound multi-axis pool.',
    tags: ['instrument', 'pool'],
  },
  procedure: signalCrossingProcedure,
  binding: instrumentBinding,
  arguments: {
    range: equippedItemAttribute(rangeParameter, {
      bindingId: instrumentBinding.id,
      attributeId: 'range',
    }),
  },
});

export const patternReader = defineCharacterFeatureDefinition({
  id: 'feature.pattern-reader',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'patternReader' },
  presentation: {
    label: 'Pattern Reader',
    description:
      'Adds actor-owned dice and axes when the exact bound item qualifies.',
  },
  characterFeature: {
    poolContributions: [
      {
        id: 'actor-add-focus',
        profile: multiAxisPoolProfiles.SignalCrossing,
        stackingGroup: multiAxisPoolStackingGroups.PoolSum,
        effect: { kind: 'addDice', dieTypeId: 'focus', delta: 1 },
        predicate: { kind: 'boundItemTag', tag: 'tuned' },
      },
      {
        id: 'actor-add-benefit',
        profile: multiAxisPoolProfiles.SignalCrossing,
        stackingGroup: multiAxisPoolStackingGroups.PoolPeak,
        effect: { kind: 'addAxis', axisId: 'benefit', value: 2 },
        predicate: { kind: 'always' },
      },
      {
        id: 'actor-inapplicable-drag',
        profile: multiAxisPoolProfiles.SignalCrossing,
        stackingGroup: multiAxisPoolStackingGroups.PoolSum,
        effect: { kind: 'addDice', dieTypeId: 'drag', delta: 1 },
        predicate: { kind: 'boundItemTag', tag: 'alternate' },
      },
      {
        id: 'actor-suppressed-benefit',
        profile: multiAxisPoolProfiles.SignalCrossing,
        stackingGroup: multiAxisPoolStackingGroups.PoolPeak,
        effect: { kind: 'addAxis', axisId: 'benefit', value: 1 },
        predicate: { kind: 'always' },
      },
    ],
  },
});

export const readerClass = defineCharacterClassDefinition({
  id: 'class.pattern-reader',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'readerClass' },
  presentation: { label: 'Pattern Reader' },
  characterClass: {
    featureDefinitions: [
      definitionReference({ definitionId: patternReader.id }),
    ],
  },
});

export const tunedInstrument = instrument(
  'item.tuned-instrument',
  'Tuned Instrument',
);

export const plainInstrument = instrument(
  'item.plain-instrument',
  'Plain Instrument',
);

const readerActions = [primeTrailingSignal.id, signalCrossing.id];
const operatorActions = [signalCrossing.id];

export const readerProfileData = profileData({
  role: 'player',
  actions: readerActions,
  classDefinition: readerClass.id,
  features: [patternReader.id],
  item: tunedInstrument,
  itemInstanceId: 'reader-instrument',
  vitality: 12,
  charge: 2,
  reserve: 3,
});

export const operatorProfileData = profileData({
  role: 'creature',
  actions: operatorActions,
  item: plainInstrument,
  itemInstanceId: 'operator-instrument',
  vitality: 12,
  charge: 2,
  reserve: 3,
});

export const readerProfile = profileDefinition(
  'profile.pattern-reader',
  'pattern-reader',
  'Pattern Reader',
  readerProfileData,
);

export const operatorProfile = profileDefinition(
  'profile.signal-operator',
  'signal-operator',
  'Signal Operator',
  operatorProfileData,
);

export const multiAxisPoolContentPack = defineContentPack({
  identity: { id: packageId, version: '1.0.0' },
  entry: { module: sourceModule, declaration: 'multiAxisPoolContentPack' },
  requirements: {
    operations: [
      {
        id: 'operation.applyEffect',
        version: RPG_OPERATION_VERSIONS['operation.applyEffect'],
      },
      {
        id: 'operation.heal',
        version: RPG_OPERATION_VERSIONS['operation.heal'],
      },
    ],
    capabilities: [
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
        id: 'capability.resources',
        version: RPG_CAPABILITY_VERSIONS['capability.resources'],
      },
      {
        id: 'capability.vitality',
        version: RPG_CAPABILITY_VERSIONS['capability.vitality'],
      },
    ],
  },
  definitions: [
    ...multiAxisPoolCatalogs.definitions,
    trailingSignal,
    primeTrailingSignal,
    signalCrossingProcedure,
    signalCrossing,
    patternReader,
    readerClass,
    tunedInstrument,
    plainInstrument,
    readerProfile,
    operatorProfile,
  ],
});

export const multiAxisPoolContentSource = contentPackSource(
  multiAxisPoolContentPack,
);

function instrument(id: string, label: string): ContentItemDefinition {
  return defineItemDefinition({
    id,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: { module: sourceModule, declaration: id },
    presentation: { label, tags: ['instrument', 'item'] },
    item: {
      tags: id === 'item.tuned-instrument'
        ? ['instrument', 'tuned']
        : ['instrument', 'alternate'],
      traits: ['aligned'],
      allowedSlots: ['hand.main'],
      attributes: [
        itemBoundedIntegerAttribute({
          id: 'range',
          value: 3,
          minimum: 1,
          maximum: 8,
        }),
      ],
      poolContributions: [
        {
          id: 'item-replace-focus',
          profile: multiAxisPoolProfiles.SignalCrossing,
          stackingGroup: multiAxisPoolStackingGroups.PoolSum,
          effect: {
            kind: 'replaceOrAddDie',
            fromDieTypeId: 'focus',
            toDieTypeId: 'signal',
            count: 1,
            fallbackDieTypeId: 'drag',
          },
          predicate: { kind: 'always' },
        },
        {
          id: 'item-add-complication',
          profile: multiAxisPoolProfiles.SignalCrossing,
          stackingGroup: multiAxisPoolStackingGroups.PoolSum,
          effect: {
            kind: 'addAxis',
            axisId: 'complication',
            value: 1,
          },
          predicate: { kind: 'always' },
        },
      ],
    },
  });
}

function profileData(input: {
  readonly role: 'player' | 'creature';
  readonly actions: readonly string[];
  readonly classDefinition?: string;
  readonly features?: readonly string[];
  readonly item: ContentItemDefinition;
  readonly itemInstanceId: string;
  readonly vitality: number;
  readonly charge: number;
  readonly reserve: number;
}): ContentParticipantProfileData {
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
    items: [{
      id: input.itemInstanceId,
      definition: definitionReference({ definitionId: input.item.id }),
    }],
    equipment: [{
      slotId: 'hand.main',
      itemInstanceId: input.itemInstanceId,
    }],
    capabilities: [
      participantProfileVitality({
        current: input.vitality,
        max: input.vitality,
      }),
      participantProfileResource(
        multiAxisPoolCatalogs.references.charge,
        { current: input.charge, max: input.charge },
      ),
      participantProfileResource(
        multiAxisPoolCatalogs.references.reserve,
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
