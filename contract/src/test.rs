use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env,
};

/// Shared test fixture — registers the escrow contract, a native-like XLM SAC,
/// initializes the escrow with the token address, and mints test XLM to the client.
fn setup() -> (
    Env,
    EscrowContractClient<'static>,
    Address, // token_id
    Address, // client_addr
    Address, // freelancer_addr
) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EscrowContract, ());
    let escrow_client = EscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token_id = env
        .register_stellar_asset_contract_v2(admin)
        .address();

    escrow_client.initialize(&token_id);

    let client_addr = Address::generate(&env);
    let freelancer_addr = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_id);
    sac.mint(&client_addr, &10_000_0000000_i128); // 10,000 XLM

    (env, escrow_client, token_id, client_addr, freelancer_addr)
}

fn balance(env: &Env, token_id: &Address, who: &Address) -> i128 {
    TokenClient::new(env, token_id).balance(who)
}

#[test]
fn test_create_and_release_escrow_happy_path() {
    let (env, escrow_client, token_id, client_addr, freelancer_addr) = setup();
    let amount: i128 = 100_0000000; // 100 XLM
    let total_milestones: u32 = 3;
    let contract_addr = escrow_client.address.clone();

    let client_start = balance(&env, &token_id, &client_addr);

    let escrow_id = escrow_client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &amount,
        &total_milestones,
    );

    assert_eq!(escrow_id, 1);

    assert_eq!(balance(&env, &token_id, &contract_addr), amount);
    assert_eq!(balance(&env, &token_id, &client_addr), client_start - amount);

    let escrow = escrow_client.get_escrow(&escrow_id);
    assert_eq!(escrow.client, client_addr);
    assert_eq!(escrow.freelancer, freelancer_addr);
    assert_eq!(escrow.amount, amount);
    assert_eq!(escrow.total_milestones, 3);
    assert_eq!(escrow.completed_milestones, 0);
    assert_eq!(escrow.status, EscrowStatus::Active);

    let per_milestone = amount / total_milestones as i128;

    escrow_client.release_funds(&escrow_id, &client_addr);
    assert_eq!(balance(&env, &token_id, &freelancer_addr), per_milestone);
    let escrow = escrow_client.get_escrow(&escrow_id);
    assert_eq!(escrow.completed_milestones, 1);
    assert_eq!(escrow.status, EscrowStatus::Active);

    escrow_client.release_funds(&escrow_id, &client_addr);
    assert_eq!(balance(&env, &token_id, &freelancer_addr), per_milestone * 2);

    escrow_client.release_funds(&escrow_id, &client_addr);
    assert_eq!(balance(&env, &token_id, &freelancer_addr), per_milestone * 3);
    let escrow = escrow_client.get_escrow(&escrow_id);
    assert_eq!(escrow.completed_milestones, 3);
    assert_eq!(escrow.status, EscrowStatus::Released);
}

#[test]
#[should_panic(expected = "Only client can release funds")]
fn test_unauthorized_release_fails() {
    let (env, escrow_client, _token_id, client_addr, freelancer_addr) = setup();
    let unauthorized_addr = Address::generate(&env);
    let amount: i128 = 100_0000000;
    let total_milestones: u32 = 3;

    let escrow_id = escrow_client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &amount,
        &total_milestones,
    );

    escrow_client.release_funds(&escrow_id, &unauthorized_addr);
}

#[test]
fn test_escrow_state_persistence() {
    let (_env, escrow_client, _token_id, client_addr, freelancer_addr) = setup();
    let amount: i128 = 50_0000000;
    let total_milestones: u32 = 2;

    let escrow_id_1 = escrow_client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &amount,
        &total_milestones,
    );

    let escrow_id_2 = escrow_client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &(amount * 2),
        &(total_milestones + 1),
    );

    assert_eq!(escrow_id_1, 1);
    assert_eq!(escrow_id_2, 2);

    let escrow_1 = escrow_client.get_escrow(&escrow_id_1);
    assert_eq!(escrow_1.amount, amount);
    assert_eq!(escrow_1.total_milestones, 2);
    assert_eq!(escrow_1.status, EscrowStatus::Active);

    let escrow_2 = escrow_client.get_escrow(&escrow_id_2);
    assert_eq!(escrow_2.amount, amount * 2);
    assert_eq!(escrow_2.total_milestones, 3);
    assert_eq!(escrow_2.status, EscrowStatus::Active);

    escrow_client.release_funds(&escrow_id_1, &client_addr);

    let escrow_1 = escrow_client.get_escrow(&escrow_id_1);
    let escrow_2 = escrow_client.get_escrow(&escrow_id_2);
    assert_eq!(escrow_1.completed_milestones, 1);
    assert_eq!(escrow_2.completed_milestones, 0);
}

#[test]
#[should_panic(expected = "Escrow is not active")]
fn test_cannot_release_after_completion() {
    let (_env, escrow_client, _token_id, client_addr, freelancer_addr) = setup();
    let amount: i128 = 100_0000000;
    let total_milestones: u32 = 2;

    let escrow_id = escrow_client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &amount,
        &total_milestones,
    );

    escrow_client.release_funds(&escrow_id, &client_addr);
    escrow_client.release_funds(&escrow_id, &client_addr);

    let escrow = escrow_client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);

    escrow_client.release_funds(&escrow_id, &client_addr);
}

#[test]
fn test_refund_escrow() {
    let (env, escrow_client, token_id, client_addr, freelancer_addr) = setup();
    let amount: i128 = 100_0000000;
    let total_milestones: u32 = 3;
    let client_start = balance(&env, &token_id, &client_addr);

    let escrow_id = escrow_client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &amount,
        &total_milestones,
    );

    // Release one milestone
    escrow_client.release_funds(&escrow_id, &client_addr);
    let per_milestone = amount / total_milestones as i128;

    // Refund — should return remaining (amount - 1 milestone)
    escrow_client.refund(&escrow_id, &client_addr);

    let escrow = escrow_client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Refunded);
    assert_eq!(escrow.completed_milestones, 1);

    // Client net change: -amount + (amount - per_milestone) = -per_milestone
    assert_eq!(
        balance(&env, &token_id, &client_addr),
        client_start - per_milestone
    );
    assert_eq!(balance(&env, &token_id, &freelancer_addr), per_milestone);
}
