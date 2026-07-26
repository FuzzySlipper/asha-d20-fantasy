import {
  defineScenarioTemplate,
  instantiateScenarioTemplate,
} from '@asha-rpg/authoring';
import type {
  ContentParticipantProfileData,
  Scenario,
} from '@asha-rpg/authoring';

import {
  operatorProfile,
  operatorProfileData,
  readerProfile,
  readerProfileData,
} from '../content-packs/multi-axis-pool/src/content-pack.js';
import {
  multiAxisPoolPlayBundle,
} from '../play-bundles/multi-axis-pool.js';

export const multiAxisPoolScenarioTemplate = defineScenarioTemplate({
  identity: {
    id: 'asha.clean-room.multi-axis-pool.scenario',
    version: '1.0.0',
  },
  playBundle: multiAxisPoolPlayBundle.identity,
  presentation: {
    label: 'Signal Crossing',
    description:
      'Two equipped participants begin in range for source-aware pool resolution.',
  },
  board: {
    width: 4,
    height: 3,
    cells: boardCells(4, 3),
  },
  participants: [
    participant(
      'reader',
      'Reader',
      'blue',
      1,
      1,
      readerProfile.id,
      readerProfileData,
    ),
    participant(
      'operator',
      'Operator',
      'red',
      2,
      1,
      operatorProfile.id,
      operatorProfileData,
    ),
  ],
  turn: {
    initiativeOrder: ['reader', 'operator'],
    currentActorId: 'reader',
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

export function multiAxisPoolScenario(playBundleId: string): Scenario {
  return instantiateScenarioTemplate(
    multiAxisPoolScenarioTemplate,
    playBundleId,
  );
}

function boardCells(width: number, height: number) {
  return Array.from({ length: width * height }, (_unused, index) => ({
    id: `cell-${index % width}-${Math.floor(index / width)}`,
    position: {
      x: index % width,
      y: Math.floor(index / width),
    },
    capabilities: [],
  }));
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
