# MilestoneEscrow Smart Contract

**AI-Powered Freelance Escrow on Stellar Soroban**

---

## Overview

MilestoneEscrow is a Soroban smart contract that enables trustless, milestone-based escrow payments for freelance work. Clients lock XLM in the contract, and funds are released incrementally as milestones are completed, eliminating payment disputes through transparent on-chain logic.

## Problem

Freelancers in emerging markets lose $50-200 per project to payment disputes because clients refuse milestone payments after work is delivered. Traditional escrow services charge 3-5% fees and take days to process disputes.

## Solution

Lock XLM in a Soroban smart contract with milestone-based releases. The contract ensures:
- **Trustless**: No intermediary needed
- **Transparent**: All actions recorded on-chain
- **Fast**: Instant milestone releases
- **Cheap**: <$0.01 per transaction

## Timeline

**Hackathon Build**: 48 hours  
**Status**: ✅ Complete and testnet-ready

---

## Stellar Features Used

- **XLM Transfers**: Native asset for escrow payments
- **Soroban Smart Contracts**: Trustless escrow logic with milestone tracking
- **Stellar Testnet**: Fast, low-cost transactions

---

## Prerequisites

- **Rust**: 1.74.0 or later
- **Soroban CLI**: 22.0.0 or later
- **Stellar Account**: Testnet account with XLM (use Friendbot)

### Install Soroban CLI

```bash
cargo install --locked soroban-cli --version 22.0.0
```

### Configure Testnet

```bash
soroban network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

---

## Build

Compile the contract to WebAssembly:

```bash
cd contract
soroban contract build
```

This generates `target/wasm32-unknown-unknown/release/milestone_escrow.wasm`

---

## Test

Run the test suite (5 tests covering happy path, edge cases, and state verification):

```bash
cargo test
```

**Test Coverage**:
1. ✅ Happy path: Create escrow → Release milestones → Complete
2. ✅ Edge case: Unauthorized caller cannot release funds
3. ✅ State verification: Multiple escrows persist correctly
4. ✅ Edge case: Cannot release after all milestones completed
5. ✅ Refund scenario: Client can refund active escrow

---

## Deploy to Testnet

### 1. Generate Identity

```bash
soroban keys generate alice --network testnet
```

### 2. Fund Account

```bash
soroban keys address alice
# Copy the address and fund it via Friendbot:
# https://friendbot.stellar.org?addr=YOUR_ADDRESS
```

### 3. Deploy Contract

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/milestone_escrow.wasm \
  --source alice \
  --network testnet
```

This returns your contract ID (e.g., `CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

### 4. Save Contract ID

```bash
export CONTRACT_ID="YOUR_CONTRACT_ID"
```

---

## Usage

### Create Escrow

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source alice \
  --network testnet \
  -- \
  create_escrow \
  --client GABC...XYZ \
  --freelancer GDEF...UVW \
  --amount 1000000000 \
  --total_milestones 3
```

**Parameters**:
- `client`: Stellar address of the client (G...)
- `freelancer`: Stellar address of the freelancer (G...)
- `amount`: Total XLM in stroops (1 XLM = 10,000,000 stroops)
- `total_milestones`: Number of milestones (e.g., 3)

**Returns**: Escrow ID (e.g., `1`)

### Release Milestone

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source alice \
  --network testnet \
  -- \
  release_funds \
  --escrow_id 1 \
  --caller GABC...XYZ
```

### Get Escrow Details

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- \
  get_escrow \
  --escrow_id 1
```

### Refund Escrow

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source alice \
  --network testnet \
  -- \
  refund \
  --escrow_id 1 \
  --caller GABC...XYZ
```

---

## Contract Functions

### `create_escrow`
Creates a new escrow with locked funds.

**Parameters**:
- `client: Address` - Client creating the escrow
- `freelancer: Address` - Freelancer receiving payment
- `amount: i128` - Total XLM in stroops
- `total_milestones: u32` - Number of milestones

**Returns**: `u64` - Unique escrow ID

### `release_funds`
Releases funds for one completed milestone.

**Parameters**:
- `escrow_id: u64` - Escrow identifier
- `caller: Address` - Must be the client

**Authorization**: Requires client signature

### `refund`
Refunds remaining funds to the client (dispute resolution).

**Parameters**:
- `escrow_id: u64` - Escrow identifier
- `caller: Address` - Must be the client

**Authorization**: Requires client signature

### `get_escrow`
Retrieves escrow details by ID.

**Parameters**:
- `escrow_id: u64` - Escrow identifier

**Returns**: `Escrow` struct with all details

### `get_client_escrows`
Gets all escrows created by a client.

**Parameters**:
- `client: Address` - Client address

**Returns**: `Vec<Escrow>` - List of escrows

### `get_freelancer_escrows`
Gets all escrows assigned to a freelancer.

**Parameters**:
- `freelancer: Address` - Freelancer address

**Returns**: `Vec<Escrow>` - List of escrows

---

## Data Structures

### Escrow

```rust
pub struct Escrow {
    pub id: u64,                    // Unique identifier
    pub client: Address,            // Client address
    pub freelancer: Address,        // Freelancer address
    pub amount: i128,               // Total XLM in stroops
    pub total_milestones: u32,      // Total milestones
    pub completed_milestones: u32,  // Completed count
    pub status: EscrowStatus,       // Active/Released/Refunded
}
```

### EscrowStatus

```rust
pub enum EscrowStatus {
    Active,      // Funds locked, milestones in progress
    Released,    // All milestones completed, funds released
    Refunded,    // Escrow refunded to client
}
```

---

## Example Flow

```bash
# 1. Deploy contract
CONTRACT_ID=$(soroban contract deploy --wasm target/wasm32-unknown-unknown/release/milestone_escrow.wasm --source alice --network testnet)

# 2. Create escrow (100 XLM, 3 milestones)
soroban contract invoke --id $CONTRACT_ID --source alice --network testnet -- \
  create_escrow \
  --client GABC...XYZ \
  --freelancer GDEF...UVW \
  --amount 1000000000 \
  --total_milestones 3

# 3. Release milestone 1
soroban contract invoke --id $CONTRACT_ID --source alice --network testnet -- \
  release_funds --escrow_id 1 --caller GABC...XYZ

# 4. Release milestone 2
soroban contract invoke --id $CONTRACT_ID --source alice --network testnet -- \
  release_funds --escrow_id 1 --caller GABC...XYZ

# 5. Release milestone 3 (final)
soroban contract invoke --id $CONTRACT_ID --source alice --network testnet -- \
  release_funds --escrow_id 1 --caller GABC...XYZ

# 6. Check escrow status
soroban contract invoke --id $CONTRACT_ID --network testnet -- \
  get_escrow --escrow_id 1
```

---

## Security Considerations

- **Authorization**: All state-changing functions require caller authentication
- **Validation**: Input validation prevents invalid escrows (amount > 0, milestones > 0)
- **State Checks**: Functions verify escrow status before operations
- **Immutability**: Completed/refunded escrows cannot be modified

---

## Future Enhancements

- **Dispute Resolution**: Multi-sig arbitration for disputed milestones
- **Partial Releases**: Release custom percentages per milestone
- **Time Locks**: Automatic refunds after deadline
- **Multi-Asset**: Support USDC and custom tokens
- **Batch Operations**: Create multiple escrows in one transaction

---

## License

MIT License

Copyright (c) 2025 MilestoneEscrow Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
