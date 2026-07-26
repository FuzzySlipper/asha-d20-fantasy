import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import {
  canonicalJson,
  preparePlayBundle,
} from '@asha-rpg/authoring';

import {
  closeQuartersDiscipline,
  crosswindOutpostContentPack,
  crosswindOutpostContentSource,
  crosswindOutpostPlayBundle,
  crosswindOutpostScenario,
  crosswindOutpostScenarioTemplate,
  crosswindOutpostProfiles,
  crosswindSweep,
  measuredOpening,
  prepareCrosswindOutpostPlayBundle,
  resonanceRod,
  ruleweaverFoundationContentPack,
  ruleweaverFoundationContentSource,
  ruleweaverTacticsRuleset,
} from '../dist/src/index.js';

const reviewedAshaRpgPin =
  'e4d6d1afb5b8387de4ff805d73b2041df29ee590';

test('crosswind outpost is one clean-room pack, bundle, and setup-only scenario', () => {
  assert.equal(
    crosswindOutpostContentPack.identity.id,
    'asha.clean-room.crosswind-outpost',
  );
  assert.deepEqual(crosswindOutpostPlayBundle.base, {
    id: ruleweaverFoundationContentPack.identity.id,
    version: ruleweaverFoundationContentPack.identity.version,
  });
  assert.deepEqual(
    crosswindOutpostPlayBundle.add.map((request) => request.id),
    [crosswindOutpostContentPack.identity.id],
  );
  assert.equal(
    crosswindOutpostScenarioTemplate.playBundle.id,
    crosswindOutpostPlayBundle.identity.id,
  );
  assert.equal(crosswindOutpostScenarioTemplate.participants.length, 8);
  assert.equal(
    new Set(
      crosswindOutpostScenarioTemplate.participants.map(
        (participant) => participant.id,
      ),
    ).size,
    8,
  );
  assert.deepEqual(
    crosswindOutpostScenarioTemplate.turn.initiativeOrder,
    [
      'anchor',
      'sentry',
      'pathfinder',
      'runner',
      'guide',
      'adept',
      'shaper',
      'guard',
    ],
  );
  assert.deepEqual(crosswindOutpostScenarioTemplate.randomSource, {
    policyId: 'random.automatic',
    policyVersion: 1,
    sourceId: 'random.system',
    sourceVersion: 1,
  });
  for (const participant of crosswindOutpostScenarioTemplate.participants) {
    assert.deepEqual(
      participant.definitionIds,
      [...participant.definitionIds].sort(),
      `${participant.id} definition identities are canonical`,
    );
    assert.deepEqual(
      participant.featureDefinitionIds ?? [],
      [...(participant.featureDefinitionIds ?? [])].sort(),
      `${participant.id} feature identities are canonical`,
    );
  }

  const scenario = crosswindOutpostScenario('artifact.fixture');
  assert.equal(scenario.playBundleId, 'artifact.fixture');
  const encoded = canonicalJson(scenario);
  for (const forbidden of [
    'actionOrder',
    'expectedEvents',
    'expectedWinner',
    'reactionChoices',
    'targetOrder',
  ]) {
    assert.equal(encoded.includes(forbidden), false);
  }
});

test('four player archetypes and four adversaries stay within content ceilings', () => {
  assert.equal(crosswindOutpostProfiles.length, 8);
  const profileDefinitions = crosswindOutpostContentPack.definitions.filter(
    (definition) =>
      definition.kind === 'support' &&
      definition.semantic.catalog === 'participantProfile',
  );
  assert.equal(profileDefinitions.length, 8);
  const roles = profileDefinitions.map(
    (definition) => definition.semantic.data.role,
  );
  assert.equal(roles.filter((role) => role === 'player').length, 4);
  assert.equal(roles.filter((role) => role === 'creature').length, 4);

  for (const profile of profileDefinitions) {
    const actionCount = profile.semantic.data.definitionReferences.length;
    assert.ok(
      actionCount >= 2 && actionCount <= 4,
      `${profile.id} has ${actionCount} actions`,
    );
    assert.equal(profile.semantic.data.capabilities.length, 12);
  }

  const playerLabels = profileDefinitions
    .filter((definition) => definition.semantic.data.role === 'player')
    .map((definition) => definition.presentation.label)
    .sort();
  assert.deepEqual(playerLabels, [
    'Field Shaper',
    'Pathfinder',
    'Signal Guide',
    'Ward Anchor',
  ]);
  const adversaryLabels = profileDefinitions
    .filter((definition) => definition.semantic.data.role === 'creature')
    .map((definition) => definition.presentation.label)
    .sort();
  assert.deepEqual(adversaryLabels, [
    'Dust Runner',
    'Field Adept',
    'Heavy Guard',
    'Line Sentry',
  ]);
});

test('equipment is inert data and shared procedures materialize attacks against several defenses', () => {
  const prepared = preparedCrosswind();
  const compilation = rustCompile(prepared);
  const strikes = compilation.compiledActions.filter(
    (action) => action.id === 'action.basic-tactical-strike',
  );
  assert.deepEqual(
    strikes.map((action) => ({
      item: action.binding.itemDefinitionId,
      defense: action.check.difficulty.defenseId,
    })),
    [
      { item: 'item.field-bow', defense: 'armor' },
      { item: 'item.resonance-rod', defense: 'wits' },
      { item: 'item.signal-baton', defense: 'nerve' },
      { item: 'item.training-blade', defense: 'armor' },
    ],
  );
  assert.equal(
    materialized(prepared, 'action.basic-tactical-strike')
      .semantic.procedureId,
    'procedure.tactical-strike',
  );

  const contentItems = crosswindOutpostContentPack.definitions.filter(
    (definition) => definition.kind === 'item',
  );
  assert.equal(contentItems.length, 4);
  for (const item of contentItems) {
    assert.equal('action' in item.item, false);
    assert.equal('program' in item.item, false);
  }
  assert.equal(resonanceRod.item.tags.includes('implement'), true);
  assert.ok(
    contentItems.some((item) => item.item.allowedSlots.includes('body')),
  );
  assert.ok(
    contentItems.some((item) => item.item.tags.includes('shield')),
  );
});

test('representative content retains the distinct tactical mechanics without scripts', () => {
  const prepared = preparedCrosswind();
  const area = materialized(prepared, crosswindSweep.id).semantic.action;
  assert.equal(area.targets.kind, 'area');
  assert.equal(area.targets.maximumTargets, 4);
  assert.equal(area.check.kind, 'scalarTest');
  assert.equal(area.check.difficulty.defenseId, 'wits');
  assert.deepEqual(
    JSON.parse(JSON.stringify(area.activation.costs)),
    [{
      budget: {
        rulesetId: ruleweaverTacticsRuleset.identity.id,
        id: 'standard',
      },
      amount: 1,
    }],
  );
  assert.deepEqual(area.costs, [{
    resourceId: 'resource.focus',
    amount: 1,
  }]);
  assert.equal(area.program.body.kind, 'forEachTarget');
  assert.deepEqual(
    Object.keys(area.program.body.body.branches),
    ['critical', 'hit'],
  );

  const localContribution = materialized(
    prepared,
    closeQuartersDiscipline.id,
  ).semantic.contributions[0];
  assert.equal(localContribution.predicate.kind, 'actorSurrounded');
  assert.equal(localContribution.subject, 'actor');
  const flankingContribution = materialized(
    prepared,
    measuredOpening.id,
  ).semantic.contributions[0];
  assert.equal(flankingContribution.predicate.kind, 'actorFlanksTarget');
  assert.equal(
    materialized(prepared, resonanceRod.id)
      .semantic.contributions[0].predicate.kind,
    'boundItemTag',
  );

  assert.deepEqual(
    materialized(prepared, 'effect.held').semantic.tenure,
    { kind: 'fixed', anchor: 'targetTurnStart', count: 2 },
  );
  assert.deepEqual(
    materialized(prepared, 'effect.unsettled').semantic.tenure,
    { kind: 'targetTurnEndSave' },
  );
  assert.equal(
    materialized(prepared, 'talent.watchful-response')
      .semantic.movementReactions[0].trigger,
    'voluntaryLeavesAdjacency',
  );
  assert.deepEqual(
    materialized(prepared, 'spatial-source.pressure-field')
      .semantic.shape,
    { kind: 'diamond', radius: 1 },
  );
  const spatialPulse = materialized(
    prepared,
    'procedure.spatial-pulse',
  );
  assert.deepEqual(spatialPulse.references, ['damage.energy']);
  assert.equal(
    spatialPulse.semantic.implementation.template.program
      .body.noRoll.operation.kind,
    'damage',
  );
  assert.deepEqual(
    materialized(prepared, 'action.tactical-push')
      .semantic.procedureId,
    'procedure.tactical-push',
  );
  assert.deepEqual(
    materialized(prepared, 'action.tactical-slide')
      .semantic.procedureId,
    'procedure.tactical-slide',
  );
});

test('package locks, closure, duplicate rejection, and Rust reload are exact', () => {
  const prepared = preparedCrosswind();
  assert.deepEqual(
    prepared.dependencyLock.map((lock) => ({
      importAs: lock.importAs,
      packageId: lock.packageId,
      relationship: lock.relationship,
      resolvedVersion: lock.resolvedVersion,
    })),
    [
      {
        importAs: `add:${crosswindOutpostContentPack.identity.id}`,
        packageId: crosswindOutpostContentPack.identity.id,
        relationship: 'contributes',
        resolvedVersion: '1.0.0',
      },
      {
        importAs: 'base',
        packageId: ruleweaverFoundationContentPack.identity.id,
        relationship: 'contributes',
        resolvedVersion: '1.0.0',
      },
      {
        importAs: 'foundation',
        packageId: ruleweaverFoundationContentPack.identity.id,
        relationship: 'dependsOn',
        resolvedVersion: '1.0.0',
      },
    ],
  );
  assert.ok(
    prepared.dependencyLock.every((lock) =>
      lock.sourceFingerprint.startsWith('fnv1a64:')
    ),
  );
  assert.ok(
    prepared.definitionProvenance.every(
      (entry) =>
        entry.packageId === crosswindOutpostContentPack.identity.id ||
        entry.packageId === ruleweaverFoundationContentPack.identity.id,
    ),
  );

  const compilation = rustCompile(prepared);
  const validation = rustCommand(
    'validate_play_bundle',
    canonicalJson(compilation.artifact),
  );
  assert.equal(validation.status, 0, validation.stderr);

  const duplicate = preparePlayBundle({
    bundle: crosswindOutpostPlayBundle,
    contentPacks: [
      crosswindOutpostContentSource,
      crosswindOutpostContentSource,
      ruleweaverFoundationContentSource,
    ],
  });
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.ok(
      duplicate.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === 'CONTENT_PACK_DUPLICATE_PACKAGE_IDENTITY',
      ),
      canonicalJson(duplicate.diagnostics),
    );
  }

  const submodule = spawnSync(
    'git',
    ['-C', 'vendor/asha-rpg', 'rev-parse', 'HEAD'],
    { encoding: 'utf8' },
  );
  assert.equal(submodule.status, 0, submodule.stderr);
  assert.equal(submodule.stdout.trim(), reviewedAshaRpgPin);
});

test('tracked source is local clean-room content with explicit non-claims', () => {
  const sourceFiles = [
    'content-packs/crosswind-outpost/src/actions.ts',
    'content-packs/crosswind-outpost/src/classes.ts',
    'content-packs/crosswind-outpost/src/content-pack.ts',
    'content-packs/crosswind-outpost/src/items.ts',
    'content-packs/crosswind-outpost/src/profiles.ts',
    'play-bundles/crosswind-outpost.ts',
    'scenarios/crosswind-outpost-skirmish.ts',
  ];
  const trackedSource = sourceFiles
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
    .toLowerCase();
  assert.equal(trackedSource.includes('/home/dev/ruleweaver'), false);
  for (const forbidden of [
    'beholder',
    'dragonborn',
    'forgotten realms',
    'mind flayer',
  ]) {
    assert.equal(trackedSource.includes(forbidden), false);
  }

  const sources = readFileSync('SOURCES.md', 'utf8');
  assert.match(
    sources,
    /No predecessor description, branded creature, art, imported\s+catalog/,
  );
  assert.match(sources, /not a complete RuleWeaver port/);
  assert.match(sources, /not a D&D 4e\s+compatibility/);
});

function preparedCrosswind() {
  const result = prepareCrosswindOutpostPlayBundle();
  assert.equal(
    result.ok,
    true,
    result.ok ? undefined : canonicalJson(result.diagnostics),
  );
  if (!result.ok) assert.fail('Crosswind Outpost did not prepare');
  return result.prepared;
}

function materialized(prepared, definitionId) {
  const definition = prepared.materializedDefinitions.find(
    (candidate) => candidate.id === definitionId,
  );
  assert.ok(definition, `missing materialized definition ${definitionId}`);
  return definition;
}

function rustCompile(prepared) {
  const result = rustCommand(
    'compile_play_bundle',
    canonicalJson(prepared),
  );
  assert.equal(result.status, 0, result.stderr);
  const envelope = JSON.parse(result.stdout);
  assert.equal(envelope.ok, true, canonicalJson(envelope.diagnostics));
  return envelope;
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
