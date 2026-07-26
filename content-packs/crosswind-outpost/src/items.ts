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
import {
  ruleweaverFoundationCatalogs,
} from '../../ruleweaver-foundation/src/catalogs.js';

const sourceModule = 'content-packs/crosswind-outpost/src/items.ts';

export const resonanceRod = implement({
  id: 'item.resonance-rod',
  label: 'Resonance Rod',
  attackStat: ruleweaverTacticsValues.Intellect,
  defense: ruleweaverTacticsValues.Wits,
  damageType: ruleweaverFoundationCatalogs.references.energy,
  range: 6,
});

export const signalBaton = implement({
  id: 'item.signal-baton',
  label: 'Signal Baton',
  attackStat: ruleweaverTacticsValues.Conviction,
  defense: ruleweaverTacticsValues.Nerve,
  damageType: ruleweaverFoundationCatalogs.references.resolve,
  range: 4,
});

export const bastionShield = defineItemDefinition({
  id: 'item.bastion-shield',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'bastionShield' },
  presentation: {
    label: 'Bastion Shield',
    description:
      'An inert defensive off-hand selection with no embedded action program.',
    tags: ['armor', 'item', 'shield'],
  },
  item: {
    tags: ['shield'],
    traits: ['defensive'],
    allowedSlots: ['hand.off'],
    attributes: [],
  },
});

export const layeredCoat = defineItemDefinition({
  id: 'item.layered-coat',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'layeredCoat' },
  presentation: {
    label: 'Layered Coat',
    description:
      'An inert body-slot equipment selection with no rules callback.',
    tags: ['armor', 'item'],
  },
  item: {
    tags: ['armor'],
    traits: ['protective'],
    allowedSlots: ['body'],
    attributes: [],
  },
});

export const crosswindOutpostItems = Object.freeze([
  bastionShield,
  layeredCoat,
  resonanceRod,
  signalBaton,
]);

function implement(input: {
  readonly id: string;
  readonly label: string;
  readonly attackStat: typeof ruleweaverTacticsValues.Intellect;
  readonly defense: typeof ruleweaverTacticsValues.Wits;
  readonly damageType: typeof ruleweaverFoundationCatalogs.references.energy;
  readonly range: number;
}) {
  return defineItemDefinition({
    id: input.id,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: { module: sourceModule, declaration: input.id },
    presentation: {
      label: input.label,
      description:
        'A data-only tactical implement resolved through the shared strike procedure.',
      tags: ['implement', 'item', 'weapon'],
    },
    item: {
      tags: ['implement', 'weapon', 'ranged'],
      traits: ['tactical'],
      allowedSlots: ['hand.main', 'weapon.backup'],
      attributes: [
        itemRulesetValueReferenceAttribute(
          'attack-stat',
          input.attackStat,
        ),
        itemDiceAttribute({ id: 'damage', count: 1, sides: 6 }),
        itemCatalogReferenceAttribute(
          'damage-type',
          input.damageType,
        ),
        itemRulesetValueReferenceAttribute('defense', input.defense),
        itemBoundedIntegerAttribute({
          id: 'range',
          value: input.range,
          minimum: 0,
          maximum: 32,
        }),
      ],
      contributions: [{
        id: 'implement-alignment',
        selector: ruleweaverTacticsSelectors.AttackTotal,
        stackingGroup: ruleweaverTacticsStackingGroups.TypedBonus,
        value: { kind: 'constant', value: 1 },
        predicate: { kind: 'boundItemTag', tag: 'implement' },
      }],
    },
  });
}
