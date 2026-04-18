# Quick Start Guide

Get MilestoneEscrow running in 5 minutes.

---

## 🚀 For Hackathon Judges

### View Live Demo

**Frontend**: [Coming Soon]  
**Contract**: https://stellar.expert/explorer/testnet/contract/YOUR_CONTRACT_ID  
**Video Demo**: [Coming Soon]

### Test the App (No Setup Required)

1. Install [Freighter Wallet](https://www.freighter.app/)
2. Switch to Testnet in Freighter
3. Visit the live demo URL
4. Click "Connect Freighter"
5. Create a test escrow:
   - Freelancer: `GTEST...` (any testnet address)
   - Amount: `100` XLM
   - Description: `Build a landing page with 3 sections`
6. Click "Generate AI Milestone Breakdown"
7. Review AI-generated milestones
8. Click "Initialize Escrow"
9. Approve in Freighter
10. View on Stellar Explorer

**Total time**: <2 minutes

---

## 💻 For Developers

### Prerequisites

- Node.js 18+
- Rust 1.74.0+
- Soroban CLI 22.0.0+
- Freighter Wallet

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/milestone-escrow.git
cd milestone-escrow
cd frontend
npm install
```

### 2. Setup Environment

```bash
# Create .env file
cat > .env << EOF
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_CONTRACT_ID=EXISTING_CONTRACT_ID
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_OPENAI_API_KEY=YOUR_OPENAI_KEY
EOF
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

---

## 🔧 Deploy Your Own Contract

### 1. Install Soroban CLI

```bash
cargo install --locked soroban-cli --version 22.0.0
```

### 2. Configure Testnet

```bash
soroban network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

### 3. Generate Identity & Fund

```bash
soroban keys generate alice --network testnet
soroban keys address alice
# Fund via: https://friendbot.stellar.org?addr=YOUR_ADDRESS
```

### 4. Build & Deploy

```bash
cd contract
soroban contract build

CONTRACT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/milestone_escrow.wasm \
  --source alice \
  --network testnet)

echo "Your Contract ID: $CONTRACT_ID"
```

### 5. Update Frontend

```bash
# Update .env with your contract ID
echo "VITE_CONTRACT_ID=$CONTRACT_ID" >> ../frontend/.env
```

---

## 🧪 Run Tests

### Frontend Tests

```bash
cd frontend
npm test
```

### Contract Tests

```bash
cd contract
cargo test
```

---

## 📱 Key Features to Demo

### 1. AI Milestone Generation
- Enter project description
- Click "Generate AI Milestone Breakdown"
- See intelligent milestone splits

### 2. AI Verification
- After generation, see verification status
- Green checkmark = milestones match description
- Yellow warning = partial match with suggestions

### 3. On-Chain Escrow
- Initialize escrow locks XLM in smart contract
- View transaction on Stellar Explorer
- Trustless, transparent, immutable

### 4. Offline Support
- Disconnect network
- Create escrow (stored locally)
- Reconnect → auto-syncs to Supabase

### 5. Real-time Updates
- Open app in two tabs
- Create escrow in one tab
- See it appear in other tab instantly

---

## 🎯 Demo Script (2 minutes)

**Minute 1: Problem & Solution**
> "Freelancers lose $50-200 per project to payment disputes. MilestoneEscrow locks XLM in a Soroban smart contract with AI-generated milestones, eliminating disputes through trustless escrow."

**Minute 2: Live Demo**
1. Connect Freighter wallet
2. Enter escrow details
3. Generate AI milestones
4. Initialize escrow
5. Show on Stellar Explorer

**Closing**
> "Fast (<3s), cheap (<$0.01), trustless. Built on Stellar Soroban with OpenAI integration. Targeting 50M+ freelancers in emerging markets."

---

## 🐛 Troubleshooting

### Freighter Not Connecting
- Ensure Freighter is installed
- Switch to Testnet in Freighter settings
- Refresh page

### Contract Call Fails
- Check account has XLM balance
- Verify contract ID is correct
- Check Freighter is on Testnet

### AI Generation Fails
- Verify OpenAI API key is valid
- Check API usage limits
- Try shorter description

### Supabase Connection Fails
- Verify project URL and anon key
- Check RLS policies are enabled
- Clear browser cache

---

## 📚 Documentation

- **Full README**: [README.md](README.md)
- **Project Overview**: [PROJECT.md](PROJECT.md)
- **Contract Docs**: [contract/README.md](contract/README.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 🔗 Useful Links

- **Stellar Docs**: https://developers.stellar.org
- **Soroban Docs**: https://soroban.stellar.org
- **Freighter Wallet**: https://www.freighter.app
- **Friendbot**: https://friendbot.stellar.org
- **Stellar Explorer**: https://stellar.expert/explorer/testnet

---

## 💬 Support

- **GitHub Issues**: [Your Repo]
- **Discord**: [Your Server]
- **Email**: support@milestoneescrow.com

---

**Built for Stellar Hackathon 2025** 🚀
