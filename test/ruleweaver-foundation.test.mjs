import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import {
  canonicalJson,
  composePlayBundle,
  constant,
  contentPackDependency,
  contentPackRequest,
  contentPackSource,
  defineCharacterFeatureDefinition,
  defineActionInvocationDefinition,
  defineContentPack,
  defineRuleset,
  preparePlayBundle,
} from '@asha-rpg/authoring';

import {
  basicTacticalStrike,
  heldCondition,
  prepareRuleweaverFoundationPlayBundle,
  ruleweaverFoundationContentPack,
  ruleweaverFoundationContentSource,
  ruleweaverFoundationCatalogs,
  ruleweaverFoundationPlayBundle,
  ruleweaverTacticalStrikeProcedure,
  ruleweaverTacticsRuleset,
  ruleweaverTacticsValues,
  staticPressureField,
  tacticalFoundationClass,
  trainingBlade,
  unsettledCondition,
  watchfulResponseTalent,
} from '../dist/src/index.js';

const reviewedAshaRpgPin =
  'e4d6d1afb5b8387de4ff805d73b2041df29ee590';

test('ruleset declares the accepted tactical vocabulary and authority policies', () => {
  assert.equal(ruleweaverTacticsRuleset.identity.id, 'asha.ruleweaver-tactics');
  assert.deepEqual(
    ruleweaverTacticsRuleset.provides.values
      .filter((value) => value.kind === 'stat')
      .map((value) => value.id),
    ['acuity', 'conviction', 'finesse', 'intellect', 'might', 'spirit'],
  );
  assert.deepEqual(
    ruleweaverTacticsRuleset.provides.values
      .filter((value) => value.kind === 'defense')
      .map((value) => value.id),
    ['armor', 'grit', 'nerve', 'wits'],
  );
  assert.deepEqual(
    ruleweaverTacticsRuleset.provides.activationBudgets.map((budget) => ({
      id: budget.id,
      timing: budget.timing,
      reset: budget.resetBoundary,
      initial: budget.initialAmount,
    })),
    [
      { id: 'bonus', timing: 'action', reset: 'ownerTurnStart', initial: 1 },
      { id: 'movement', timing: 'action', reset: 'ownerTurnStart', initial: 6 },
      {
        id: 'reaction',
        timing: 'reaction',
        reset: 'ownerTurnStart',
        initial: 1,
      },
      {
        id: 'standard',
        timing: 'action',
        reset: 'ownerTurnStart',
        initial: 1,
      },
    ],
  );
  assert.equal(
    ruleweaverTacticsRuleset.provides.movementAllowanceBudgetId,
    'movement',
  );
  assert.deepEqual(ruleweaverTacticsRuleset.models.lineOfEffect, {
    id: 'line-of-effect.square-grid-supercover',
    version: 1,
  });

  const profile = ruleweaverTacticsRuleset.provides.scalarTestProfiles[0];
  assert.deepEqual(
    profile.bands.map((band) => band.id),
    ['miss', 'hit', 'critical'],
  );
  assert.deepEqual(profile.naturalDieRules, [{
    id: 'natural-twenty',
    minimum: 20,
    maximum: 20,
    effect: { kind: 'setBand', bandId: 'critical' },
  }]);
});

test('foundation keeps procedures, inert items, actions, effects, talents, and class composition distinct', () => {
  const prepared = preparedFoundation();
  assert.equal(
    ruleweaverFoundationPlayBundle.base.id,
    ruleweaverFoundationContentPack.identity.id,
  );
  assert.equal(
    basicTacticalStrike.source.module,
    'content-packs/ruleweaver-foundation/src/actions.ts',
  );
  assert.equal(
    trainingBlade.source.module,
    'content-packs/ruleweaver-foundation/src/items.ts',
  );
  assert.equal(
    tacticalFoundationClass.source.module,
    'content-packs/ruleweaver-foundation/src/classes.ts',
  );
  assert.equal(
    watchfulResponseTalent.source.module,
    'content-packs/ruleweaver-foundation/src/talents.ts',
  );

  for (const itemId of ['item.field-bow', 'item.training-blade']) {
    const item = materialized(prepared, itemId);
    assert.equal(item.kind, 'item');
    assert.equal('action' in item.semantic, false);
    assert.equal('program' in item.semantic, false);
    assert.equal('definitionIds' in item.semantic, false);
  }

  const strikes = rustCompile(prepared).compiledActions.filter(
    (action) => action.id === basicTacticalStrike.id,
  );
  assert.deepEqual(
    strikes.map((action) => action.binding.itemDefinitionId),
    ['item.field-bow', 'item.training-blade'],
  );
  assert.equal(
    materialized(prepared, basicTacticalStrike.id).semantic.procedureId,
    'procedure.tactical-strike',
  );

  assert.deepEqual(
    materialized(prepared, tacticalFoundationClass.id)
      .semantic.featureDefinitionIds,
    ['talent.coordinated-pressure', 'talent.watchful-response'],
  );
  assert.deepEqual(
    materialized(prepared, watchfulResponseTalent.id)
      .semantic.movementReactions[0],
    {
      id: 'watchful-response',
      trigger: 'voluntaryLeavesAdjacency',
      responseActionId: 'action.leave-adjacency-response',
      activationBudgetId: 'reaction',
      activationCost: 1,
      maximumUses: 1,
      duration: 'encounter',
      reach: 1,
      requiresLineOfEffect: true,
    },
  );
});

test('conditions and spatial sources retain typed lifecycle and closed trigger bindings', () => {
  const prepared = preparedFoundation();
  assert.deepEqual(materialized(prepared, heldCondition.id).semantic.tenure, {
    kind: 'fixed',
    anchor: 'targetTurnStart',
    count: 2,
  });
  assert.deepEqual(
    materialized(prepared, unsettledCondition.id).semantic.tenure,
    { kind: 'targetTurnEndSave' },
  );
  assert.deepEqual(
    materialized(prepared, unsettledCondition.id).semantic.condition,
    {
      clauses: [{ kind: 'forbidActionTag', actionTag: 'control' }],
    },
  );
  assert.deepEqual(
    materialized(prepared, staticPressureField.id).semantic,
    {
      shape: { kind: 'diamond', radius: 1 },
      targetFilter: 'hostiles',
      stackingId: 'pressure-field',
      stacking: 'independentBySource',
      tenure: {
        kind: 'fixed',
        anchor: 'sourceTurnStart',
        count: 2,
      },
      triggers: [
        {
          boundary: 'enter',
          procedureId: 'procedure.spatial-pulse',
          procedureOwnerPackageId:
            ruleweaverFoundationContentPack.identity.id,
        },
        {
          boundary: 'startTurn',
          procedureId: 'procedure.spatial-pulse',
          procedureOwnerPackageId:
            ruleweaverFoundationContentPack.identity.id,
        },
      ],
      schema: { identity: 'asha.rpg.spatial-source', version: 1 },
    },
  );
});

test('dependency-only composition is deterministic across source load order', () => {
  const dependentAction = defineActionInvocationDefinition({
    id: 'action.dependency-only-fixture',
    visibility: 'public',
    extensionPolicy: 'sealed',
    source: {
      module: 'test/fixtures/dependency-only.ts',
      declaration: 'dependentAction',
    },
    presentation: { label: 'Dependency-only fixture' },
    procedure: ruleweaverTacticalStrikeProcedure,
    importAs: 'foundation',
    arguments: {
      'attack-stat': ruleweaverTacticsValues.Might,
      costs: [],
      damage: constant(1),
      'damage-type': ruleweaverFoundationCatalogs.references.impact,
      defense: ruleweaverTacticsValues.Armor,
      'maximum-targets': 1,
      range: 1,
    },
  });
  const dependentPack = defineContentPack({
    identity: {
      id: 'asha.ruleweaver-tactics.dependency-fixture',
      version: '1.0.0',
    },
    entry: {
      module: 'test/fixtures/dependency-only.ts',
      declaration: 'dependentPack',
    },
    dependencies: [
      contentPackDependency({
        id: ruleweaverFoundationContentPack.identity.id,
        version: ruleweaverFoundationContentPack.identity.version,
        importAs: 'foundation',
      }),
    ],
    definitions: [dependentAction],
  });
  const bundle = composePlayBundle({
    identity: {
      id: 'asha.ruleweaver-tactics.dependency-fixture.play',
      version: '1.0.0',
    },
    ruleset: ruleweaverTacticsRuleset,
    base: contentPackRequest({
      id: dependentPack.identity.id,
      version: dependentPack.identity.version,
    }),
    add: [],
    overlays: [],
    configure: {},
  });
  const dependentSource = contentPackSource(dependentPack);
  const left = preparePlayBundle({
    bundle,
    contentPacks: [dependentSource, ruleweaverFoundationContentSource],
  });
  const right = preparePlayBundle({
    bundle,
    contentPacks: [ruleweaverFoundationContentSource, dependentSource],
  });
  assert.equal(left.ok, true, left.ok ? undefined : canonicalJson(left.diagnostics));
  assert.equal(
    right.ok,
    true,
    right.ok ? undefined : canonicalJson(right.diagnostics),
  );
  if (!left.ok || !right.ok) return;
  assert.equal(canonicalJson(left.prepared), canonicalJson(right.prepared));
  assert.equal(
    rustCompile(left.prepared).artifact.artifactId,
    rustCompile(right.prepared).artifact.artifactId,
  );
  assert.deepEqual(
    materialized(left.prepared, dependentAction.id).references,
    ['damage.impact', 'procedure.tactical-strike'],
  );
  assert.ok(
    left.prepared.dependencyLock.some(
      (entry) =>
        entry.packageId === ruleweaverFoundationContentPack.identity.id &&
        entry.sourceFingerprint.startsWith('fnv1a64:'),
    ),
  );
});

test('duplicate and ambiguous dependency identities fail closed', () => {
  const duplicate = preparePlayBundle({
    bundle: ruleweaverFoundationPlayBundle,
    contentPacks: [
      ruleweaverFoundationContentSource,
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

  const first = sharedFeaturePack('asha.fixture.first');
  const second = sharedFeaturePack('asha.fixture.second');
  const result = preparePlayBundle({
    bundle: composePlayBundle({
      identity: { id: 'asha.fixture.ambiguous.play', version: '1.0.0' },
      ruleset: ruleweaverTacticsRuleset,
      base: contentPackRequest({
        id: first.identity.id,
        version: first.identity.version,
      }),
      add: [
        contentPackRequest({
          id: second.identity.id,
          version: second.identity.version,
        }),
      ],
      overlays: [],
      configure: {},
    }),
    contentPacks: [
      contentPackSource(first),
      contentPackSource(second),
    ],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === 'CONTENT_PACK_DUPLICATE_DEFINITION_ID',
      ),
      canonicalJson(result.diagnostics),
    );
  }
});

test('incompatible Rulesets and Rust artifact tampering reject independently', () => {
  const incompatibleRuleset = defineRuleset({
    ...ruleweaverTacticsRuleset,
    provides: {
      ...ruleweaverTacticsRuleset.provides,
      operations: ruleweaverTacticsRuleset.provides.operations.filter(
        (operation) => operation.id !== 'operation.createSpatialSource',
      ),
    },
  });
  const incompatible = preparePlayBundle({
    bundle: {
      ...ruleweaverFoundationPlayBundle,
      ruleset: incompatibleRuleset,
    },
    contentPacks: [ruleweaverFoundationContentSource],
  });
  assert.equal(incompatible.ok, false);
  if (!incompatible.ok) {
    assert.ok(
      incompatible.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === 'CONTENT_PACK_OPERATION_REQUIREMENT_MISSING' &&
          diagnostic.message.includes('operation.createSpatialSource'),
      ),
      canonicalJson(incompatible.diagnostics),
    );
  }

  const compilation = rustCompile(preparedFoundation());
  const valid = rustCommand(
    'validate_play_bundle',
    canonicalJson(compilation.artifact),
  );
  assert.equal(valid.status, 0, valid.stderr);

  const tampered = structuredClone(compilation.artifact);
  const condition = tampered.materializedDefinitions.find(
    (definition) => definition.id === unsettledCondition.id,
  );
  assert.ok(condition);
  condition.semantic.tenure = {
    kind: 'fixed',
    anchor: 'targetTurnStart',
    count: 999,
  };
  const rejected = rustCommand(
    'validate_play_bundle',
    canonicalJson(tampered),
  );
  assert.notEqual(rejected.status, 0);
  assert.match(
    `${rejected.stdout}\n${rejected.stderr}`,
    /CONTENT_PACK_DEFINITION_FINGERPRINT_MISMATCH/,
  );
});

test('foundation records the exact reviewed public engine pin', () => {
  const submodule = spawnSync(
    'git',
    ['-C', 'vendor/asha-rpg', 'rev-parse', 'HEAD'],
    { encoding: 'utf8' },
  );
  assert.equal(submodule.status, 0, submodule.stderr);
  assert.equal(submodule.stdout.trim(), reviewedAshaRpgPin);
});

function preparedFoundation() {
  const result = prepareRuleweaverFoundationPlayBundle();
  assert.equal(
    result.ok,
    true,
    result.ok ? undefined : canonicalJson(result.diagnostics),
  );
  if (!result.ok) assert.fail('RuleWeaver-tactics foundation did not prepare');
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
  const result = rustCommand('compile_play_bundle', canonicalJson(prepared));
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

function sharedFeaturePack(id) {
  return defineContentPack({
    identity: { id, version: '1.0.0' },
    entry: {
      module: `test/fixtures/${id}.ts`,
      declaration: 'sharedFeaturePack',
    },
    definitions: [
      defineCharacterFeatureDefinition({
        id: 'talent.shared-fixture',
        visibility: 'public',
        extensionPolicy: 'sealed',
        source: {
          module: `test/fixtures/${id}.ts`,
          declaration: 'sharedFeature',
        },
        presentation: { label: `Shared fixture from ${id}` },
        characterFeature: {},
      }),
    ],
  });
}
