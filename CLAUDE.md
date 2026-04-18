# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MilestoneEscrow (Taskspay) is an AI-powered freelance escrow platform on the Stellar blockchain. Clients lock XLM in a Soroban smart contract; AI generates milestone breakdowns; AI verifies completed work before releasing funds. Targets freelancers in emerging markets.

## Commands

### Frontend (`/frontend`)

```bash
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # TypeScript check + production build
npm run lint      # ESLint
npm test          # Vitest (watch mode)
npm run preview   # Preview production build
```

Run a single test file:
```bash
npx vitest run src/amount-utils.test.ts
```

### Smart Contract (`/contract`)

```bash
soroban contract build    # Compile Rust → WebAssembly (requires soroban-cli 22+)
cargo test               # Run 5 contract unit tests
```

## Architecture

### No Backend Server

The frontend talks directly to Supabase (Postgres + Auth + Realtime) and the Stellar blockchain. There is no custom API server.

### Data Flow

```
User → Freighter wallet extension (signs txns)
     → @stellar/stellar-sdk → Soroban contract (escrow lock/release/refund)
     → Supabase (index escrow records, work submissions, AI verification results)
     → OpenAI GPT-4o-mini (milestone generation & delivery verification)
```

### Key Source Files

| File | Purpose |
|------|---------|
| [frontend/src/stellar.ts](frontend/src/stellar.ts) | All blockchain contract invocations |
| [frontend/src/supabase.ts](frontend/src/supabase.ts) | Supabase client + TypeScript types for all tables |
| [frontend/src/openai.ts](frontend/src/openai.ts) | Milestone generation via OpenAI |
| [frontend/src/verification.ts](frontend/src/verification.ts) | AI verification of submitted work |
| [frontend/src/freighter.ts](frontend/src/freighter.ts) | Freighter wallet connection & signing |
| [frontend/src/offline.ts](frontend/src/offline.ts) | Offline-first LocalStorage queue + sync |
| [frontend/src/App.tsx](frontend/src/App.tsx) | Top-level routing and global state |
| [contract/src/lib.rs](contract/src/lib.rs) | Soroban escrow contract (create/release/refund) |

### Smart Contract

The Soroban contract (`contract/src/lib.rs`) exposes:
- `create_escrow` — locks XLM, stores escrow state on-chain
- `release_funds` — releases one milestone's share to freelancer (called per milestone)
- `refund` — returns remaining locked funds to client
- `get_escrow`, `get_client_escrows`, `get_freelancer_escrows` — read-only queries

`EscrowStatus` enum: `Active | Released | Refunded`.

### Database Schema (Supabase / PostgreSQL)

All tables have Row Level Security enabled — users only access their own rows.

- **escrows** — core record with `wallet_address`, `freelancer_address`, `amount` (NUMERIC 20,7 for XLM precision), `milestones` (JSONB), `tx_hash`, `status` ('pending'|'active'|'completed'|'refunded'), `verification_result` (JSONB)
- **work_submissions** — freelancer submissions per `milestone_index` with `description` (max 2000) and `urls` (array, max 5)
- **delivery_verifications** — AI results: `score`, `recommendation` ('approve'|'request_changes'|'reject'), `feedback`, `gaps` array
- **payment_releases** — per-milestone release audit trail linking to `verification_id`

Migrations live in [supabase/migrations/](supabase/migrations/) and must be applied manually via the Supabase SQL editor (no CLI migration runner is configured).

### Offline Support

`offline.ts` queues write operations to `localStorage` when the network is unavailable and replays them on reconnect. This affects submission and verification flows — check `offline.ts` when debugging sync issues.

## Environment Variables

Frontend requires a `.env` file at `frontend/.env`:

```
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_CONTRACT_ID=<deployed-contract-id>
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_OPENAI_API_KEY=sk-...   # optional; AI features degrade gracefully without it
```

The project currently targets **Stellar Testnet**. The contract must be deployed before `VITE_CONTRACT_ID` can be set.

## Testing

Tests use **Vitest** with a **jsdom** environment. Property-based tests use **fast-check** (see `amount-utils.test.ts` for examples of how input sanitization is fuzz-tested). Contract tests are in `contract/src/test.rs` and cover happy path, authorization enforcement, state persistence, and refund scenarios.
