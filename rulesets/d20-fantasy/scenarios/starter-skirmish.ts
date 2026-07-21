import {
  defineScenarioTemplate,
  instantiateScenarioTemplate,
} from '@asha-rpg/authoring';
import type {
  ContentParticipantProfileData,
  Scenario,
  ScenarioTemplate,
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
import { d20FantasyStarterPlayBundle } from '../play-bundles/starter.js';

export const frontlineDuelScenarioTemplate = scenarioTemplate(
  'asha.d20-fantasy.scenario.frontline-duel',
  'Frontline Duel',
  'A focused Fighter and Goblin duel for melee checks, damage, reactions, healing, and conditions.',
  5,
  3,
  [
    participant(
      'fighter',
      'Fighter',
      'heroes',
      1,
      1,
      fighterProfile.id,
      fighterProfileData,
    ),
    participant(
      'goblin',
      'Goblin Warrior',
      'monsters',
      2,
      1,
      goblinProfile.id,
      goblinProfileData,
    ),
  ],
  ['fighter', 'goblin'],
);

export const starterSkirmishScenarioTemplate = scenarioTemplate(
  'asha.d20-fantasy.scenario.starter-skirmish',
  'Starter Skirmish',
  'Fighter and Wizard face a Goblin Warrior and Skeleton with room for melee and ranged actions.',
  7,
  5,
  [
    participant(
      'fighter',
      'Fighter',
      'heroes',
      2,
      2,
      fighterProfile.id,
      fighterProfileData,
    ),
    participant(
      'wizard',
      'Wizard',
      'heroes',
      1,
      3,
      wizardProfile.id,
      wizardProfileData,
    ),
    participant(
      'goblin',
      'Goblin Warrior',
      'monsters',
      3,
      2,
      goblinProfile.id,
      goblinProfileData,
    ),
    participant(
      'skeleton',
      'Skeleton',
      'monsters',
      2,
      3,
      skeletonProfile.id,
      skeletonProfileData,
    ),
  ],
  ['skeleton', 'fighter', 'wizard', 'goblin'],
);

export function starterSkirmishScenario(playBundleId: string): Scenario {
  return instantiateScenarioTemplate(
    starterSkirmishScenarioTemplate,
    playBundleId,
  );
}

function scenarioTemplate(
  id: string,
  label: string,
  description: string,
  width: number,
  height: number,
  participants: ScenarioTemplate['participants'],
  initiativeOrder: readonly string[],
): ScenarioTemplate {
  return defineScenarioTemplate({
    identity: { id, version: '1.0.0' },
    playBundle: d20FantasyStarterPlayBundle.identity,
    presentation: { label, description },
    board: { width, height, cells: [] },
    participants,
    turn: {
      initiativeOrder,
      currentActorId: initiativeOrder[0] ?? '',
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
    definitionIds: [
      profileDefinitionId,
      ...profile.definitionReferences.map((reference) => reference.definitionId),
    ],
    capabilities: profile.capabilities,
  };
}
