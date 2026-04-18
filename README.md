# Taskspay

**AI-powered freelance escrow on Stellar.**

![Blockchain](https://img.shields.io/badge/Blockchain-Stellar%20Soroban-111827?style=for-the-badge&logo=stellar)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Network](https://img.shields.io/badge/Network-Testnet-B7E35B?style=for-the-badge)

Taskspay is a milestone-based escrow app for freelance work. Clients lock XLM in a Soroban smart contract, generate milestone plans from a plain-English project brief, collect freelancer submissions, and release funds as each milestone is approved. Supabase stores off-chain metadata and submission history, while Stellar handles settlement on-chain.

## Product Walkthrough

<p align="center">
  <img src="./docs/screenshots/landing-page.png" alt="Taskspay landing page" width="49%" />
  <img src="./docs/screenshots/role-selection.png" alt="Wallet-based role selection" width="49%" />
</p>

<p align="center">
  <img src="./docs/screenshots/new-escrow.png" alt="New escrow creation flow" width="49%" />
  <img src="./docs/screenshots/history.png" alt="Escrow history page" width="49%" />
</p>

<p align="center">
  <img src="./docs/screenshots/freelancer-view.png" alt="Freelancer submission view" width="49%" />
  <img src="./docs/screenshots/client-decision.png" alt="Client review and payment release" width="49%" />
</p>

## Core Features

- Lock XLM in a Soroban escrow contract
- Generate 3 to 5 milestone breakdowns with GPT-4o-mini
- Let freelancers submit descriptions, links, and image evidence
- Score submissions with AI before client review
- Release funds milestone by milestone or refund remaining escrow
- Use wallet-based access control with Freighter and Supabase

## Live Contract

- Network: `Stellar Testnet`
- Contract ID: `CDQFDOAZ5HJISBN6BPNET573F4J7FLIVFPBKBNUJZBEWVMD7XAVAV3Z3`
- Explorer: [stellar.expert](https://stellar.expert/explorer/testnet/contract/CDQFDOAZ5HJISBN6BPNET573F4J7FLIVFPBKBNUJZBEWVMD7XAVAV3Z3)

## Architecture

```text
React + Vite frontend
├── Freighter wallet connect + signing
├── Soroban RPC transaction building and submission
├── OpenAI milestone generation and delivery verification
└── Supabase auth, tables, storage, and realtime

Soroban escrow contract
├── initialize(token)
├── create_escrow(client, freelancer, amount, total_milestones)
├── release_funds(escrow_id, caller)
└── refund(escrow_id, caller)
```

The app has no custom backend. The frontend talks directly to Soroban RPC and Supabase.

## Project Structure

```text
Taskspay/
├── contract/             # Soroban escrow contract in Rust
├── frontend/             # React + Vite application
├── supabase/migrations/  # Database schema and RLS policies
├── scripts/              # Network setup and troubleshooting helpers
└── docs/screenshots/     # README product screenshots
```

## Local Setup

### Prerequisites

- Node.js 18+
- Rust
- `wasm32-unknown-unknown` target via `rustup target add wasm32-unknown-unknown`
- Stellar CLI
- Freighter wallet on Testnet
- Supabase project
- OpenAI API key

### 1. Clone and install

```bash
git clone https://github.com/JohnCarl-30/Taskspay.git
cd Taskspay/frontend
npm install
```

### 2. Wrap native XLM as a Stellar Asset Contract

```bash
cd ..
bash scripts/wrap-native-xlm.sh
```

This prints the value you must use for `VITE_XLM_TOKEN_ADDRESS`.

### 3. Configure `frontend/.env`

```env
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_CONTRACT_ID=CDQFDOAZ5HJISBN6BPNET573F4J7FLIVFPBKBNUJZBEWVMD7XAVAV3Z3
VITE_XLM_TOKEN_ADDRESS=<output from wrap-native-xlm.sh>
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_OPENAI_API_KEY=<your-openai-api-key>
```

### 4. Apply Supabase migrations

Run every SQL file in [`supabase/migrations/`](./supabase/migrations/) in numeric order using the Supabase SQL Editor, then enable **Anonymous Sign-In** in Supabase Auth.

### 5. Fund a testnet wallet

Use Friendbot with your Freighter public key:

```text
https://friendbot.stellar.org?addr=<your-public-key>
```

### 6. Run the app

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`, connect Freighter, and initialize the contract once before creating your first escrow.

## Development

```bash
# frontend
cd frontend
npm run dev
npm run build
npm run lint
npm test

# contract
cd contract
cargo test
soroban contract build
```

## Important Notes

- `VITE_XLM_TOKEN_ADDRESS` is required. The app intentionally does not fall back to a hardcoded token address.
- Native XLM must be wrapped before `initialize` succeeds.
- Vite reads `.env` only on startup, so restart `npm run dev` after changing environment variables.
- On-chain amounts are encoded in stroops.
- AI verification is advisory only. The client makes the final decision.

## License

MIT. See [LICENSE](./LICENSE).
