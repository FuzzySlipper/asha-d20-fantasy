import {
  action,
  actionId,
  actionPatch,
  add,
  ally,
  applyModifier,
  attack,
  cells,
  combineContentPatches,
  constant,
  damage,
  defineActionDefinition,
  defineMixinDefinition,
  definitionReference,
  deriveAction,
  dice,
  forEachTarget,
  half,
  heal,
  hostile,
  moveToCell,
  noRoll,
  onCheck,
  openReaction,
  patchParameter,
  reactionId,
  reactionOptionId,
  readStat,
  replace,
  savingThrow,
  sequence,
  spend,
  stackingGroup,
  turns,
} from '@asha-rpg/authoring';

import { d20FantasyValues } from '../../../rulesets/d20-fantasy/src/ruleset.js';
import { starterCatalogs } from './catalogs.js';

const sourceModule = 'content-packs/starter/src/actions.ts';
const defensiveGuard = reactionId('reaction.defensive-guard');
const brace = reactionOptionId('brace');

export const basicMove = publicAction(
  'action.move',
  'Move',
  action({
    id: actionId('action.move'),
    name: 'Move',
    sourcePath: `${sourceModule}#basicMove`,
    targets: cells({ range: 6 }),
    check: noRoll(),
    program: onCheck({
      noRoll: moveToCell({ maximumDistance: 6, provokes: true }),
    }),
  }),
  'Move to an authority-approved destination within six grid cells. Movement consumes this turn.',
  ['movement'],
);

export const meleePresentationMixin = defineMixinDefinition({
  id: 'mixin.melee-presentation',
  visibility: 'private',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'meleePresentationMixin' },
  parameters: [
    { id: 'range', type: 'number' },
    { id: 'description', type: 'string' },
  ],
  patch: combineContentPatches(
    actionPatch.semantic.maximumRange.set(patchParameter('range')),
    actionPatch.presentation.description.set(patchParameter('description')),
  ),
});

export const longSwordBase = defineActionDefinition({
  id: 'base.long-sword-strike',
  visibility: 'private',
  extensionPolicy: 'derivable',
  source: { module: sourceModule, declaration: 'longSwordBase' },
  presentation: { label: 'Longsword Strike' },
  action: action({
    id: actionId('base.long-sword-strike'),
    name: 'Longsword Strike',
    sourcePath: `${sourceModule}#longSwordBase`,
    targets: hostile({ range: 0 }),
    check: attack({
      modifier: readStat('actor', d20FantasyValues.MeleeAttackBonus),
      defense: d20FantasyValues.ArmorClass,
    }),
    rollScope: 'perTarget',
    program: onCheck({
      hit: sequence(
        openReaction({
          id: defensiveGuard,
          options: [{ id: brace, label: 'Brace', damageReduction: 2 }],
        }),
        damage({
          amount: add(
            dice({ count: 1, sides: 8 }),
            readStat('actor', d20FantasyValues.StrengthModifier),
          ),
          type: starterCatalogs.references.slashing,
        }),
      ),
    }),
  }),
});

export const lightBladeBase = defineActionDefinition({
  id: 'base.light-blade-strike',
  visibility: 'private',
  extensionPolicy: 'derivable',
  source: { module: sourceModule, declaration: 'lightBladeBase' },
  presentation: { label: 'Light Blade Strike' },
  action: action({
    id: actionId('base.light-blade-strike'),
    name: 'Light Blade Strike',
    sourcePath: `${sourceModule}#lightBladeBase`,
    targets: hostile({ range: 0 }),
    check: attack({
      modifier: readStat('actor', d20FantasyValues.MeleeAttackBonus),
      defense: d20FantasyValues.ArmorClass,
    }),
    rollScope: 'perTarget',
    program: onCheck({
      hit: damage({
        amount: add(
          dice({ count: 1, sides: 6 }),
          readStat('actor', d20FantasyValues.DexterityModifier),
        ),
        type: starterCatalogs.references.slashing,
      }),
    }),
  }),
});

export const longSwordStrike = deriveAction({
  id: 'action.fighter.long-sword',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'longSwordStrike' },
  base: definitionReference({ definitionId: longSwordBase.id }),
  mixins: [
    {
      target: definitionReference({ definitionId: meleePresentationMixin.id }),
      parameters: {
        range: 1,
        description: 'Make a melee attack and allow the target to brace before damage.',
      },
    },
  ],
  patch: actionPatch.presentation.label.set('Longsword Strike'),
});

export const goblinScimitar = deriveAction({
  id: 'action.goblin.scimitar',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'goblinScimitar' },
  base: definitionReference({ definitionId: lightBladeBase.id }),
  mixins: [
    {
      target: definitionReference({ definitionId: meleePresentationMixin.id }),
      parameters: {
        range: 1,
        description: 'A quick melee weapon attack using the attacker’s Dexterity.',
      },
    },
  ],
  patch: actionPatch.presentation.label.set('Scimitar'),
});

export const shieldBash = publicAction('action.fighter.shield-bash', 'Shield Bash',
  action({
    id: actionId('action.fighter.shield-bash'),
    name: 'Shield Bash',
    sourcePath: `${sourceModule}#shieldBash`,
    targets: hostile({ range: 1 }),
    check: attack({
      modifier: readStat('actor', d20FantasyValues.MeleeAttackBonus),
      defense: d20FantasyValues.ArmorClass,
    }),
    rollScope: 'perTarget',
    program: onCheck({
      hit: sequence(
        damage({
          amount: add(
            dice({ count: 1, sides: 4 }),
            readStat('actor', d20FantasyValues.StrengthModifier),
          ),
          type: starterCatalogs.references.bludgeoning,
        }),
        applyModifier({
          modifier: starterCatalogs.references.prone,
          value: constant(1),
          duration: turns(1),
          stacking: replace(stackingGroup('condition.posture')),
        }),
      ),
    }),
  }),
  'Deals light damage and applies the Prone condition marker for one turn.',
  ['fighter', 'condition'],
);

export const secondWind = publicAction('action.fighter.second-wind', 'Second Wind',
  action({
    id: actionId('action.fighter.second-wind'),
    name: 'Second Wind',
    sourcePath: `${sourceModule}#secondWind`,
    targets: ally({ range: 0 }),
    check: noRoll(),
    costs: [spend(starterCatalogs.references.secondWind, 1)],
    program: onCheck({
      noRoll: heal({ amount: dice({ count: 1, sides: 10, bonus: 1 }) }),
    }),
  }),
  'Spend the once-per-setup resource to regain 1d10 + 1 vitality.',
  ['fighter', 'healing'],
);

export const fireBolt = publicAction('action.wizard.fire-bolt', 'Fire Bolt',
  action({
    id: actionId('action.wizard.fire-bolt'),
    name: 'Fire Bolt',
    sourcePath: `${sourceModule}#fireBolt`,
    targets: hostile({ range: 6 }),
    check: attack({
      modifier: readStat('actor', d20FantasyValues.SpellAttackBonus),
      defense: d20FantasyValues.ArmorClass,
    }),
    rollScope: 'perTarget',
    program: onCheck({
      hit: damage({
        amount: dice({ count: 1, sides: 10 }),
        type: starterCatalogs.references.fire,
      }),
    }),
  }),
  'A ranged spell attack that deals 1d10 Fire damage.',
  ['wizard', 'spell'],
);

export const thunderWave = publicAction('action.wizard.thunder-wave', 'Thunder Wave',
  action({
    id: actionId('action.wizard.thunder-wave'),
    name: 'Thunder Wave',
    sourcePath: `${sourceModule}#thunderWave`,
    targets: hostile({ range: 2, maximum: 2 }),
    check: savingThrow({
      difficulty: constant(13),
      defense: d20FantasyValues.ConstitutionSave,
    }),
    rollScope: 'perTarget',
    costs: [spend(starterCatalogs.references.spellSlot, 1)],
    program: forEachTarget(
      2,
      onCheck({
        failed: damage({
          amount: dice({ count: 2, sides: 8 }),
          type: starterCatalogs.references.thunder,
        }),
        saved: damage({
          amount: half(dice({ count: 2, sides: 8 })),
          type: starterCatalogs.references.thunder,
        }),
      }),
    ),
  }),
  'Up to two nearby targets make Constitution saves against Thunder damage.',
  ['wizard', 'spell', 'saving-throw'],
);

export const skeletonShortSword = publicAction(
  'action.skeleton.short-sword',
  'Shortsword',
  action({
    id: actionId('action.skeleton.short-sword'),
    name: 'Shortsword',
    sourcePath: `${sourceModule}#skeletonShortSword`,
    targets: hostile({ range: 1 }),
    check: attack({
      modifier: readStat('actor', d20FantasyValues.MeleeAttackBonus),
      defense: d20FantasyValues.ArmorClass,
    }),
    rollScope: 'perTarget',
    program: onCheck({
      hit: damage({
        amount: add(
          dice({ count: 1, sides: 6 }),
          readStat('actor', d20FantasyValues.DexterityModifier),
        ),
        type: starterCatalogs.references.piercing,
      }),
    }),
  }),
  'A close piercing attack with a light blade.',
  ['creature', 'weapon'],
);

export const starterActionDefinitions = Object.freeze([
  basicMove,
  longSwordBase,
  lightBladeBase,
  meleePresentationMixin,
  longSwordStrike.definition,
  goblinScimitar.definition,
  shieldBash,
  secondWind,
  fireBolt,
  thunderWave,
  skeletonShortSword,
]);

export const starterActionRelationships = Object.freeze([
  longSwordStrike.relationship,
  goblinScimitar.relationship,
]);

function publicAction(
  id: string,
  label: string,
  authoredAction: ReturnType<typeof action>,
  description: string,
  tags: readonly string[],
) {
  return defineActionDefinition({
    id,
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: { module: sourceModule, declaration: id },
    presentation: { label, description, tags },
    action: authoredAction,
  });
}
