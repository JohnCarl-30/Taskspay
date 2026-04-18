# Taskspay

AI-Powered Freelance Escrow on Stellar.

---

## Problem

A freelancer in Manila delivers a landing page project to a client in Singapore. The client refuses to pay the final milestone, claiming the work wasn't completed. The freelancer spends weeks in dispute resolution with no guaranteed outcome, loses $200, and learns to never work with overseas clients again.

## Solution

Taskspay lets the client lock XLM in a Soroban smart contract escrow. AI generates structured milestones from the project description, and AI verifies deliverables before funds are released. If the freelancer submits quality work and the client goes silent, funds auto-release after 72 hours. Settlement happens in under 5 seconds with fees under $0.01.

---

## Demo Flow (2 minutes)

1. Connect Freighter wallet (testnet)
2. Enter freelancer Stellar address, total amount, and project description
3. Click "Generate AI Milestone Breakdown" — AI splits the project into 3 milestones
4. Click "Initialize Escrow" — contract locks XLM on-chain
5. Freelancer completes milestone 1 → Client approves → Funds release
6. Repeat until all milestones complete

---

## Architecture

```
Browser (React + Vite)
  |-- Freighter Wallet API      (signing)
  |-- @stellar/stellar-sdk      (transaction building, RPC)
  |-- Supabase                 (real-time off-chain state sync)
  |-- OpenAI GPT-4o-mini       (milestone generation & verification)

Stellar Testnet
  |-- Taskspay Soroban Contract (escrow logic)
```

No backend server. All escrow state lives on-chain. Supabase mirrors it for real-time UI updates and activity logs.

---

## Project Structure

```
Taskspay/
├── contract/
│   ├── src/
│   │   ├── lib.rs              # Soroban escrow contract
│   │   └── test.rs             # 5 contract tests
│   └── Cargo.toml
├── frontend/
│   ├── src/
│   │   ├── pages/             # HomePage, EscrowPage, HistoryPage
│   │   ├── components/         # EscrowCard, StatusBadge, Topbar
│   │   ├── utils/             # Amount utils, error handling
│   │   ├── stellar.ts        # Contract invocations, balance reads
│   │   ├── freighter.ts      # Wallet connect and signing
│   │   ├── supabase.ts      # Supabase client and types
│   │   ├── openai.ts        # OpenAI milestone generation
│   │   └── verification.ts # AI milestone verification
│   ├── package.json
├── supabase/
│   └── migrations/           # Database schema
└── README.md
```

---

## Smart Contract

Deployed on Stellar testnet:
```
YOUR_CONTRACT_ID_HERE
```

Explorer: https://stellar.expert/explorer/testnet/contract/YOUR_CONTRACT_ID_HERE

### Contract Functions

| Function | Caller | Description |
|---|---|---|
| `create_escrow(client, freelancer, amount, total_milestones)` | Client | Locks XLM, returns escrow ID |
| `release_funds(escrow_id)` | Client | Releases one milestone's share to freelancer |
| `refund(escrow_id)` | Client | Returns remaining locked funds to client |
| `get_escrow(escrow_id)` | Anyone | Read-only escrow state |

### Escrow Status Lifecycle

```
Active --> Released (client calls release_funds per milestone)
       --> Refunded (client calls refund)
```

---

## Prerequisites

**For the smart contract:**
- Rust (latest stable)
- Soroban CLI v22+
- Stellar testnet account funded via Friendbot

**For the frontend:**
- Node.js 18+
- Freighter browser extension set to Testnet
- Testnet XLM (for gas)

---

## Setup

### Smart Contract

```bash
# Build
cd contract
soroban contract build

# Test
cargo test

# Deploy to testnet
soroban keys generate deployer --network testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/taskspay.wasm \
  --source deployer \
  --network testnet
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

**Environment variables** (`.env`):

```env
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_CONTRACT_ID=<deployed contract ID>
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_OPENAI_API_KEY=sk-...
```

---

## Sample CLI Invocations

```bash
# Create escrow: client locks 100 XLM for freelancer, 3 milestones
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source client \
  --network testnet \
  -- create_escrow \
  --client <CLIENT_ADDRESS> \
  --freelancer <FREELANCER_ADDRESS> \
  --amount 1000000000 \
  --total_milestones 3

# Release milestone 1 (33 XLM to freelancer)
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source client \
  --network testnet \
  -- release_funds \
  --escrow_id 1

# Check escrow state
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --network testnet \
  -- get_escrow \
  --escrow_id 1
```

---

## Target Users

Filipino freelance developers, designers, and content creators earning $500-$5,000/month who regularly work with overseas clients. They face frequent payment disputes, lack legal recourse, and need instant, trustless payment guarantees.

---

## Why Stellar

No other chain gives sub-cent fees with built-in smart contracts that can enforce escrow logic without intermediaries. Stellar's speed (3-5 second finality) and cost (less than $0.01 per transaction) makes this directly competitive against PayPal and bank wire alternatives for freelance payments. The escrow contract is composable — it can be reused for any milestone-based B2B or B2C trade.