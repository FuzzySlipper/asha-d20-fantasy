import {
  defineItemDefinition,
  defineParticipantProfileDefinition,
  defineParticipantProfileData,
  definitionReference,
  itemBoundedIntegerAttribute,
  itemCatalogReferenceAttribute,
  itemDiceAttribute,
  itemIdentifierAttribute,
  itemRulesetValueReferenceAttribute,
  participantProfileDefense,
  participantProfileResource,
  participantProfileStat,
  participantProfileVitality,
} from '@asha-rpg/authoring';
import type {
  ContentParticipantProfileCapability,
  ContentParticipantProfileData,
  ContentItemDefinition,
  ContentCatalogReference,
  RulesetValueReference,
} from '@asha-rpg/authoring';

import { d20FantasyValues } from '../../../rulesets/d20-fantasy/src/ruleset.js';
import { starterCatalogs } from './catalogs.js';

const sourceModule = 'content-packs/starter/src/profiles.ts';
const weaponSlots = ['hand.main', 'hand.off', 'weapon.backup'] as const;

export const longSwordItem = weapon({
  id: 'item.long-sword',
  label: 'Longsword',
  description: 'A versatile one-handed martial weapon.',
  damage: { count: 1, sides: 8 },
  damageType: starterCatalogs.references.slashing,
  damageStat: d20FantasyValues.StrengthModifier,
  kind: 'longsword',
});

export const battleAxeItem = weapon({
  id: 'item.battleaxe',
  label: 'Battleaxe',
  description: 'A one-handed martial axe added entirely through item data and loadout.',
  damage: { count: 1, sides: 8 },
  damageType: starterCatalogs.references.slashing,
  damageStat: d20FantasyValues.StrengthModifier,
  kind: 'battleaxe',
});

export const scimitarItem = weapon({
  id: 'item.scimitar',
  label: 'Scimitar',
  description: 'A light slashing weapon.',
  damage: { count: 1, sides: 6 },
  damageType: starterCatalogs.references.slashing,
  damageStat: d20FantasyValues.DexterityModifier,
  kind: 'scimitar',
});

export const shortSwordItem = weapon({
  id: 'item.short-sword',
  label: 'Shortsword',
  description: 'A light piercing weapon.',
  damage: { count: 1, sides: 6 },
  damageType: starterCatalogs.references.piercing,
  damageStat: d20FantasyValues.DexterityModifier,
  kind: 'shortsword',
});

export const shieldItem = defineItemDefinition({
  id: 'item.shield',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'shieldItem' },
  presentation: {
    label: 'Shield',
    description: 'A defensive off-hand item usable by Shield Bash.',
    tags: ['armor', 'item'],
  },
  item: {
    tags: ['shield'],
    traits: ['defensive'],
    allowedSlots: ['hand.off'],
    attributes: [
      itemDiceAttribute({ id: 'damage', count: 1, sides: 4 }),
      itemRulesetValueReferenceAttribute(
        'damage-stat',
        d20FantasyValues.StrengthModifier,
      ),
      itemCatalogReferenceAttribute(
        'damage-type',
        starterCatalogs.references.bludgeoning,
      ),
      itemBoundedIntegerAttribute({
        id: 'range',
        value: 1,
        minimum: 0,
        maximum: 64,
      }),
    ],
  },
});

export const arcaneFocusItem = defineItemDefinition({
  id: 'item.arcane-focus',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'arcaneFocusItem' },
  presentation: {
    label: 'Arcane Focus',
    description: 'A spellcasting focus with no embedded action behavior.',
    tags: ['focus', 'item'],
  },
  item: {
    tags: ['focus'],
    traits: ['arcane'],
    allowedSlots: ['hand.main', 'hand.off'],
    attributes: [
      itemIdentifierAttribute({ id: 'focus-kind', valueId: 'arcane' }),
    ],
  },
});

export const fighterProfileData: ContentParticipantProfileData =
  defineParticipantProfileData({
    role: 'player',
    definitionReferences: references([
      'action.move',
      'action.basic-attack',
      'action.fighter.shield-bash',
      'action.fighter.second-wind',
    ]),
    items: [
      profileItem('fighter-battleaxe', battleAxeItem),
      profileItem('fighter-longsword', longSwordItem),
      profileItem('fighter-shield', shieldItem),
    ],
    equipment: [
      { slotId: 'hand.main', itemInstanceId: 'fighter-longsword' },
      { slotId: 'hand.off', itemInstanceId: 'fighter-shield' },
      { slotId: 'weapon.backup', itemInstanceId: 'fighter-battleaxe' },
    ],
    capabilities: Object.freeze([
      participantProfileVitality({ current: 12, max: 12 }),
      ...abilities([16, 14, 14, 10, 12, 10]),
      participantProfileStat(d20FantasyValues.MeleeAttackBonus, 5),
      participantProfileStat(d20FantasyValues.SpellAttackBonus, 0),
      ...defenses({
        armorClass: 16,
        strength: 5,
        dexterity: 2,
        constitution: 4,
        intelligence: 0,
        wisdom: 1,
        charisma: 0,
      }),
      participantProfileResource(
        starterCatalogs.references.secondWind,
        { current: 1, max: 1 },
      ),
    ]),
  });

export const wizardProfileData: ContentParticipantProfileData =
  defineParticipantProfileData({
    role: 'player',
    definitionReferences: references([
      'action.move',
      'action.wizard.fire-bolt',
      'action.wizard.ray-of-frost',
      'action.wizard.thunder-wave',
    ]),
    items: [profileItem('wizard-focus', arcaneFocusItem)],
    equipment: [
      { slotId: 'hand.main', itemInstanceId: 'wizard-focus' },
    ],
    capabilities: Object.freeze([
      participantProfileVitality({ current: 8, max: 8 }),
      ...abilities([8, 14, 14, 16, 12, 10]),
      participantProfileStat(d20FantasyValues.MeleeAttackBonus, 1),
      participantProfileStat(d20FantasyValues.SpellAttackBonus, 5),
      ...defenses({
        armorClass: 12,
        strength: -1,
        dexterity: 2,
        constitution: 2,
        intelligence: 5,
        wisdom: 3,
        charisma: 0,
      }),
      participantProfileResource(
        starterCatalogs.references.spellSlot,
        { current: 2, max: 2 },
      ),
    ]),
  });

export const goblinProfileData: ContentParticipantProfileData =
  defineParticipantProfileData({
    role: 'creature',
    definitionReferences: references([
      'action.move',
      'action.basic-attack',
    ]),
    items: [profileItem('goblin-scimitar', scimitarItem)],
    equipment: [
      { slotId: 'hand.main', itemInstanceId: 'goblin-scimitar' },
    ],
    capabilities: Object.freeze([
      participantProfileVitality({ current: 10, max: 10 }),
      ...abilities([8, 15, 10, 10, 8, 8]),
      participantProfileStat(d20FantasyValues.MeleeAttackBonus, 4),
      participantProfileStat(d20FantasyValues.SpellAttackBonus, 0),
      ...defenses({
        armorClass: 15,
        strength: -1,
        dexterity: 2,
        constitution: 0,
        intelligence: 0,
        wisdom: -1,
        charisma: -1,
      }),
    ]),
  });

export const skeletonProfileData: ContentParticipantProfileData =
  defineParticipantProfileData({
    role: 'creature',
    definitionReferences: references([
      'action.move',
      'action.basic-attack',
    ]),
    items: [profileItem('skeleton-shortsword', shortSwordItem)],
    equipment: [
      { slotId: 'hand.main', itemInstanceId: 'skeleton-shortsword' },
    ],
    capabilities: Object.freeze([
      participantProfileVitality({ current: 13, max: 13 }),
      ...abilities([10, 16, 15, 6, 8, 5]),
      participantProfileStat(d20FantasyValues.MeleeAttackBonus, 5),
      participantProfileStat(d20FantasyValues.SpellAttackBonus, 0),
      ...defenses({
        armorClass: 14,
        strength: 0,
        dexterity: 3,
        constitution: 2,
        intelligence: -2,
        wisdom: -1,
        charisma: -3,
      }),
    ]),
  });

export const fighterProfile = profileDefinition(
  'profile.fighter',
  'fighter',
  'Fighter',
  'A durable martial character with two weapon choices, shield control, and self-healing.',
  fighterProfileData,
);

export const wizardProfile = profileDefinition(
  'profile.wizard',
  'wizard',
  'Wizard',
  'A fragile ranged spellcaster with shared-procedure spells.',
  wizardProfileData,
);

export const goblinProfile = profileDefinition(
  'profile.goblin-warrior',
  'goblin-warrior',
  'Goblin Warrior',
  'A quick low-vitality creature with a data-only scimitar.',
  goblinProfileData,
);

export const skeletonProfile = profileDefinition(
  'profile.skeleton',
  'skeleton',
  'Skeleton',
  'An undead creature with a data-only shortsword.',
  skeletonProfileData,
);

export const starterItemDefinitions = Object.freeze([
  longSwordItem,
  battleAxeItem,
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

function weapon(input: {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly damage: { readonly count: number; readonly sides: number };
  readonly damageType: ContentCatalogReference<'damageType', string>;
  readonly damageStat: RulesetValueReference<'stat', string, string>;
  readonly kind: string;
}): ContentItemDefinition {
  return defineItemDefinition({
    id: input.id,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: { module: sourceModule, declaration: input.id },
    presentation: {
      label: input.label,
      description: input.description,
      tags: ['item', 'weapon'],
    },
    item: {
      tags: ['weapon'],
      traits: ['melee'],
      allowedSlots: weaponSlots,
      attributes: [
        itemRulesetValueReferenceAttribute(
          'attack-stat',
          d20FantasyValues.MeleeAttackBonus,
        ),
        itemDiceAttribute({
          id: 'damage',
          count: input.damage.count,
          sides: input.damage.sides,
        }),
        itemRulesetValueReferenceAttribute('damage-stat', input.damageStat),
        itemCatalogReferenceAttribute('damage-type', input.damageType),
        itemIdentifierAttribute({ id: 'weapon-kind', valueId: input.kind }),
        itemBoundedIntegerAttribute({
          id: 'range',
          value: 1,
          minimum: 0,
          maximum: 64,
        }),
      ],
    },
  });
}

function profileItem(id: string, definition: ContentItemDefinition) {
  return {
    id,
    definition: definitionReference({ definitionId: definition.id }),
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
    participantProfileDefense(
      d20FantasyValues.ConstitutionSave,
      input.constitution,
    ),
    participantProfileDefense(
      d20FantasyValues.IntelligenceSave,
      input.intelligence,
    ),
    participantProfileDefense(d20FantasyValues.WisdomSave, input.wisdom),
    participantProfileDefense(d20FantasyValues.CharismaSave, input.charisma),
  ];
}

function references(definitionIds: readonly string[]) {
  return definitionIds.map((definitionId) =>
    definitionReference({ definitionId }),
  );
}
