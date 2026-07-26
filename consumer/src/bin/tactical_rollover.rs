use std::io::{self, Read};

use asha_rpg::{
    compile_prepared_play_bundle_json, GridPosition, RpgActionProposal, RpgAreaActionProposal,
    RpgAuthoritySession, RpgCommandOutcome, RpgContributionDisposition,
    RpgDamageResponseDisposition, RpgDomainEvent, RpgRandomRequest, RpgRandomSource,
    RpgRandomSourceBinding, RpgRandomSourceFailure, RpgReactionProposal, RpgReplayEntry,
    RpgScalarContributionLedger, RpgScenario, RpgTurnControl, RpgTurnControlProposal,
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
        .expect("read tactical rollover session source");
    let source: SessionSource = serde_json::from_slice(&input).expect("decode session source");
    let prepared = serde_json::to_vec(&source.prepared).expect("encode prepared PlayBundle");
    let bundle =
        compile_prepared_play_bundle_json(&prepared).expect("compile tactical rollover PlayBundle");
    let mut scenario_value = source.scenario;
    scenario_value["playBundleId"] = Value::String(bundle.artifact().artifact_id.clone());
    let scenario: RpgScenario =
        serde_json::from_value(scenario_value).expect("decode tactical rollover Scenario");

    prove_item_packet_and_replay(&bundle, &scenario);
    prove_inapplicable_contribution(&bundle, &scenario);
    prove_defense_test(&bundle, &scenario);
    prove_effect_cost_expiry_and_replay(&bundle, &scenario);
    prove_area_staleness_and_movement(&bundle, &scenario);
    println!(
        "verified tactical rollover kit at artifact {}",
        bundle.artifact().artifact_id
    );
}

fn prove_item_packet_and_replay(bundle: &asha_rpg::CompiledPlayBundle, scenario: &RpgScenario) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let initial = session.checkpoint().unwrap();
    let before = session.state().entity("warded").unwrap().vitality().current;
    let mut random = StableSource::new(scenario.random_source.clone());
    let (pending, submit_entry) = submit(
        &mut session,
        &mut random,
        "action.tactical-strike",
        "tactician",
        Some("item.balanced-blade"),
        &["warded"],
    );
    let RpgCommandOutcome::AwaitingReaction(pending) = pending else {
        panic!("item-bound hit must open the configured reaction");
    };
    let (outcome, reaction_entry) = session
        .react_with_random_source_recorded(
            RpgReactionProposal {
                expected_revision: pending.expected_revision,
                reaction_id: pending.request.reaction_id,
                option_id: Some("brace".to_owned()),
            },
            &mut random,
        )
        .unwrap();
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("item-bound reaction must commit: {outcome:?}");
    };
    let scalar = scalar_event(&receipt.events);
    assert_eq!(scalar.actor_id, "tactician");
    assert_eq!(scalar.target_id, "warded");
    assert_eq!(scalar.profile_id, "tactical-test");
    assert_eq!(scalar.base_band_id, "hit");
    assert_eq!(scalar.final_band_id, "hit");
    assert_eq!(scalar.roll, 15);
    assert!(scalar
        .contribution_ledger
        .candidates
        .iter()
        .any(|candidate| {
            candidate.source_definition_id == "feature.flanking-discipline"
                && candidate.applied_value == 2
                && candidate.disposition == RpgContributionDisposition::Applied
        }));
    let packet = receipt
        .events
        .iter()
        .find_map(|event| match event {
            RpgDomainEvent::DamagePacketApplied { parts, .. } => Some(parts),
            _ => None,
        })
        .expect("two-part damage packet");
    assert_eq!(
        packet
            .iter()
            .map(|part| part.part_id.as_str())
            .collect::<Vec<_>>(),
        ["impact", "strain"]
    );
    let impact = &packet[0];
    assert!(impact.response_candidates.iter().any(|candidate| {
        candidate.source_definition_id == "feature.impact-ward"
            && candidate.response_id == "impact-reduction"
            && candidate.disposition == RpgDamageResponseDisposition::Applied
    }));
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
        [(1, 20, &[15][..]), (1, 8, &[4][..])]
    );
    assert!(impact.response_candidates.iter().any(|candidate| {
        candidate.source_definition_id == "authority.reaction"
            && candidate.response_id == "pending-damage-reduction"
            && candidate.disposition == RpgDamageResponseDisposition::Applied
    }));
    assert_eq!(
        session.state().entity("warded").unwrap().vitality().current,
        before - 3
    );
    let replayed = RpgAuthoritySession::replay(initial, &[submit_entry, reaction_entry]).unwrap();
    assert_eq!(
        replayed.state_hash().unwrap(),
        session.state_hash().unwrap()
    );
    assert_eq!(replayed.encounter_view().log, session.encounter_view().log);
}

fn prove_inapplicable_contribution(bundle: &asha_rpg::CompiledPlayBundle, scenario: &RpgScenario) {
    let mut separated = scenario.clone();
    separated
        .participants
        .iter_mut()
        .find(|participant| participant.id == "ally")
        .unwrap()
        .position = GridPosition { x: 5, y: 3 };
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), separated).unwrap();
    let mut random = StableSource::new(scenario.random_source.clone());
    let (pending, _) = submit(
        &mut session,
        &mut random,
        "action.tactical-strike",
        "tactician",
        Some("item.balanced-blade"),
        &["warded"],
    );
    let RpgCommandOutcome::AwaitingReaction(pending) = pending else {
        panic!("ordinary separated hit should still reach reaction");
    };
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
        panic!("separated strike should commit: {outcome:?}");
    };
    let scalar = scalar_event(&receipt.events);
    assert_eq!(scalar.final_band_id, "hit");
    assert!(scalar
        .contribution_ledger
        .candidates
        .iter()
        .any(|candidate| {
            candidate.source_definition_id == "feature.flanking-discipline"
                && matches!(
                    candidate.disposition,
                    RpgContributionDisposition::Inapplicable { .. }
                )
        }));
}

fn prove_defense_test(bundle: &asha_rpg::CompiledPlayBundle, scenario: &RpgScenario) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let mut random = StableSource::new(scenario.random_source.clone());
    let (outcome, _) = submit(
        &mut session,
        &mut random,
        "action.guard-test",
        "tactician",
        None,
        &["warded"],
    );
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("defense test must commit: {outcome:?}");
    };
    let scalar = scalar_event(&receipt.events);
    assert_eq!(scalar.actor_id, "tactician");
    assert_eq!(scalar.target_id, "warded");
    assert_eq!(scalar.difficulty, 13);
    assert_eq!(scalar.final_band_id, "hit");
    assert!(receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::EffectApplied {
            definition_id,
            target_id,
            ..
        } if definition_id == "effect.measured" && target_id == "warded"
    )));
}

fn prove_effect_cost_expiry_and_replay(
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
        "action.take-measure",
        "tactician",
        None,
        &["tactician"],
    );
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("fixed-cost effect action must commit: {outcome:?}");
    };
    entries.push(entry);
    assert!(receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::ResourceSpent {
            entity_id,
            resource_id,
            amount: 1,
            remaining: 1,
        } if entity_id == "tactician" && resource_id == "focus"
    )));
    assert_eq!(
        session
            .state()
            .entity("tactician")
            .unwrap()
            .resource("focus")
            .unwrap()
            .current,
        1
    );
    assert_eq!(
        session
            .state()
            .entity("tactician")
            .unwrap()
            .resource("reserve")
            .unwrap()
            .current,
        1
    );
    assert_eq!(
        session
            .state()
            .entity("tactician")
            .unwrap()
            .effects()
            .count(),
        1
    );
    end_until(&mut session, "tactician", &mut entries);
    assert_eq!(
        session
            .state()
            .entity("tactician")
            .unwrap()
            .effects()
            .next()
            .unwrap()
            .remaining_count(),
        1
    );
    let (pending, entry) = submit(
        &mut session,
        &mut random,
        "action.tactical-strike",
        "tactician",
        Some("item.balanced-blade"),
        &["warded"],
    );
    entries.push(entry);
    let RpgCommandOutcome::AwaitingReaction(pending) = pending else {
        panic!("measured strike must reach reaction");
    };
    let (outcome, entry) = session
        .react_with_random_source_recorded(
            RpgReactionProposal {
                expected_revision: pending.expected_revision,
                reaction_id: pending.request.reaction_id,
                option_id: None,
            },
            &mut random,
        )
        .unwrap();
    entries.push(entry);
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("measured strike should commit: {outcome:?}");
    };
    let scalar = scalar_event(&receipt.events);
    assert_eq!(scalar.final_band_id, "surge");
    assert!(scalar
        .contribution_ledger
        .candidates
        .iter()
        .any(|candidate| {
            candidate.source_definition_id == "effect.measured"
                && candidate.source_instance_id.is_some()
                && candidate.applied_value == 2
                && candidate.disposition == RpgContributionDisposition::Applied
        }));
    end_until(&mut session, "tactician", &mut entries);
    assert_eq!(
        session
            .state()
            .entity("tactician")
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
                if definition_id == "effect.measured"
        )));
    let replayed = RpgAuthoritySession::replay(initial, &entries).unwrap();
    assert_eq!(
        replayed.state_hash().unwrap(),
        session.state_hash().unwrap()
    );
    assert_eq!(replayed.encounter_view().log, session.encounter_view().log);
}

fn prove_area_staleness_and_movement(
    bundle: &asha_rpg::CompiledPlayBundle,
    scenario: &RpgScenario,
) {
    let mut session = RpgAuthoritySession::from_scenario(bundle.clone(), scenario.clone()).unwrap();
    let option = area_option(&session, "cell-2-1");
    assert_eq!(
        option.included_participant_ids,
        ["warded".to_owned(), "scout".to_owned()]
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
                && rejection.path == "$.proposal.sessionBindingId"
    ));
    assert!(stale.replay_entry.is_none());
    assert_eq!(clone.state_hash().unwrap(), before_hash);
    assert_eq!(clone.encounter_view().log, before_log);

    let initial = session.checkpoint().unwrap();
    let result = session
        .submit_area_with_random_source_recorded(proposal, &mut random)
        .unwrap();
    let RpgCommandOutcome::Accepted(receipt) = result.outcome else {
        panic!("projected area must commit: {:?}", result.outcome);
    };
    assert!(receipt.events.iter().any(|event| matches!(
        event,
        RpgDomainEvent::AreaTargetsDerived {
            included_participant_ids,
            ..
        } if included_participant_ids == &["warded".to_owned(), "scout".to_owned()]
    )));
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
        .find(|action| action.definition_id == "action.tactical-move")
        .unwrap()
        .options
        .cell_paths
        .iter()
        .find(|path| path.destination_cell_id == "cell-0-0")
        .expect("authority projects selected-cell movement")
        .destination_cell_id
        .clone();
    let (outcome, _) = submit(
        &mut movement,
        &mut random,
        "action.tactical-move",
        "tactician",
        None,
        &[&destination],
    );
    assert!(matches!(outcome, RpgCommandOutcome::Accepted(_)));
    assert_eq!(
        movement.state().entity("tactician").unwrap().position(),
        GridPosition { x: 0, y: 0 }
    );
}

fn submit(
    session: &mut RpgAuthoritySession,
    random: &mut StableSource,
    action_id: &str,
    actor_id: &str,
    item_definition_id: Option<&str>,
    target_ids: &[&str],
) -> (RpgCommandOutcome, RpgReplayEntry) {
    let item_binding = session
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
            panic!(
                "current actor {actor_id} must expose {action_id} with binding {item_definition_id:?}"
            )
        })
        .item_binding;
    session
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
        .unwrap()
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

struct ScalarEvidence {
    actor_id: String,
    target_id: String,
    profile_id: String,
    roll: u32,
    contribution_ledger: RpgScalarContributionLedger,
    difficulty: i32,
    base_band_id: String,
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
                contribution_ledger,
                difficulty,
                base_band_id,
                final_band_id,
                ..
            } => Some(ScalarEvidence {
                actor_id: actor_id.clone(),
                target_id: target_id.clone(),
                profile_id: profile_id.clone(),
                roll: *roll,
                contribution_ledger: contribution_ledger.clone(),
                difficulty: *difficulty,
                base_band_id: base_band_id.clone(),
                final_band_id: final_band_id.clone(),
            }),
            _ => None,
        })
        .expect("ScalarTestResolved event")
}

fn area_option(session: &RpgAuthoritySession, anchor_cell_id: &str) -> asha_rpg::RpgAreaOptionView {
    session
        .encounter_view()
        .actions
        .iter()
        .find(|action| action.definition_id == "action.area-sweep")
        .expect("area action")
        .options
        .area_options
        .iter()
        .find(|option| option.anchor_cell_id == anchor_cell_id)
        .unwrap_or_else(|| {
            panic!(
                "area option {anchor_cell_id} not found among {:?}",
                session
                    .encounter_view()
                    .actions
                    .iter()
                    .find(|action| action.definition_id == "action.area-sweep")
                    .unwrap()
                    .options
                    .area_options
                    .iter()
                    .map(|option| (
                        option.anchor_cell_id.as_str(),
                        option.included_participant_ids.as_slice(),
                    ))
                    .collect::<Vec<_>>()
            )
        })
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
}

impl StableSource {
    fn new(binding: RpgRandomSourceBinding) -> Self {
        Self { binding }
    }
}

impl RpgRandomSource for StableSource {
    fn binding(&self) -> &RpgRandomSourceBinding {
        &self.binding
    }

    fn draw(&mut self, request: &RpgRandomRequest) -> Result<Vec<u32>, RpgRandomSourceFailure> {
        let value = if request.sides == 20 {
            15
        } else {
            4_u32.min(request.sides)
        };
        Ok(vec![value; request.count as usize])
    }
}
