use std::io::{self, Read};

use asha_rpg::{
    compile_prepared_play_bundle_json, GridPosition, RpgActionProposal, RpgAreaActionProposal,
    RpgAuthoritySession, RpgCommandOutcome, RpgContributionDisposition,
    RpgDamageResponseDisposition, RpgDomainEvent, RpgIntentItemBinding,
    RpgOutcomeBandShiftDisposition, RpgRandomRequest, RpgRandomSource, RpgRandomSourceBinding,
    RpgRandomSourceFailure, RpgReactionProposal, RpgReplayEntry, RpgScalarContributionLedger,
    RpgScenario, RpgTurnControl, RpgTurnControlProposal,
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
        .expect("read context tactics session source");
    let source: SessionSource = serde_json::from_slice(&input).expect("decode session source");
    let prepared = serde_json::to_vec(&source.prepared).expect("encode prepared PlayBundle");
    let bundle =
        compile_prepared_play_bundle_json(&prepared).expect("compile context tactics PlayBundle");
    let mut scenario_value = source.scenario;
    scenario_value["playBundleId"] = Value::String(bundle.artifact().artifact_id.clone());
    let scenario: RpgScenario =
        serde_json::from_value(scenario_value).expect("decode context tactics Scenario");

    prove_context_ledgers_packet_and_replay(&bundle, &scenario);
    prove_inapplicable_context(&bundle, &scenario);
    prove_defense_test(&bundle, &scenario);
    prove_budgets_effect_expiry_and_replay(&bundle, &scenario);
    prove_area_staleness_responses_and_movement(&bundle, &scenario);
    println!(
        "verified context tactics kit at artifact {}",
        bundle.artifact().artifact_id
    );
}

fn prove_context_ledgers_packet_and_replay(
    bundle: &asha_rpg::CompiledPlayBundle,
    scenario: &RpgScenario,
) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let initial = session.checkpoint().unwrap();
    let mut random = StableSource::new(scenario.random_source.clone());
    let (pending, submit_entry) = submit(
        &mut session,
        &mut random,
        "action.context-strike",
        "coordinator",
        Some("item.calibrated-rod"),
        &["keeper"],
    );
    let RpgCommandOutcome::AwaitingReaction(pending) = pending else {
        panic!("context strike must open the response: {pending:?}");
    };
    let (outcome, reaction_entry) = session
        .react_with_random_source_recorded(
            RpgReactionProposal {
                expected_revision: pending.expected_revision,
                reaction_id: pending.request.reaction_id,
                option_id: Some("soften".to_owned()),
            },
            &mut random,
        )
        .unwrap();
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("context strike response must commit: {outcome:?}");
    };
    let scalar = scalar_event(&receipt.events);
    assert_eq!(scalar.actor_id, "coordinator");
    assert_eq!(scalar.target_id, "keeper");
    assert_eq!(scalar.profile_id, "four-step-test");
    assert_eq!(scalar.base_band_id, "advance");
    assert_eq!(scalar.final_band_id, "breakthrough");
    assert_eq!(scalar.roll, 6);
    assert_decision(
        &scalar.contribution_ledger,
        "actor-ready",
        RpgContributionDisposition::Suppressed {
            policy: asha_rpg::RpgContributionStackingPolicy::Greatest,
            retained_contribution_ids: vec![
                "item.calibrated-rod#coordinator-rod:calibrated-edge".to_owned()
            ],
        },
    );
    assert_decision(
        &scalar.contribution_ledger,
        "cell-overlook",
        RpgContributionDisposition::Suppressed {
            policy: asha_rpg::RpgContributionStackingPolicy::Greatest,
            retained_contribution_ids: vec![
                "item.calibrated-rod#coordinator-rod:calibrated-edge".to_owned()
            ],
        },
    );
    assert_decision(
        &scalar.contribution_ledger,
        "target-opening",
        RpgContributionDisposition::Applied,
    );
    assert_decision(
        &scalar.contribution_ledger,
        "calibrated-edge",
        RpgContributionDisposition::Applied,
    );
    let overlook_shift = scalar
        .band_shift_candidates
        .iter()
        .find(|candidate| candidate.shift_id == "overlook-shift")
        .expect("overlook band shift");
    assert_eq!(
        overlook_shift.disposition,
        RpgOutcomeBandShiftDisposition::Applied
    );
    let guarded_shift = scalar
        .band_shift_candidates
        .iter()
        .find(|candidate| candidate.shift_id == "guarded-shift")
        .expect("guarded band shift");
    assert!(matches!(
        guarded_shift.disposition,
        RpgOutcomeBandShiftDisposition::Inapplicable { .. }
    ));
    assert_eq!(
        receipt
            .random_evidence
            .iter()
            .map(|evidence| (
                evidence.request.count,
                evidence.request.sides,
                evidence.values.as_slice(),
            ))
            .collect::<Vec<_>>(),
        [(1, 20, &[6][..]), (1, 10, &[4][..])]
    );
    let packet = damage_packet(&receipt.events, "keeper");
    assert_eq!(
        packet
            .iter()
            .map(|part| part.part_id.as_str())
            .collect::<Vec<_>>(),
        ["kinetic", "strain"]
    );
    assert!(
        packet.iter().any(|part| {
            part.response_candidates
                .iter()
                .any(|candidate| candidate.disposition == RpgDamageResponseDisposition::Applied)
        }),
        "packet must expose applied responses: {packet:?}"
    );
    assert!(packet[0].response_candidates.iter().any(|candidate| {
        candidate.response_id == "strain-trim"
            && matches!(
                candidate.disposition,
                RpgDamageResponseDisposition::Inapplicable { .. }
            )
    }));
    assert!(packet[1].response_candidates.iter().any(|candidate| {
        candidate.response_id == "kinetic-scale"
            && matches!(
                candidate.disposition,
                RpgDamageResponseDisposition::Inapplicable { .. }
            )
    }));
    assert_eq!(budget(&session, "coordinator", "tempo"), 1);
    assert_eq!(budget(&session, "keeper", "response"), 0);
    assert_eq!(session.encounter_view().accepted_activations_this_turn, 2);

    let replayed = RpgAuthoritySession::replay(initial, &[submit_entry, reaction_entry]).unwrap();
    assert_eq!(
        replayed.state_hash().unwrap(),
        session.state_hash().unwrap()
    );
    assert_eq!(replayed.encounter_view().log, session.encounter_view().log);
}

fn prove_inapplicable_context(bundle: &asha_rpg::CompiledPlayBundle, scenario: &RpgScenario) {
    let mut without_overlook = scenario.clone();
    without_overlook
        .board
        .cells
        .iter_mut()
        .find(|cell| cell.id == "cell-1-1")
        .unwrap()
        .capabilities
        .clear();
    let scalar = resolved_strike(bundle, without_overlook, "keeper");
    assert_eq!(scalar.base_band_id, "advance");
    assert_eq!(scalar.final_band_id, "advance");
    assert_decision_kind(
        &scalar.contribution_ledger,
        "cell-overlook",
        |disposition| matches!(disposition, RpgContributionDisposition::Inapplicable { .. }),
    );
    assert!(scalar.band_shift_candidates.iter().any(|candidate| {
        candidate.shift_id == "overlook-shift"
            && matches!(
                candidate.disposition,
                RpgOutcomeBandShiftDisposition::Inapplicable { .. }
            )
    }));

    let mut guarded_scenario = scenario.clone();
    let keeper = guarded_scenario
        .participants
        .iter_mut()
        .find(|participant| participant.id == "keeper")
        .unwrap();
    let keeper_ward = keeper
        .capabilities
        .iter_mut()
        .find(|capability| {
            matches!(
                capability,
                asha_rpg::RpgInitialCapability::Defense { id, .. }
                    if id == "ward"
            )
        })
        .unwrap();
    let asha_rpg::RpgInitialCapability::Defense { value, .. } = keeper_ward else {
        unreachable!("keeper ward capability")
    };
    *value = 14;
    let guarded = resolved_strike(bundle, guarded_scenario, "keeper");
    assert_decision_kind(
        &guarded.contribution_ledger,
        "target-opening",
        |disposition| matches!(disposition, RpgContributionDisposition::Inapplicable { .. }),
    );
    assert!(guarded.band_shift_candidates.iter().any(|candidate| {
        candidate.shift_id == "guarded-shift"
            && candidate.disposition == RpgOutcomeBandShiftDisposition::Applied
    }));
}

fn prove_defense_test(bundle: &asha_rpg::CompiledPlayBundle, scenario: &RpgScenario) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let mut random = StableSource::new(scenario.random_source.clone());
    let (outcome, _) = submit(
        &mut session,
        &mut random,
        "action.ward-probe",
        "coordinator",
        None,
        &["keeper"],
    );
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("ward probe must commit: {outcome:?}");
    };
    let scalar = scalar_event(&receipt.events);
    assert_eq!(scalar.difficulty, 12);
    assert_eq!(scalar.base_band_id, "advance");
    assert_eq!(scalar.final_band_id, "breakthrough");
    assert_eq!(budget(&session, "coordinator", "tempo"), 2);
}

fn prove_budgets_effect_expiry_and_replay(
    bundle: &asha_rpg::CompiledPlayBundle,
    scenario: &RpgScenario,
) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let initial = session.checkpoint().unwrap();
    let mut entries = Vec::new();
    let mut random = StableSource::new(scenario.random_source.clone());

    let (outcome, entry) = submit(
        &mut session,
        &mut random,
        "action.observe-field",
        "coordinator",
        None,
        &["coordinator"],
    );
    assert!(matches!(outcome, RpgCommandOutcome::Accepted(_)));
    entries.push(entry);
    assert_eq!(budget(&session, "coordinator", "tempo"), 3);

    let (outcome, entry) = submit(
        &mut session,
        &mut random,
        "action.center-line",
        "coordinator",
        None,
        &["coordinator"],
    );
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("center line must commit: {outcome:?}");
    };
    entries.push(entry);
    assert!(receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::ResourceSpent {
            entity_id,
            resource_id,
            amount: 1,
            remaining: 0,
        } if entity_id == "coordinator" && resource_id == "drive"
    )));
    assert_eq!(budget(&session, "coordinator", "tempo"), 2);
    assert_eq!(
        session
            .state()
            .entity("coordinator")
            .unwrap()
            .resource("reserve")
            .unwrap()
            .current,
        2
    );

    let (pending, entry) = submit(
        &mut session,
        &mut random,
        "action.context-strike",
        "coordinator",
        Some("item.calibrated-rod"),
        &["keeper"],
    );
    entries.push(entry);
    let RpgCommandOutcome::AwaitingReaction(pending) = pending else {
        panic!("centered strike must open response: {pending:?}");
    };
    let (outcome, entry) = session
        .react_with_random_source_recorded(
            RpgReactionProposal {
                expected_revision: pending.expected_revision,
                reaction_id: pending.request.reaction_id,
                option_id: Some("soften".to_owned()),
            },
            &mut random,
        )
        .unwrap();
    entries.push(entry);
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("centered strike must commit: {outcome:?}");
    };
    let scalar = scalar_event(&receipt.events);
    assert_decision(
        &scalar.contribution_ledger,
        "centered-edge",
        RpgContributionDisposition::Applied,
    );
    assert_decision_kind(
        &scalar.contribution_ledger,
        "calibrated-edge",
        |disposition| matches!(disposition, RpgContributionDisposition::Suppressed { .. }),
    );
    assert_eq!(budget(&session, "coordinator", "tempo"), 0);

    let (outcome, entry) = submit(
        &mut session,
        &mut random,
        "action.observe-field",
        "coordinator",
        None,
        &["coordinator"],
    );
    assert!(matches!(outcome, RpgCommandOutcome::Accepted(_)));
    entries.push(entry);
    assert_eq!(session.encounter_view().accepted_activations_this_turn, 5);

    let before_hash = session.state_hash().unwrap();
    let before_log = session.encounter_view().log;
    let before_random = random.draw_count;
    let rejected = session
        .submit_with_random_source_recorded(
            RpgActionProposal {
                expected_revision: session.state().revision(),
                action_id: "action.observe-field".to_owned(),
                actor_id: "coordinator".to_owned(),
                target_ids: vec!["coordinator".to_owned()],
                item_binding: None,
            },
            &mut random,
        )
        .unwrap();
    assert!(matches!(
        rejected.0,
        RpgCommandOutcome::Rejected(ref rejection)
            if rejection.code == "RPG_ACTIVATION_CEILING_REACHED"
    ));
    assert!(matches!(
        rejected.1.outcome,
        RpgCommandOutcome::Rejected(ref rejection)
            if rejection.code == "RPG_ACTIVATION_CEILING_REACHED"
    ));
    assert_eq!(session.state_hash().unwrap(), before_hash);
    assert_eq!(session.encounter_view().log, before_log);
    assert_eq!(random.draw_count, before_random);

    end_current_turn(&mut session, &mut entries);
    end_until(&mut session, "coordinator", &mut entries);
    assert_eq!(budget(&session, "coordinator", "tempo"), 3);
    assert_eq!(session.encounter_view().accepted_activations_this_turn, 0);
    assert_eq!(
        session
            .state()
            .entity("coordinator")
            .unwrap()
            .effects()
            .next()
            .unwrap()
            .remaining_count(),
        1
    );
    end_current_turn(&mut session, &mut entries);
    end_until(&mut session, "coordinator", &mut entries);
    assert_eq!(
        session
            .state()
            .entity("coordinator")
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
                if definition_id == "effect.centered-line"
        )));

    let replayed = RpgAuthoritySession::replay(initial, &entries).unwrap();
    assert_eq!(
        replayed.state_hash().unwrap(),
        session.state_hash().unwrap()
    );
    assert_eq!(replayed.encounter_view().log, session.encounter_view().log);
}

fn prove_area_staleness_responses_and_movement(
    bundle: &asha_rpg::CompiledPlayBundle,
    scenario: &RpgScenario,
) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let option = area_option(&session, "cell-2-1");
    assert_eq!(
        option.included_participant_ids,
        ["keeper".to_owned(), "rover".to_owned()]
    );
    let proposal = area_proposal(&option);
    let mut clone = session.clone();
    let before_hash = clone.state_hash().unwrap();
    let before_log = clone.encounter_view().log;
    let mut random = StableSource::new(scenario.random_source.clone());
    let stale = clone
        .submit_area_with_random_source_recorded(proposal.clone(), &mut random)
        .unwrap();
    assert!(matches!(
        stale.outcome,
        RpgCommandOutcome::Rejected(ref rejection)
            if rejection.code == "RPG_AREA_OPTION_STALE"
    ));
    assert!(stale.replay_entry.is_none());
    assert_eq!(clone.state_hash().unwrap(), before_hash);
    assert_eq!(clone.encounter_view().log, before_log);

    let initial = session.checkpoint().unwrap();
    let result = session
        .submit_area_with_random_source_recorded(proposal, &mut random)
        .unwrap();
    let RpgCommandOutcome::Accepted(receipt) = result.outcome else {
        panic!("context area must commit: {:?}", result.outcome);
    };
    assert!(receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::AreaTargetsDerived {
            included_participant_ids,
            ..
        } if included_participant_ids == &["keeper".to_owned(), "rover".to_owned()]
    )));
    let keeper_packet = damage_packet(&receipt.events, "keeper");
    assert_eq!(
        keeper_packet[0]
            .response_candidates
            .iter()
            .filter(|candidate| { candidate.disposition == RpgDamageResponseDisposition::Applied })
            .map(|candidate| candidate.response_id.as_str())
            .collect::<Vec<_>>(),
        ["kinetic-trim", "kinetic-scale"]
    );
    assert_eq!(
        keeper_packet[1]
            .response_candidates
            .iter()
            .filter(|candidate| { candidate.disposition == RpgDamageResponseDisposition::Applied })
            .map(|candidate| candidate.response_id.as_str())
            .collect::<Vec<_>>(),
        ["strain-trim"]
    );
    assert!(damage_packet(&receipt.events, "rover")
        .iter()
        .all(|part| part.response_candidates.is_empty()));
    assert_eq!(
        session.state().entity("keeper").unwrap().vitality().current,
        18
    );
    assert_eq!(
        session.state().entity("rover").unwrap().vitality().current,
        5
    );
    assert_eq!(
        session
            .state()
            .entity("partner")
            .unwrap()
            .vitality()
            .current,
        12
    );
    assert_eq!(budget(&session, "coordinator", "tempo"), 0);
    let replayed = RpgAuthoritySession::replay(initial, &[result.replay_entry.unwrap()]).unwrap();
    assert_eq!(
        replayed.state_hash().unwrap(),
        session.state_hash().unwrap()
    );

    let mut movement =
        RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let destination = movement
        .encounter_view()
        .actions
        .iter()
        .find(|action| action.definition_id == "action.context-move")
        .unwrap()
        .options
        .cell_paths
        .iter()
        .find(|path| path.destination_cell_id == "cell-0-0")
        .expect("authority projects a context movement path")
        .destination_cell_id
        .clone();
    let (outcome, _) = submit(
        &mut movement,
        &mut random,
        "action.context-move",
        "coordinator",
        None,
        &[&destination],
    );
    assert!(matches!(outcome, RpgCommandOutcome::Accepted(_)));
    assert_eq!(
        movement.state().entity("coordinator").unwrap().position(),
        GridPosition { x: 0, y: 0 }
    );
    assert_eq!(budget(&movement, "coordinator", "tempo"), 2);
}

fn resolved_strike(
    bundle: &asha_rpg::CompiledPlayBundle,
    scenario: RpgScenario,
    target_id: &str,
) -> ScalarEvidence {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let mut random = StableSource::new(scenario.random_source.clone());
    let (pending, _) = submit(
        &mut session,
        &mut random,
        "action.context-strike",
        "coordinator",
        Some("item.calibrated-rod"),
        &[target_id],
    );
    match pending {
        RpgCommandOutcome::AwaitingReaction(pending) => {
            let (outcome, _) = session
                .react_with_random_source_recorded(
                    RpgReactionProposal {
                        expected_revision: pending.expected_revision,
                        reaction_id: pending.request.reaction_id,
                        option_id: None,
                    },
                    &mut random,
                )
                .unwrap();
            let RpgCommandOutcome::Accepted(receipt) = outcome else {
                panic!("context strike must commit: {outcome:?}");
            };
            scalar_event(&receipt.events)
        }
        RpgCommandOutcome::Accepted(receipt) => scalar_event(&receipt.events),
        other => panic!("context strike must resolve: {other:?}"),
    }
}

fn submit(
    session: &mut RpgAuthoritySession,
    random: &mut StableSource,
    action_id: &str,
    actor_id: &str,
    item_definition_id: Option<&str>,
    target_ids: &[&str],
) -> (RpgCommandOutcome, RpgReplayEntry) {
    let item_binding = action_binding(session, action_id, item_definition_id);
    let result = session
        .submit_with_random_source_recorded(
            RpgActionProposal {
                expected_revision: session.state().revision(),
                action_id: action_id.to_owned(),
                actor_id: actor_id.to_owned(),
                target_ids: target_ids.iter().map(|value| (*value).to_owned()).collect(),
                item_binding,
            },
            random,
        )
        .unwrap();
    result
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

fn end_until(
    session: &mut RpgAuthoritySession,
    desired_actor_id: &str,
    entries: &mut Vec<RpgReplayEntry>,
) {
    while session.turn().current_actor_id != desired_actor_id {
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

struct ScalarEvidence {
    actor_id: String,
    target_id: String,
    profile_id: String,
    roll: u32,
    difficulty: i32,
    contribution_ledger: RpgScalarContributionLedger,
    base_band_id: String,
    band_shift_candidates: Vec<asha_rpg::RpgOutcomeBandShiftDecision>,
    final_band_id: String,
}

fn scalar_event(events: &[RpgDomainEvent]) -> ScalarEvidence {
    events
        .iter()
        .find_map(|event| match event {
            RpgDomainEvent::ScalarTestResolved {
                actor_id,
                target_id,
                profile_id,
                roll,
                difficulty,
                contribution_ledger,
                base_band_id,
                band_shift_ledger,
                final_band_id,
                ..
            } => Some(ScalarEvidence {
                actor_id: actor_id.clone(),
                target_id: target_id.clone(),
                profile_id: profile_id.clone(),
                roll: *roll,
                difficulty: *difficulty,
                contribution_ledger: contribution_ledger.clone(),
                base_band_id: base_band_id.clone(),
                band_shift_candidates: band_shift_ledger.candidates.clone(),
                final_band_id: final_band_id.clone(),
            }),
            _ => None,
        })
        .expect("ScalarTestResolved event")
}

fn assert_decision(
    ledger: &RpgScalarContributionLedger,
    contribution_id: &str,
    expected: RpgContributionDisposition,
) {
    let decision = ledger
        .candidates
        .iter()
        .find(|candidate| candidate.contribution_id == contribution_id)
        .unwrap_or_else(|| panic!("missing contribution {contribution_id}"));
    assert_eq!(decision.disposition, expected);
}

fn assert_decision_kind(
    ledger: &RpgScalarContributionLedger,
    contribution_id: &str,
    predicate: impl FnOnce(&RpgContributionDisposition) -> bool,
) {
    let decision = ledger
        .candidates
        .iter()
        .find(|candidate| candidate.contribution_id == contribution_id)
        .unwrap_or_else(|| panic!("missing contribution {contribution_id}"));
    assert!(
        predicate(&decision.disposition),
        "unexpected {contribution_id} disposition: {:?}",
        decision.disposition
    );
}

fn damage_packet<'a>(
    events: &'a [RpgDomainEvent],
    target_id: &str,
) -> &'a [asha_rpg::RpgDamagePartResolution] {
    events
        .iter()
        .find_map(|event| match event {
            RpgDomainEvent::DamagePacketApplied {
                target_id: event_target,
                parts,
                ..
            } if event_target == target_id => Some(parts.as_slice()),
            _ => None,
        })
        .unwrap_or_else(|| panic!("missing damage packet for {target_id}"))
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

fn area_option(session: &RpgAuthoritySession, anchor_cell_id: &str) -> asha_rpg::RpgAreaOptionView {
    session
        .encounter_view()
        .actions
        .iter()
        .find(|action| action.definition_id == "action.context-burst")
        .expect("context area action")
        .options
        .area_options
        .iter()
        .find(|option| option.anchor_cell_id == anchor_cell_id)
        .unwrap_or_else(|| panic!("missing context area anchor {anchor_cell_id}"))
        .clone()
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

struct StableSource {
    binding: RpgRandomSourceBinding,
    draw_count: u64,
}

impl StableSource {
    fn new(binding: RpgRandomSourceBinding) -> Self {
        Self {
            binding,
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
            .expect("bounded draw count");
        let value = if request.sides == 20 {
            6
        } else {
            4_u32.min(request.sides)
        };
        Ok(vec![value; request.count as usize])
    }
}
