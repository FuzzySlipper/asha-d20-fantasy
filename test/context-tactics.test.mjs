import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import {
  canonicalJson,
  defineRuleset,
  preparePlayBundle,
} from '@asha-rpg/authoring';

import {
  contextTacticsContentPack,
  contextTacticsContentSource,
  contextTacticsPlayBundle,
  contextTacticsRuleset,
  contextTacticsScenario,
  prepareContextTacticsPlayBundle,
} from '../dist/src/index.js';

test('context tactics is a distinct four-root setup-only kit', () => {
  assert.equal(
    contextTacticsRuleset.identity.id,
    'asha.clean-room.context-tactics',
  );
  assert.equal(
    contextTacticsContentPack.identity.id,
    'asha.clean-room.context-tactics.content',
  );
  assert.equal(
    contextTacticsPlayBundle.identity.id,
    'asha.clean-room.context-tactics.play',
  );
  assert.equal(
    contextTacticsPlayBundle.base.id,
    contextTacticsContentPack.identity.id,
  );

  const scenario = contextTacticsScenario('compiled-by-test');
  assert.equal(scenario.board.cells.length, 20);
  assert.deepEqual(
    scenario.board.cells.find((cell) => cell.id === 'cell-1-1')
      ?.capabilities,
    [{
      id: 'overlook',
      version: 1,
      definitionId: 'terrain.overlook',
      value: { kind: 'flag', value: true },
    }],
  );
  assert.equal(scenario.participants.length, 4);
  assert.equal('commands' in scenario, false);
  assert.equal('expectedEvents' in scenario, false);
  assert.equal('results' in scenario, false);
  assert.equal('tester' in scenario, false);
});

test('the closed kit declares F0 through F5 semantics without TypeScript execution', () => {
  const prepared = preparedKit();
  const profile = contextTacticsRuleset.provides.scalarTestProfiles[0];
  assert.deepEqual(
    profile.bands.map((band) => band.id),
    ['reverse', 'stall', 'advance', 'breakthrough'],
  );
  assert.deepEqual(
    contextTacticsRuleset.provides.activationBudgets.map(
      (budget) => ({
        id: budget.id,
        timing: budget.timing,
        initialAmount: budget.initialAmount,
      }),
    ),
    [
      { id: 'response', timing: 'reaction', initialAmount: 1 },
      { id: 'tempo', timing: 'action', initialAmount: 3 },
    ],
  );
  assert.equal(
    contextTacticsRuleset.models.actionEconomy.acceptedActivationCeiling,
    5,
  );

  const reader = materialized(prepared, 'feature.context-reader');
  assert.deepEqual(
    reader.semantic.contributions.map((contribution) => ({
      id: contribution.id,
      group: contribution.stackingGroup.id,
      predicate: contribution.predicate.kind,
    })),
    [
      { id: 'actor-ready', group: 'edge', predicate: 'namedValue' },
      { id: 'cell-overlook', group: 'edge', predicate: 'cellCapability' },
      { id: 'target-opening', group: 'opening', predicate: 'namedValue' },
    ],
  );
  assert.deepEqual(
    reader.semantic.outcomeBandShifts.map((shift) => ({
      id: shift.id,
      shift: shift.shift,
      predicate: shift.predicate.kind,
    })),
    [
      { id: 'guarded-shift', shift: -1, predicate: 'namedValue' },
      { id: 'overlook-shift', shift: 1, predicate: 'cellCapability' },
    ],
  );

  const item = materialized(prepared, 'item.calibrated-rod');
  assert.equal(item.semantic.contributions[0].predicate.kind, 'boundItemTag');
  assert.equal(item.semantic.contributions[0].value.value, 3);
  assert.equal('action' in item.semantic, false);
  assert.equal('program' in item.semantic, false);

  const freeAction = materialized(prepared, 'action.observe-field');
  assert.deepEqual(freeAction.semantic.action.activation, {
    timing: 'action',
    costs: [],
  });
  const strikeProcedure = materialized(prepared, 'procedure.context-strike');
  assert.deepEqual(
    strikeProcedure.semantic.implementation.template.activation.costs.map(
      (cost) => ({
        budget: {
          rulesetId: cost.budget.rulesetId,
          id: cost.budget.id,
        },
        amount: cost.amount,
      }),
    ),
    [{
      budget: {
        rulesetId: 'asha.clean-room.context-tactics',
        id: 'tempo',
      },
      amount: 2,
    }],
  );

  const effect = materialized(prepared, 'effect.centered-line');
  assert.deepEqual(effect.semantic.tenure, {
    kind: 'fixed',
    anchor: 'sourceTurnStart',
    count: 2,
  });
  assert.equal(effect.semantic.contributions[0].value.value, 4);

  const responses = materialized(prepared, 'feature.layered-ward')
    .semantic.damageResponses;
  assert.deepEqual(
    responses.map((response) => ({
      id: response.id,
      damageTypeId: response.damageTypeId,
      kind: response.effect.kind,
    })),
    [
      { id: 'kinetic-scale', damageTypeId: 'kinetic', kind: 'scale' },
      { id: 'kinetic-trim', damageTypeId: 'kinetic', kind: 'flat' },
      { id: 'strain-trim', damageTypeId: 'strain', kind: 'flat' },
    ],
  );
  assert.equal(
    materialized(prepared, 'action.context-burst')
      .semantic.action.targets.kind,
    'area',
  );
});

test('a malformed duplicate activation budget fails before authority startup', () => {
  const invalidRuleset = defineRuleset({
    ...contextTacticsRuleset,
    provides: {
      ...contextTacticsRuleset.provides,
      activationBudgets: [
        ...contextTacticsRuleset.provides.activationBudgets,
        contextTacticsRuleset.provides.activationBudgets[1],
      ],
    },
  });
  const result = preparePlayBundle({
    bundle: {
      ...contextTacticsPlayBundle,
      ruleset: invalidRuleset,
    },
    contentPacks: [contextTacticsContentSource],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === 'RULESET_ACTIVATION_BUDGET_INVALID',
    ),
    canonicalJson(result.diagnostics),
  );
});

test('Rust authority proves context, budgets, effects, packets, areas, and replay', () => {
  const result = prepareContextTacticsPlayBundle();
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
      'context_tactics',
    ],
    {
      encoding: 'utf8',
      input: canonicalJson({
        prepared: result.prepared,
        scenario: contextTacticsScenario('compiled-by-test'),
      }),
    },
  );
  assert.equal(played.status, 0, played.stderr);
  assert.match(played.stdout, /verified context tactics kit/);
});

function preparedKit() {
  const result = prepareContextTacticsPlayBundle();
  assert.equal(
    result.ok,
    true,
    result.ok ? undefined : canonicalJson(result.diagnostics),
  );
  if (!result.ok) assert.fail('context tactics PlayBundle did not prepare');
  return result.prepared;
}

function materialized(prepared, definitionId) {
  const definition = prepared.materializedDefinitions.find(
    (candidate) => candidate.id === definitionId,
  );
  assert.ok(definition, `missing materialized definition ${definitionId}`);
  return definition;
}
