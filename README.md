# Taskspay

**AI-Powered Freelance Escrow on Stellar Blockchain**

A trustless payment platform where clients lock XLM in a Soroban smart contract, AI generates milestone breakdowns from a project description, and the client reviews freelancer submissions before releasing funds — all on-chain, no intermediaries, sub-cent fees.

---

## The Problem

A freelancer in Manila delivers a landing page to a client in Singapore. The client refuses to pay the final milestone, claiming the work "wasn't completed." The freelancer spends weeks in dispute resolution with no legal recourse and loses $200. This happens millions of times a year across Southeast Asia, India, and Latin America.

Traditional solutions (PayPal, Wise, bank wires) have no escrow logic. Centralized escrow services charge 3–10% and have slow resolution. There is no trustless, cheap, fast alternative — until Stellar.

---

## The Solution

Taskspay uses a **Soroban smart contract** to hold funds trustlessly, **OpenAI GPT-4o-mini** to generate structured milestones, and an **AI verification engine** to analyze freelancer submissions. The client makes the final accept/reject decision. Settlement is 3–5 seconds with fees under $0.01.

---

## Live Contract

```
Network:     Stellar Testnet
Contract ID: CB2TSAFK7EDO44GH5ZU2H6G7J2KSFQLHIRDD544IO57PP3BNEXU65P76
Explorer:    https://stellar.expert/explorer/testnet/contract/CB2TSAFK7EDO44GH5ZU2H6G7J2KSFQLHIRDD544IO57PP3BNEXU65P76
```

---

## Full User Flow

### Step 1 — Connect Wallet

The app opens to the dashboard. The top bar has a **Connect Wallet** button. Clicking it triggers Freighter's permission popup.

```
┌─────────────────────────────────────────────────────────────────┐
│  TASKSPAY                              [Connect Wallet]         │
│─────────────────────────────────────────────────────────────────│
│  Overview                                                        │
│  Welcome, Connect Wallet                                         │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ WALLET BALANCE│  │ ACTIVE ESCROWS│  │  TOTAL LOCKED │       │
│  │  0.00         │  │    0          │  │  0.00         │       │
│  │  XLM · Testnet│  │  In progress  │  │  XLM          │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │  +  NEW ESCROW           │  │  →  TRANSACTION HISTORY  │    │
│  │  Lock funds with AI      │  │  Full ledger of activity │    │
│  │  milestone breakdown     │  │                          │    │
│  └──────────────────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

After connecting, the wallet balance populates from the Stellar RPC and your public key is shown in the top bar.

```
┌─────────────────────────────────────────────────────────────────┐
│  TASKSPAY                  GBKQ...8YXZ  [TESTNET]  [History]   │
│─────────────────────────────────────────────────────────────────│
│  Overview                                                        │
│  Welcome, Freelancer                                             │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ WALLET BALANCE│  │ ACTIVE ESCROWS│  │  TOTAL LOCKED │       │
│  │  9,847.23     │  │    2          │  │ 10,500.00     │       │
│  │  XLM · Testnet│  │  In progress  │  │  XLM          │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

### Step 2 — Create a New Escrow (Client)

Click **New Escrow** or navigate via the top bar. Fill in the freelancer's Stellar address, total XLM amount, and a plain-English project description.

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Dashboard                                                     │
│  New Escrow                                                      │
│─────────────────────────────────────────────────────────────────│
│  FREELANCER ADDRESS                                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ GC523Q3IFGEMUVZHNOOGECLAUOUSZJ643IXC757Q2IKVSTOGCMDADHOY  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  TOTAL AMOUNT (XLM)                                              │
│  ┌──────────────────┐                                           │
│  │  10000            │                                           │
│  └──────────────────┘                                           │
│                                                                  │
│  PROJECT DESCRIPTION                                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Build a 5-page landing page with responsive design,       │  │
│  │ contact form, and CMS integration. Deliver Figma mockups  │  │
│  │ first, then HTML/CSS, then final handoff with docs.       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [  ✦ GENERATE AI MILESTONE BREAKDOWN  ]                        │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 2a — AI Generates Milestones

Click **Generate AI Milestone Breakdown**. OpenAI GPT-4o-mini analyzes the description and splits the project into 3–5 milestones with percentage allocations and XLM amounts.

```
┌─────────────────────────────────────────────────────────────────┐
│  AI MILESTONE BREAKDOWN                           ✦ Generated   │
│─────────────────────────────────────────────────────────────────│
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1  Design Mockup                           30%          │   │
│  │     Initial design mockup delivered      3,000.00 XLM   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  2  Development Phase                       40%          │   │
│  │     Landing page development completed   4,000.00 XLM   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  3  Final Review                            30%          │   │
│  │     Final revisions and delivery         3,000.00 XLM   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [  INITIALIZE ESCROW →  ]                                      │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 2b — Initialize on Chain

Click **Initialize Escrow →**. Freighter pops up asking you to sign the transaction. After signing, the contract locks the XLM and returns an on-chain escrow ID.

```
┌──────────────────────────────────────────┐
│  FREIGHTER                               │
│                                          │
│  Sign Transaction                        │
│  ─────────────────                       │
│  Contract: CB2T...76                     │
│  Method: create_escrow                   │
│  Amount: 10,000 XLM                      │
│                                          │
│  [Cancel]  [Sign Transaction]            │
└──────────────────────────────────────────┘
```

After signing:

```
┌─────────────────────────────────────────────────────────────────┐
│  ✓ Escrow initialized on Stellar Testnet                        │
│    TX: a4b9c2d... ↗ Explorer                                    │
│    On-chain ID: 7                                               │
└─────────────────────────────────────────────────────────────────┘
```

The escrow is now live. The XLM is locked in the smart contract. The escrow card appears on the dashboard.

---

### Step 3 — Dashboard (Client View)

The client's dashboard shows all active escrows. The **Review Pending** badge appears in yellow when the freelancer has submitted work waiting for your decision.

```
┌─────────────────────────────────────────────────────────────────┐
│  ACTIVE ESCROWS                                   View All →    │
│─────────────────────────────────────────────────────────────────│
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ● PENDING  🟡 REVIEW PENDING              Amount       │   │
│  │  Build a landing page                      10,000 XLM  │   │
│  │  GC523Q3...DHOY                          Milestone 1/3  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ● PENDING                                  Amount       │   │
│  │  E-commerce backend API                     5,000 XLM   │   │
│  │  GAAZI4...WJHN                           Milestone 2/4  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Step 4 — Escrow Detail: Freelancer Submits Work

The freelancer navigates to the escrow detail page by connecting **their own wallet** (the `freelancer_address` registered in the contract). They see a **Freelancer** role badge and the submission form.

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Dashboard                                                     │
│  Build a landing page              🟡 Freelancer               │
│─────────────────────────────────────────────────────────────────│
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │  ESCROW SUMMARY      │  │  SUBMIT WORK EVIDENCE            │ │
│  │──────────────────────│  │──────────────────────────────────│ │
│  │  Client              │  │  MILESTONE 1                     │ │
│  │  GBKQ...8YXZ         │  │  ┌──────────────────────────┐   │ │
│  │  Freelancer          │  │  │  Design Mockup            │   │ │
│  │  GC52...HOY          │  │  │  Initial design mockup    │   │ │
│  │  Total  10,000 XLM   │  │  └──────────────────────────┘   │ │
│  │  Milestone  1 of 3   │  │                                  │ │
│  │──────────────────────│  │  WORK DESCRIPTION                │ │
│  │  MILESTONES          │  │  ┌──────────────────────────┐   │ │
│  │  ▶ 1 Design Mockup   │  │  │  Completed the Figma     │   │ │
│  │     active  30%      │  │  │  mockup for all 5 pages. │   │ │
│  │    2 Development     │  │  │  Desktop + mobile vers.. │   │ │
│  │    3 Final Review    │  │  └──────────────────────────┘   │ │
│  └──────────────────────┘  │  2000 remaining                  │ │
│                             │                                  │ │
│                             │  SUPPORTING URLS (OPTIONAL)      │ │
│                             │  ┌──────────────────────────┐   │ │
│                             │  │  https://figma.com/...   │   │ │
│                             │  └──────────────────────────┘   │ │
│                             │  + ADD URL (1/5)                 │ │
│                             │                                  │ │
│                             │  [ SUBMIT WORK EVIDENCE → ]     │ │
│                             └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

After submitting, the AI verification runs automatically and shows a recommendation:

```
┌─────────────────────────────────────────────────────────────────┐
│  ✓ Work submitted! Waiting for client review.                   │
│─────────────────────────────────────────────────────────────────│
│  AI VERIFICATION REPORT                         just now        │
│  ┌───────────┐                                                  │
│  │    ╭──╮   │  ● APPROVE                                      │
│  │   ( 87 )  │                                                  │
│  │    SCORE  │  The submission demonstrates strong completion   │
│  │           │  of the milestone. Figma mockup link provided    │
│  └───────────┘  with all 5 pages covered in desktop and mobile. │
│                                                                  │
│  ▼ VIEW FULL SUBMISSION                                         │
│─────────────────────────────────────────────────────────────────│
│  🟡 Awaiting client review                                      │
│     The client will accept or reject your submission.           │
└─────────────────────────────────────────────────────────────────┘
```

If the client rejects, the freelancer sees:

```
│  ✗ Work rejected                                               │
│    The client has requested changes. Review the AI             │
│    feedback above and resubmit.                                │
```

---

### Step 5 — Escrow Detail: Client Reviews & Decides

The client connects their wallet (the wallet that created the escrow). They see a **Client** badge. The right column shows the freelancer's submission and the AI analysis.

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Dashboard                                                     │
│  Build a landing page              🟢 Client                   │
│─────────────────────────────────────────────────────────────────│
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │  ESCROW SUMMARY      │  │  FREELANCER SUBMISSION           │ │
│  │                      │  │                     ● Awaiting   │ │
│  │  Client              │  │──────────────────────────────────│ │
│  │  GBKQ...8YXZ         │  │  DESCRIPTION                     │ │
│  │  Freelancer          │  │  Completed the Figma mockup for  │ │
│  │  GC52...HOY          │  │  all 5 pages including desktop   │ │
│  │  Total  10,000 XLM   │  │  and mobile breakpoints.         │ │
│  │  Milestone  1 of 3   │  │                                  │ │
│  │──────────────────────│  │  SUPPORTING LINKS                │ │
│  │  MILESTONES          │  │  ↗ https://figma.com/...         │ │
│  │  ▶ 1 Design Mockup   │  └──────────────────────────────────┘ │
│  │     active  30%      │                                        │
│  │    2 Development     │  AI VERIFICATION REPORT    just now   │
│  │    3 Final Review    │  ┌──────────────────────────────────┐ │
│  └──────────────────────┘  │  ┌──────┐  ● APPROVE            │ │
│                             │  │  87  │                        │ │
│                             │  │ SCORE│  Strong submission.    │ │
│                             │  └──────┘  All pages covered.   │ │
│                             │  ▼ VIEW FULL SUBMISSION         │ │
│                             └──────────────────────────────────┘ │
│                                                                   │
│                             ┌──────────────────────────────────┐ │
│                             │  YOUR DECISION                   │ │
│                             │──────────────────────────────────│ │
│                             │  AI scores this 87/100 and       │ │
│                             │  recommends approve. The final   │ │
│                             │  decision is yours.              │ │
│                             │                                  │ │
│                             │  ┌──────────────────────┐ ┌───┐ │ │
│                             │  │  Release 3,000 XLM → │ │ ✗ │ │ │
│                             │  └──────────────────────┘ └───┘ │ │
│                             │         Accept         Reject    │ │
│                             └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

If the client clicks **Release 3,000 XLM →**, Freighter asks for a signature. After signing, the funds are released on-chain and the milestone advances:

```
┌─────────────────────────────────────────────────────────────────┐
│  ✓ Payment released! Milestone complete.                        │
│─────────────────────────────────────────────────────────────────│
│  MILESTONES                                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  ✓  Design Mockup        completed          30%        │    │
│  │  ▶  Development Phase    active             40%        │    │
│  │     Final Review         pending            30%        │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

If the client clicks **Reject**, no funds are released. The freelancer sees the rejection and can resubmit with improved work.

---

### Step 6 — Submission History

Both client and freelancer can expand **Submission History** to see every submission for the current milestone, with AI scores, recommendations, and client decisions.

```
┌─────────────────────────────────────────────────────────────────┐
│  SUBMISSION HISTORY                           3 submissions     │
│─────────────────────────────────────────────────────────────────│
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  just now          ● Most Recent                    ▲   │   │
│  │  🟢 Client: Accepted    ● AI: Approve               │   │   │
│  │  ┌──────┐                                            │   │   │
│  │  │  87  │  Strong submission. All deliverables met.  │   │   │
│  │  │ SCORE│                                            │   │   │
│  │  └──────┘                                            │   │   │
│  │  ─────────────────────────────────────────────────── │   │   │
│  │  DESCRIPTION                                         │   │   │
│  │  Completed Figma mockup for all 5 pages...           │   │   │
│  │  SUPPORTING URLS                                     │   │   │
│  │  ↗ https://figma.com/...                             │   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  2 hours ago                                        ▼   │   │
│  │  🔴 Client: Rejected    ● AI: Request Changes           │   │
│  │  ┌──────┐                                               │   │
│  │  │  52  │  Incomplete. Mobile designs missing.          │   │
│  │  └──────┘                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Step 7 — Transaction History Page

The History page shows all escrows with stats and Stellar Explorer links.

```
┌─────────────────────────────────────────────────────────────────┐
│  Ledger                                                          │
│  History                                                         │
│─────────────────────────────────────────────────────────────────│
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  TOTAL ESCROWS  │  │    RELEASED     │  │     PENDING     │ │
│  │       3         │  │       1         │  │       2         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  ACTIVE                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ● PENDING            Build a landing page    10,000 XLM│   │
│  │                       GC52...HOY            Milestone 1/3│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  RELEASED                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ✓ RELEASED           Logo design project     2,000 XLM │   │
│  │                       GAAZ...CWJN             Completed  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Wrong Wallet Connected

If you open an escrow with a wallet that is neither the client nor the freelancer, the page shows a locked state:

```
┌──────────────────────────────────────┐
│  ACCESS RESTRICTED                   │
│  ──────────────────                  │
│             🔒                       │
│   Wrong wallet connected             │
│                                      │
│   Connect the client wallet to       │
│   review and approve submissions,    │
│   or the freelancer wallet to        │
│   submit work.                       │
└──────────────────────────────────────┘
```

---

## Architecture

```
Browser (React 19 + TypeScript + Vite)
    │
    ├── @stellar/freighter-api    Signs transactions via Freighter extension
    ├── @stellar/stellar-sdk      Builds + submits Soroban transactions
    ├── Supabase JS               Off-chain state, auth, realtime
    └── OpenAI API                Milestone generation + delivery verification
         │
         ▼
Stellar Testnet (Soroban RPC)
    └── Taskspay Contract         Locks XLM, releases per milestone, refunds
         │
         ▼
Supabase (PostgreSQL + Auth + Realtime)
    ├── escrows                   Mirrors on-chain state + milestone metadata
    ├── work_submissions          Freelancer deliverables per milestone
    └── delivery_verifications    AI analysis results (score, recommendation)
```

**No backend server.** The React frontend calls Stellar RPC and Supabase directly. Auth is anonymous (wallet-scoped via Supabase anonymous sign-in).

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Blockchain | Stellar Testnet, Soroban Smart Contracts |
| Wallet | Freighter browser extension (`@stellar/freighter-api`) |
| Off-chain DB | Supabase (PostgreSQL + Realtime + Anonymous Auth) |
| AI | OpenAI GPT-4o-mini |
| Testing | Vitest, fast-check (property-based), jsdom |
| Contract | Rust, Soroban SDK |

---

## Smart Contract

**File**: [`contract/src/lib.rs`](contract/src/lib.rs)

### Functions

| Function | Caller | What it does |
|---|---|---|
| `create_escrow(client, freelancer, amount, total_milestones)` | Client | Locks XLM in contract, returns `u64` escrow ID |
| `release_funds(escrow_id, client)` | Client | Releases one milestone's share to freelancer |
| `refund(escrow_id, client)` | Client | Returns all remaining locked XLM to client |
| `get_escrow(escrow_id)` | Anyone | Read-only escrow state query |
| `get_client_escrows(client)` | Anyone | All escrows for a client address |
| `get_freelancer_escrows(freelancer)` | Anyone | All escrows for a freelancer address |

### Escrow State Machine

```
create_escrow()
      │
      ▼
   Active ──── release_funds() ──▶ (per-milestone, repeats)
      │
      └──────── refund() ──────▶ Refunded
```

Each `release_funds()` call releases `total_amount / total_milestones` XLM to the freelancer. After `total_milestones` releases, the escrow is fully `Released`.

### Amount Encoding

XLM amounts are stored in **stroops** (1 XLM = 10,000,000 stroops) as `i128`. The frontend converts at creation time:

```typescript
const amountStroops = BigInt(Math.round(parseFloat(amountXLM) * 10_000_000));
```

---

## Database Schema

All tables have **Row Level Security (RLS)** enabled via Supabase anonymous auth.

### `escrows`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Supabase auth user (escrow creator) |
| `wallet_address` | TEXT | Client's Stellar address |
| `freelancer_address` | TEXT | Freelancer's Stellar address |
| `amount` | NUMERIC(20,7) | Total XLM |
| `description` | TEXT | Project description |
| `milestone_count` | INT | Number of milestones |
| `milestones` | JSONB | `[{name, description, percentage, xlm}]` |
| `tx_hash` | TEXT | Creation transaction hash |
| `status` | TEXT | `pending \| active \| completed \| refunded` |
| `on_chain_id` | BIGINT | The `u64` ID returned by the contract |
| `payment_releases` | JSONB | `[{milestone_index, released_at, tx_hash, score}]` |
| `verification_result` | JSONB | AI pre-flight check of the project description |

### `work_submissions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `escrow_id` | UUID | FK → escrows |
| `milestone_index` | INT | Which milestone (0-indexed) |
| `submitter_address` | TEXT | Freelancer's Stellar address |
| `description` | TEXT | Work description (max 2000 chars) |
| `urls` | TEXT[] | Supporting links (max 5) |
| `client_decision` | TEXT | `accepted \| rejected \| null` |

### `delivery_verifications`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `submission_id` | UUID | FK → work_submissions |
| `score` | INT | 0–100 AI quality score |
| `recommendation` | TEXT | `approve \| request_changes \| reject` |
| `feedback` | TEXT | AI explanation |
| `gaps` | TEXT[] | Specific missing items identified by AI |
| `raw_response` | JSONB | Full OpenAI response |

### Migrations

Migrations live in [`supabase/migrations/`](supabase/migrations/) and must be applied manually via the **Supabase SQL Editor** (no CLI runner configured).

| File | Change |
|------|--------|
| `001_initial_schema.sql` | Create `escrows` table |
| `002_work_submissions.sql` | Create `work_submissions` table |
| `003_delivery_verifications.sql` | Create `delivery_verifications` table |
| `004_payment_releases.sql` | Add `payment_releases` column to escrows |
| `005_add_on_chain_id_to_escrows.sql` | Add `on_chain_id` column |
| `006_add_client_decision_to_work_submissions.sql` | Add `client_decision` column |

---

## Setup

### Prerequisites

- Node.js 18+
- Rust (latest stable) + `wasm32-unknown-unknown` target
- Soroban CLI v22+
- [Freighter browser extension](https://www.freighter.app/) set to **Testnet**
- A Supabase project
- An OpenAI API key

### 1. Clone and Install

```bash
git clone https://github.com/your-repo/taskspay.git
cd taskspay
cd frontend && npm install
```

### 2. Environment Variables

Create `frontend/.env`:

```env
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_CONTRACT_ID=CB2TSAFK7EDO44GH5ZU2H6G7J2KSFQLHIRDD544IO57PP3BNEXU65P76
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_OPENAI_API_KEY=sk-...
```

### 3. Apply Database Migrations

In the Supabase dashboard → **SQL Editor**, run each migration file in order from `supabase/migrations/`:

```
001 → 002 → 003 → 004 → 005 → 006
```

Enable **Anonymous Sign-In** in Supabase → Authentication → Providers.

### 4. Run the Frontend

```bash
cd frontend
npm run dev
# App runs at http://localhost:5173
```

### 5. (Optional) Build and Deploy the Smart Contract

The contract is already deployed. To deploy your own:

```bash
cd contract

# Build
soroban contract build
# Output: target/wasm32-unknown-unknown/release/taskspay.wasm

# Run tests
cargo test

# Deploy to testnet
soroban keys generate deployer --network testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/taskspay.wasm \
  --source deployer \
  --network testnet
```

Copy the output contract ID into your `.env` as `VITE_CONTRACT_ID`.

---

## Development Commands

```bash
# Frontend
cd frontend
npm run dev        # Dev server at localhost:5173
npm run build      # TypeScript check + production build
npm run lint       # ESLint
npm test           # Vitest in watch mode

# Run a single test file
npx vitest run src/amount-utils.test.ts

# Smart contract
cd contract
cargo test         # 5 unit tests
soroban contract build
```

---

## Key Source Files

| File | Purpose |
|------|---------|
| [`frontend/src/stellar.ts`](frontend/src/stellar.ts) | All Soroban contract calls: `createEscrow`, `releaseFunds`, `refundEscrow` |
| [`frontend/src/freighter.ts`](frontend/src/freighter.ts) | Freighter wallet: connect, sign, get address |
| [`frontend/src/supabase.ts`](frontend/src/supabase.ts) | Supabase client, all TypeScript types, DB helpers |
| [`frontend/src/openai.ts`](frontend/src/openai.ts) | Milestone generation via GPT-4o-mini |
| [`frontend/src/verification.ts`](frontend/src/verification.ts) | AI delivery verification (score, recommendation) |
| [`frontend/src/pages/EscrowDetailPage.tsx`](frontend/src/pages/EscrowDetailPage.tsx) | Role-based client/freelancer view |
| [`contract/src/lib.rs`](contract/src/lib.rs) | Soroban escrow contract |

---

## Role-Based Access

The app detects the user's role by comparing the connected wallet address against the escrow record:

| Wallet matches | Role shown | Can do |
|----------------|-----------|--------|
| `wallet_address` (escrow creator) | 🟢 **Client** | Review submission, Accept/Release funds, Reject |
| `freelancer_address` | 🟡 **Freelancer** | Submit work evidence |
| Neither | 🔒 **Viewer** | Read-only — cannot interact |

---

## AI Integration

### Milestone Generation (`openai.ts`)

When the client enters a project description, GPT-4o-mini generates 3–5 milestones with:
- Milestone name
- Description of what's delivered
- Percentage of total payment
- Calculated XLM amount

### Delivery Verification (`verification.ts`)

When the freelancer submits work, GPT-4o-mini analyzes the submission against the milestone requirements and returns:

| Field | Values |
|-------|--------|
| `score` | 0–100 |
| `recommendation` | `approve` / `request_changes` / `reject` |
| `feedback` | Plain-English explanation |
| `gaps` | Specific missing items |

The AI result is **informational only** — the client always makes the final decision.

---

## Offline Support

[`frontend/src/offline.ts`](frontend/src/offline.ts) queues write operations to `localStorage` when the network is unavailable and replays them on reconnect. This covers submission and verification flows for users on low-connectivity connections common in target markets (Philippines, Indonesia, Vietnam).

---

## Why Stellar

| Factor | Detail |
|--------|--------|
| **Fees** | < $0.01 per transaction — PayPal charges 2.9% + $0.30 |
| **Speed** | 3–5 second finality vs 1–3 business days for wire transfers |
| **Smart contracts** | Soroban enables trustless escrow with no intermediary |
| **Composability** | Same contract works for any milestone-based agreement |

---

## Target Market

Filipino freelancers, designers, and developers earning $500–$5,000/month who regularly work with overseas clients. They face frequent payment disputes, have no legal recourse across borders, and need instant, trustless payment guarantees. The $10B+ global freelance market is underserved by existing payment rails.

---

## License

MIT — see [LICENSE](LICENSE)
