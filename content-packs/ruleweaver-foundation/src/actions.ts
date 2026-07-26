import {
  action,
  actionId,
  activation,
  ally,
  applyEffect,
  constant,
  createSpatialSource,
  defineActionDefinition,
  defineActionInvocationDefinition,
  definitionReference,
  dice,
  equippedItemAttribute,
  hostile,
  noRoll,
  onCheck,
  spend,
} from '@asha-rpg/authoring';

import {
  ruleweaverTacticsBudgets,
} from '../../../rulesets/ruleweaver-tactics/src/ruleset.js';
import { ruleweaverFoundationCatalogs } from './catalogs.js';
import { heldCondition, unsettledCondition } from './effects.js';
import {
  leaveResponseProcedure,
  tacticalHealingProcedure,
  tacticalMovementProcedure,
  tacticalPushProcedure,
  tacticalSlideProcedure,
  ruleweaverTacticalStrikeProcedure,
} from './procedures.js';
import { staticPressureField } from './spatial-sources.js';

const sourceModule = 'content-packs/ruleweaver-foundation/src/actions.ts';

const weaponBinding = {
  id: 'weapon',
  requiredTags: ['weapon'],
  requiredTraits: ['tactical'],
  slotIds: ['hand.main', 'hand.off', 'weapon.backup'],
} as const;

const strikeAttackStat = ruleweaverTacticalStrikeProcedure.parameters[0];
const strikeDamage = ruleweaverTacticalStrikeProcedure.parameters[2];
const strikeDamageType = ruleweaverTacticalStrikeProcedure.parameters[3];
const strikeDefense = ruleweaverTacticalStrikeProcedure.parameters[4];
const strikeRange = ruleweaverTacticalStrikeProcedure.parameters[6];

export const basicTacticalStrike = defineActionInvocationDefinition({
  id: 'action.basic-tactical-strike',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'basicTacticalStrike' },
  presentation: {
    label: 'Basic Tactical Strike',
    description:
      'Resolve one shared strike through an exact equipped weapon binding.',
    tags: ['attack', 'precision', 'weapon'],
  },
  procedure: ruleweaverTacticalStrikeProcedure,
  binding: weaponBinding,
  arguments: {
    'attack-stat': equippedItemAttribute(strikeAttackStat, {
      bindingId: weaponBinding.id,
      attributeId: 'attack-stat',
    }),
    costs: [],
    damage: equippedItemAttribute(strikeDamage, {
      bindingId: weaponBinding.id,
      attributeId: 'damage',
    }),
    'damage-type': equippedItemAttribute(strikeDamageType, {
      bindingId: weaponBinding.id,
      attributeId: 'damage-type',
    }),
    defense: equippedItemAttribute(strikeDefense, {
      bindingId: weaponBinding.id,
      attributeId: 'defense',
    }),
    'maximum-targets': 1,
    range: equippedItemAttribute(strikeRange, {
      bindingId: weaponBinding.id,
      attributeId: 'range',
    }),
  },
});

const [
  responseDamage,
  responseDamageType,
  responseRange,
] = leaveResponseProcedure.parameters;

export const leaveAdjacencyResponse = defineActionInvocationDefinition({
  id: 'action.leave-adjacency-response',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'leaveAdjacencyResponse' },
  presentation: {
    label: 'Parting Response',
    description:
      'A human-choice response bound to the exact trigger-time weapon.',
    tags: ['reaction', 'weapon'],
  },
  procedure: leaveResponseProcedure,
  binding: weaponBinding,
  arguments: {
    damage: equippedItemAttribute(responseDamage, {
      bindingId: weaponBinding.id,
      attributeId: 'damage',
    }),
    'damage-type': equippedItemAttribute(responseDamageType, {
      bindingId: weaponBinding.id,
      attributeId: 'damage-type',
    }),
    range: equippedItemAttribute(responseRange, {
      bindingId: weaponBinding.id,
      attributeId: 'range',
    }),
  },
});

export const focusedRecovery = defineActionInvocationDefinition({
  id: 'action.focused-recovery',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'focusedRecovery' },
  presentation: {
    label: 'Focused Recovery',
    description: 'Spend one Focus to restore a nearby ally.',
    tags: ['healing', 'support'],
  },
  procedure: tacticalHealingProcedure,
  arguments: {
    costs: [spend(ruleweaverFoundationCatalogs.references.focus, 1)],
    healing: dice({ count: 1, sides: 6, bonus: 2 }),
    range: 4,
  },
});

export const ruleweaverTacticalMove = defineActionInvocationDefinition({
  id: 'action.tactical-move',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'ruleweaverTacticalMove' },
  presentation: {
    label: 'Move',
    description:
      'Select a Rust-projected route within the remaining movement budget.',
    tags: ['movement'],
  },
  procedure: tacticalMovementProcedure,
  arguments: { range: 12 },
});

export const tacticalPush = defineActionInvocationDefinition({
  id: 'action.tactical-push',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'tacticalPush' },
  presentation: {
    label: 'Drive Back',
    description: 'Move one adjacent target away along an authoritative route.',
    tags: ['forced-movement', 'push'],
  },
  procedure: tacticalPushProcedure,
  arguments: { distance: 2 },
});

export const tacticalSlide = defineActionInvocationDefinition({
  id: 'action.tactical-slide',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'tacticalSlide' },
  presentation: {
    label: 'Redirect',
    description: 'Choose one authority-projected forced movement route.',
    tags: ['forced-movement', 'slide'],
  },
  procedure: tacticalSlideProcedure,
  arguments: { distance: 2 },
});

export const imposeHeld = defineActionDefinition({
  id: 'action.impose-held',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'imposeHeld' },
  action: action({
    id: actionId('action.impose-held'),
    name: 'Pin in Place',
    sourcePath: `${sourceModule}#imposeHeld`,
    tags: ['condition', 'control'],
    targets: hostile({ range: 4, lineOfEffect: 'required' }),
    check: noRoll(),
    activation: activation({
      timing: 'action',
      costs: [{ budget: ruleweaverTacticsBudgets.Standard, amount: 1 }],
    }),
    program: onCheck({
      noRoll: applyEffect({
        effect: definitionReference({ definitionId: heldCondition.id }),
        rank: constant(1),
      }),
    }),
  }),
});

export const imposeUnsettled = defineActionDefinition({
  id: 'action.impose-unsettled',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'imposeUnsettled' },
  action: action({
    id: actionId('action.impose-unsettled'),
    name: 'Disrupt',
    sourcePath: `${sourceModule}#imposeUnsettled`,
    tags: ['condition', 'control'],
    targets: hostile({ range: 6, lineOfEffect: 'required' }),
    check: noRoll(),
    activation: activation({
      timing: 'action',
      costs: [{ budget: ruleweaverTacticsBudgets.Standard, amount: 1 }],
    }),
    program: onCheck({
      noRoll: applyEffect({
        effect: definitionReference({ definitionId: unsettledCondition.id }),
        rank: constant(1),
      }),
    }),
  }),
});

export const raisePressureField = defineActionDefinition({
  id: 'action.raise-pressure-field',
  visibility: 'public',
  extensionPolicy: 'sealed',
  source: { module: sourceModule, declaration: 'raisePressureField' },
  action: action({
    id: actionId('action.raise-pressure-field'),
    name: 'Raise Pressure Field',
    sourcePath: `${sourceModule}#raisePressureField`,
    tags: ['spatial-source', 'zone'],
    targets: ally({ range: 0 }),
    check: noRoll(),
    activation: activation({
      timing: 'action',
      costs: [{ budget: ruleweaverTacticsBudgets.Standard, amount: 1 }],
    }),
    costs: [spend(ruleweaverFoundationCatalogs.references.focus, 2)],
    program: onCheck({
      noRoll: createSpatialSource({
        spatialSource: definitionReference({
          definitionId: staticPressureField.id,
        }),
        instanceId: 'pressure-field',
        owner: 'actor',
        source: 'actor',
      }),
    }),
  }),
});

export const ruleweaverFoundationActions = Object.freeze([
  basicTacticalStrike,
  focusedRecovery,
  imposeHeld,
  imposeUnsettled,
  leaveAdjacencyResponse,
  raisePressureField,
  ruleweaverTacticalMove,
  tacticalPush,
  tacticalSlide,
]);
