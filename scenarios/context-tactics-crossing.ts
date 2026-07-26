import {
  defineScenarioTemplate,
  instantiateScenarioTemplate,
} from '@asha-rpg/authoring';
import type {
  ContentParticipantProfileData,
  Scenario,
} from '@asha-rpg/authoring';

import {
  coordinatorProfile,
  coordinatorProfileData,
  keeperProfile,
  keeperProfileData,
  overlookCell,
  partnerProfile,
  partnerProfileData,
  roverProfile,
  roverProfileData,
} from '../content-packs/context-tactics/src/content-pack.js';
import {
  contextTacticsPlayBundle,
} from '../play-bundles/context-tactics.js';

export const contextTacticsScenarioTemplate = defineScenarioTemplate({
  identity: {
    id: 'asha.clean-room.context-tactics.scenario',
    version: '1.0.0',
  },
  playBundle: contextTacticsPlayBundle.identity,
  presentation: {
    label: 'Overlook Crossing',
    description:
      'Two small teams begin around one declared terrain fact for contextual tests, activation choices, and area selection.',
  },
  board: {
    width: 5,
    height: 4,
    cells: boardCells(5, 4),
  },
  participants: [
    participant(
      'coordinator',
      'Coordinator',
      'blue',
      1,
      1,
      coordinatorProfile.id,
      coordinatorProfileData,
    ),
    participant(
      'partner',
      'Partner',
      'blue',
      3,
      1,
      partnerProfile.id,
      partnerProfileData,
    ),
    participant(
      'keeper',
      'Keeper',
      'red',
      2,
      1,
      keeperProfile.id,
      keeperProfileData,
    ),
    participant(
      'rover',
      'Rover',
      'red',
      2,
      2,
      roverProfile.id,
      roverProfileData,
    ),
  ],
  turn: {
    initiativeOrder: ['coordinator', 'keeper', 'partner', 'rover'],
    currentActorId: 'coordinator',
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

export function contextTacticsScenario(playBundleId: string): Scenario {
  return instantiateScenarioTemplate(
    contextTacticsScenarioTemplate,
    playBundleId,
  );
}

function boardCells(width: number, height: number) {
  return Array.from({ length: width * height }, (_unused, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const isOverlook = x === 1 && y === 1;
    return {
      id: `cell-${x}-${y}`,
      position: { x, y },
      capabilities: isOverlook
        ? [{
            id: 'overlook',
            version: 1,
            definitionId: overlookCell.id,
            value: { kind: 'flag' as const, value: true },
          }]
        : [],
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
      ...profile.definitionReferences.map((reference) => reference.definitionId),
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
    items: profile.items.map((item) => ({
      id: item.id,
      definitionId: item.definition.definitionId,
    })),
    equipment: profile.equipment,
    capabilities: profile.capabilities,
  };
}
