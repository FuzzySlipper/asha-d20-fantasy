import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import { canonicalJson, defineRuleset, preparePlayBundle } from '@asha-rpg/authoring';

import {
  d20FantasyRuleset,
  d20FantasyStarterContentPack,
  d20FantasyStarterContentSource,
  d20FantasyStarterPlayBundle,
  d20FantasyValues,
  prepareD20FantasyStarterPlayBundle,
  starterSkirmishScenario,
} from '../dist/src/index.js';

test('named d20 contracts and starter content prepare as one PlayBundle', () => {
  assert.equal(d20FantasyValues.Strength.id, 'strength');
  assert.equal(d20FantasyValues.ArmorClass.id, 'armor-class');
  assert.deepEqual(d20FantasyRuleset.models.initiative, {
    id: 'initiative.scenario-ordered',
    version: 1,
  });
  const strengthModifier = d20FantasyRuleset.provides.values.find(
    (value) => value.id === 'strength-modifier',
  );
  const initiative = d20FantasyRuleset.provides.values.find(
    (value) => value.id === 'initiative',
  );
  assert.equal(strengthModifier?.source.kind, 'derived');
  assert.equal(initiative?.source.kind, 'derived');

  const result = prepareD20FantasyStarterPlayBundle();
  assert.equal(result.ok, true, result.ok ? undefined : canonicalJson(result.diagnostics));
  if (!result.ok) return;

  const profiles = result.prepared.materializedDefinitions.filter(
    (definition) => definition.semantic.catalog === 'participantProfile',
  );
  assert.equal(profiles.length, 4);
  assert.deepEqual(d20FantasyStarterContentPack.requirements.values, []);
  assert.deepEqual(d20FantasyStarterContentPack.requirements.numericDomains, []);
  assert.ok(result.prepared.contentRequirements.values.length > 0);
  assert.ok(result.prepared.contentRequirements.numericDomains.length > 0);
  const derivedIds = new Set([
    'strength-modifier',
    'dexterity-modifier',
    'constitution-modifier',
    'intelligence-modifier',
    'wisdom-modifier',
    'charisma-modifier',
    'initiative',
  ]);
  for (const profile of profiles) {
    assert.equal(
      profile.semantic.data.capabilities.some(
        (capability) => derivedIds.has(capability.id),
      ),
      false,
      `${profile.id} must leave derived values to Rust authority`,
    );
  }
  assert.ok(result.prepared.derivationProvenance.length >= 2);
  assert.ok(result.prepared.materializedDefinitions.some(
    (definition) =>
      definition.id === 'action.move' &&
      definition.semantic.targets.kind === 'cell' &&
      definition.semantic.program.body.noRoll.operation.kind === 'moveToCell',
  ));
  assert.ok(result.prepared.materializedDefinitions.some(
    (definition) => definition.semantic.catalog === 'modifier' && definition.semantic.id === 'prone',
  ));
});

test('starter weapon damage types match the cited SRD weapon table', () => {
  const result = prepareD20FantasyStarterPlayBundle();
  assert.equal(result.ok, true, result.ok ? undefined : canonicalJson(result.diagnostics));
  if (!result.ok) return;

  assert.deepEqual(damageTypesFor(result.prepared, 'action.fighter.long-sword'), ['slashing']);
  assert.deepEqual(damageTypesFor(result.prepared, 'action.fighter.shield-bash'), ['bludgeoning']);
});

test('Rust compiles and reloads the real starter artifact', () => {
  const result = prepareD20FantasyStarterPlayBundle();
  assert.equal(result.ok, true, result.ok ? undefined : canonicalJson(result.diagnostics));
  if (!result.ok) return;

  const compilation = rustCommand('compile_play_bundle', canonicalJson(result.prepared));
  assert.equal(compilation.status, 0, compilation.stderr);
  const envelope = JSON.parse(compilation.stdout);
  assert.equal(envelope.ok, true, canonicalJson(envelope.diagnostics));

  const validation = rustCommand('validate_play_bundle', canonicalJson(envelope.artifact));
  assert.equal(validation.status, 0, validation.stderr);

  const scenario = starterSkirmishScenario(envelope.artifact.artifactId);
  assert.equal(scenario.participants.length, 4);
  assert.equal(scenario.board.cells.length, 35);
  assert.equal(new Set(scenario.board.cells.map((cell) => cell.id)).size, 35);
  assert.ok(scenario.participants.every((participant) =>
    participant.definitionIds.includes('action.move')
  ));
  assert.deepEqual(scenario.turn.initiativeOrder, ['skeleton', 'fighter', 'wizard', 'goblin']);
});

test('the portable consumer plays one alternating round with a reaction', () => {
  const result = prepareD20FantasyStarterPlayBundle();
  assert.equal(result.ok, true, result.ok ? undefined : canonicalJson(result.diagnostics));
  if (!result.ok) return;
  const sessionSource = canonicalJson({
    prepared: result.prepared,
    scenario: starterSkirmishScenario('compiled-by-consumer'),
  });
  const played = spawnSync(
    'cargo',
    ['run', '--quiet', '--manifest-path', 'consumer/Cargo.toml'],
    { encoding: 'utf8', input: sessionSource },
  );

  assert.equal(played.status, 0, played.stderr);
  assert.match(played.stdout, /played one alternating round/);
});

test('an incompatible Ruleset reports the missing content requirement directly', () => {
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
    contentPacks: [d20FantasyStarterContentSource],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.diagnostics.some(
    (diagnostic) =>
      diagnostic.code === 'PLAY_BUNDLE_OPERATION_REQUIREMENT_MISSING' &&
      diagnostic.message.includes('operation.openReaction'),
  ));
});

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

function damageTypesFor(prepared, definitionId) {
  const definition = prepared.materializedDefinitions.find(
    (candidate) => candidate.id === definitionId,
  );
  assert.ok(definition, `missing materialized definition ${definitionId}`);

  const damageTypes = [];
  visit(definition.semantic.program, (value) => {
    if (value.kind === 'damage') damageTypes.push(value.damageType);
  });
  return damageTypes;
}

function visit(value, inspect) {
  if (value === null || typeof value !== 'object') return;
  inspect(value);
  for (const child of Object.values(value)) visit(child, inspect);
}
