import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import {
  canonicalJson,
  preparePlayBundle,
} from '@asha-rpg/authoring';

import {
  multiAxisPoolContentPack,
  multiAxisPoolContentSource,
  multiAxisPoolPlayBundle,
  multiAxisPoolRuleset,
  multiAxisPoolScenario,
  prepareMultiAxisPoolPlayBundle,
} from '../dist/src/index.js';

test('multi-axis pool is a distinct four-root setup-only kit', () => {
  assert.equal(
    multiAxisPoolRuleset.identity.id,
    'asha.clean-room.multi-axis-pool',
  );
  assert.equal(
    multiAxisPoolContentPack.identity.id,
    'asha.clean-room.multi-axis-pool.content',
  );
  assert.equal(
    multiAxisPoolPlayBundle.identity.id,
    'asha.clean-room.multi-axis-pool.play',
  );
  assert.equal(
    multiAxisPoolPlayBundle.base.id,
    multiAxisPoolContentPack.identity.id,
  );

  const scenario = multiAxisPoolScenario('compiled-by-test');
  assert.equal(scenario.board.cells.length, 12);
  assert.equal(scenario.participants.length, 2);
  assert.equal('commands' in scenario, false);
  assert.equal('expectedEvents' in scenario, false);
  assert.equal('results' in scenario, false);
  assert.equal('tester' in scenario, false);
});

test('the closed kit retains original pool structure and source contracts', () => {
  const prepared = preparedKit();
  const profile =
    multiAxisPoolRuleset.provides.heterogeneousPoolProfiles[0];
  assert.deepEqual(
    profile.dieTypes.map((dieType) => ({
      id: dieType.id,
      sides: dieType.sides,
    })),
    [
      { id: 'drag', sides: 6 },
      { id: 'focus', sides: 8 },
      { id: 'signal', sides: 4 },
    ],
  );
  assert.deepEqual(
    profile.cancellations.map((cancellation) => cancellation.id),
    ['benefit-complication', 'progress-setback'],
  );
  assert.deepEqual(
    profile.bands.map((band) => band.id),
    ['blocked', 'progress'],
  );

  const feature = materialized(prepared, 'feature.pattern-reader');
  assert.deepEqual(
    feature.semantic.poolContributions.map((contribution) => ({
      id: contribution.id,
      kind: contribution.effect.kind,
      predicate: contribution.predicate.kind,
    })),
    [
      {
        id: 'actor-add-benefit',
        kind: 'addAxis',
        predicate: 'always',
      },
      {
        id: 'actor-add-focus',
        kind: 'addDice',
        predicate: 'boundItemTag',
      },
      {
        id: 'actor-inapplicable-drag',
        kind: 'addDice',
        predicate: 'boundItemTag',
      },
    ],
  );

  const item = materialized(prepared, 'item.tuned-instrument');
  assert.equal('action' in item.semantic, false);
  assert.equal('program' in item.semantic, false);
  assert.deepEqual(
    item.semantic.poolContributions[0].effect,
    {
      kind: 'addAxis',
      axisId: 'complication',
      value: 1,
    },
  );
  assert.deepEqual(
    item.semantic.poolContributions[1].effect,
    {
      kind: 'replaceOrAddDie',
      fromDieTypeId: 'focus',
      toDieTypeId: 'signal',
      count: 1,
      fallbackDieTypeId: 'drag',
    },
  );

  const effect = materialized(prepared, 'effect.trailing-signal');
  assert.equal(effect.semantic.durationAnchor, 'targetTurnStart');
  assert.equal(effect.semantic.durationCount, 2);
  assert.deepEqual(
    effect.semantic.poolContributions.map(
      (contribution) => contribution.effect.kind,
    ),
    ['addAxis', 'addDice'],
  );

  const procedure = materialized(prepared, 'procedure.signal-crossing');
  assert.equal(
    procedure.semantic.implementation.template.check.kind,
    'heterogeneousPool',
  );
  assert.deepEqual(
    procedure.semantic.implementation.template.costs,
    [{ resourceId: 'charge', amount: 1 }],
  );
});

test('a malformed pool face table fails before authority startup', () => {
  const profile =
    multiAxisPoolRuleset.provides.heterogeneousPoolProfiles[0];
  const drag = profile.dieTypes[0];
  const result = preparePlayBundle({
    bundle: {
      ...multiAxisPoolPlayBundle,
      ruleset: {
        ...multiAxisPoolRuleset,
        provides: {
          ...multiAxisPoolRuleset.provides,
          heterogeneousPoolProfiles: [{
            ...profile,
            dieTypes: [
              { ...drag, faces: drag.faces.slice(0, 5) },
              ...profile.dieTypes.slice(1),
            ],
          }],
        },
      },
    },
    contentPacks: [multiAxisPoolContentSource],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === 'RULESET_POOL_DIE_TYPE_INVALID',
    ),
    canonicalJson(result.diagnostics),
  );
});

test('Rust authority proves source reduction, axes, effects, costs, and replay', () => {
  const result = prepareMultiAxisPoolPlayBundle();
  assert.equal(
    result.ok,
    true,
    result.ok ? undefined : canonicalJson(result.diagnostics),
  );
  if (!result.ok) return;

  const played = spawnSync(
    'cargo',
    [
      'run',
      '--quiet',
      '--manifest-path',
      'consumer/Cargo.toml',
      '--bin',
      'multi_axis_pool',
    ],
    {
      encoding: 'utf8',
      input: canonicalJson({
        prepared: result.prepared,
        scenario: multiAxisPoolScenario('compiled-by-test'),
      }),
    },
  );
  assert.equal(played.status, 0, played.stderr);
  assert.match(played.stdout, /verified multi-axis pool kit/);
});

function preparedKit() {
  const result = prepareMultiAxisPoolPlayBundle();
  assert.equal(
    result.ok,
    true,
    result.ok ? undefined : canonicalJson(result.diagnostics),
  );
  if (!result.ok) assert.fail('multi-axis pool PlayBundle did not prepare');
  return result.prepared;
}

function materialized(prepared, definitionId) {
  const definition = prepared.materializedDefinitions.find(
    (candidate) => candidate.id === definitionId,
  );
  assert.ok(definition, `missing materialized definition ${definitionId}`);
  return definition;
}
