import {
  defineParticipantProfileData,
  defineParticipantProfileDefinition,
  definitionReference,
  participantProfileDefense,
  participantProfileResource,
  participantProfileStat,
  participantProfileVitality,
} from '@asha-rpg/authoring';
import type {
  ContentItemDefinition,
  ContentParticipantProfileCapability,
  ContentParticipantProfileData,
} from '@asha-rpg/authoring';

import {
  ruleweaverTacticsValues,
} from '../../../rulesets/ruleweaver-tactics/src/ruleset.js';
import {
  fieldBow,
  trainingBlade,
} from '../../ruleweaver-foundation/src/items.js';
import {
  coordinatedPressureTalent,
  watchfulResponseTalent,
} from '../../ruleweaver-foundation/src/talents.js';
import {
  ruleweaverFoundationCatalogs,
} from '../../ruleweaver-foundation/src/catalogs.js';
import {
  closeQuartersDiscipline,
  fieldShaperClass,
  measuredOpening,
  pathfinderClass,
  signalGuideClass,
  wardAnchorClass,
} from './classes.js';
import {
  bastionShield,
  layeredCoat,
  resonanceRod,
  signalBaton,
} from './items.js';

const sourceModule = 'content-packs/crosswind-outpost/src/profiles.ts';

const actions = Object.freeze({
  Strike: 'action.basic-tactical-strike',
  Heal: 'action.focused-recovery',
  Held: 'action.impose-held',
  LeaveResponse: 'action.leave-adjacency-response',
  Move: 'action.tactical-move',
  PressureField: 'action.raise-pressure-field',
  Push: 'action.tactical-push',
  Slide: 'action.tactical-slide',
  Sweep: 'action.crosswind-sweep',
  Unsettled: 'action.impose-unsettled',
});

const foundationDefinitionIds = new Set([
  actions.Strike,
  actions.Heal,
  actions.Held,
  actions.LeaveResponse,
  actions.Move,
  actions.PressureField,
  actions.Push,
  actions.Slide,
  actions.Unsettled,
  coordinatedPressureTalent.id,
  watchfulResponseTalent.id,
]);

export const wardAnchorProfileData = profileData({
  role: 'player',
  classDefinitionId: wardAnchorClass.id,
  featureDefinitionIds: [
    closeQuartersDiscipline.id,
    watchfulResponseTalent.id,
  ],
  actionIds: [
    actions.Strike,
    actions.Move,
    actions.Held,
    actions.LeaveResponse,
  ],
  items: [
    foundationItem('anchor-blade', trainingBlade),
    item('anchor-shield', bastionShield),
    item('anchor-coat', layeredCoat),
  ],
  equipment: [
    { slotId: 'hand.main', itemInstanceId: 'anchor-blade' },
    { slotId: 'hand.off', itemInstanceId: 'anchor-shield' },
    { slotId: 'body', itemInstanceId: 'anchor-coat' },
  ],
  vitality: 18,
  focus: 2,
  stats: [5, 2, 2, 1, 4, 3],
  defenses: [17, 15, 11, 13],
});

export const pathfinderProfileData = profileData({
  role: 'player',
  classDefinitionId: pathfinderClass.id,
  featureDefinitionIds: [
    coordinatedPressureTalent.id,
    measuredOpening.id,
  ],
  actionIds: [actions.Strike, actions.Move, actions.Slide, actions.Unsettled],
  items: [
    foundationItem('pathfinder-bow', fieldBow),
    foundationItem('pathfinder-blade', trainingBlade),
    item('pathfinder-coat', layeredCoat),
  ],
  equipment: [
    { slotId: 'hand.main', itemInstanceId: 'pathfinder-bow' },
    { slotId: 'weapon.backup', itemInstanceId: 'pathfinder-blade' },
    { slotId: 'body', itemInstanceId: 'pathfinder-coat' },
  ],
  vitality: 13,
  focus: 2,
  stats: [2, 5, 4, 2, 2, 3],
  defenses: [14, 12, 15, 12],
});

export const signalGuideProfileData = profileData({
  role: 'player',
  classDefinitionId: signalGuideClass.id,
  featureDefinitionIds: [
    measuredOpening.id,
    watchfulResponseTalent.id,
  ],
  actionIds: [
    actions.Strike,
    actions.Move,
    actions.Heal,
    actions.LeaveResponse,
  ],
  items: [
    item('guide-baton', signalBaton),
    item('guide-shield', bastionShield),
  ],
  equipment: [
    { slotId: 'hand.main', itemInstanceId: 'guide-baton' },
    { slotId: 'hand.off', itemInstanceId: 'guide-shield' },
  ],
  vitality: 15,
  focus: 4,
  stats: [2, 2, 3, 3, 5, 4],
  defenses: [15, 13, 13, 15],
});

export const fieldShaperProfileData = profileData({
  role: 'player',
  classDefinitionId: fieldShaperClass.id,
  featureDefinitionIds: [
    closeQuartersDiscipline.id,
    coordinatedPressureTalent.id,
  ],
  actionIds: [
    actions.Strike,
    actions.Sweep,
    actions.Unsettled,
    actions.PressureField,
  ],
  items: [
    item('shaper-rod', resonanceRod),
    item('shaper-coat', layeredCoat),
  ],
  equipment: [
    { slotId: 'hand.main', itemInstanceId: 'shaper-rod' },
    { slotId: 'body', itemInstanceId: 'shaper-coat' },
  ],
  vitality: 11,
  focus: 5,
  stats: [1, 3, 3, 5, 2, 4],
  defenses: [12, 12, 15, 14],
});

export const lineSentryProfileData = adversaryProfile({
  actionIds: [actions.Strike, actions.Move, actions.Push],
  itemId: 'sentry-blade',
  itemDefinition: trainingBlade,
  vitality: 12,
  stats: [4, 2, 2, 1, 2, 2],
  defenses: [15, 13, 11, 11],
});

export const dustRunnerProfileData = adversaryProfile({
  actionIds: [actions.Strike, actions.Move, actions.Slide],
  itemId: 'runner-bow',
  itemDefinition: fieldBow,
  vitality: 9,
  stats: [2, 4, 3, 1, 2, 2],
  defenses: [12, 11, 14, 11],
});

export const fieldAdeptProfileData = adversaryProfile({
  actionIds: [actions.Strike, actions.Unsettled, actions.PressureField],
  itemId: 'adept-rod',
  itemDefinition: resonanceRod,
  vitality: 10,
  focus: 3,
  stats: [1, 2, 2, 4, 3, 3],
  defenses: [11, 11, 14, 13],
});

export const heavyGuardProfileData = adversaryProfile({
  actionIds: [actions.Strike, actions.Move, actions.Held],
  itemId: 'guard-blade',
  itemDefinition: trainingBlade,
  vitality: 16,
  stats: [5, 1, 2, 1, 3, 2],
  defenses: [16, 15, 10, 12],
});

export const wardAnchorProfile = profileDefinition(
  'profile.ward-anchor',
  'ward-anchor',
  'Ward Anchor',
  'A front-line defender with control, forced movement, and a leave response.',
  wardAnchorProfileData,
);

export const pathfinderProfile = profileDefinition(
  'profile.pathfinder',
  'pathfinder',
  'Pathfinder',
  'A mobile striker with melee and ranged equipment choices.',
  pathfinderProfileData,
);

export const signalGuideProfile = profileDefinition(
  'profile.signal-guide',
  'signal-guide',
  'Signal Guide',
  'A support leader with healing and position-control choices.',
  signalGuideProfileData,
);

export const fieldShaperProfile = profileDefinition(
  'profile.field-shaper',
  'field-shaper',
  'Field Shaper',
  'An area controller with a persistent field and multi-target sweep.',
  fieldShaperProfileData,
);

export const lineSentryProfile = profileDefinition(
  'profile.line-sentry',
  'line-sentry',
  'Line Sentry',
  'A generic close-range adversary.',
  lineSentryProfileData,
);

export const dustRunnerProfile = profileDefinition(
  'profile.dust-runner',
  'dust-runner',
  'Dust Runner',
  'A generic mobile ranged adversary.',
  dustRunnerProfileData,
);

export const fieldAdeptProfile = profileDefinition(
  'profile.field-adept',
  'field-adept',
  'Field Adept',
  'A generic control-oriented adversary.',
  fieldAdeptProfileData,
);

export const heavyGuardProfile = profileDefinition(
  'profile.heavy-guard',
  'heavy-guard',
  'Heavy Guard',
  'A generic durable adversary.',
  heavyGuardProfileData,
);

export const crosswindOutpostProfiles = Object.freeze([
  dustRunnerProfile,
  fieldAdeptProfile,
  fieldShaperProfile,
  heavyGuardProfile,
  lineSentryProfile,
  pathfinderProfile,
  signalGuideProfile,
  wardAnchorProfile,
]);

function adversaryProfile(input: {
  readonly actionIds: readonly string[];
  readonly itemId: string;
  readonly itemDefinition: ContentItemDefinition;
  readonly vitality: number;
  readonly focus?: number;
  readonly stats: Scores;
  readonly defenses: Defenses;
}) {
  return profileData({
    role: 'creature',
    actionIds: input.actionIds,
    featureDefinitionIds: [],
    items: [
      input.itemDefinition.id === trainingBlade.id ||
      input.itemDefinition.id === fieldBow.id
        ? foundationItem(input.itemId, input.itemDefinition)
        : item(input.itemId, input.itemDefinition),
    ],
    equipment: [{
      slotId: 'hand.main',
      itemInstanceId: input.itemId,
    }],
    vitality: input.vitality,
    focus: input.focus ?? 1,
    stats: input.stats,
    defenses: input.defenses,
  });
}

type Scores = readonly [number, number, number, number, number, number];
type Defenses = readonly [number, number, number, number];

function profileData(input: {
  readonly role: 'player' | 'creature';
  readonly classDefinitionId?: string;
  readonly featureDefinitionIds: readonly string[];
  readonly actionIds: readonly string[];
  readonly items: readonly ReturnType<typeof item>[];
  readonly equipment: readonly {
    readonly slotId: string;
    readonly itemInstanceId: string;
  }[];
  readonly vitality: number;
  readonly focus: number;
  readonly stats: Scores;
  readonly defenses: Defenses;
}): ContentParticipantProfileData {
  return defineParticipantProfileData({
    role: input.role,
    classDefinition: input.classDefinitionId === undefined
      ? null
      : definitionReference({ definitionId: input.classDefinitionId }),
    featureDefinitions: input.featureDefinitionIds.map((definitionId) =>
      definitionReference({
        definitionId,
        ...(foundationDefinitionIds.has(definitionId)
          ? { importAs: 'foundation' }
          : {}),
      })
    ),
    definitionReferences: input.actionIds.map((definitionId) =>
      definitionReference({
        definitionId,
        ...(foundationDefinitionIds.has(definitionId)
          ? { importAs: 'foundation' }
          : {}),
      })
    ),
    items: input.items,
    equipment: input.equipment,
    capabilities: Object.freeze([
      participantProfileVitality({
        current: input.vitality,
        max: input.vitality,
      }),
      participantProfileResource(
        ruleweaverFoundationCatalogs.references.focus,
        { current: input.focus, max: input.focus },
      ),
      ...statCapabilities(input.stats),
      ...defenseCapabilities(input.defenses),
    ]),
  });
}

function statCapabilities(
  scores: Scores,
): readonly ContentParticipantProfileCapability[] {
  return [
    participantProfileStat(ruleweaverTacticsValues.Might, scores[0]),
    participantProfileStat(ruleweaverTacticsValues.Finesse, scores[1]),
    participantProfileStat(ruleweaverTacticsValues.Acuity, scores[2]),
    participantProfileStat(ruleweaverTacticsValues.Intellect, scores[3]),
    participantProfileStat(ruleweaverTacticsValues.Conviction, scores[4]),
    participantProfileStat(ruleweaverTacticsValues.Spirit, scores[5]),
  ];
}

function defenseCapabilities(
  defenses: Defenses,
): readonly ContentParticipantProfileCapability[] {
  return [
    participantProfileDefense(ruleweaverTacticsValues.Armor, defenses[0]),
    participantProfileDefense(ruleweaverTacticsValues.Grit, defenses[1]),
    participantProfileDefense(ruleweaverTacticsValues.Wits, defenses[2]),
    participantProfileDefense(ruleweaverTacticsValues.Nerve, defenses[3]),
  ];
}

function item(id: string, definition: ContentItemDefinition) {
  return {
    id,
    definition: definitionReference({ definitionId: definition.id }),
  };
}

function foundationItem(id: string, definition: ContentItemDefinition) {
  return {
    id,
    definition: definitionReference({
      definitionId: definition.id,
      importAs: 'foundation',
    }),
  };
}

function profileDefinition(
  id: string,
  profileId: string,
  label: string,
  description: string,
  profile: ContentParticipantProfileData,
) {
  return defineParticipantProfileDefinition({
    id,
    profileId,
    profile,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: { module: sourceModule, declaration: id },
    presentation: {
      label,
      description,
      tags: [profile.role, 'participant-profile'],
    },
  });
}
