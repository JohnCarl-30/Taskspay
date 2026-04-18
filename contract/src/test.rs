use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

// Test 1 (Happy path): MVP transaction executes successfully end-to-end
#[test]
fn test_create_and_release_escrow_happy_path() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let client_addr = Address::generate(&env);
    let freelancer_addr = Address::generate(&env);
    let amount: i128 = 100_0000000; // 100 XLM in stroops
    let total_milestones: u32 = 3;

    // Create escrow
    let escrow_id = client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &amount,
        &total_milestones,
    );

    assert_eq!(escrow_id, 1, "First escrow should have ID 1");

    // Retrieve escrow and verify initial state
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.client, client_addr);
    assert_eq!(escrow.freelancer, freelancer_addr);
    assert_eq!(escrow.amount, amount);
    assert_eq!(escrow.total_milestones, 3);
    assert_eq!(escrow.completed_milestones, 0);
    assert_eq!(escrow.status, EscrowStatus::Active);

    // Release funds for milestone 1
    client.release_funds(&escrow_id, &client_addr);
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.completed_milestones, 1);
    assert_eq!(escrow.status, EscrowStatus::Active);

    // Release funds for milestone 2
    client.release_funds(&escrow_id, &client_addr);
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.completed_milestones, 2);
    assert_eq!(escrow.status, EscrowStatus::Active);

    // Release funds for milestone 3 (final)
    client.release_funds(&escrow_id, &client_addr);
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.completed_milestones, 3);
    assert_eq!(escrow.status, EscrowStatus::Released);
}

// Test 2 (Edge case): Unauthorized caller cannot release funds
#[test]
#[should_panic(expected = "Only client can release funds")]
fn test_unauthorized_release_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let client_addr = Address::generate(&env);
    let freelancer_addr = Address::generate(&env);
    let unauthorized_addr = Address::generate(&env);
    let amount: i128 = 100_0000000;
    let total_milestones: u32 = 3;

    // Create escrow
    let escrow_id = client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &amount,
        &total_milestones,
    );

    // Attempt to release funds with unauthorized address (should panic)
    client.release_funds(&escrow_id, &unauthorized_addr);
}

// Test 3 (State verification): Contract storage reflects correct state after operations
#[test]
fn test_escrow_state_persistence() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let client_addr = Address::generate(&env);
    let freelancer_addr = Address::generate(&env);
    let amount: i128 = 50_0000000; // 50 XLM
    let total_milestones: u32 = 2;

    // Create first escrow
    let escrow_id_1 = client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &amount,
        &total_milestones,
    );

    // Create second escrow
    let escrow_id_2 = client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &(amount * 2),
        &(total_milestones + 1),
    );

    // Verify both escrows exist with correct IDs
    assert_eq!(escrow_id_1, 1);
    assert_eq!(escrow_id_2, 2);

    // Verify first escrow state
    let escrow_1 = client.get_escrow(&escrow_id_1);
    assert_eq!(escrow_1.amount, amount);
    assert_eq!(escrow_1.total_milestones, 2);
    assert_eq!(escrow_1.status, EscrowStatus::Active);

    // Verify second escrow state
    let escrow_2 = client.get_escrow(&escrow_id_2);
    assert_eq!(escrow_2.amount, amount * 2);
    assert_eq!(escrow_2.total_milestones, 3);
    assert_eq!(escrow_2.status, EscrowStatus::Active);

    // Release one milestone from first escrow
    client.release_funds(&escrow_id_1, &client_addr);

    // Verify first escrow updated, second unchanged
    let escrow_1 = client.get_escrow(&escrow_id_1);
    let escrow_2 = client.get_escrow(&escrow_id_2);
    assert_eq!(escrow_1.completed_milestones, 1);
    assert_eq!(escrow_2.completed_milestones, 0);
}

// Test 4 (Edge case): Cannot release funds after all milestones completed
#[test]
#[should_panic(expected = "Escrow is not active")]
fn test_cannot_release_after_completion() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let client_addr = Address::generate(&env);
    let freelancer_addr = Address::generate(&env);
    let amount: i128 = 100_0000000;
    let total_milestones: u32 = 2;

    // Create escrow
    let escrow_id = client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &amount,
        &total_milestones,
    );

    // Release all milestones
    client.release_funds(&escrow_id, &client_addr);
    client.release_funds(&escrow_id, &client_addr);

    // Verify escrow is released
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);

    // Attempt to release again (should panic)
    client.release_funds(&escrow_id, &client_addr);
}

// Test 5 (Refund scenario): Client can refund active escrow
#[test]
fn test_refund_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);

    let client_addr = Address::generate(&env);
    let freelancer_addr = Address::generate(&env);
    let amount: i128 = 100_0000000;
    let total_milestones: u32 = 3;

    // Create escrow
    let escrow_id = client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &amount,
        &total_milestones,
    );

    // Release one milestone
    client.release_funds(&escrow_id, &client_addr);
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.completed_milestones, 1);
    assert_eq!(escrow.status, EscrowStatus::Active);

    // Refund the escrow
    client.refund(&escrow_id, &client_addr);

    // Verify escrow is refunded
    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Refunded);
    assert_eq!(escrow.completed_milestones, 1); // Completed milestones unchanged
}
