use std::io::{self, Read};

use asha_rpg::{
    compile_prepared_play_bundle_json, CompiledPlayBundle, RpgActionProposal, RpgAuthoritySession,
    RpgCommandOutcome, RpgRandomRequest, RpgRandomSource, RpgRandomSourceBinding,
    RpgRandomSourceFailure, RpgReactionProposal, RpgScenario,
};
use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SessionSource {
    prepared: Value,
    positional_scenario: Value,
    scenario: Value,
    #[serde(default = "default_brace_reduction")]
    expected_brace_reduction: u32,
}

fn main() {
    let mut input = Vec::new();
    io::stdin()
        .read_to_end(&mut input)
        .expect("read session source");
    let source: SessionSource = serde_json::from_slice(&input).expect("decode session source");
    let prepared = serde_json::to_vec(&source.prepared).expect("encode prepared PlayBundle");
    let bundle = compile_prepared_play_bundle_json(&prepared).expect("compile d20 PlayBundle");

    let mut positional_scenario_value = source.positional_scenario;
    positional_scenario_value["playBundleId"] =
        Value::String(bundle.artifact().artifact_id.clone());
    let positional_scenario: RpgScenario =
        serde_json::from_value(positional_scenario_value).expect("decode positional Scenario");
    assert_positional_talent_behavior(&bundle, &positional_scenario);
    println!("verified Basic Attack contribution log: base + Coordinated Flanker + Hold the Line");

    let mut scenario_value = source.scenario;
    scenario_value["playBundleId"] = Value::String(bundle.artifact().artifact_id.clone());
    let scenario: RpgScenario = serde_json::from_value(scenario_value).expect("decode Scenario");
    assert_shared_weapon_behavior(&bundle, &scenario, source.expected_brace_reduction);
    let mut random = StableSource {
        binding: scenario.random_source.clone(),
    };
    let mut session = RpgAuthoritySession::from_scenario(bundle, scenario).expect("start Scenario");
    let fighter = session.state().entity("fighter").expect("fighter state");
    assert_eq!(fighter.stat("strength-modifier"), Some(3));
    assert_eq!(fighter.stat("dexterity-modifier"), Some(2));
    assert_eq!(fighter.stat("initiative"), Some(2));
    let skeleton = session.state().entity("skeleton").expect("skeleton state");
    assert_eq!(skeleton.stat("dexterity-modifier"), Some(3));
    assert_eq!(skeleton.stat("initiative"), Some(3));

    let movement = session
        .encounter_view()
        .actions
        .into_iter()
        .find(|action| action.definition_id == "action.move")
        .expect("current actor owns Move");
    let detour = movement
        .options
        .cell_paths
        .iter()
        .find(|path| path.destination_cell_id == "cell-4-3")
        .expect("Move exposes the route around the impassable cell");
    assert_eq!(
        detour.cell_ids,
        vec!["cell-2-4", "cell-3-4", "cell-4-4", "cell-4-3"]
    );
    assert_eq!(detour.movement_cost, 4);
    accept(action(
        &mut session,
        &mut random,
        "action.move",
        "skeleton",
        None,
        &["cell-4-3"],
    ));
    assert_eq!(
        session.state().entity("skeleton").unwrap().position(),
        asha_rpg::GridPosition { x: 4, y: 3 }
    );

    let pending = action(
        &mut session,
        &mut random,
        "action.basic-attack",
        "fighter",
        Some("item.long-sword"),
        &["goblin"],
    );
    let RpgCommandOutcome::AwaitingReaction(pending) = pending else {
        panic!("fighter strike must expose its defensive reaction");
    };
    let (reaction, _) = session
        .react_with_random_source_recorded(
            RpgReactionProposal {
                expected_revision: pending.expected_revision,
                reaction_id: pending.request.reaction_id,
                option_id: Some("brace".to_owned()),
            },
            &mut random,
        )
        .expect("resolve defensive reaction");
    accept(reaction);

    accept(action(
        &mut session,
        &mut random,
        "action.wizard.fire-bolt",
        "wizard",
        None,
        &["skeleton"],
    ));
    let pending = action(
        &mut session,
        &mut random,
        "action.basic-attack",
        "goblin",
        Some("item.scimitar"),
        &["fighter"],
    );
    let RpgCommandOutcome::AwaitingReaction(pending) = pending else {
        panic!("goblin Basic Attack must expose the shared defensive reaction");
    };
    let (reaction, _) = session
        .react_with_random_source_recorded(
            RpgReactionProposal {
                expected_revision: pending.expected_revision,
                reaction_id: pending.request.reaction_id,
                option_id: None,
            },
            &mut random,
        )
        .expect("decline goblin defensive reaction");
    accept(reaction);

    assert_eq!(session.turn().round, 2);
    assert_eq!(session.turn().current_actor_id, "skeleton");
    assert_eq!(session.state().revision(), 4);
    println!(
        "played one alternating round through {} at revision {}",
        session
            .artifact()
            .expect("artifact-bound session")
            .artifact_id,
        session.state().revision(),
    );
}

fn assert_positional_talent_behavior(bundle: &CompiledPlayBundle, scenario: &RpgScenario) {
    let (total, contributions) = positional_attack(bundle, scenario.clone());
    assert_eq!(total, 23);
    assert_eq!(
        contributions,
        vec![
            (
                "action.basic-attack".to_owned(),
                "Basic Attack".to_owned(),
                5
            ),
            (
                "feature.coordinated-flanker".to_owned(),
                "Coordinated Flanker".to_owned(),
                2,
            ),
            (
                "feature.hold-the-line".to_owned(),
                "Hold the Line".to_owned(),
                1,
            ),
        ]
    );

    let mut without_flank = scenario.clone();
    without_flank
        .participants
        .iter_mut()
        .find(|participant| participant.id == "wizard")
        .expect("Wizard participant")
        .position = asha_rpg::GridPosition { x: 4, y: 1 };
    assert_eq!(
        positional_attack(bundle, without_flank).1,
        vec![
            (
                "action.basic-attack".to_owned(),
                "Basic Attack".to_owned(),
                5
            ),
            (
                "feature.hold-the-line".to_owned(),
                "Hold the Line".to_owned(),
                1,
            ),
        ]
    );

    let mut without_surround = scenario.clone();
    without_surround
        .participants
        .iter_mut()
        .find(|participant| participant.id == "skeleton")
        .expect("Skeleton participant")
        .position = asha_rpg::GridPosition { x: 4, y: 2 };
    assert_eq!(
        positional_attack(bundle, without_surround).1,
        vec![
            (
                "action.basic-attack".to_owned(),
                "Basic Attack".to_owned(),
                5
            ),
            (
                "feature.coordinated-flanker".to_owned(),
                "Coordinated Flanker".to_owned(),
                2,
            ),
        ]
    );
}

fn positional_attack(
    bundle: &CompiledPlayBundle,
    scenario: RpgScenario,
) -> (i32, Vec<(String, String, i32)>) {
    let mut random = StableSource {
        binding: scenario.random_source.clone(),
    };
    let mut session =
        RpgAuthoritySession::from_scenario(bundle.clone(), scenario).expect("start talent probe");
    let pending = action(
        &mut session,
        &mut random,
        "action.basic-attack",
        "fighter",
        Some("item.long-sword"),
        &["goblin"],
    );
    let RpgCommandOutcome::AwaitingReaction(pending) = pending else {
        panic!("talent Basic Attack must reach the shared defensive reaction");
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
        .expect("resolve talent probe reaction");
    let RpgCommandOutcome::Accepted(receipt) = outcome else {
        panic!("talent probe must commit: {outcome:?}");
    };
    receipt
        .events
        .into_iter()
        .find_map(|event| match event {
            asha_rpg::RpgDomainEvent::AttackResolved {
                total,
                contributions,
                ..
            } => Some((
                total,
                contributions
                    .into_iter()
                    .map(|contribution| {
                        (
                            contribution.source_definition_id,
                            contribution.source_label,
                            contribution.amount,
                        )
                    })
                    .collect(),
            )),
            _ => None,
        })
        .expect("AttackResolved contribution evidence")
}

fn assert_shared_weapon_behavior(
    bundle: &CompiledPlayBundle,
    scenario: &RpgScenario,
    expected_brace_reduction: u32,
) {
    for (actor_id, item_definition_id, target_id) in [
        ("fighter", "item.battleaxe", "goblin"),
        ("fighter", "item.long-sword", "goblin"),
        ("goblin", "item.scimitar", "fighter"),
        ("skeleton", "item.short-sword", "wizard"),
    ] {
        let mut probe_scenario = scenario.clone();
        probe_scenario.turn.current_actor_id = actor_id.to_owned();
        let mut random = StableSource {
            binding: probe_scenario.random_source.clone(),
        };
        let mut probe = RpgAuthoritySession::from_scenario(bundle.clone(), probe_scenario)
            .expect("start bound-action probe");
        let outcome = action(
            &mut probe,
            &mut random,
            "action.basic-attack",
            actor_id,
            Some(item_definition_id),
            &[target_id],
        );
        let RpgCommandOutcome::AwaitingReaction(pending) = outcome else {
            panic!("{actor_id} {item_definition_id} must reach the shared defensive reaction");
        };
        assert_eq!(
            pending.request.options[0].damage_reduction, expected_brace_reduction,
            "{item_definition_id} must inherit the one Basic Attack behavior"
        );
    }
}

fn default_brace_reduction() -> u32 {
    2
}

fn action(
    session: &mut RpgAuthoritySession,
    random: &mut StableSource,
    action_id: &str,
    actor_id: &str,
    item_definition_id: Option<&str>,
    target_ids: &[&str],
) -> RpgCommandOutcome {
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
    let expected_revision = session.state().revision();
    let (outcome, _) = session
        .submit_with_random_source_recorded(
            RpgActionProposal {
                expected_revision,
                action_id: action_id.to_owned(),
                actor_id: actor_id.to_owned(),
                target_ids: target_ids.iter().map(|value| (*value).to_owned()).collect(),
                item_binding,
            },
            random,
        )
        .expect("submit automatic action");
    outcome
}

fn accept(outcome: RpgCommandOutcome) {
    if !matches!(outcome, RpgCommandOutcome::Accepted(_)) {
        panic!("expected accepted action, received {outcome:?}");
    }
}

struct StableSource {
    binding: RpgRandomSourceBinding,
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
