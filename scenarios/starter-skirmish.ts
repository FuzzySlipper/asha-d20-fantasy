import {
  defineScenarioTemplate,
  instantiateScenarioTemplate,
} from '@asha-rpg/authoring';
import type {
  ContentParticipantProfileData,
  Scenario,
  ScenarioTemplate,
} from '@asha-rpg/authoring';

// Scenario setup composes peer Content Pack and PlayBundle roots only.

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
  [{ x: 3, y: 3 }],
);

export const positionalTalentsScenarioTemplate = scenarioTemplate(
  'asha.d20-fantasy.scenario.positional-talents',
  'Positional Talents',
  'A Fighter begins between two hostiles while a Wizard completes a flank across the Goblin.',
  5,
  4,
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
      'wizard',
      'Wizard',
      'heroes',
      3,
      1,
      wizardProfile.id,
      wizardProfileData,
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
    participant(
      'skeleton',
      'Skeleton',
      'monsters',
      1,
      2,
      skeletonProfile.id,
      skeletonProfileData,
    ),
  ],
  ['fighter', 'wizard', 'goblin', 'skeleton'],
);

export function starterSkirmishScenario(playBundleId: string): Scenario {
  return instantiateScenarioTemplate(
    starterSkirmishScenarioTemplate,
    playBundleId,
  );
}

export function positionalTalentsScenario(playBundleId: string): Scenario {
  return instantiateScenarioTemplate(
    positionalTalentsScenarioTemplate,
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
  impassableCells: readonly { readonly x: number; readonly y: number }[] = [],
): ScenarioTemplate {
  return defineScenarioTemplate({
    identity: { id, version: '1.0.0' },
    playBundle: d20FantasyStarterPlayBundle.identity,
    presentation: { label, description },
    board: {
      width,
      height,
      cells: boardCells(width, height, impassableCells),
    },
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

function boardCells(
  width: number,
  height: number,
  impassableCells: readonly { readonly x: number; readonly y: number }[],
) {
  return Array.from({ length: width * height }, (_unused, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const impassable = impassableCells.some(
      (position) => position.x === x && position.y === y,
    );
    return {
      id: `cell-${x}-${y}`,
      position: { x, y },
      capabilities: impassable
        ? [
            {
              id: 'capability.traversal',
              version: 1,
              value: {
                kind: 'traversal' as const,
                passable: false,
                movementCost: 1,
              },
            },
          ]
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
