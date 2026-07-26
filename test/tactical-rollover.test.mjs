import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import {
  canonicalJson,
  defineRuleset,
  preparePlayBundle,
} from '@asha-rpg/authoring';

import {
  prepareTacticalRolloverPlayBundle,
  tacticalRolloverContentPack,
  tacticalRolloverContentSource,
  tacticalRolloverPlayBundle,
  tacticalRolloverRuleset,
  tacticalRolloverScenario,
} from '../dist/src/index.js';

test('the tactical rollover roots remain distinct and the Scenario is setup-only', () => {
  assert.equal(
    tacticalRolloverRuleset.identity.id,
    'asha.clean-room.tactical-rollover',
  );
  assert.equal(
    tacticalRolloverContentPack.identity.id,
    'asha.clean-room.tactical-rollover.content',
  );
  assert.equal(
    tacticalRolloverPlayBundle.identity.id,
    'asha.clean-room.tactical-rollover.play',
  );
  assert.equal(
    tacticalRolloverPlayBundle.base.id,
    tacticalRolloverContentPack.identity.id,
  );

  const scenario = tacticalRolloverScenario('compiled-by-test');
  assert.equal(scenario.board.cells.length, 24);
  assert.equal(scenario.participants.length, 4);
  const tactician = scenario.participants.find(
    (participant) => participant.id === 'tactician',
  );
  assert.equal(tactician.classDefinitionId, 'class.tactician');
  assert.deepEqual(
    tactician.featureDefinitionIds,
    ['feature.flanking-discipline'],
  );
  assert.deepEqual(
    tactician.capabilities
      .filter((capability) => capability.owner === 'resource')
      .map((capability) => capability.id),
    ['focus', 'reserve'],
  );
  assert.equal('commands' in scenario, false);
  assert.equal('expectedEvents' in scenario, false);
  assert.equal('results' in scenario, false);
});

test('the kit prepares typed scalar, item, effect, packet, response, and area semantics', () => {
  const prepared = preparedKit();
  const profile = tacticalRolloverRuleset.provides.scalarTestProfiles[0];
  assert.deepEqual(
    profile.bands.map((band) => band.id),
    ['miss', 'hit', 'surge'],
  );
  assert.deepEqual(profile.naturalDieRules, [
    {
      id: 'natural-low',
      minimum: 1,
      maximum: 1,
      effect: { kind: 'shift', amount: -2 },
    },
    {
      id: 'natural-high',
      minimum: 20,
      maximum: 20,
      effect: { kind: 'shift', amount: 2 },
    },
  ]);

  const strike = materialized(prepared, 'action.tactical-strike');
  assert.equal(strike.semantic.kind, 'invocation');
  assert.equal(strike.semantic.procedureId, 'procedure.tactical-strike');
  assert.deepEqual(strike.semantic.binding, {
    id: 'weapon',
    requiredTags: ['weapon'],
    requiredTraits: ['tactical'],
    slotIds: ['hand.main'],
  });

  const blade = materialized(prepared, 'item.balanced-blade');
  assert.equal(blade.semantic.schema.identity, 'asha.rpg.item');
  assert.equal('action' in blade.semantic, false);
  assert.equal('program' in blade.semantic, false);

  const effect = materialized(prepared, 'effect.measured');
  assert.equal(effect.semantic.durationAnchor, 'sourceTurnStart');
  assert.equal(effect.semantic.durationCount, 2);
  assert.equal(
    effect.semantic.contributions[0].predicate.kind,
    'effectActive',
  );

  const ward = materialized(prepared, 'feature.impact-ward');
  assert.deepEqual(ward.semantic.damageResponses[0], {
    schema: { identity: 'asha.rpg.damage-response', version: 1 },
    id: 'impact-reduction',
    damageTypeId: 'damage.impact',
    requiredTags: ['weapon'],
    bypassTags: ['precise'],
    effect: { kind: 'flat', value: -2 },
  });

  const area = materialized(prepared, 'action.area-sweep');
  assert.equal(area.semantic.action.targets.kind, 'area');
  assert.deepEqual(area.semantic.action.targets.area.shape, {
    kind: 'diamond',
    radius: 1,
  });

  const procedure = materialized(prepared, 'procedure.tactical-strike');
  const hitPacket =
    procedure.semantic.implementation.template.program.body
      .branches.hit.steps[1].operation;
  assert.deepEqual(
    hitPacket.parts.map((part) => part.id),
    ['impact', 'strain'],
  );
  assert.equal(hitPacket.parts[0].amount.kind, 'parameter');
  assert.equal(hitPacket.parts[1].amount.kind, 'parameter');
});

test('a gap in the scalar margin partition fails before Rust activation', () => {
  const originalProfile =
    tacticalRolloverRuleset.provides.scalarTestProfiles[0];
  const invalidRuleset = defineRuleset({
    ...tacticalRolloverRuleset,
    provides: {
      ...tacticalRolloverRuleset.provides,
      scalarTestProfiles: [{
        ...originalProfile,
        marginRules: [
          { minimum: null, maximum: -1, bandId: 'miss' },
          { minimum: 1, maximum: 9, bandId: 'hit' },
          { minimum: 10, maximum: null, bandId: 'surge' },
        ],
      }],
    },
  });
  const result = preparePlayBundle({
    bundle: {
      ...tacticalRolloverPlayBundle,
      ruleset: invalidRuleset,
    },
    contentPacks: [tacticalRolloverContentSource],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(
    result.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === 'RULESET_SCALAR_TEST_MARGIN_RULE_INVALID',
    ),
    canonicalJson(result.diagnostics),
  );
});

test('Rust authority proves the tactical kit, rejection, expiry, and replay paths', () => {
  const result = prepareTacticalRolloverPlayBundle();
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
      'tactical_rollover',
    ],
    {
      encoding: 'utf8',
      input: canonicalJson({
        prepared: result.prepared,
        scenario: tacticalRolloverScenario('compiled-by-test'),
      }),
    },
  );
  assert.equal(played.status, 0, played.stderr);
  assert.match(played.stdout, /verified tactical rollover kit/);
});

function preparedKit() {
  const result = prepareTacticalRolloverPlayBundle();
  assert.equal(
    result.ok,
    true,
    result.ok ? undefined : canonicalJson(result.diagnostics),
  );
  if (!result.ok) assert.fail('tactical rollover PlayBundle did not prepare');
  return result.prepared;
}

function materialized(prepared, definitionId) {
  const definition = prepared.materializedDefinitions.find(
    (candidate) => candidate.id === definitionId,
  );
  assert.ok(definition, `missing materialized definition ${definitionId}`);
  return definition;
}
