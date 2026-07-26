import {
  defineScenarioTemplate,
  instantiateScenarioTemplate,
} from '@asha-rpg/authoring';
import type {
  ContentParticipantProfileData,
  Scenario,
} from '@asha-rpg/authoring';

import {
  dustRunnerProfile,
  dustRunnerProfileData,
  fieldAdeptProfile,
  fieldAdeptProfileData,
  fieldShaperProfile,
  fieldShaperProfileData,
  heavyGuardProfile,
  heavyGuardProfileData,
  lineSentryProfile,
  lineSentryProfileData,
  pathfinderProfile,
  pathfinderProfileData,
  signalGuideProfile,
  signalGuideProfileData,
  wardAnchorProfile,
  wardAnchorProfileData,
} from '../content-packs/crosswind-outpost/src/profiles.js';
import {
  crosswindOutpostPlayBundle,
} from '../play-bundles/crosswind-outpost.js';

export const crosswindOutpostScenarioTemplate = defineScenarioTemplate({
  identity: {
    id: 'asha.clean-room.crosswind-outpost.scenario',
    version: '1.0.0',
  },
  playBundle: crosswindOutpostPlayBundle.identity,
  presentation: {
    label: 'Crosswind Outpost',
    description:
      'Two original tactical teams begin near a contested center with all subsequent choices left to the players.',
  },
  board: {
    width: 8,
    height: 6,
    cells: boardCells(8, 6),
  },
  participants: [
    participant(
      'anchor',
      'Ward Anchor',
      'blue',
      2,
      3,
      wardAnchorProfile.id,
      wardAnchorProfileData,
    ),
    participant(
      'pathfinder',
      'Pathfinder',
      'blue',
      4,
      3,
      pathfinderProfile.id,
      pathfinderProfileData,
    ),
    participant(
      'guide',
      'Signal Guide',
      'blue',
      1,
      4,
      signalGuideProfile.id,
      signalGuideProfileData,
    ),
    participant(
      'shaper',
      'Field Shaper',
      'blue',
      1,
      1,
      fieldShaperProfile.id,
      fieldShaperProfileData,
    ),
    participant(
      'sentry',
      'Line Sentry',
      'red',
      3,
      3,
      lineSentryProfile.id,
      lineSentryProfileData,
    ),
    participant(
      'runner',
      'Dust Runner',
      'red',
      2,
      2,
      dustRunnerProfile.id,
      dustRunnerProfileData,
    ),
    participant(
      'adept',
      'Field Adept',
      'red',
      6,
      2,
      fieldAdeptProfile.id,
      fieldAdeptProfileData,
    ),
    participant(
      'guard',
      'Heavy Guard',
      'red',
      6,
      4,
      heavyGuardProfile.id,
      heavyGuardProfileData,
    ),
  ],
  turn: {
    initiativeOrder: [
      'anchor',
      'sentry',
      'pathfinder',
      'runner',
      'guide',
      'adept',
      'shaper',
      'guard',
    ],
    currentActorId: 'anchor',
    round: 1,
    turn: 1,
  },
  randomSource: {
    policyId: 'random.automatic',
    policyVersion: 1,
    sourceId: 'random.system',
    sourceVersion: 1,
  },
});

export function crosswindOutpostScenario(
  playBundleId: string,
): Scenario {
  return instantiateScenarioTemplate(
    crosswindOutpostScenarioTemplate,
    playBundleId,
  );
}

function boardCells(width: number, height: number) {
  return Array.from({ length: width * height }, (_unused, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    return {
      id: `cell-${x}-${y}`,
      position: { x, y },
      capabilities: [],
    };
  });
}

function participant(
  id: string,
  label: string,
  teamId: string,
  x: number,
  y: number,
  profileDefinitionId: string,
  profile: ContentParticipantProfileData,
) {
  return {
    id,
    label,
    teamId,
    position: { x, y },
    definitionIds: [
      profileDefinitionId,
      ...profile.definitionReferences.map((reference) =>
        reference.definitionId
      ),
    ],
    ...(profile.classDefinition === null
      ? {}
      : { classDefinitionId: profile.classDefinition.definitionId }),
    ...(profile.featureDefinitions.length === 0
      ? {}
      : {
          featureDefinitionIds: profile.featureDefinitions.map(
            (reference) => reference.definitionId,
          ),
        }),
    items: profile.items.map((profileItem) => ({
      id: profileItem.id,
      definitionId: profileItem.definition.definitionId,
    })),
    equipment: profile.equipment,
    capabilities: profile.capabilities,
  };
}
