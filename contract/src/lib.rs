#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Active,
    Released,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Escrow {
    pub id: u64,
    pub client: Address,
    pub freelancer: Address,
    pub amount: i128,
    pub total_milestones: u32,
    pub completed_milestones: u32,
    pub status: EscrowStatus,
}

#[contracttype]
pub enum DataKey {
    Escrow(u64),
    EscrowCounter,
    TokenAddress,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// One-time setup: set the XLM token contract address used for transfers.
    /// Must be called before any escrow is created. On testnet, use the native
    /// Stellar Asset Contract address: CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2QDGDG6
    pub fn initialize(env: Env, token: Address) {
        assert!(
            env.storage()
                .instance()
                .get::<DataKey, Address>(&DataKey::TokenAddress)
                .is_none(),
            "Already initialized"
        );
        env.storage().instance().set(&DataKey::TokenAddress, &token);
    }

    pub fn create_escrow(
        env: Env,
        client: Address,
        freelancer: Address,
        amount: i128,
        total_milestones: u32,
    ) -> u64 {
        client.require_auth();

        assert!(amount > 0, "Amount must be greater than 0");
        assert!(total_milestones > 0, "Must have at least 1 milestone");

        let token = get_token(&env);
        token.transfer(&client, &env.current_contract_address(), &amount);

        let counter_key = DataKey::EscrowCounter;
        let escrow_id: u64 = env
            .storage()
            .persistent()
            .get(&counter_key)
            .unwrap_or(0);

        let next_id = escrow_id + 1;
        env.storage().persistent().set(&counter_key, &next_id);

        let escrow = Escrow {
            id: next_id,
            client: client.clone(),
            freelancer: freelancer.clone(),
            amount,
            total_milestones,
            completed_milestones: 0,
            status: EscrowStatus::Active,
        };

        let escrow_key = DataKey::Escrow(next_id);
        env.storage().persistent().set(&escrow_key, &escrow);

        next_id
    }

    pub fn release_funds(env: Env, escrow_id: u64, caller: Address) {
        caller.require_auth();

        let escrow_key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&escrow_key)
            .expect("Escrow not found");

        assert!(escrow.client == caller, "Only client can release funds");
        assert!(
            escrow.status == EscrowStatus::Active,
            "Escrow is not active"
        );
        assert!(
            escrow.completed_milestones < escrow.total_milestones,
            "All milestones already completed"
        );

        escrow.completed_milestones += 1;

        if escrow.completed_milestones == escrow.total_milestones {
            escrow.status = EscrowStatus::Released;
        }

        env.storage().persistent().set(&escrow_key, &escrow);

        let per_milestone = escrow.amount / escrow.total_milestones as i128;
        let token = get_token(&env);
        token.transfer(
            &env.current_contract_address(),
            &escrow.freelancer,
            &per_milestone,
        );
    }

    pub fn refund(env: Env, escrow_id: u64, caller: Address) {
        caller.require_auth();

        let escrow_key = DataKey::Escrow(escrow_id);
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&escrow_key)
            .expect("Escrow not found");

        assert!(escrow.client == caller, "Only client can refund");
        assert!(
            escrow.status == EscrowStatus::Active,
            "Escrow is not active"
        );

        let per_milestone = escrow.amount / escrow.total_milestones as i128;
        let released = escrow.completed_milestones as i128 * per_milestone;
        let remaining = escrow.amount - released;

        escrow.status = EscrowStatus::Refunded;
        env.storage().persistent().set(&escrow_key, &escrow);

        if remaining > 0 {
            let token = get_token(&env);
            token.transfer(
                &env.current_contract_address(),
                &escrow.client,
                &remaining,
            );
        }
    }

    pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
        let escrow_key = DataKey::Escrow(escrow_id);
        env.storage()
            .persistent()
            .get(&escrow_key)
            .expect("Escrow not found")
    }

    pub fn get_client_escrows(env: Env, client: Address) -> Vec<Escrow> {
        let max_id: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::EscrowCounter)
            .unwrap_or(0);

        let mut escrows = Vec::new(&env);
        for id in 1..=max_id {
            let escrow_key = DataKey::Escrow(id);
            if let Some(escrow) = env
                .storage()
                .persistent()
                .get::<DataKey, Escrow>(&escrow_key)
            {
                if escrow.client == client {
                    escrows.push_back(escrow);
                }
            }
        }
        escrows
    }

    pub fn get_freelancer_escrows(env: Env, freelancer: Address) -> Vec<Escrow> {
        let max_id: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::EscrowCounter)
            .unwrap_or(0);

        let mut escrows = Vec::new(&env);
        for id in 1..=max_id {
            let escrow_key = DataKey::Escrow(id);
            if let Some(escrow) = env
                .storage()
                .persistent()
                .get::<DataKey, Escrow>(&escrow_key)
            {
                if escrow.freelancer == freelancer {
                    escrows.push_back(escrow);
                }
            }
        }
        escrows
    }
}

fn get_token(env: &Env) -> token::Client<'_> {
    let addr: Address = env
        .storage()
        .instance()
        .get(&DataKey::TokenAddress)
        .expect("Contract not initialized — call initialize(token) first");
    token::Client::new(env, &addr)
}

#[cfg(test)]
mod test;
