use std::io::{self, Read};

use asha_rpg::{
    compile_prepared_play_bundle_json, RpgActionProposal, RpgAuthoritySession, RpgCommandOutcome,
    RpgRandomRequest, RpgRandomSource, RpgRandomSourceBinding, RpgRandomSourceFailure,
    RpgReactionProposal, RpgScenario,
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
        .expect("read session source");
    let source: SessionSource = serde_json::from_slice(&input).expect("decode session source");
    let prepared = serde_json::to_vec(&source.prepared).expect("encode prepared PlayBundle");
    let bundle = compile_prepared_play_bundle_json(&prepared).expect("compile d20 PlayBundle");

    let mut scenario_value = source.scenario;
    scenario_value["playBundleId"] = Value::String(bundle.artifact().artifact_id.clone());
    let scenario: RpgScenario = serde_json::from_value(scenario_value).expect("decode Scenario");
    let mut random = StableSource {
        binding: scenario.random_source.clone(),
    };
    let mut session = RpgAuthoritySession::from_scenario(bundle, scenario).expect("start Scenario");

    accept(action(
        &mut session,
        &mut random,
        "action.skeleton.short-sword",
        "skeleton",
        &["wizard"],
    ));

    let pending = action(
        &mut session,
        &mut random,
        "action.fighter.long-sword",
        "fighter",
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
        "action.wizard.thunder-wave",
        "wizard",
        &["skeleton"],
    ));
    accept(action(
        &mut session,
        &mut random,
        "action.goblin.scimitar",
        "goblin",
        &["fighter"],
    ));

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

fn action(
    session: &mut RpgAuthoritySession,
    random: &mut StableSource,
    action_id: &str,
    actor_id: &str,
    target_ids: &[&str],
) -> RpgCommandOutcome {
    let expected_revision = session.state().revision();
    let (outcome, _) = session
        .submit_with_random_source_recorded(
            RpgActionProposal {
                expected_revision,
                action_id: action_id.to_owned(),
                actor_id: actor_id.to_owned(),
                target_ids: target_ids.iter().map(|value| (*value).to_owned()).collect(),
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
