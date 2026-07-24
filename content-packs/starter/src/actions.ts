import {
  constant,
  defineActionInvocationDefinition,
  dice,
  equippedItemAttribute,
  readStat,
  spend,
} from '@asha-rpg/authoring';

import {
  attackRollDamageConditionProcedure,
  attackRollDamageProcedure,
  basicWeaponAttackProcedure,
  movementProcedure,
  resourceSpendHealingProcedure,
  savingThrowFullHalfDamageProcedure,
} from '../../foundation/src/procedures.js';
import { d20FantasyValues } from '../../../rulesets/d20-fantasy/src/ruleset.js';
import { starterCatalogs } from './catalogs.js';

const sourceModule = 'content-packs/starter/src/actions.ts';
const foundationImport = 'foundation';

const [
  weaponAttackStat,
  weaponDamage,
  weaponDamageStat,
  weaponDamageType,
  ,
  weaponRange,
] = basicWeaponAttackProcedure.parameters;
const [
  ,
  conditionDamage,
  conditionDamageStat,
  conditionDamageType,
  ,
  ,
  ,
  ,
  conditionRange,
] = attackRollDamageConditionProcedure.parameters;

const weaponBinding = {
  id: 'weapon',
  requiredTags: ['weapon'],
  requiredTraits: ['melee'],
  slotIds: ['hand.main', 'hand.off', 'weapon.backup'],
} as const;
const shieldBinding = {
  id: 'shield',
  requiredTags: ['shield'],
  requiredTraits: ['defensive'],
  slotIds: ['hand.off'],
} as const;

export const basicMove = defineActionInvocationDefinition({
  id: 'action.move',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'basicMove' },
  presentation: {
    label: 'Move',
    description: 'Move to an authority-approved destination within six grid cells.',
    tags: ['movement'],
  },
  procedure: movementProcedure,
  importAs: foundationImport,
  arguments: { range: 6 },
});

export const basicAttack = defineActionInvocationDefinition({
  id: 'action.basic-attack',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'basicAttack' },
  presentation: {
    label: 'Basic Attack',
    description: 'Attack with one compatible equipped melee weapon.',
    tags: ['attack', 'weapon'],
  },
  procedure: basicWeaponAttackProcedure,
  importAs: foundationImport,
  binding: weaponBinding,
  arguments: {
    'attack-stat': equippedItemAttribute(weaponAttackStat, {
      bindingId: weaponBinding.id,
      attributeId: 'attack-stat',
    }),
    damage: equippedItemAttribute(weaponDamage, {
      bindingId: weaponBinding.id,
      attributeId: 'damage',
    }),
    'damage-stat': equippedItemAttribute(weaponDamageStat, {
      bindingId: weaponBinding.id,
      attributeId: 'damage-stat',
    }),
    'damage-type': equippedItemAttribute(weaponDamageType, {
      bindingId: weaponBinding.id,
      attributeId: 'damage-type',
    }),
    defense: d20FantasyValues.ArmorClass,
    range: equippedItemAttribute(weaponRange, {
      bindingId: weaponBinding.id,
      attributeId: 'range',
    }),
  },
});

export const shieldBash = defineActionInvocationDefinition({
  id: 'action.fighter.shield-bash',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'shieldBash' },
  presentation: {
    label: 'Shield Bash',
    description: 'Deal light damage and apply the Prone marker for one turn.',
    tags: ['condition', 'fighter'],
  },
  procedure: attackRollDamageConditionProcedure,
  importAs: foundationImport,
  binding: shieldBinding,
  arguments: {
    'attack-bonus': readStat('actor', d20FantasyValues.MeleeAttackBonus),
    damage: equippedItemAttribute(conditionDamage, {
      bindingId: shieldBinding.id,
      attributeId: 'damage',
    }),
    'damage-stat': equippedItemAttribute(conditionDamageStat, {
      bindingId: shieldBinding.id,
      attributeId: 'damage-stat',
    }),
    'damage-type': equippedItemAttribute(conditionDamageType, {
      bindingId: shieldBinding.id,
      attributeId: 'damage-type',
    }),
    defense: d20FantasyValues.ArmorClass,
    duration: 1,
    modifier: starterCatalogs.references.prone,
    'modifier-value': constant(1),
    range: equippedItemAttribute(conditionRange, {
      bindingId: shieldBinding.id,
      attributeId: 'range',
    }),
    'stacking-group': 'condition.posture',
  },
});

export const secondWind = defineActionInvocationDefinition({
  id: 'action.fighter.second-wind',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'secondWind' },
  presentation: {
    label: 'Second Wind',
    description: 'Spend the once-per-setup resource to regain 1d10 + 1 vitality.',
    tags: ['fighter', 'healing'],
  },
  procedure: resourceSpendHealingProcedure,
  importAs: foundationImport,
  arguments: {
    costs: [spend(starterCatalogs.references.secondWind, 1)],
    healing: dice({ count: 1, sides: 10, bonus: 1 }),
    range: 0,
  },
});

export const fireBolt = spellAttack({
  id: 'action.wizard.fire-bolt',
  declaration: 'fireBolt',
  label: 'Fire Bolt',
  description: 'A ranged spell attack that deals 1d10 Fire damage.',
  damage: dice({ count: 1, sides: 10 }),
  damageType: starterCatalogs.references.fire,
  range: 6,
});

export const rayOfFrost = spellAttack({
  id: 'action.wizard.ray-of-frost',
  declaration: 'rayOfFrost',
  label: 'Ray of Frost',
  description: 'A ranged spell attack that deals 1d8 cold damage.',
  damage: dice({ count: 1, sides: 8 }),
  damageType: starterCatalogs.references.cold,
  range: 6,
});

export const thunderWave = defineActionInvocationDefinition({
  id: 'action.wizard.thunder-wave',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'thunderWave' },
  presentation: {
    label: 'Thunder Wave',
    description: 'Up to two nearby targets make Constitution saves against Thunder damage.',
    tags: ['saving-throw', 'spell', 'wizard'],
  },
  procedure: savingThrowFullHalfDamageProcedure,
  importAs: foundationImport,
  arguments: {
    costs: [spend(starterCatalogs.references.spellSlot, 1)],
    damage: dice({ count: 2, sides: 8 }),
    'damage-type': starterCatalogs.references.thunder,
    defense: d20FantasyValues.ConstitutionSave,
    difficulty: constant(13),
    'maximum-targets': 2,
    range: 2,
  },
});

export const starterActionDefinitions = Object.freeze([
  basicMove,
  basicAttack,
  shieldBash,
  secondWind,
  fireBolt,
  rayOfFrost,
  thunderWave,
]);

function spellAttack(input: {
  readonly id: string;
  readonly declaration: string;
  readonly label: string;
  readonly description: string;
  readonly damage: ReturnType<typeof dice>;
  readonly damageType:
    | typeof starterCatalogs.references.fire
    | typeof starterCatalogs.references.cold;
  readonly range: number;
}) {
  return defineActionInvocationDefinition({
    id: input.id,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: { module: sourceModule, declaration: input.declaration },
    presentation: {
      label: input.label,
      description: input.description,
      tags: ['spell', 'wizard'],
    },
    procedure: attackRollDamageProcedure,
    importAs: foundationImport,
    arguments: {
      'attack-bonus': readStat('actor', d20FantasyValues.SpellAttackBonus),
      damage: input.damage,
      'damage-type': input.damageType,
      defense: d20FantasyValues.ArmorClass,
      range: input.range,
    },
  });
}
