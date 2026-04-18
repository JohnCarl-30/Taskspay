#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec};

// Escrow status enum
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Active,      // Escrow is active, funds locked
    Released,    // Funds released to freelancer
    Refunded,    // Funds refunded to client
}

// Escrow data structure stored on-chain
#[contracttype]
#[derive(Clone, Debug)]
pub struct Escrow {
    pub id: u64,                    // Unique escrow identifier
    pub client: Address,            // Client who created the escrow
    pub freelancer: Address,        // Freelancer receiving payment
    pub amount: i128,               // Total XLM amount in stroops (1 XLM = 10^7 stroops)
    pub total_milestones: u32,      // Total number of milestones
    pub completed_milestones: u32,  // Number of completed milestones
    pub status: EscrowStatus,       // Current escrow status
}

// Storage keys for contract data
#[contracttype]
pub enum DataKey {
    Escrow(u64),      // Key for individual escrow by ID
    EscrowCounter,    // Counter for generating unique escrow IDs
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Create a new escrow contract
    /// 
    /// # Arguments
    /// * `client` - Address of the client creating the escrow
    /// * `freelancer` - Address of the freelancer receiving payment
    /// * `amount` - Total XLM amount in stroops (1 XLM = 10^7 stroops)
    /// * `total_milestones` - Number of milestones for the project
    /// 
    /// # Returns
    /// * `u64` - The unique escrow ID
    /// 
    /// # Panics
    /// * If amount is <= 0
    /// * If total_milestones is 0
    /// * If client is not authorized
    pub fn create_escrow(
        env: Env,
        client: Address,
        freelancer: Address,
        amount: i128,
        total_milestones: u32,
    ) -> u64 {
        // Verify the client is authorized to create this escrow
        client.require_auth();

        // Validate inputs
        assert!(amount > 0, "Amount must be greater than 0");
        assert!(total_milestones > 0, "Must have at least 1 milestone");

        // Generate unique escrow ID
        let counter_key = DataKey::EscrowCounter;
        let escrow_id: u64 = env
            .storage()
            .instance()
            .get(&counter_key)
            .unwrap_or(0);
        
        let next_id = escrow_id + 1;
        env.storage().instance().set(&counter_key, &next_id);

        // Create escrow record
        let escrow = Escrow {
            id: next_id,
            client: client.clone(),
            freelancer: freelancer.clone(),
            amount,
            total_milestones,
            completed_milestones: 0,
            status: EscrowStatus::Active,
        };

        // Store escrow in contract storage
        let escrow_key = DataKey::Escrow(next_id);
        env.storage().instance().set(&escrow_key, &escrow);

        // Note: In production, this would transfer XLM from client to contract
        // For testnet demo, we assume funds are locked via separate transfer

        next_id
    }

    /// Release funds for a completed milestone
    /// 
    /// # Arguments
    /// * `escrow_id` - The unique escrow identifier
    /// * `caller` - Address of the caller (must be client)
    /// 
    /// # Panics
    /// * If escrow doesn't exist
    /// * If caller is not the client
    /// * If escrow is not active
    /// * If all milestones already completed
    pub fn release_funds(env: Env, escrow_id: u64, caller: Address) {
        // Verify caller is authorized
        caller.require_auth();

        // Retrieve escrow
        let escrow_key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&escrow_key)
            .expect("Escrow not found");

        // Verify caller is the client
        assert!(escrow.client == caller, "Only client can release funds");

        // Verify escrow is active
        assert!(
            escrow.status == EscrowStatus::Active,
            "Escrow is not active"
        );

        // Verify there are milestones left to complete
        assert!(
            escrow.completed_milestones < escrow.total_milestones,
            "All milestones already completed"
        );

        // Increment completed milestones
        escrow.completed_milestones += 1;

        // If all milestones completed, mark escrow as released
        if escrow.completed_milestones == escrow.total_milestones {
            escrow.status = EscrowStatus::Released;
        }

        // Update escrow in storage
        env.storage().instance().set(&escrow_key, &escrow);

        // Note: In production, this would transfer proportional XLM to freelancer
        // Amount per milestone = total_amount / total_milestones
    }

    /// Refund the escrow to the client (dispute resolution)
    /// 
    /// # Arguments
    /// * `escrow_id` - The unique escrow identifier
    /// * `caller` - Address of the caller (must be client)
    /// 
    /// # Panics
    /// * If escrow doesn't exist
    /// * If caller is not the client
    /// * If escrow is not active
    pub fn refund(env: Env, escrow_id: u64, caller: Address) {
        // Verify caller is authorized
        caller.require_auth();

        // Retrieve escrow
        let escrow_key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&escrow_key)
            .expect("Escrow not found");

        // Verify caller is the client
        assert!(escrow.client == caller, "Only client can refund");

        // Verify escrow is active
        assert!(
            escrow.status == EscrowStatus::Active,
            "Escrow is not active"
        );

        // Mark escrow as refunded
        escrow.status = EscrowStatus::Refunded;

        // Update escrow in storage
        env.storage().instance().set(&escrow_key, &escrow);

        // Note: In production, this would transfer remaining XLM back to client
    }

    /// Get escrow details by ID
    /// 
    /// # Arguments
    /// * `escrow_id` - The unique escrow identifier
    /// 
    /// # Returns
    /// * `Escrow` - The escrow data structure
    /// 
    /// # Panics
    /// * If escrow doesn't exist
    pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
        let escrow_key = DataKey::Escrow(escrow_id);
        env.storage()
            .instance()
            .get(&escrow_key)
            .expect("Escrow not found")
    }

    /// Get all escrows for a specific client
    /// 
    /// # Arguments
    /// * `client` - Address of the client
    /// 
    /// # Returns
    /// * `Vec<Escrow>` - Vector of all escrows created by the client
    /// 
    /// Note: This is a simplified implementation for demo purposes.
    /// In production, you'd use a more efficient indexing mechanism.
    pub fn get_client_escrows(env: Env, client: Address) -> Vec<Escrow> {
        let counter_key = DataKey::EscrowCounter;
        let max_id: u64 = env
            .storage()
            .instance()
            .get(&counter_key)
            .unwrap_or(0);

        let mut escrows = Vec::new(&env);

        // Iterate through all escrow IDs and filter by client
        for id in 1..=max_id {
            let escrow_key = DataKey::Escrow(id);
            if let Some(escrow) = env.storage().instance().get::<DataKey, Escrow>(&escrow_key) {
                if escrow.client == client {
                    escrows.push_back(escrow);
                }
            }
        }

        escrows
    }

    /// Get all escrows for a specific freelancer
    /// 
    /// # Arguments
    /// * `freelancer` - Address of the freelancer
    /// 
    /// # Returns
    /// * `Vec<Escrow>` - Vector of all escrows assigned to the freelancer
    pub fn get_freelancer_escrows(env: Env, freelancer: Address) -> Vec<Escrow> {
        let counter_key = DataKey::EscrowCounter;
        let max_id: u64 = env
            .storage()
            .instance()
            .get(&counter_key)
            .unwrap_or(0);

        let mut escrows = Vec::new(&env);

        // Iterate through all escrow IDs and filter by freelancer
        for id in 1..=max_id {
            let escrow_key = DataKey::Escrow(id);
            if let Some(escrow) = env.storage().instance().get::<DataKey, Escrow>(&escrow_key) {
                if escrow.freelancer == freelancer {
                    escrows.push_back(escrow);
                }
            }
        }

        escrows
    }
}

#[cfg(test)]
mod test;
