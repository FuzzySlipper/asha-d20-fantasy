import {
  defineItemDefinition,
  itemBoundedIntegerAttribute,
  itemCatalogReferenceAttribute,
  itemDiceAttribute,
  itemRulesetValueReferenceAttribute,
} from '@asha-rpg/authoring';

import {
  ruleweaverTacticsSelectors,
  ruleweaverTacticsStackingGroups,
  ruleweaverTacticsValues,
} from '../../../rulesets/ruleweaver-tactics/src/ruleset.js';
import { ruleweaverFoundationCatalogs } from './catalogs.js';

const sourceModule = 'content-packs/ruleweaver-foundation/src/items.ts';

export const trainingBlade = defineItemDefinition({
  id: 'item.training-blade',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'trainingBlade' },
  presentation: {
    label: 'Training Blade',
    description: 'A compact practice weapon with explicit inert attributes.',
    tags: ['item', 'weapon'],
  },
  item: {
    tags: ['weapon', 'melee'],
    traits: ['tactical'],
    allowedSlots: ['hand.main', 'hand.off', 'weapon.backup'],
    attributes: [
      itemRulesetValueReferenceAttribute(
        'attack-stat',
        ruleweaverTacticsValues.Might,
      ),
      itemDiceAttribute({ id: 'damage', count: 1, sides: 8 }),
      itemCatalogReferenceAttribute(
        'damage-type',
        ruleweaverFoundationCatalogs.references.impact,
      ),
      itemRulesetValueReferenceAttribute(
        'defense',
        ruleweaverTacticsValues.Armor,
      ),
      itemBoundedIntegerAttribute({
        id: 'range',
        value: 1,
        minimum: 0,
        maximum: 32,
      }),
    ],
    contributions: [
      {
        id: 'training-balance',
        selector: ruleweaverTacticsSelectors.AttackTotal,
        stackingGroup: ruleweaverTacticsStackingGroups.TypedBonus,
        value: { kind: 'constant', value: 1 },
        predicate: { kind: 'boundItemTag', tag: 'weapon' },
      },
    ],
  },
});

export const fieldBow = defineItemDefinition({
  id: 'item.field-bow',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'fieldBow' },
  presentation: {
    label: 'Field Bow',
    description: 'A ranged practice weapon using the same shared strike.',
    tags: ['item', 'weapon'],
  },
  item: {
    tags: ['weapon', 'ranged'],
    traits: ['tactical'],
    allowedSlots: ['hand.main', 'weapon.backup'],
    attributes: [
      itemRulesetValueReferenceAttribute(
        'attack-stat',
        ruleweaverTacticsValues.Finesse,
      ),
      itemDiceAttribute({ id: 'damage', count: 1, sides: 6 }),
      itemCatalogReferenceAttribute(
        'damage-type',
        ruleweaverFoundationCatalogs.references.impact,
      ),
      itemRulesetValueReferenceAttribute(
        'defense',
        ruleweaverTacticsValues.Armor,
      ),
      itemBoundedIntegerAttribute({
        id: 'range',
        value: 8,
        minimum: 0,
        maximum: 32,
      }),
    ],
  },
});

export const ruleweaverFoundationItems = Object.freeze([
  fieldBow,
  trainingBlade,
]);
