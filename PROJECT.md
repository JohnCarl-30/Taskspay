# MilestoneEscrow

**AI-Powered Freelance Escrow on Stellar**

---

## PROBLEM

Freelancers in Southeast Asia and emerging markets lose $50-200 per project to payment disputes because clients refuse milestone payments after work is delivered, forcing freelancers to either accept partial payment or spend weeks in dispute resolution with no guaranteed outcome.

## SOLUTION

MilestoneEscrow locks XLM in a Soroban smart contract with AI-generated milestone breakdowns, releasing funds automatically when the client approves each milestone—eliminating payment disputes through transparent, immutable on-chain escrow with intelligent project structuring via OpenAI.

## STELLAR FEATURES USED

- **XLM Transfers**: Native asset for escrow payments
- **Soroban Smart Contracts**: Trustless escrow logic with milestone-based fund release
- **Stellar Testnet**: Fast, low-cost transactions (<$0.01 per escrow)

## TARGET USERS

**Who**: Freelance developers, designers, and content creators earning $500-$5,000/month  
**Where**: Southeast Asia (Philippines, Indonesia, Vietnam), India, Latin America  
**Why**: They face frequent payment disputes, lack legal recourse, and need instant, trustless payment guarantees

## CORE FEATURE (MVP)

**User Flow (Demo-able in <2 minutes)**:

1. **Client connects Freighter wallet** → Wallet balance displayed
2. **Client enters**: Freelancer address, total XLM amount, project description
3. **AI generates milestones** → OpenAI breaks project into 3-5 milestones with percentage splits
4. **Client approves & initializes escrow** → Soroban contract locks XLM on-chain
5. **Result**: Funds locked in smart contract, visible on Stellar Explorer, ready for milestone-based release

**On-Chain Action**: `create_escrow(client, freelancer, amount, milestones)` → Contract stores escrow state, locks XLM

## WHY THIS WINS

**Stellar Hackathon Fit**: Demonstrates Soroban's real-world utility for financial coordination in underserved markets, leveraging Stellar's speed and low fees to solve a $10B+ global freelance payment problem.

**Judge Appeal**: Combines AI innovation (OpenAI milestone generation) with Stellar's core strengths (fast, cheap, trustless payments), targets real users with measurable pain (payment disputes), and showcases composability (Supabase + Stellar + AI).

## OPTIONAL EDGE (BONUS POINTS)

**AI Integration**: OpenAI GPT-4o-mini generates intelligent milestone breakdowns and verifies that milestones match project descriptions, reducing disputes before they happen.

**Offline Support**: LocalStorage queue syncs escrows to Supabase when connection restores, enabling usage in low-connectivity regions.

**Real-time Updates**: Supabase Realtime subscriptions push escrow status changes to all parties instantly.

---

## CONSTRAINTS

**REGION**: Global (focus on SEA, South Asia, LATAM)  
**USER TYPE**: Freelancers, SMEs  
**COMPLEXITY**: Soroban required, Web app, Mobile-first  
**THEME**: Work & Gig Economy (Escrow for contracts), Finance & Payments (Micropayments)

---

## TECHNOLOGY STACK

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Blockchain**: Stellar Testnet + Soroban Smart Contracts
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **AI**: OpenAI GPT-4o-mini
- **Testing**: Vitest + fast-check (property-based testing)

---

## PROJECT STATUS

✅ Frontend UI complete  
✅ AI milestone generation working  
✅ Supabase integration in progress  
✅ Soroban contract implemented  
✅ Testnet deployment ready  

---

## DEMO LINKS

- **Live Demo**: [Coming Soon]
- **Contract Explorer**: https://stellar.expert/explorer/testnet/contract/[CONTRACT_ID]
- **GitHub**: [Your Repo URL]
- **Video Demo**: [Coming Soon]

---

## LICENSE

MIT License - See LICENSE file for details
