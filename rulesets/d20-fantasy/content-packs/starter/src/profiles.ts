import {
  defineParticipantProfileDefinition,
  defineParticipantProfileData,
  defineSupportDefinition,
  definitionReference,
  participantProfileDefense,
  participantProfileResource,
  participantProfileStat,
  participantProfileVitality,
  withLowLevelDefinitionReferences,
} from '@asha-rpg/authoring';
import type {
  ContentParticipantProfileCapability,
  ContentParticipantProfileData,
} from '@asha-rpg/authoring';

import { d20FantasyValues } from '../../../src/ruleset.js';
import { starterCatalogs } from './catalogs.js';

const sourceModule = 'rulesets/d20-fantasy/content-packs/starter/src/profiles.ts';

export const longSwordItem = itemDefinition(
  'item.long-sword',
  'Longsword',
  ['action.fighter.long-sword'],
  'A versatile martial weapon represented here by its one-handed d8 strike.',
  ['item', 'weapon'],
);

export const shieldItem = itemDefinition(
  'item.shield',
  'Shield',
  ['action.fighter.shield-bash'],
  'A defensive item that also grants the starter Shield Bash action.',
  ['item', 'armor'],
);

export const arcaneFocusItem = itemDefinition(
  'item.arcane-focus',
  'Arcane Focus',
  ['action.wizard.fire-bolt', 'action.wizard.thunder-wave'],
  'A focus carrying the starter Wizard spell actions.',
  ['item', 'focus'],
);

export const scimitarItem = itemDefinition(
  'item.scimitar',
  'Scimitar',
  ['action.goblin.scimitar'],
  'A light d6 slashing weapon.',
  ['item', 'weapon'],
);

export const shortSwordItem = itemDefinition(
  'item.short-sword',
  'Shortsword',
  ['action.skeleton.short-sword'],
  'A light d6 piercing weapon.',
  ['item', 'weapon'],
);

export const fighterProfileData: ContentParticipantProfileData = defineParticipantProfileData({
  role: 'player',
  definitionReferences: references([
    'action.fighter.long-sword',
    'action.fighter.shield-bash',
    'action.fighter.second-wind',
    longSwordItem.id,
    shieldItem.id,
  ]),
  capabilities: Object.freeze([
    participantProfileVitality({ current: 12, max: 12 }),
    ...abilities([16, 14, 14, 10, 12, 10]),
    participantProfileStat(d20FantasyValues.MeleeAttackBonus, 5),
    participantProfileStat(d20FantasyValues.SpellAttackBonus, 0),
    ...defenses({ armorClass: 16, strength: 5, dexterity: 2, constitution: 4, intelligence: 0, wisdom: 1, charisma: 0 }),
    participantProfileResource(
      starterCatalogs.references.secondWind,
      { current: 1, max: 1 },
    ),
  ]),
});

export const wizardProfileData: ContentParticipantProfileData = defineParticipantProfileData({
  role: 'player',
  definitionReferences: references([
    'action.wizard.fire-bolt',
    'action.wizard.thunder-wave',
    arcaneFocusItem.id,
  ]),
  capabilities: Object.freeze([
    participantProfileVitality({ current: 8, max: 8 }),
    ...abilities([8, 14, 14, 16, 12, 10]),
    participantProfileStat(d20FantasyValues.MeleeAttackBonus, 1),
    participantProfileStat(d20FantasyValues.SpellAttackBonus, 5),
    ...defenses({ armorClass: 12, strength: -1, dexterity: 2, constitution: 2, intelligence: 5, wisdom: 3, charisma: 0 }),
    participantProfileResource(
      starterCatalogs.references.spellSlot,
      { current: 2, max: 2 },
    ),
  ]),
});

export const goblinProfileData: ContentParticipantProfileData = defineParticipantProfileData({
  role: 'creature',
  definitionReferences: references(['action.goblin.scimitar', scimitarItem.id]),
  capabilities: Object.freeze([
    participantProfileVitality({ current: 10, max: 10 }),
    ...abilities([8, 15, 10, 10, 8, 8]),
    participantProfileStat(d20FantasyValues.MeleeAttackBonus, 4),
    participantProfileStat(d20FantasyValues.SpellAttackBonus, 0),
    ...defenses({ armorClass: 15, strength: -1, dexterity: 2, constitution: 0, intelligence: 0, wisdom: -1, charisma: -1 }),
  ]),
});

export const skeletonProfileData: ContentParticipantProfileData = defineParticipantProfileData({
  role: 'creature',
  definitionReferences: references(['action.skeleton.short-sword', shortSwordItem.id]),
  capabilities: Object.freeze([
    participantProfileVitality({ current: 13, max: 13 }),
    ...abilities([10, 16, 15, 6, 8, 5]),
    participantProfileStat(d20FantasyValues.MeleeAttackBonus, 5),
    participantProfileStat(d20FantasyValues.SpellAttackBonus, 0),
    ...defenses({ armorClass: 14, strength: 0, dexterity: 3, constitution: 2, intelligence: -2, wisdom: -1, charisma: -3 }),
  ]),
});

export const fighterProfile = profileDefinition(
  'profile.fighter',
  'fighter',
  'Fighter',
  'A durable martial character with a longsword, shield control, and self-healing.',
  fighterProfileData,
);

export const wizardProfile = profileDefinition(
  'profile.wizard',
  'wizard',
  'Wizard',
  'A fragile ranged spellcaster with an attack cantrip and a limited multi-target spell.',
  wizardProfileData,
);

export const goblinProfile = profileDefinition(
  'profile.goblin-warrior',
  'goblin-warrior',
  'Goblin Warrior',
  'A quick low-vitality creature with a scimitar.',
  goblinProfileData,
);

export const skeletonProfile = profileDefinition(
  'profile.skeleton',
  'skeleton',
  'Skeleton',
  'An undead creature with a shortsword and strong Dexterity.',
  skeletonProfileData,
);

export const starterItemDefinitions = Object.freeze([
  longSwordItem,
  shieldItem,
  arcaneFocusItem,
  scimitarItem,
  shortSwordItem,
]);

export const starterProfileDefinitions = Object.freeze([
  fighterProfile,
  wizardProfile,
  goblinProfile,
  skeletonProfile,
]);

function itemDefinition(
  id: string,
  label: string,
  definitionIds: readonly string[],
  description: string,
  tags: readonly string[],
) {
  const definition = defineSupportDefinition({
    id,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: { module: sourceModule, declaration: id },
    presentation: { label, description, tags },
    semantic: {
      catalog: 'item',
      id,
      data: { definitionIds },
    },
  });
  return withLowLevelDefinitionReferences(
    definition,
    definitionIds.map((definitionId) => definitionReference({ definitionId })),
  );
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
    presentation: { label, description, tags: [profile.role, 'participant-profile'] },
  });
}

function abilities(
  scores: readonly [number, number, number, number, number, number],
): readonly ContentParticipantProfileCapability[] {
  return [
    participantProfileStat(d20FantasyValues.Strength, scores[0]),
    participantProfileStat(d20FantasyValues.Dexterity, scores[1]),
    participantProfileStat(d20FantasyValues.Constitution, scores[2]),
    participantProfileStat(d20FantasyValues.Intelligence, scores[3]),
    participantProfileStat(d20FantasyValues.Wisdom, scores[4]),
    participantProfileStat(d20FantasyValues.Charisma, scores[5]),
  ];
}

function defenses(input: {
  readonly armorClass: number;
  readonly strength: number;
  readonly dexterity: number;
  readonly constitution: number;
  readonly intelligence: number;
  readonly wisdom: number;
  readonly charisma: number;
}): readonly ContentParticipantProfileCapability[] {
  return [
    participantProfileDefense(d20FantasyValues.ArmorClass, input.armorClass),
    participantProfileDefense(d20FantasyValues.StrengthSave, input.strength),
    participantProfileDefense(d20FantasyValues.DexteritySave, input.dexterity),
    participantProfileDefense(d20FantasyValues.ConstitutionSave, input.constitution),
    participantProfileDefense(d20FantasyValues.IntelligenceSave, input.intelligence),
    participantProfileDefense(d20FantasyValues.WisdomSave, input.wisdom),
    participantProfileDefense(d20FantasyValues.CharismaSave, input.charisma),
  ];
}

function references(definitionIds: readonly string[]) {
  return definitionIds.map((definitionId) => definitionReference({ definitionId }));
}
