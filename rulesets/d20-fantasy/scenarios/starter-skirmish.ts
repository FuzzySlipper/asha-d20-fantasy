import { defineScenario } from '@asha-rpg/authoring';
import type {
  ContentParticipantProfileData,
  Scenario,
} from '@asha-rpg/authoring';

import {
  fighterProfile,
  fighterProfileData,
  goblinProfile,
  goblinProfileData,
  skeletonProfile,
  skeletonProfileData,
  wizardProfile,
  wizardProfileData,
} from '../content-packs/starter/src/profiles.js';

export function starterSkirmishScenario(playBundleId: string): Scenario {
  return defineScenario({
    playBundleId,
    board: {
      width: 7,
      height: 5,
      cells: [],
    },
    participants: [
      participant('fighter', 'Fighter', 'heroes', 2, 2, fighterProfile.id, fighterProfileData),
      participant('wizard', 'Wizard', 'heroes', 1, 3, wizardProfile.id, wizardProfileData),
      participant('goblin', 'Goblin Warrior', 'monsters', 3, 2, goblinProfile.id, goblinProfileData),
      participant('skeleton', 'Skeleton', 'monsters', 2, 3, skeletonProfile.id, skeletonProfileData),
    ],
    turn: {
      initiativeOrder: ['skeleton', 'fighter', 'wizard', 'goblin'],
      currentActorId: 'skeleton',
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
    definitionIds: [profileDefinitionId, ...profile.definitionIds],
    capabilities: profile.capabilities,
  };
}
