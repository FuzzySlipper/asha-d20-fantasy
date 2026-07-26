import {
  defineScenarioTemplate,
  instantiateScenarioTemplate,
} from '@asha-rpg/authoring';
import type {
  ContentParticipantProfileData,
  Scenario,
} from '@asha-rpg/authoring';

import {
  allyProfile,
  allyProfileData,
  scoutProfile,
  scoutProfileData,
  tacticianProfile,
  tacticianProfileData,
  wardedProfile,
  wardedProfileData,
} from '../content-packs/tactical-rollover/src/content-pack.js';
import {
  tacticalRolloverPlayBundle,
} from '../play-bundles/tactical-rollover.js';

export const tacticalRolloverScenarioTemplate = defineScenarioTemplate({
  identity: {
    id: 'asha.clean-room.tactical-rollover.scenario',
    version: '1.0.0',
  },
  playBundle: tacticalRolloverPlayBundle.identity,
  presentation: {
    label: 'Measured Crossing',
    description:
      'Two small teams begin in a position that exposes flanking, area selection, movement, graded tests, and qualified damage.',
  },
  board: {
    width: 6,
    height: 4,
    cells: boardCells(6, 4),
  },
  participants: [
    participant(
      'tactician',
      'Tactician',
      'blue',
      1,
      1,
      tacticianProfile.id,
      tacticianProfileData,
    ),
    participant(
      'ally',
      'Ally',
      'blue',
      3,
      1,
      allyProfile.id,
      allyProfileData,
    ),
    participant(
      'warded',
      'Warded Rival',
      'red',
      2,
      1,
      wardedProfile.id,
      wardedProfileData,
    ),
    participant(
      'scout',
      'Rival Scout',
      'red',
      2,
      2,
      scoutProfile.id,
      scoutProfileData,
    ),
  ],
  turn: {
    initiativeOrder: ['tactician', 'warded', 'ally', 'scout'],
    currentActorId: 'tactician',
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

export function tacticalRolloverScenario(playBundleId: string): Scenario {
  return instantiateScenarioTemplate(
    tacticalRolloverScenarioTemplate,
    playBundleId,
  );
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
