import {
  defineParticipantProfileDefinition,
  defineSupportDefinition,
  definitionReference,
  rulesetValueId,
  withLowLevelDefinitionReferences,
} from '@asha-rpg/authoring';
import type {
  ContentParticipantProfileData,
  ScenarioInitialCapability,
} from '@asha-rpg/authoring';

import { d20FantasyValues } from '../../../src/ruleset.js';

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

export const fighterProfileData: ContentParticipantProfileData = Object.freeze({
  role: 'player',
  definitionIds: Object.freeze([
    'action.fighter.long-sword',
    'action.fighter.shield-bash',
    'action.fighter.second-wind',
    longSwordItem.id,
    shieldItem.id,
  ]),
  capabilities: Object.freeze([
    vitality(12),
    ...abilities([16, 14, 14, 10, 12, 10]),
    stat(d20FantasyValues.MeleeAttackBonus, 5),
    stat(d20FantasyValues.SpellAttackBonus, 0),
    stat(d20FantasyValues.Initiative, 2),
    ...defenses({ armorClass: 16, strength: 5, dexterity: 2, constitution: 4, intelligence: 0, wisdom: 1, charisma: 0 }),
    resource('second-wind', 1),
  ]),
});

export const wizardProfileData: ContentParticipantProfileData = Object.freeze({
  role: 'player',
  definitionIds: Object.freeze([
    'action.wizard.fire-bolt',
    'action.wizard.thunder-wave',
    arcaneFocusItem.id,
  ]),
  capabilities: Object.freeze([
    vitality(8),
    ...abilities([8, 14, 14, 16, 12, 10]),
    stat(d20FantasyValues.MeleeAttackBonus, 1),
    stat(d20FantasyValues.SpellAttackBonus, 5),
    stat(d20FantasyValues.Initiative, 2),
    ...defenses({ armorClass: 12, strength: -1, dexterity: 2, constitution: 2, intelligence: 5, wisdom: 3, charisma: 0 }),
    resource('spell-slot', 2),
  ]),
});

export const goblinProfileData: ContentParticipantProfileData = Object.freeze({
  role: 'creature',
  definitionIds: Object.freeze(['action.goblin.scimitar', scimitarItem.id]),
  capabilities: Object.freeze([
    vitality(10),
    ...abilities([8, 15, 10, 10, 8, 8]),
    stat(d20FantasyValues.MeleeAttackBonus, 4),
    stat(d20FantasyValues.SpellAttackBonus, 0),
    stat(d20FantasyValues.Initiative, 2),
    ...defenses({ armorClass: 15, strength: -1, dexterity: 2, constitution: 0, intelligence: 0, wisdom: -1, charisma: -1 }),
  ]),
});

export const skeletonProfileData: ContentParticipantProfileData = Object.freeze({
  role: 'creature',
  definitionIds: Object.freeze(['action.skeleton.short-sword', shortSwordItem.id]),
  capabilities: Object.freeze([
    vitality(13),
    ...abilities([10, 16, 15, 6, 8, 5]),
    stat(d20FantasyValues.MeleeAttackBonus, 5),
    stat(d20FantasyValues.SpellAttackBonus, 0),
    stat(d20FantasyValues.Initiative, 3),
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

function vitality(maximum: number): ScenarioInitialCapability {
  return { owner: 'vitality', value: { current: maximum, max: maximum } };
}

function resource(id: string, maximum: number): ScenarioInitialCapability {
  return { owner: 'resource', id, value: { current: maximum, max: maximum } };
}

function stat(
  reference: Parameters<typeof rulesetValueId>[0],
  value: number,
): ScenarioInitialCapability {
  return { owner: 'stat', id: rulesetValueId(reference), value };
}

function defense(
  reference: Parameters<typeof rulesetValueId>[0],
  value: number,
): ScenarioInitialCapability {
  return { owner: 'defense', id: rulesetValueId(reference), value };
}

function abilities(
  scores: readonly [number, number, number, number, number, number],
): readonly ScenarioInitialCapability[] {
  const modifiers = scores.map(abilityModifier);
  return [
    stat(d20FantasyValues.Strength, scores[0]),
    stat(d20FantasyValues.Dexterity, scores[1]),
    stat(d20FantasyValues.Constitution, scores[2]),
    stat(d20FantasyValues.Intelligence, scores[3]),
    stat(d20FantasyValues.Wisdom, scores[4]),
    stat(d20FantasyValues.Charisma, scores[5]),
    stat(d20FantasyValues.StrengthModifier, modifiers[0] ?? 0),
    stat(d20FantasyValues.DexterityModifier, modifiers[1] ?? 0),
    stat(d20FantasyValues.ConstitutionModifier, modifiers[2] ?? 0),
    stat(d20FantasyValues.IntelligenceModifier, modifiers[3] ?? 0),
    stat(d20FantasyValues.WisdomModifier, modifiers[4] ?? 0),
    stat(d20FantasyValues.CharismaModifier, modifiers[5] ?? 0),
  ];
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function defenses(input: {
  readonly armorClass: number;
  readonly strength: number;
  readonly dexterity: number;
  readonly constitution: number;
  readonly intelligence: number;
  readonly wisdom: number;
  readonly charisma: number;
}): readonly ScenarioInitialCapability[] {
  return [
    defense(d20FantasyValues.ArmorClass, input.armorClass),
    defense(d20FantasyValues.StrengthSave, input.strength),
    defense(d20FantasyValues.DexteritySave, input.dexterity),
    defense(d20FantasyValues.ConstitutionSave, input.constitution),
    defense(d20FantasyValues.IntelligenceSave, input.intelligence),
    defense(d20FantasyValues.WisdomSave, input.wisdom),
    defense(d20FantasyValues.CharismaSave, input.charisma),
  ];
}
