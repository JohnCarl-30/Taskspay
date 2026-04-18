# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All frontend commands run from `frontend/`:

```bash
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # tsc -b + vite build (type-check + production bundle)
npm run lint         # eslint .
npm test             # vitest --run (single pass, no watch)
npx vitest run <path>            # Run a single test file
npx vitest run -t "<test name>"  # Run tests matching a name
```

Smart contract (from `contract/`):

```bash
cargo test                  # Unit tests in contract/src/test.rs
soroban contract build      # Builds wasm32 artifact in target/wasm32-unknown-unknown/release/
```

One-off setup:

```bash
bash scripts/wrap-native-xlm.sh   # Wraps native XLM as a SAC on testnet; prints the ID to paste into VITE_XLM_TOKEN_ADDRESS
```

## Architecture

**Three-tier app with no custom backend.** React frontend talks directly to (a) Soroban RPC for the on-chain escrow contract and (b) Supabase for off-chain state.

### On-chain: Soroban escrow contract (`contract/src/lib.rs`)

Single `EscrowContract` with these entrypoints: `initialize(token)`, `create_escrow`, `release_funds`, `refund`, plus view helpers. The contract stores the native XLM **Stellar Asset Contract (SAC)** address once via `initialize`; subsequent calls use that address to move XLM. `release_funds` pays `amount / total_milestones` directly to the freelancer address captured at `create_escrow` time — the client does not re-enter the freelancer address on release. Amounts are `i128` stroops (1 XLM = 10,000,000 stroops).

The native XLM SAC **must be wrapped on the target network before `initialize` will succeed** (via `stellar contract asset deploy --asset native`). Failure mode surfaces as `Unsupported address type: CD…`. The `scripts/wrap-native-xlm.sh` helper automates this; `XLM_TOKEN_SETUP.md` documents recovery.

### Off-chain: Supabase

Six core tables mirror on-chain state and layer AI/metadata on top:
- `escrows` (contains `on_chain_id`, `payment_releases` JSONB, AI-generated `milestones`)
- `work_submissions` (freelancer deliverables per milestone, with `client_decision`)
- `delivery_verifications` (AI scores per submission)
- `user_profiles` (role: `client` | `freelancer`)

Auth is **anonymous Supabase sign-in keyed to the Freighter wallet address**. RLS uses the wallet address, not user_id — see migrations 007 and 009. All migrations live in `supabase/migrations/` and must be applied manually via the Supabase SQL Editor (no CLI runner).

### Frontend (`frontend/src/`)

- `stellar.ts` — all Soroban tx building (`createEscrow`, `releaseFunds`, `refundEscrow`, `initializeContract`). Throws `XlmTokenSetupError` when `VITE_XLM_TOKEN_ADDRESS` is missing or the SAC isn't wrapped; the UI catches this and surfaces a `SetupHelpCard` in `HomePage.tsx`. **No silent fallback for the token address.**
- `freighter.ts` — Freighter connect / get public key / sign XDR.
- `supabase.ts` — single Supabase client + all TS types + realtime subscriptions.
- `openai.ts` — GPT-4o-mini milestone generation.
- `verification.ts` — GPT-4o-mini delivery scoring.
- `App.tsx` — top-level router via a `page` string + role-gated rendering. After wallet connect, it fetches a `user_profiles` row; if missing, shows `RoleSelectionPage`. Client sees `HomePage`; freelancer sees `FreelancerHomePage`. Escrows auto-refresh via `subscribeToEscrows`.
- `offline.ts` — localStorage queue for writes while offline; replays on reconnect. Target users are on flaky connectivity.

### Key flow: release_funds

`ReleaseFundsButton` runs a state machine: `idle → confirming → signing → submitting → success | error`. On confirm it calls `stellar.ts::releaseFunds`, which builds + simulates the tx, hands the XDR to Freighter for signing, submits to Soroban RPC. The contract transfers XLM from the contract account to `escrow.freelancer` via the SAC — that is the moment the freelancer's Freighter balance updates. Then the frontend writes a `payment_releases` entry to Supabase for UI history (off-chain only; on-chain state is the source of truth).

## Environment

`frontend/.env` is required for development. Critical keys:

```
VITE_CONTRACT_ID                # Deployed Taskspay contract (testnet default: see README)
VITE_XLM_TOKEN_ADDRESS          # Output of scripts/wrap-native-xlm.sh — empty = app will refuse to initialize
VITE_STELLAR_RPC_URL            # https://soroban-testnet.stellar.org
VITE_SUPABASE_URL / _ANON_KEY   # Supabase project
VITE_OPENAI_API_KEY             # For milestone + verification AI
```

Vite only reads `.env` at dev-server start — changes require `npm run dev` restart.

## Non-obvious conventions

- **Do not add backwards-compat fallbacks for contract addresses.** A missing `VITE_XLM_TOKEN_ADDRESS` should throw `XlmTokenSetupError` with the remediation command, not silently use a hardcoded value. A wrong hardcoded value was the original cause of the "Unsupported address type" confusion.
- **`localStorage.contractInitialized`** caches only the `true` result; `false` is always re-checked so a failed init doesn't get cached.
- **Amount encoding**: always use `BigInt(Math.round(parseFloat(xlm) * 10_000_000))` when passing to the contract; never trust floats for stroop math.
- **Role detection**: the app compares connected wallet against the escrow's `wallet_address` (client) and `freelancer_address` fields. Neither match → read-only `Viewer` mode shown in `EscrowDetailPage`.
- **Styling**: uses Tailwind v4 + CSS variables in `src/index.css`. Glass components use the `.glass` utility; gradient text uses `.gradient-text`. Dark theme is the default via `:root`, light theme activates under `[data-theme="light"]`.
