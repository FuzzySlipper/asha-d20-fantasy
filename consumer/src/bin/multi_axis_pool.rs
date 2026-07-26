use std::collections::BTreeMap;
use std::io::{self, Read};

use asha_rpg::{
    compile_prepared_play_bundle_json, RpgActionProposal, RpgAuthoritySession,
    RpgAutomaticCommandFailure, RpgCommandOutcome, RpgContributionDisposition, RpgDomainEvent,
    RpgIntentItemBinding, RpgRandomRequest, RpgRandomRequestKind, RpgRandomSourceBinding,
    RpgReplayEntry, RpgRollTapeEntry, RpgRollTapeSource, RpgScenario, RpgTurnControl,
    RpgTurnControlProposal,
};
use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SessionSource {
    prepared: Value,
    scenario: Value,
}

fn main() {
    let mut input = Vec::new();
    io::stdin()
        .read_to_end(&mut input)
        .expect("read multi-axis pool session source");
    let source: SessionSource =
        serde_json::from_slice(&input).expect("decode multi-axis pool session source");
    let prepared = serde_json::to_vec(&source.prepared).expect("encode prepared PlayBundle");
    let bundle =
        compile_prepared_play_bundle_json(&prepared).expect("compile multi-axis pool PlayBundle");
    let mut scenario_value = source.scenario;
    scenario_value["playBundleId"] = Value::String(bundle.artifact().artifact_id.clone());
    let scenario: RpgScenario =
        serde_json::from_value(scenario_value).expect("decode multi-axis pool Scenario");

    prove_source_reduction_effect_expiry_and_replay(&bundle, &scenario);
    prove_evidence_mismatch_is_atomic(&bundle, &scenario);
    println!(
        "verified multi-axis pool kit at artifact {}",
        bundle.artifact().artifact_id
    );
}

fn prove_source_reduction_effect_expiry_and_replay(
    bundle: &asha_rpg::CompiledPlayBundle,
    scenario: &RpgScenario,
) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let initial = session.checkpoint().unwrap();
    let mut entries = Vec::new();

    let mut no_random = RpgRollTapeSource::new(scenario.random_source.clone(), Vec::new());
    let (prime_outcome, prime_entry) = session
        .submit_with_random_source_recorded(
            RpgActionProposal {
                expected_revision: 0,
                action_id: "action.prime-trailing-signal".to_owned(),
                actor_id: "reader".to_owned(),
                target_ids: vec!["operator".to_owned()],
                item_binding: None,
            },
            &mut no_random,
        )
        .unwrap();
    entries.push(prime_entry);
    let RpgCommandOutcome::Accepted(prime_receipt) = prime_outcome else {
        panic!("signal priming must commit: {prime_outcome:?}");
    };
    assert!(prime_receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::EffectApplied {
            target_id,
            definition_id,
            ..
        } if target_id == "operator" && definition_id == "effect.trailing-signal"
    )));
    assert_eq!(resource(&session, "reader", "charge"), 2);
    assert_eq!(resource(&session, "reader", "reserve"), 3);
    assert_eq!(
        session
            .state()
            .entity("operator")
            .unwrap()
            .effects()
            .next()
            .unwrap()
            .remaining_count(),
        2
    );

    assert_eq!(session.turn().current_actor_id, "operator");
    assert_eq!(
        session
            .state()
            .entity("operator")
            .unwrap()
            .effects()
            .next()
            .unwrap()
            .remaining_count(),
        2
    );

    let operator_request = pool_request(4, vec![("drag", 2, 6), ("signal", 2, 4)]);
    let operator_binding =
        action_binding(&session, "action.signal-crossing", "item.plain-instrument");
    let mut operator_source = tape(
        scenario.random_source.clone(),
        operator_request.clone(),
        vec![4, 2, 4, 2],
    );
    let (operator_outcome, operator_entry) = session
        .submit_with_random_source_recorded(
            RpgActionProposal {
                expected_revision: session.state().revision(),
                action_id: "action.signal-crossing".to_owned(),
                actor_id: "operator".to_owned(),
                target_ids: vec!["reader".to_owned()],
                item_binding: Some(operator_binding),
            },
            &mut operator_source,
        )
        .unwrap();
    entries.push(operator_entry);
    let RpgCommandOutcome::Accepted(operator_receipt) = operator_outcome else {
        panic!("operator pool must commit: {operator_outcome:?}");
    };
    assert_eq!(
        operator_receipt.random_evidence[0].request,
        operator_request
    );
    let operator_pool = pool_event(&operator_receipt.events);
    assert_eq!(
        operator_receipt.random_evidence[0]
            .heterogeneous_values
            .iter()
            .map(|value| (
                value.die_type_id.as_str(),
                value.ordinal,
                value.sides,
                value.value,
            ))
            .collect::<Vec<_>>(),
        [
            ("drag", 1, 6, 4),
            ("drag", 2, 6, 2),
            ("signal", 1, 4, 4),
            ("signal", 2, 4, 2),
        ]
    );
    assert_eq!(
        operator_pool.base_dice,
        BTreeMap::from([("drag".to_owned(), 1), ("signal".to_owned(), 1)])
    );
    assert_eq!(
        operator_pool.frozen_dice,
        BTreeMap::from([("drag".to_owned(), 2), ("signal".to_owned(), 2)])
    );
    assert_eq!(
        candidate_evidence(&operator_pool),
        [
            (
                "effect.trailing-signal",
                operator_pool.candidates[0].source_instance_id.as_deref(),
                "effect-add-echo",
                "applied",
            ),
            (
                "effect.trailing-signal",
                operator_pool.candidates[1].source_instance_id.as_deref(),
                "effect-add-signal",
                "applied",
            ),
            (
                "item.plain-instrument",
                Some("operator-instrument"),
                "item-add-complication",
                "applied",
            ),
            (
                "item.plain-instrument",
                Some("operator-instrument"),
                "item-replace-focus",
                "applied",
            ),
        ]
    );
    assert_eq!(operator_pool.replacement_units.len(), 1);
    assert!(operator_pool.replacement_units[0].used_fallback);
    assert_eq!(operator_pool.replacement_units[0].added_die_type_id, "drag");
    assert_eq!(
        operator_pool.automatic_axes,
        BTreeMap::from([("complication".to_owned(), 1), ("echo".to_owned(), 1),])
    );
    assert_eq!(
        operator_pool.net_axes,
        BTreeMap::from([
            ("benefit".to_owned(), 0),
            ("complication".to_owned(), 1),
            ("echo".to_owned(), 1),
            ("progress".to_owned(), 2),
            ("setback".to_owned(), 0),
        ])
    );
    assert_eq!(
        cancellation_evidence(&operator_pool),
        [("benefit-complication", 1), ("progress-setback", 0),]
    );
    assert_eq!(operator_pool.final_band_id, "progress");
    assert_eq!(resource(&session, "operator", "charge"), 1);
    assert_eq!(resource(&session, "operator", "reserve"), 3);
    assert!(operator_receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::ResourceSpent {
            entity_id,
            resource_id,
            amount: 1,
            remaining: 1,
        } if entity_id == "operator" && resource_id == "charge"
    )));
    assert!(operator_receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::VectorOutcomeBranchSelected {
            final_band_id,
            selected_branch_id,
            ..
        } if final_band_id == "progress" && selected_branch_id == "progress"
    )));

    assert_eq!(session.turn().current_actor_id, "reader");

    let reader_request = pool_request(4, vec![("drag", 1, 6), ("signal", 3, 4)]);
    let reader_binding =
        action_binding(&session, "action.signal-crossing", "item.tuned-instrument");
    let mut reader_source = tape(
        scenario.random_source.clone(),
        reader_request.clone(),
        vec![4, 2, 4, 2],
    );
    let (reader_outcome, reader_entry) = session
        .submit_with_random_source_recorded(
            RpgActionProposal {
                expected_revision: session.state().revision(),
                action_id: "action.signal-crossing".to_owned(),
                actor_id: "reader".to_owned(),
                target_ids: vec!["operator".to_owned()],
                item_binding: Some(reader_binding),
            },
            &mut reader_source,
        )
        .unwrap();
    entries.push(reader_entry);
    let RpgCommandOutcome::Accepted(reader_receipt) = reader_outcome else {
        panic!("reader pool must commit: {reader_outcome:?}");
    };
    assert_eq!(reader_receipt.random_evidence[0].request, reader_request);
    assert_eq!(
        reader_receipt.random_evidence[0]
            .heterogeneous_values
            .iter()
            .map(|value| (
                value.die_type_id.as_str(),
                value.ordinal,
                value.sides,
                value.value,
            ))
            .collect::<Vec<_>>(),
        [
            ("drag", 1, 6, 4),
            ("signal", 1, 4, 2),
            ("signal", 2, 4, 4),
            ("signal", 3, 4, 2),
        ]
    );
    let reader_pool = pool_event(&reader_receipt.events);
    assert_eq!(
        reader_pool.base_dice,
        BTreeMap::from([("drag".to_owned(), 1), ("signal".to_owned(), 1)])
    );
    assert_eq!(
        reader_pool.frozen_dice,
        BTreeMap::from([("drag".to_owned(), 1), ("signal".to_owned(), 3)])
    );
    assert_eq!(
        candidate_evidence(&reader_pool),
        [
            (
                "effect.trailing-signal",
                reader_pool.candidates[0].source_instance_id.as_deref(),
                "effect-add-echo",
                "applied",
            ),
            (
                "effect.trailing-signal",
                reader_pool.candidates[1].source_instance_id.as_deref(),
                "effect-add-signal",
                "applied",
            ),
            (
                "feature.pattern-reader",
                None,
                "actor-add-benefit",
                "applied",
            ),
            ("feature.pattern-reader", None, "actor-add-focus", "applied",),
            (
                "feature.pattern-reader",
                None,
                "actor-inapplicable-drag",
                "inapplicable",
            ),
            (
                "item.tuned-instrument",
                Some("reader-instrument"),
                "item-add-complication",
                "applied",
            ),
            (
                "item.tuned-instrument",
                Some("reader-instrument"),
                "item-replace-focus",
                "applied",
            ),
        ]
    );
    assert_eq!(reader_pool.replacement_units.len(), 1);
    assert!(!reader_pool.replacement_units[0].used_fallback);
    assert_eq!(reader_pool.replacement_units[0].added_die_type_id, "signal");
    assert_eq!(
        reader_pool.raw_axes,
        BTreeMap::from([
            ("benefit".to_owned(), 1),
            ("complication".to_owned(), 0),
            ("echo".to_owned(), 0),
            ("progress".to_owned(), 3),
            ("setback".to_owned(), 0),
        ])
    );
    assert_eq!(
        reader_pool.automatic_axes,
        BTreeMap::from([
            ("benefit".to_owned(), 2),
            ("complication".to_owned(), 1),
            ("echo".to_owned(), 1),
        ])
    );
    assert_eq!(
        reader_pool.net_axes,
        BTreeMap::from([
            ("benefit".to_owned(), 2),
            ("complication".to_owned(), 0),
            ("echo".to_owned(), 1),
            ("progress".to_owned(), 3),
            ("setback".to_owned(), 0),
        ])
    );
    assert_eq!(
        cancellation_evidence(&reader_pool),
        [("benefit-complication", 1), ("progress-setback", 0),]
    );
    assert_eq!(reader_pool.final_band_id, "progress");
    assert!(reader_receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::VectorOutcomeBranchSelected {
            final_band_id,
            selected_branch_id,
            ..
        } if final_band_id == "progress" && selected_branch_id == "progress"
    )));
    assert_eq!(resource(&session, "reader", "charge"), 1);
    assert_eq!(resource(&session, "reader", "reserve"), 3);
    assert!(reader_receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::ResourceSpent {
            entity_id,
            resource_id,
            amount: 1,
            remaining: 1,
        } if entity_id == "reader" && resource_id == "charge"
    )));

    assert_eq!(session.turn().current_actor_id, "operator");
    assert_eq!(
        session
            .state()
            .entity("operator")
            .unwrap()
            .effects()
            .next()
            .unwrap()
            .remaining_count(),
        1
    );
    end_current_turn(&mut session, &mut entries);
    end_current_turn(&mut session, &mut entries);
    assert_eq!(session.turn().current_actor_id, "operator");
    assert_eq!(
        session
            .state()
            .entity("operator")
            .unwrap()
            .effects()
            .count(),
        0
    );
    assert!(session
        .encounter_view()
        .log
        .iter()
        .flat_map(|entry| &entry.events)
        .any(|event| matches!(
            event,
            RpgDomainEvent::EffectExpired { definition_id, .. }
                if definition_id == "effect.trailing-signal"
        )));

    let replayed = RpgAuthoritySession::replay(initial, &entries).unwrap();
    assert_eq!(
        replayed.state_hash().unwrap(),
        session.state_hash().unwrap()
    );
    assert_eq!(replayed.encounter_view().log, session.encounter_view().log);
}

fn prove_evidence_mismatch_is_atomic(
    bundle: &asha_rpg::CompiledPlayBundle,
    scenario: &RpgScenario,
) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let before_hash = session.state_hash().unwrap();
    let before_log = session.encounter_view().log;
    let before_charge = resource(&session, "reader", "charge");
    let binding = action_binding(&session, "action.signal-crossing", "item.tuned-instrument");
    let mut wrong_request = pool_request(3, vec![("drag", 1, 6), ("signal", 2, 4)]);
    wrong_request.heterogeneous_terms[1].sides = 6;
    let mut source = tape(scenario.random_source.clone(), wrong_request, vec![4, 2, 4]);
    let failure = session
        .submit_with_random_source_recorded(
            RpgActionProposal {
                expected_revision: 0,
                action_id: "action.signal-crossing".to_owned(),
                actor_id: "reader".to_owned(),
                target_ids: vec!["operator".to_owned()],
                item_binding: Some(binding),
            },
            &mut source,
        )
        .unwrap_err();
    assert!(matches!(
        failure,
        RpgAutomaticCommandFailure::RandomSource(ref failure)
            if failure.code == "RPG_RANDOM_TAPE_REQUEST_ORDER_MISMATCH"
    ));
    assert_eq!(session.state_hash().unwrap(), before_hash);
    assert_eq!(session.encounter_view().log, before_log);
    assert_eq!(resource(&session, "reader", "charge"), before_charge);
    assert_eq!(resource(&session, "reader", "reserve"), 3);
    assert_eq!(session.accepted_random_values(), 0);
}

fn pool_request(count: u32, terms: Vec<(&str, u32, u32)>) -> RpgRandomRequest {
    RpgRandomRequest {
        kind: RpgRandomRequestKind::HeterogeneousPool,
        count,
        sides: 0,
        path: "$.action.check.targets[0].pool".to_owned(),
        heterogeneous_terms: terms
            .into_iter()
            .map(
                |(die_type_id, count, sides)| asha_rpg::RpgHeterogeneousRandomTerm {
                    die_type_id: die_type_id.to_owned(),
                    count,
                    sides,
                },
            )
            .collect(),
    }
}

fn tape(
    binding: RpgRandomSourceBinding,
    request: RpgRandomRequest,
    values: Vec<u32>,
) -> RpgRollTapeSource {
    RpgRollTapeSource::new(binding, vec![RpgRollTapeEntry { request, values }])
}

fn action_binding(
    session: &RpgAuthoritySession,
    action_id: &str,
    item_definition_id: &str,
) -> RpgIntentItemBinding {
    session
        .encounter_view()
        .actions
        .into_iter()
        .find(|action| {
            action.definition_id == action_id
                && action
                    .item_binding
                    .as_ref()
                    .is_some_and(|binding| binding.item_definition_id == item_definition_id)
        })
        .unwrap_or_else(|| {
            panic!("current actor must expose {action_id} with {item_definition_id}")
        })
        .item_binding
        .expect("item-bound action")
}

fn end_current_turn(session: &mut RpgAuthoritySession, entries: &mut Vec<RpgReplayEntry>) {
    let actor_id = session.turn().current_actor_id.clone();
    let (outcome, entry) = session
        .control_recorded(RpgTurnControlProposal {
            expected_revision: session.state().revision(),
            actor_id,
            control: RpgTurnControl::EndTurn,
        })
        .unwrap();
    assert!(matches!(outcome, RpgCommandOutcome::ControlAccepted(_)));
    entries.push(entry);
}

fn resource(session: &RpgAuthoritySession, entity_id: &str, resource_id: &str) -> i32 {
    session
        .state()
        .entity(entity_id)
        .unwrap()
        .resource(resource_id)
        .unwrap()
        .current
}

struct PoolEvidence {
    base_dice: BTreeMap<String, u32>,
    candidates: Vec<asha_rpg::RpgPoolContributionDecision>,
    replacement_units: Vec<asha_rpg::RpgPoolReplacementUnit>,
    frozen_dice: BTreeMap<String, u32>,
    raw_axes: BTreeMap<String, i32>,
    automatic_axes: BTreeMap<String, i32>,
    cancellations: Vec<asha_rpg::RpgPoolCancellationResult>,
    net_axes: BTreeMap<String, i32>,
    final_band_id: String,
}

fn pool_event(events: &[RpgDomainEvent]) -> PoolEvidence {
    events
        .iter()
        .find_map(|event| match event {
            RpgDomainEvent::HeterogeneousPoolResolved {
                base_dice,
                contribution_ledger,
                frozen_dice,
                raw_axes,
                automatic_axes,
                cancellations,
                net_axes,
                final_band_id,
                ..
            } => Some(PoolEvidence {
                base_dice: base_dice.clone(),
                candidates: contribution_ledger.candidates.clone(),
                replacement_units: contribution_ledger.replacement_units.clone(),
                frozen_dice: frozen_dice.clone(),
                raw_axes: raw_axes.clone(),
                automatic_axes: automatic_axes.clone(),
                cancellations: cancellations.clone(),
                net_axes: net_axes.clone(),
                final_band_id: final_band_id.clone(),
            }),
            _ => None,
        })
        .expect("HeterogeneousPoolResolved event")
}

fn cancellation_evidence(pool: &PoolEvidence) -> Vec<(&str, i32)> {
    pool.cancellations
        .iter()
        .map(|cancellation| {
            (
                cancellation.cancellation_id.as_str(),
                cancellation.cancelled,
            )
        })
        .collect()
}

fn candidate_evidence(pool: &PoolEvidence) -> Vec<(&str, Option<&str>, &str, &'static str)> {
    pool.candidates
        .iter()
        .map(|candidate| {
            let disposition = match candidate.disposition {
                RpgContributionDisposition::Applied => "applied",
                RpgContributionDisposition::Inapplicable { .. } => "inapplicable",
                RpgContributionDisposition::Suppressed { .. } => "suppressed",
            };
            (
                candidate.source_definition_id.as_str(),
                candidate.source_instance_id.as_deref(),
                candidate.contribution_id.as_str(),
                disposition,
            )
        })
        .collect()
}
