use std::io::{self, Read};

use asha_rpg::{
    compile_prepared_play_bundle_json, load_compiled_play_bundle, GridPosition, RpgActionProposal,
    RpgAreaActionProposal, RpgAuthoritySession, RpgCommandOutcome, RpgContributionDisposition,
    RpgDomainEvent, RpgForcedMovementCommand, RpgInitialCapability, RpgIntentItemBinding,
    RpgMovementKind, RpgRandomRequest, RpgRandomRequestKind, RpgRandomSource,
    RpgRandomSourceBinding, RpgRandomSourceFailure, RpgReactionProposal, RpgReplayEntry,
    RpgRollTapeEntry, RpgRollTapeSource, RpgScenario, RpgTurnControl, RpgTurnControlProposal,
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
        .expect("read Crosswind Outpost session source");
    let source: SessionSource =
        serde_json::from_slice(&input).expect("decode Crosswind Outpost session source");
    let prepared_json = serde_json::to_vec(&source.prepared).expect("encode prepared PlayBundle");
    let bundle = compile_prepared_play_bundle_json(&prepared_json)
        .expect("compile Crosswind Outpost through the public Rust facade");
    let mut scenario_value = source.scenario;
    scenario_value["playBundleId"] = Value::String(bundle.artifact().artifact_id.clone());
    let scenario: RpgScenario =
        serde_json::from_value(scenario_value).expect("decode Crosswind Outpost Scenario");

    prove_rust_tamper_rejection(&source.prepared, &bundle);
    prove_bound_attack_budgets_randomness_and_atomic_rejections(&bundle, &scenario);
    prove_distinct_defenses_miss_and_inapplicable_evidence(&bundle, &scenario);
    prove_cross_source_reduction_and_replay(&bundle, &scenario);
    prove_area_cost_once_and_healing(&bundle, &scenario);
    prove_conditions_movement_reaction_and_forced_movement(&bundle, &scenario);
    prove_spatial_source_lifecycle_checkpoint_and_replay(&bundle, &scenario);

    println!(
        "verified Crosswind Outpost public authority at artifact {}",
        bundle.artifact().artifact_id
    );
}

fn prove_rust_tamper_rejection(prepared: &Value, bundle: &asha_rpg::CompiledPlayBundle) {
    let mut tampered_prepared = prepared.clone();
    tampered_prepared["materializedDefinitions"][0]["fingerprint"] =
        Value::String("fnv1a64:0000000000000000".to_owned());
    let prepared_failure = compile_prepared_play_bundle_json(
        &serde_json::to_vec(&tampered_prepared).expect("encode tampered prepared PlayBundle"),
    )
    .expect_err("Rust must reject tampered prepared materialization");
    assert!(!prepared_failure.diagnostics.is_empty());

    let mut tampered_artifact = bundle.artifact().clone();
    tampered_artifact.artifact_id = "fnv1a64:0000000000000000".to_owned();
    let artifact_failure =
        load_compiled_play_bundle(tampered_artifact).expect_err("Rust must reject artifact tamper");
    assert!(!artifact_failure.diagnostics.is_empty());
}

fn prove_bound_attack_budgets_randomness_and_atomic_rejections(
    bundle: &asha_rpg::CompiledPlayBundle,
    scenario: &RpgScenario,
) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let initial = session.checkpoint().unwrap();
    let blade_binding = action_binding(
        &session,
        "action.basic-tactical-strike",
        Some("item.training-blade"),
    );

    let second_blade_binding = action_binding(
        &session,
        "action.basic-tactical-strike",
        Some("item.training-blade"),
    );
    assert_atomic_rejection(
        &mut session,
        scenario,
        RpgActionProposal {
            expected_revision: 0,
            action_id: "action.basic-tactical-strike".to_owned(),
            actor_id: "anchor".to_owned(),
            target_ids: vec!["sentry".to_owned()],
            item_binding: None,
        },
        "RPG_ACTION_ITEM_BINDING_REQUIRED",
    );
    assert_atomic_rejection(
        &mut session,
        scenario,
        RpgActionProposal {
            expected_revision: 99,
            action_id: "action.basic-tactical-strike".to_owned(),
            actor_id: "anchor".to_owned(),
            target_ids: vec!["sentry".to_owned()],
            item_binding: blade_binding.clone(),
        },
        "RPG_SESSION_REVISION_MISMATCH",
    );

    let mut random = StableSource::new(scenario.random_source.clone(), 20, 4);
    let (outcome, entry) = session
        .submit_with_random_source_recorded(
            RpgActionProposal {
                expected_revision: 0,
                action_id: "action.basic-tactical-strike".to_owned(),
                actor_id: "anchor".to_owned(),
                target_ids: vec!["sentry".to_owned()],
                item_binding: blade_binding.clone(),
            },
            &mut random,
        )
        .unwrap();
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("bound anchor strike must commit: {outcome:?}");
    };
    assert_eq!(receipt.item_binding, blade_binding);
    assert_eq!(
        receipt
            .random_evidence
            .iter()
            .map(|evidence| (
                evidence.request.kind,
                evidence.request.count,
                evidence.request.sides,
                evidence.values.clone(),
            ))
            .collect::<Vec<_>>(),
        [
            (RpgRandomRequestKind::ScalarTest, 1, 20, vec![20]),
            (RpgRandomRequestKind::FormulaDice, 1, 8, vec![4]),
        ]
    );
    assert_eq!(
        receipt
            .random_evidence
            .iter()
            .map(|evidence| evidence.request.path.as_str())
            .collect::<Vec<_>>(),
        [
            "$.action.check.targets[0].roll",
            "$.action.program.body.targets[0].critical.parts[0].amount.dice[0]",
        ]
    );
    let scalar = scalar_event(&receipt.events, "sentry");
    assert_eq!(scalar.0, "attack-test");
    assert_eq!(scalar.1, 15);
    assert_eq!(scalar.2, "critical");
    assert_contribution(scalar.3, "close-quarters-discipline", |disposition| {
        disposition == &RpgContributionDisposition::Applied
    });
    assert_contribution(scalar.3, "training-balance", |disposition| {
        disposition == &RpgContributionDisposition::Applied
    });
    assert!(
        receipt.events.iter().any(|event| matches!(
            event,
            RpgDomainEvent::DamagePacketApplied {
                target_id,
                original_packet_sum: 4,
                adjusted_packet_sum: 4,
            actual_vitality_delta: 4,
                before_vitality: 12,
                after_vitality: 8,
                ..
            } if target_id == "sentry"
        )),
        "unexpected strike events: {:#?}",
        receipt.events
    );
    assert_eq!(budget(&session, "anchor", "standard"), 0);
    assert_eq!(session.encounter_view().accepted_random_position, 2);
    assert_eq!(session.encounter_view().log.len(), 1);

    assert_atomic_rejection(
        &mut session,
        scenario,
        RpgActionProposal {
            expected_revision: 1,
            action_id: "action.basic-tactical-strike".to_owned(),
            actor_id: "anchor".to_owned(),
            target_ids: vec!["sentry".to_owned()],
            item_binding: second_blade_binding,
        },
        "RPG_ACTIVATION_BUDGET_INSUFFICIENT",
    );

    let replayed = RpgAuthoritySession::replay(initial, &[entry]).unwrap();
    assert_session_equal(&replayed, &session);

    let mut dead_target = scenario.clone();
    set_vitality(&mut dead_target, "sentry", 0);
    let mut dead_target_session =
        RpgAuthoritySession::from_scenario(bundle.clone(), dead_target.clone()).unwrap();
    let binding = action_binding(
        &dead_target_session,
        "action.basic-tactical-strike",
        Some("item.training-blade"),
    );
    assert_atomic_rejection(
        &mut dead_target_session,
        &dead_target,
        RpgActionProposal {
            expected_revision: 0,
            action_id: "action.basic-tactical-strike".to_owned(),
            actor_id: "anchor".to_owned(),
            target_ids: vec!["sentry".to_owned()],
            item_binding: binding,
        },
        "RPG_INTENT_TARGET_INACTIVE",
    );

    let mut dead_actor = scenario.clone();
    set_vitality(&mut dead_actor, "anchor", 0);
    let dead_actor_failure = RpgAuthoritySession::from_scenario(bundle.clone(), dead_actor)
        .expect_err("a zero-vitality current actor must fail before authority state");
    assert!(dead_actor_failure
        .diagnostics
        .iter()
        .any(|diagnostic| diagnostic.code == "RPG_SCENARIO_CURRENT_ACTOR_INACTIVE"));

    let mut invalid_path_session =
        RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    assert_atomic_rejection(
        &mut invalid_path_session,
        scenario,
        RpgActionProposal {
            expected_revision: 0,
            action_id: "action.tactical-move".to_owned(),
            actor_id: "anchor".to_owned(),
            target_ids: vec!["cell-99-99".to_owned()],
            item_binding: None,
        },
        "RPG_INTENT_CELL_BINDING_MISSING",
    );

    let mut duplicate_source_scenario = scenario.clone();
    let anchor = duplicate_source_scenario
        .participants
        .iter_mut()
        .find(|participant| participant.id == "anchor")
        .unwrap();
    anchor
        .feature_definition_ids
        .push(anchor.feature_definition_ids[0].clone());
    let duplicate_failure =
        RpgAuthoritySession::from_scenario(bundle.clone(), duplicate_source_scenario)
            .expect_err("duplicate selected source identities must fail before authority state");
    assert!(duplicate_failure
        .diagnostics
        .iter()
        .any(|diagnostic| { diagnostic.code == "RPG_SCENARIO_FEATURE_DEFINITIONS_NOT_CANONICAL" }));

    let malformed_before = dead_target_session.checkpoint().unwrap();
    let request = RpgRandomRequest {
        kind: RpgRandomRequestKind::ScalarTest,
        count: 2,
        sides: 20,
        path: "$.wrong".to_owned(),
        heterogeneous_terms: Vec::new(),
    };
    let mut malformed_source = RpgRollTapeSource::new(
        dead_target.random_source.clone(),
        [RpgRollTapeEntry {
            request,
            values: vec![20, 20],
        }],
    );
    let malformed = dead_target_session.submit_with_random_source_recorded(
        RpgActionProposal {
            expected_revision: 0,
            action_id: "action.basic-tactical-strike".to_owned(),
            actor_id: "anchor".to_owned(),
            target_ids: vec!["runner".to_owned()],
            item_binding: action_binding(
                &dead_target_session,
                "action.basic-tactical-strike",
                Some("item.training-blade"),
            ),
        },
        &mut malformed_source,
    );
    assert!(malformed.is_err());
    assert_eq!(dead_target_session.checkpoint().unwrap(), malformed_before);
}

fn prove_distinct_defenses_miss_and_inapplicable_evidence(
    bundle: &asha_rpg::CompiledPlayBundle,
    scenario: &RpgScenario,
) {
    let mut miss = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let mut entries = Vec::new();
    end_until(&mut miss, "pathfinder", &mut entries);
    let before_vitality = vitality(&miss, "adept");
    let mut low_random = StableSource::new(scenario.random_source.clone(), 1, 4);
    let (outcome, _) = submit(
        &mut miss,
        &mut low_random,
        "action.basic-tactical-strike",
        "pathfinder",
        Some("item.field-bow"),
        &["adept"],
    );
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("legal miss must still commit its budget: {outcome:?}");
    };
    let scalar = scalar_event(&receipt.events, "adept");
    assert_eq!(scalar.1, 11);
    assert_eq!(scalar.2, "miss");
    assert_contribution(scalar.3, "coordinated-pressure", |disposition| {
        matches!(disposition, RpgContributionDisposition::Inapplicable { .. })
    });
    assert_contribution(scalar.3, "measured-opening", |disposition| {
        matches!(disposition, RpgContributionDisposition::Inapplicable { .. })
    });
    assert_eq!(vitality(&miss, "adept"), before_vitality);
    assert!(!receipt
        .events
        .iter()
        .any(|event| matches!(event, RpgDomainEvent::DamagePacketApplied { .. })));

    let mut nerve = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let mut nerve_entries = Vec::new();
    end_until(&mut nerve, "guide", &mut nerve_entries);
    let mut high_random = StableSource::new(scenario.random_source.clone(), 20, 4);
    let (outcome, _) = submit(
        &mut nerve,
        &mut high_random,
        "action.basic-tactical-strike",
        "guide",
        Some("item.signal-baton"),
        &["sentry"],
    );
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("signal baton strike must commit: {outcome:?}");
    };
    assert_eq!(scalar_event(&receipt.events, "sentry").1, 11);
    assert!(receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::DamagePacketApplied { parts, .. }
            if parts[0].damage_type_id == "damage.resolve"
    )));

    let mut wits = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let mut wits_entries = Vec::new();
    end_until(&mut wits, "shaper", &mut wits_entries);
    let (outcome, _) = submit(
        &mut wits,
        &mut high_random,
        "action.basic-tactical-strike",
        "shaper",
        Some("item.resonance-rod"),
        &["adept"],
    );
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("resonance rod strike must commit: {outcome:?}");
    };
    assert_eq!(scalar_event(&receipt.events, "adept").1, 14);
    assert!(receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::DamagePacketApplied { parts, .. }
            if parts[0].damage_type_id == "damage.energy"
    )));
}

fn prove_cross_source_reduction_and_replay(
    bundle: &asha_rpg::CompiledPlayBundle,
    scenario: &RpgScenario,
) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let initial = session.checkpoint().unwrap();
    let mut entries = Vec::new();
    end_until(&mut session, "adept", &mut entries);

    let mut no_random = StableSource::new(scenario.random_source.clone(), 20, 4);
    let (outcome, apply_entry) = submit(
        &mut session,
        &mut no_random,
        "action.impose-unsettled",
        "adept",
        None,
        &["pathfinder"],
    );
    entries.push(apply_entry);
    let RpgCommandOutcome::Accepted(applied) = outcome else {
        panic!("unsettled condition must apply: {outcome:?}");
    };
    assert!(applied.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::EffectApplied {
            target_id,
            definition_id,
            remaining_count: 1,
            ..
        } if target_id == "pathfinder" && definition_id == "effect.unsettled"
    )));
    end_until(&mut session, "pathfinder", &mut entries);

    let mut strike_random = StableSource::new(scenario.random_source.clone(), 15, 4);
    let (outcome, strike_entry) = submit(
        &mut session,
        &mut strike_random,
        "action.basic-tactical-strike",
        "pathfinder",
        Some("item.training-blade"),
        &["sentry"],
    );
    entries.push(strike_entry);
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("effect-bearing pathfinder strike must commit: {outcome:?}");
    };
    let scalar = scalar_event(&receipt.events, "sentry");
    assert_eq!(scalar.1, 15);
    assert_eq!(scalar.2, "hit");
    let ids = scalar
        .3
        .candidates
        .iter()
        .map(|candidate| {
            (
                candidate.source_definition_id.as_str(),
                candidate.contribution_id.as_str(),
            )
        })
        .collect::<Vec<_>>();
    assert_eq!(
        ids,
        [
            ("effect.unsettled", "unsettled-penalty"),
            ("item.training-blade", "training-balance"),
            ("talent.coordinated-pressure", "coordinated-pressure"),
            ("talent.measured-opening", "measured-opening"),
        ]
    );
    assert_eq!(
        session
            .encounter_view()
            .participants
            .iter()
            .find(|participant| participant.id == "pathfinder")
            .unwrap()
            .feature_definition_ids,
        [
            "talent.coordinated-pressure".to_owned(),
            "talent.measured-opening".to_owned(),
        ]
    );
    // Source discovery crosses effect, bound-item, and selected-feature lanes.
    // The public ledger proves that Rust reduces them into one canonical order
    // rather than preserving their distinct collection order.
    assert_contribution(scalar.3, "unsettled-penalty", |disposition| {
        disposition == &RpgContributionDisposition::Applied
    });
    assert_contribution(scalar.3, "coordinated-pressure", |disposition| {
        disposition == &RpgContributionDisposition::Applied
    });
    assert_contribution(scalar.3, "measured-opening", |disposition| {
        disposition == &RpgContributionDisposition::Applied
    });
    assert_contribution(scalar.3, "training-balance", |disposition| {
        matches!(
            disposition,
            RpgContributionDisposition::Suppressed {
                retained_contribution_ids,
                ..
            } if retained_contribution_ids
                == &["talent.coordinated-pressure#-:coordinated-pressure".to_owned()]
        )
    });

    let replayed = RpgAuthoritySession::replay(initial, &entries).unwrap();
    assert_session_equal(&replayed, &session);
}

fn prove_area_cost_once_and_healing(bundle: &asha_rpg::CompiledPlayBundle, scenario: &RpgScenario) {
    let mut area_session =
        RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let mut area_entries = Vec::new();
    end_until(&mut area_session, "shaper", &mut area_entries);
    let area_option = area_session
        .encounter_view()
        .actions
        .iter()
        .find(|action| action.definition_id == "action.crosswind-sweep")
        .unwrap()
        .options
        .area_options
        .iter()
        .find(|option| option.anchor_cell_id == "cell-2-3")
        .cloned()
        .expect("authority must project the two-target sweep");
    assert_eq!(
        area_option.included_participant_ids,
        ["runner".to_owned(), "sentry".to_owned()]
    );

    let mut cloned = area_session.clone();
    let clone_before = cloned.checkpoint().unwrap();
    let mut no_random = StableSource::new(scenario.random_source.clone(), 20, 4);
    let stale = cloned
        .submit_area_with_random_source_recorded(area_proposal(&area_option), &mut no_random)
        .unwrap();
    assert!(matches!(
        stale.outcome,
        RpgCommandOutcome::Rejected(ref rejection) if rejection.code == "RPG_AREA_OPTION_STALE"
    ));
    assert!(stale.replay_entry.is_none());
    assert_eq!(cloned.checkpoint().unwrap(), clone_before);

    let area_initial = area_session.checkpoint().unwrap();
    let mut random = StableSource::new(scenario.random_source.clone(), 20, 4);
    let area = area_session
        .submit_area_option_with_random_source_recorded(area_option, &mut random)
        .unwrap();
    let RpgCommandOutcome::Accepted(receipt) = area.outcome else {
        panic!("current sweep option must commit: {:?}", area.outcome);
    };
    let area_entry = area.replay_entry.expect("accepted area replay entry");
    assert!(receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::AreaTargetsDerived {
            anchor_cell_id,
            included_participant_ids,
            ..
        } if anchor_cell_id == "cell-2-3"
            && included_participant_ids == &["runner".to_owned(), "sentry".to_owned()]
    )));
    assert_eq!(
        receipt
            .random_evidence
            .iter()
            .map(|evidence| (
                evidence.request.kind,
                evidence.request.count,
                evidence.request.sides,
                evidence.values.clone(),
            ))
            .collect::<Vec<_>>(),
        [
            (RpgRandomRequestKind::ScalarTest, 1, 20, vec![20]),
            (RpgRandomRequestKind::ScalarTest, 1, 20, vec![20]),
            (RpgRandomRequestKind::FormulaDice, 1, 6, vec![4]),
            (RpgRandomRequestKind::FormulaDice, 1, 6, vec![4]),
        ]
    );
    assert_eq!(
        receipt
            .random_evidence
            .iter()
            .map(|evidence| evidence.request.path.as_str())
            .collect::<Vec<_>>(),
        [
            "$.action.check.targets[0].roll",
            "$.action.check.targets[1].roll",
            "$.action.program.body.targets[0].critical.parts[0].amount.dice[0]",
            "$.action.program.body.targets[1].critical.parts[0].amount.dice[0]",
        ]
    );
    assert_eq!(scalar_event(&receipt.events, "runner").1, 14);
    assert_eq!(scalar_event(&receipt.events, "sentry").1, 11);
    assert_eq!(budget(&area_session, "shaper", "standard"), 0);
    assert_eq!(resource(&area_session, "shaper", "resource.focus"), 4);
    assert_eq!(vitality(&area_session, "runner"), 4);
    assert_eq!(vitality(&area_session, "sentry"), 7);
    let replayed = RpgAuthoritySession::replay(area_initial, &[area_entry]).unwrap();
    assert_session_equal(&replayed, &area_session);

    let mut healing_session =
        RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let mut entries = Vec::new();
    end_until(&mut healing_session, "runner", &mut entries);
    let mut attack_random = StableSource::new(scenario.random_source.clone(), 20, 4);
    let (outcome, entry) = submit(
        &mut healing_session,
        &mut attack_random,
        "action.basic-tactical-strike",
        "runner",
        Some("item.field-bow"),
        &["anchor"],
    );
    entries.push(entry);
    assert!(matches!(outcome, RpgCommandOutcome::Accepted(_)));
    assert_eq!(vitality(&healing_session, "anchor"), 14);
    end_until(&mut healing_session, "guide", &mut entries);
    let mut heal_random = StableSource::new(scenario.random_source.clone(), 20, 4);
    let (outcome, entry) = submit(
        &mut healing_session,
        &mut heal_random,
        "action.focused-recovery",
        "guide",
        None,
        &["anchor"],
    );
    entries.push(entry);
    let RpgCommandOutcome::Accepted(healed) = outcome else {
        panic!("focused recovery must commit: {outcome:?}");
    };
    assert!(healed.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::HealingApplied {
            target_id,
            amount: 6,
            current_vitality: 18,
            ..
        } if target_id == "anchor"
    )));
    assert_eq!(vitality(&healing_session, "anchor"), 18);
    assert_eq!(resource(&healing_session, "guide", "resource.focus"), 3);
    assert_eq!(budget(&healing_session, "guide", "bonus"), 0);
    assert_eq!(budget(&healing_session, "guide", "standard"), 1);
}

fn prove_conditions_movement_reaction_and_forced_movement(
    bundle: &asha_rpg::CompiledPlayBundle,
    scenario: &RpgScenario,
) {
    prove_held_condition(bundle, scenario);
    prove_movement_reaction(bundle, scenario);
    prove_forced_movement(bundle, scenario);
}

fn prove_held_condition(bundle: &asha_rpg::CompiledPlayBundle, scenario: &RpgScenario) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let initial = session.checkpoint().unwrap();
    let mut entries = Vec::new();
    let mut random = StableSource::new(scenario.random_source.clone(), 20, 4);
    let (outcome, entry) = submit(
        &mut session,
        &mut random,
        "action.impose-held",
        "anchor",
        None,
        &["sentry"],
    );
    entries.push(entry);
    assert!(matches!(outcome, RpgCommandOutcome::Accepted(_)));
    end_until(&mut session, "sentry", &mut entries);
    assert_eq!(
        session
            .encounter_view()
            .participants
            .iter()
            .find(|participant| participant.id == "sentry")
            .unwrap()
            .effects[0]
            .definition_id,
        "effect.held"
    );
    let movement = session
        .encounter_view()
        .actions
        .iter()
        .find(|action| action.definition_id == "action.tactical-move")
        .unwrap()
        .clone();
    assert!(!movement.available);
    let before = session.checkpoint().unwrap();
    let (rejected, _) = session
        .submit_with_random_source_recorded(
            RpgActionProposal {
                expected_revision: session.state().revision(),
                action_id: "action.tactical-move".to_owned(),
                actor_id: "sentry".to_owned(),
                target_ids: vec!["cell-4-2".to_owned()],
                item_binding: None,
            },
            &mut random,
        )
        .unwrap();
    assert!(
        matches!(
            rejected,
            RpgCommandOutcome::Rejected(ref rejection)
            if rejection.code == "RPG_CONDITION_MOVEMENT_RESTRICTED"
        ),
        "unexpected held-movement rejection: {rejected:?}"
    );
    assert_eq!(session.checkpoint().unwrap(), before);

    end_until_round_actor(&mut session, 3, "sentry", &mut entries);
    assert!(session
        .encounter_view()
        .participants
        .iter()
        .find(|participant| participant.id == "sentry")
        .unwrap()
        .effects
        .is_empty());
    assert!(
        session
            .encounter_view()
            .actions
            .iter()
            .find(|action| action.definition_id == "action.tactical-move")
            .unwrap()
            .available
    );
    assert!(session
        .encounter_view()
        .log
        .iter()
        .flat_map(|entry| &entry.events)
        .any(|event| matches!(
            event,
            RpgDomainEvent::EffectExpired { definition_id, .. }
                if definition_id == "effect.held"
        )));
    assert_eq!(budget(&session, "anchor", "standard"), 1);
    let replayed = RpgAuthoritySession::replay(initial, &entries).unwrap();
    assert_session_equal(&replayed, &session);
}

fn prove_movement_reaction(bundle: &asha_rpg::CompiledPlayBundle, scenario: &RpgScenario) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let initial = session.checkpoint().unwrap();
    let mut entries = Vec::new();
    end_until(&mut session, "sentry", &mut entries);
    let destination = "cell-4-2";
    let route = session
        .encounter_view()
        .actions
        .iter()
        .find(|action| action.definition_id == "action.tactical-move")
        .unwrap()
        .options
        .cell_paths
        .iter()
        .find(|path| path.destination_cell_id == destination)
        .cloned()
        .expect("sentry must have a route that leaves anchor adjacency");
    assert_eq!(route.movement_cost, 2);
    let mut no_random = StableSource::new(scenario.random_source.clone(), 20, 4);
    let (outcome, submit_entry) = submit(
        &mut session,
        &mut no_random,
        "action.tactical-move",
        "sentry",
        None,
        &[destination],
    );
    entries.push(submit_entry);
    let RpgCommandOutcome::AwaitingReaction(pending) = outcome else {
        panic!("voluntary departure must open anchor response: {outcome:?}");
    };
    assert_eq!(pending.request.actor_id, "sentry");
    assert_eq!(pending.request.target_id, "sentry");
    let movement_context = pending.request.movement.as_ref().unwrap();
    assert_eq!(movement_context.owner_id, "anchor");
    assert_eq!(
        movement_context.source_definition_id,
        "talent.watchful-response"
    );
    let response_option_id = pending.request.options[0].id.clone();
    let pending_before = session.checkpoint().unwrap();
    let (invalid, _) = session
        .react_with_random_values_recorded(
            RpgReactionProposal {
                expected_revision: pending.expected_revision,
                reaction_id: pending.request.reaction_id.clone(),
                option_id: Some(response_option_id.clone()),
            },
            vec![1, 1],
        )
        .unwrap();
    assert!(matches!(
        invalid,
        RpgCommandOutcome::Rejected(ref rejection)
            if rejection.code == "RPG_RANDOM_EVIDENCE_UNUSED"
    ));
    assert_eq!(session.checkpoint().unwrap(), pending_before);
    let (outcome, reaction_entry) = session
        .react_with_random_source_recorded(
            RpgReactionProposal {
                expected_revision: pending.expected_revision,
                reaction_id: pending.request.reaction_id,
                option_id: Some(response_option_id),
            },
            &mut no_random,
        )
        .unwrap();
    entries.push(reaction_entry);
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("movement response must commit with movement: {outcome:?}");
    };
    assert_eq!(
        session.state().entity("sentry").unwrap().position(),
        GridPosition { x: 4, y: 2 }
    );
    assert_eq!(vitality(&session, "sentry"), 8);
    assert_eq!(budget(&session, "anchor", "reaction"), 0);
    assert!(receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::MovementTransition {
            moved_participant_id,
            movement_kind: RpgMovementKind::Voluntary,
            provokes: true,
            ..
        } if moved_participant_id == "sentry"
    )));
    assert!(receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::MovementReactionResolved {
            owner_id,
            accepted: true,
            ..
        } if owner_id == "anchor"
    )));
    let replayed = RpgAuthoritySession::replay(initial, &entries).unwrap();
    assert_session_equal(&replayed, &session);
}

fn prove_forced_movement(bundle: &asha_rpg::CompiledPlayBundle, scenario: &RpgScenario) {
    let mut push = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let push_initial = push.checkpoint().unwrap();
    let mut push_entries = Vec::new();
    end_until(&mut push, "sentry", &mut push_entries);
    let mut no_random = StableSource::new(scenario.random_source.clone(), 20, 4);
    let (outcome, entry) = submit(
        &mut push,
        &mut no_random,
        "action.tactical-push",
        "sentry",
        None,
        &["anchor"],
    );
    push_entries.push(entry);
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("push must commit its canonical route: {outcome:?}");
    };
    assert!(receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::MovementTransition {
            moved_participant_id,
            movement_kind: RpgMovementKind::Push,
            provokes: false,
            ..
        } if moved_participant_id == "anchor"
    )));
    assert!(!receipt
        .events
        .iter()
        .any(|event| matches!(event, RpgDomainEvent::MovementReactionOpened { .. })));
    let replayed = RpgAuthoritySession::replay(push_initial, &push_entries).unwrap();
    assert_session_equal(&replayed, &push);

    let mut slide = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let slide_initial = slide.checkpoint().unwrap();
    let mut slide_entries = Vec::new();
    end_until(&mut slide, "runner", &mut slide_entries);
    let (outcome, submit_entry) = submit(
        &mut slide,
        &mut no_random,
        "action.tactical-slide",
        "runner",
        None,
        &["anchor"],
    );
    slide_entries.push(submit_entry);
    let RpgCommandOutcome::AwaitingForcedMovement(pending) = outcome else {
        panic!("slide must expose authority route choices: {outcome:?}");
    };
    let option = pending
        .options
        .first()
        .cloned()
        .expect("slide route option");
    let mut stale = option.clone();
    stale.route.destination_cell_id = "cell-99-99".to_owned();
    let pending_before = slide.checkpoint().unwrap();
    let (rejected, _) = slide
        .resolve_forced_movement_recorded(RpgForcedMovementCommand { option: stale }, Vec::new())
        .unwrap();
    assert!(matches!(
        rejected,
        RpgCommandOutcome::Rejected(ref rejection)
            if rejection.code == "RPG_FORCED_MOVEMENT_OPTION_STALE"
    ));
    assert_eq!(slide.checkpoint().unwrap(), pending_before);
    let (outcome, choice_entry) = slide
        .resolve_forced_movement_recorded(
            RpgForcedMovementCommand {
                option: option.clone(),
            },
            Vec::new(),
        )
        .unwrap();
    slide_entries.push(choice_entry);
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("current slide route must commit: {outcome:?}");
    };
    assert!(receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::MovementTransition {
            movement_kind: RpgMovementKind::Slide,
            provokes: false,
            ..
        }
    )));
    let replayed = RpgAuthoritySession::replay(slide_initial, &slide_entries).unwrap();
    assert_session_equal(&replayed, &slide);
}

fn prove_spatial_source_lifecycle_checkpoint_and_replay(
    bundle: &asha_rpg::CompiledPlayBundle,
    scenario: &RpgScenario,
) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let initial = session.checkpoint().unwrap();
    let mut entries = Vec::new();
    end_until(&mut session, "runner", &mut entries);
    let mut no_random = StableSource::new(scenario.random_source.clone(), 20, 4);
    let (moved, entry) = submit(
        &mut session,
        &mut no_random,
        "action.tactical-move",
        "runner",
        None,
        &["cell-2-1"],
    );
    entries.push(entry);
    match moved {
        RpgCommandOutcome::Accepted(_) => {}
        RpgCommandOutcome::AwaitingReaction(pending) => {
            let (declined, entry) = session
                .react_with_random_source_recorded(
                    RpgReactionProposal {
                        expected_revision: pending.expected_revision,
                        reaction_id: pending.request.reaction_id,
                        option_id: None,
                    },
                    &mut no_random,
                )
                .unwrap();
            entries.push(entry);
            assert!(matches!(declined, RpgCommandOutcome::Accepted(_)));
        }
        other => panic!("runner movement must commit after response choice: {other:?}"),
    }
    end_until(&mut session, "shaper", &mut entries);
    let (created, entry) = submit(
        &mut session,
        &mut no_random,
        "action.raise-pressure-field",
        "shaper",
        None,
        &["shaper"],
    );
    entries.push(entry);
    let RpgCommandOutcome::Accepted(created) = created else {
        panic!("pressure field must be created: {created:?}");
    };
    assert!(created.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::SpatialSourceCreated {
            owner_id,
            source_id,
            definition_id,
            remaining_count: 2,
            ..
        } if owner_id == "shaper"
            && source_id == "shaper"
            && definition_id == "spatial-source.pressure-field"
    )));
    assert_eq!(session.encounter_view().spatial_sources.len(), 1);
    assert_eq!(resource(&session, "shaper", "resource.focus"), 3);

    let runner_before = vitality(&session, "runner");
    end_until_round_actor(&mut session, 2, "runner", &mut entries);
    assert_eq!(vitality(&session, "runner"), runner_before - 1);
    assert!(session
        .encounter_view()
        .log
        .iter()
        .flat_map(|entry| &entry.events)
        .any(|event| matches!(
            event,
            RpgDomainEvent::SpatialSourceTriggerEvaluated {
                boundary: asha_rpg::RpgSpatialSourceBoundary::StartTurn,
                participant_id,
                definition_id,
                ..
            } if participant_id == "runner"
                && definition_id == "spatial-source.pressure-field"
        )));

    let checkpoint = session.checkpoint().unwrap();
    let restored = RpgAuthoritySession::restore_checkpoint(checkpoint).unwrap();
    assert_session_equal(&restored, &session);
    let replayed = RpgAuthoritySession::replay(initial, &entries).unwrap();
    assert_session_equal(&replayed, &session);
}

fn submit(
    session: &mut RpgAuthoritySession,
    random: &mut dyn RpgRandomSource,
    action_id: &str,
    actor_id: &str,
    item_definition_id: Option<&str>,
    target_ids: &[&str],
) -> (RpgCommandOutcome, RpgReplayEntry) {
    let proposal = RpgActionProposal {
        expected_revision: session.state().revision(),
        action_id: action_id.to_owned(),
        actor_id: actor_id.to_owned(),
        target_ids: target_ids.iter().map(|value| (*value).to_owned()).collect(),
        item_binding: action_binding(session, action_id, item_definition_id),
    };
    session
        .submit_with_random_source_recorded(proposal, random)
        .unwrap()
}

fn action_binding(
    session: &RpgAuthoritySession,
    action_id: &str,
    item_definition_id: Option<&str>,
) -> Option<RpgIntentItemBinding> {
    session
        .encounter_view()
        .actions
        .into_iter()
        .find(|action| {
            action.definition_id == action_id
                && action
                    .item_binding
                    .as_ref()
                    .map(|binding| binding.item_definition_id.as_str())
                    == item_definition_id
        })
        .unwrap_or_else(|| {
            panic!("current actor must expose {action_id} with binding {item_definition_id:?}")
        })
        .item_binding
}

fn assert_atomic_rejection(
    session: &mut RpgAuthoritySession,
    scenario: &RpgScenario,
    proposal: RpgActionProposal,
    expected_code: &str,
) {
    let before = session.checkpoint().unwrap();
    let before_view = session.encounter_view();
    let mut random = StableSource::new(scenario.random_source.clone(), 20, 4);
    let (outcome, replay) = session
        .submit_with_random_source_recorded(proposal, &mut random)
        .unwrap();
    assert!(
        matches!(
            outcome,
            RpgCommandOutcome::Rejected(ref rejection) if rejection.code == expected_code
        ),
        "expected {expected_code}, received {outcome:?}"
    );
    assert!(matches!(
        replay.outcome,
        RpgCommandOutcome::Rejected(ref rejection) if rejection.code == expected_code
    ));
    assert_eq!(session.checkpoint().unwrap(), before);
    assert_eq!(session.encounter_view(), before_view);
    assert_eq!(random.draw_count, 0);
}

fn end_until(
    session: &mut RpgAuthoritySession,
    desired_actor_id: &str,
    entries: &mut Vec<RpgReplayEntry>,
) {
    while session.turn().current_actor_id != desired_actor_id {
        end_current_turn(session, entries);
    }
}

fn end_until_round_actor(
    session: &mut RpgAuthoritySession,
    round: u64,
    desired_actor_id: &str,
    entries: &mut Vec<RpgReplayEntry>,
) {
    while session.turn().round != round || session.turn().current_actor_id != desired_actor_id {
        end_current_turn(session, entries);
    }
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

fn area_proposal(option: &asha_rpg::RpgAreaOptionView) -> RpgAreaActionProposal {
    RpgAreaActionProposal {
        session_binding_id: option.session_binding_id.clone(),
        authority_revision: option.authority_revision,
        action_id: option.action_id.clone(),
        actor_id: option.current_actor_id.clone(),
        anchor_cell_id: option.anchor_cell_id.clone(),
        item_binding: option.item_binding.clone(),
    }
}

fn scalar_event<'a>(
    events: &'a [RpgDomainEvent],
    target_id: &str,
) -> (
    &'a str,
    i32,
    &'a str,
    &'a asha_rpg::RpgScalarContributionLedger,
) {
    events
        .iter()
        .find_map(|event| match event {
            RpgDomainEvent::ScalarTestResolved {
                target_id: resolved_target,
                profile_id,
                difficulty,
                final_band_id,
                contribution_ledger,
                ..
            } if resolved_target == target_id => Some((
                profile_id.as_str(),
                *difficulty,
                final_band_id.as_str(),
                contribution_ledger,
            )),
            _ => None,
        })
        .unwrap_or_else(|| panic!("missing scalar event for {target_id}"))
}

fn assert_contribution(
    ledger: &asha_rpg::RpgScalarContributionLedger,
    contribution_id: &str,
    predicate: impl FnOnce(&RpgContributionDisposition) -> bool,
) {
    let candidate = ledger
        .candidates
        .iter()
        .find(|candidate| candidate.contribution_id == contribution_id)
        .unwrap_or_else(|| panic!("missing contribution {contribution_id}: {ledger:#?}"));
    assert!(
        predicate(&candidate.disposition),
        "unexpected contribution disposition: {candidate:#?}"
    );
}

fn budget(session: &RpgAuthoritySession, participant_id: &str, budget_id: &str) -> i32 {
    session
        .encounter_view()
        .participants
        .iter()
        .find(|participant| participant.id == participant_id)
        .unwrap()
        .activation_budgets
        .iter()
        .find(|budget| budget.id == budget_id)
        .unwrap()
        .remaining
}

fn resource(session: &RpgAuthoritySession, participant_id: &str, resource_id: &str) -> i32 {
    session
        .state()
        .entity(participant_id)
        .unwrap()
        .resource(resource_id)
        .unwrap()
        .current
}

fn vitality(session: &RpgAuthoritySession, participant_id: &str) -> i32 {
    session
        .state()
        .entity(participant_id)
        .unwrap()
        .vitality()
        .current
}

fn set_vitality(scenario: &mut RpgScenario, participant_id: &str, current: i32) {
    let participant = scenario
        .participants
        .iter_mut()
        .find(|participant| participant.id == participant_id)
        .unwrap();
    let vitality = participant
        .capabilities
        .iter_mut()
        .find_map(|capability| match capability {
            RpgInitialCapability::Vitality { value } => Some(value),
            _ => None,
        })
        .unwrap();
    vitality.current = current;
}

fn assert_session_equal(left: &RpgAuthoritySession, right: &RpgAuthoritySession) {
    assert_eq!(left.state_hash().unwrap(), right.state_hash().unwrap());
    assert_eq!(
        left.encounter_view().accepted_random_position,
        right.encounter_view().accepted_random_position
    );
    assert_eq!(left.encounter_view().log, right.encounter_view().log);
    assert_eq!(
        left.encounter_view().participants,
        right.encounter_view().participants
    );
    assert_eq!(
        left.encounter_view().spatial_sources,
        right.encounter_view().spatial_sources
    );
    assert_eq!(left.turn(), right.turn());
}

struct StableSource {
    binding: RpgRandomSourceBinding,
    d20_value: u32,
    other_value: u32,
    draw_count: u64,
}

impl StableSource {
    fn new(binding: RpgRandomSourceBinding, d20_value: u32, other_value: u32) -> Self {
        Self {
            binding,
            d20_value,
            other_value,
            draw_count: 0,
        }
    }
}

impl RpgRandomSource for StableSource {
    fn binding(&self) -> &RpgRandomSourceBinding {
        &self.binding
    }

    fn draw(&mut self, request: &RpgRandomRequest) -> Result<Vec<u32>, RpgRandomSourceFailure> {
        self.draw_count = self
            .draw_count
            .checked_add(u64::from(request.count))
            .expect("bounded random draw count");
        let value = if request.sides == 20 {
            self.d20_value
        } else {
            self.other_value.min(request.sides)
        };
        Ok(vec![value; request.count as usize])
    }
}
