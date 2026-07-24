import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import {
  canonicalJson,
  contentPackSource,
  defineContentPack,
  defineRuleset,
  preparePlayBundle,
} from '@asha-rpg/authoring';

import {
  basicWeaponAttackProcedure,
  d20FantasyFoundationContentPack,
  d20FantasyFoundationContentSource,
  d20FantasyRuleset,
  d20FantasyStarterContentPack,
  d20FantasyStarterContentSource,
  d20FantasyStarterPlayBundle,
  d20FantasyValues,
  prepareD20FantasyStarterPlayBundle,
  starterSkirmishScenario,
} from '../dist/src/index.js';

test('the PlayBundle composes a procedure foundation and a dependent starter pack', () => {
  assert.equal(d20FantasyValues.Strength.id, 'strength');
  assert.equal(d20FantasyValues.ArmorClass.id, 'armor-class');
  assert.deepEqual(d20FantasyRuleset.models.initiative, {
    id: 'initiative.scenario-ordered',
    version: 1,
  });
  assert.deepEqual(d20FantasyStarterContentPack.dependencies, [{
    id: d20FantasyFoundationContentPack.identity.id,
    version: d20FantasyFoundationContentPack.identity.version,
    importAs: 'foundation',
    relationship: 'dependsOn',
  }]);

  const result = preparedStarter();
  const procedures = result.prepared.materializedDefinitions.filter(
    (definition) => definition.kind === 'actionProcedure',
  );
  assert.deepEqual(
    procedures.map((definition) => definition.id).sort(),
    [
      'procedure.attack-roll-damage',
      'procedure.attack-roll-damage-condition',
      'procedure.basic-weapon-attack',
      'procedure.movement',
      'procedure.resource-spend-healing',
      'procedure.saving-throw-full-half-damage',
    ],
  );

  const expectedProcedures = new Map([
    ['action.basic-attack', 'procedure.basic-weapon-attack'],
    ['action.fighter.second-wind', 'procedure.resource-spend-healing'],
    ['action.fighter.shield-bash', 'procedure.attack-roll-damage-condition'],
    ['action.move', 'procedure.movement'],
    ['action.wizard.fire-bolt', 'procedure.attack-roll-damage'],
    ['action.wizard.ray-of-frost', 'procedure.attack-roll-damage'],
    ['action.wizard.thunder-wave', 'procedure.saving-throw-full-half-damage'],
  ]);
  for (const [actionId, procedureId] of expectedProcedures) {
    const definition = materialized(result.prepared, actionId);
    assert.equal(definition.semantic.kind, 'invocation');
    assert.equal(definition.semantic.procedureId, procedureId);
  }
});

test('starter weapons, shield, and focus are typed data-only items', () => {
  const result = preparedStarter();
  const items = result.prepared.materializedDefinitions.filter(
    (definition) => definition.kind === 'item',
  );
  assert.deepEqual(
    items.map((definition) => definition.id).sort(),
    [
      'item.arcane-focus',
      'item.battleaxe',
      'item.long-sword',
      'item.scimitar',
      'item.shield',
      'item.short-sword',
    ],
  );
  for (const item of items) {
    assert.equal(item.semantic.schema.identity, 'asha.rpg.item');
    assert.equal('definitionIds' in item.semantic, false);
    assert.equal('action' in item.semantic, false);
    assert.equal('program' in item.semantic, false);
  }

  const oldDefinitions = [
    'action.fighter.long-sword',
    'action.goblin.scimitar',
    'action.skeleton.short-sword',
    'base.long-sword-strike',
    'base.light-blade-strike',
    'mixin.melee-presentation',
  ];
  for (const definitionId of oldDefinitions) {
    assert.equal(
      result.prepared.materializedDefinitions.some(
        (definition) => definition.id === definitionId,
      ),
      false,
      `${definitionId} must not survive the migration`,
    );
  }
});

test('profiles carry authoritative item instances and equipment loadouts', () => {
  const result = preparedStarter();
  const fighter = materialized(result.prepared, 'profile.fighter').semantic.data;
  assert.deepEqual(fighter.definitionIds, [
    'action.basic-attack',
    'action.fighter.second-wind',
    'action.fighter.shield-bash',
    'action.move',
  ]);
  assert.deepEqual(fighter.items, [
    { id: 'fighter-battleaxe', definitionId: 'item.battleaxe' },
    { id: 'fighter-longsword', definitionId: 'item.long-sword' },
    { id: 'fighter-shield', definitionId: 'item.shield' },
  ]);
  assert.deepEqual(fighter.equipment, [
    { slotId: 'hand.main', itemInstanceId: 'fighter-longsword' },
    { slotId: 'hand.off', itemInstanceId: 'fighter-shield' },
    { slotId: 'weapon.backup', itemInstanceId: 'fighter-battleaxe' },
  ]);

  const scenario = starterSkirmishScenario('compiled-by-test');
  const scenarioFighter = scenario.participants.find(
    (participant) => participant.id === 'fighter',
  );
  assert.deepEqual(scenarioFighter.items, fighter.items);
  assert.deepEqual(scenarioFighter.equipment, fighter.equipment);
  assert.ok(scenario.participants.every((participant) =>
    participant.definitionIds.includes('action.move')
  ));
});

test('Rust expands one Basic Attack into weapon-specific authoritative variants', () => {
  const compilation = compileStarter(preparedStarter().prepared);
  const basicAttacks = compilation.compiledActions.filter(
    (action) => action.id === 'action.basic-attack',
  );
  assert.deepEqual(
    basicAttacks.map((action) => ({
      itemDefinitionId: action.binding.itemDefinitionId,
      damageDice: diceRequest(action.randomPlan),
      damageType: itemAttribute(
        compilation,
        action.binding.itemDefinitionId,
        'damage-type',
      ).value.definitionId,
      damageStat: itemAttribute(
        compilation,
        action.binding.itemDefinitionId,
        'damage-stat',
      ).value.id,
    })),
    [
      {
        itemDefinitionId: 'item.battleaxe',
        damageDice: { count: 1, sides: 8 },
        damageType: 'slashing',
        damageStat: 'strength-modifier',
      },
      {
        itemDefinitionId: 'item.long-sword',
        damageDice: { count: 1, sides: 8 },
        damageType: 'slashing',
        damageStat: 'strength-modifier',
      },
      {
        itemDefinitionId: 'item.scimitar',
        damageDice: { count: 1, sides: 6 },
        damageType: 'slashing',
        damageStat: 'dexterity-modifier',
      },
      {
        itemDefinitionId: 'item.short-sword',
        damageDice: { count: 1, sides: 6 },
        damageType: 'piercing',
        damageStat: 'dexterity-modifier',
      },
    ],
  );

  const shieldBash = compilation.compiledActions.find(
    (action) => action.id === 'action.fighter.shield-bash',
  );
  assert.equal(shieldBash.binding.itemDefinitionId, 'item.shield');
  assert.equal(
    itemAttribute(compilation, 'item.shield', 'damage-type').value.definitionId,
    'bludgeoning',
  );
});

test('one Basic Attack procedure behavior change reaches every weapon variant', () => {
  const changedProcedure = {
    ...basicWeaponAttackProcedure,
    implementation: {
      ...basicWeaponAttackProcedure.implementation,
      template: {
        ...basicWeaponAttackProcedure.implementation.template,
        program: {
          ...basicWeaponAttackProcedure.implementation.template.program,
          body: {
            ...basicWeaponAttackProcedure.implementation.template.program.body,
            hit: {
              ...basicWeaponAttackProcedure.implementation.template.program.body.hit,
              steps: basicWeaponAttackProcedure.implementation.template.program.body.hit.steps.map(
                (step, index) => index === 0
                  ? {
                      ...step,
                      operation: {
                        ...step.operation,
                        options: step.operation.options.map((option) => ({
                          ...option,
                          damageReduction: 3,
                        })),
                      },
                    }
                  : step,
              ),
            },
          },
        },
      },
    },
  };
  const changedFoundation = defineContentPack({
    ...d20FantasyFoundationContentPack,
    definitions: d20FantasyFoundationContentPack.definitions.map(
      (definition) => definition.id === changedProcedure.id
        ? changedProcedure
        : definition,
    ),
  });
  const changed = preparePlayBundle({
    bundle: d20FantasyStarterPlayBundle,
    contentPacks: [
      d20FantasyStarterContentSource,
      contentPackSource(changedFoundation),
    ],
  });
  assert.equal(changed.ok, true, changed.ok ? undefined : canonicalJson(changed.diagnostics));
  if (!changed.ok) return;

  const changedCompilation = compileStarter(changed.prepared);
  assert.equal(
    changedCompilation.compiledActions.filter(
      (action) => action.id === 'action.basic-attack',
    ).length,
    4,
  );
  const played = playConsumer(changed.prepared, {
    expectedBraceReduction: 3,
  });
  assert.equal(played.status, 0, played.stderr);
});

test('Rust compiles, reloads, and plays several item-bound turns', () => {
  const result = preparedStarter();
  const compilation = compileStarter(result.prepared);
  const validation = rustCommand(
    'validate_play_bundle',
    canonicalJson(compilation.artifact),
  );
  assert.equal(validation.status, 0, validation.stderr);

  const scenario = starterSkirmishScenario(compilation.artifact.artifactId);
  assert.equal(scenario.participants.length, 4);
  assert.equal(scenario.board.cells.length, 35);
  assert.deepEqual(
    scenario.board.cells.find((cell) => cell.id === 'cell-3-3')?.capabilities,
    [{
      id: 'capability.traversal',
      version: 1,
      value: { kind: 'traversal', passable: false, movementCost: 1 },
    }],
  );

  const played = playConsumer(result.prepared);
  assert.equal(played.status, 0, played.stderr);
  assert.match(played.stdout, /played one alternating round/);
});

test('an incompatible Ruleset reports the foundation requirement directly', () => {
  const incompatibleRuleset = defineRuleset({
    ...d20FantasyRuleset,
    provides: {
      ...d20FantasyRuleset.provides,
      operations: d20FantasyRuleset.provides.operations.filter(
        (operation) => operation.id !== 'operation.openReaction',
      ),
    },
  });
  const result = preparePlayBundle({
    bundle: {
      ...d20FantasyStarterPlayBundle,
      ruleset: incompatibleRuleset,
    },
    contentPacks: [
      d20FantasyStarterContentSource,
      d20FantasyFoundationContentSource,
    ],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.diagnostics.some(
    (diagnostic) =>
      diagnostic.code === 'PLAY_BUNDLE_OPERATION_REQUIREMENT_MISSING' &&
      diagnostic.message.includes('operation.openReaction'),
  ));
});

function preparedStarter() {
  const result = prepareD20FantasyStarterPlayBundle();
  assert.equal(result.ok, true, result.ok ? undefined : canonicalJson(result.diagnostics));
  if (!result.ok) assert.fail('starter PlayBundle did not prepare');
  return result;
}

function compileStarter(prepared) {
  const compilation = rustCommand('compile_play_bundle', canonicalJson(prepared));
  assert.equal(compilation.status, 0, compilation.stderr);
  const envelope = JSON.parse(compilation.stdout);
  assert.equal(envelope.ok, true, canonicalJson(envelope.diagnostics));
  return envelope;
}

function materialized(prepared, definitionId) {
  const definition = prepared.materializedDefinitions.find(
    (candidate) => candidate.id === definitionId,
  );
  assert.ok(definition, `missing materialized definition ${definitionId}`);
  return definition;
}

function rustCommand(binary, input) {
  return spawnSync(
    'cargo',
    [
      'run',
      '--quiet',
      '--manifest-path',
      'vendor/asha-rpg/Cargo.toml',
      '-p',
      'rpg-compiler',
      '--bin',
      binary,
    ],
    { encoding: 'utf8', input },
  );
}

function diceRequest(randomPlan) {
  const request = randomPlan.find(
    (entry) => entry.request.kind === 'formulaDice',
  )?.request;
  assert.ok(request, 'expected formula dice request');
  return { count: request.count, sides: request.sides };
}

function itemAttribute(compilation, definitionId, attributeId) {
  const item = compilation.compiledItems.find(
    (candidate) => candidate.definitionId === definitionId,
  );
  assert.ok(item, `missing compiled item ${definitionId}`);
  const attribute = item.attributes.find(
    (candidate) => candidate.id === attributeId,
  );
  assert.ok(attribute, `missing ${definitionId}.${attributeId}`);
  return attribute;
}

function playConsumer(prepared, extra = {}) {
  return spawnSync(
    'cargo',
    ['run', '--quiet', '--manifest-path', 'consumer/Cargo.toml'],
    {
      encoding: 'utf8',
      input: canonicalJson({
        prepared,
        scenario: starterSkirmishScenario('compiled-by-consumer'),
        ...extra,
      }),
    },
  );
}
