# Deployment Guide

Complete guide for deploying MilestoneEscrow to production.

---

## Prerequisites

- Rust 1.74.0+
- Soroban CLI 22.0.0+
- Node.js 18+
- Supabase account
- OpenAI API key
- Stellar testnet/mainnet account

---

## 1. Deploy Soroban Contract

### Install Soroban CLI

```bash
cargo install --locked soroban-cli --version 22.0.0
```

### Configure Network

**For Testnet**:
```bash
soroban network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

**For Mainnet** (when ready):
```bash
soroban network add mainnet \
  --rpc-url https://soroban-mainnet.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

### Generate Identity

```bash
# Generate new identity
soroban keys generate deployer --network testnet

# Get address
soroban keys address deployer

# Fund via Friendbot (testnet only)
curl "https://friendbot.stellar.org?addr=$(soroban keys address deployer)"
```

### Build Contract

```bash
cd contract
soroban contract build
```

### Deploy Contract

```bash
CONTRACT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/milestone_escrow.wasm \
  --source deployer \
  --network testnet)

echo "Contract deployed: $CONTRACT_ID"
```

### Save Contract ID

```bash
# Save to .env
echo "VITE_CONTRACT_ID=$CONTRACT_ID" >> ../frontend/.env
```

---

## 2. Setup Supabase

### Create Project

1. Go to https://supabase.com
2. Create new project
3. Save project URL and anon key

### Run Migration

1. Open Supabase SQL Editor
2. Copy contents of `supabase/migrations/001_create_escrows_table.sql`
3. Execute the SQL

### Configure Authentication

1. Go to Authentication → Settings
2. Enable "Anonymous sign-ins" (or configure custom auth)
3. Configure RLS policies (already in migration)

### Get Credentials

```bash
# Add to frontend/.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 3. Setup OpenAI

### Get API Key

1. Go to https://platform.openai.com
2. Create API key
3. Add to environment variables

```bash
# Add to frontend/.env
VITE_OPENAI_API_KEY=sk-...
```

---

## 4. Deploy Frontend

### Option A: Vercel (Recommended)

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - VITE_CONTRACT_ID
# - VITE_STELLAR_RPC_URL
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_OPENAI_API_KEY
```

### Option B: Netlify

```bash
cd frontend

# Install Netlify CLI
npm i -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist

# Set environment variables in Netlify dashboard
```

### Option C: Self-Hosted

```bash
cd frontend

# Build
npm run build

# Serve with nginx/apache
# Copy dist/ to your web server
```

---

## 5. Environment Variables

### Frontend (.env)

```bash
# Stellar
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_CONTRACT_ID=YOUR_CONTRACT_ID

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# OpenAI
VITE_OPENAI_API_KEY=sk-...
```

---

## 6. Verify Deployment

### Test Contract

```bash
# Create test escrow
soroban contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  create_escrow \
  --client $(soroban keys address deployer) \
  --freelancer GTEST...ABC \
  --amount 1000000000 \
  --total_milestones 3

# Get escrow
soroban contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- \
  get_escrow \
  --escrow_id 1
```

### Test Frontend

1. Visit deployed URL
2. Connect Freighter wallet
3. Create test escrow
4. Verify on Stellar Explorer

---

## 7. Monitoring

### Contract Monitoring

- **Stellar Explorer**: https://stellar.expert/explorer/testnet/contract/YOUR_CONTRACT_ID
- **Soroban RPC**: Monitor transaction success rate
- **Gas Usage**: Track transaction fees

### Frontend Monitoring

- **Vercel Analytics**: Built-in performance monitoring
- **Sentry**: Error tracking (optional)
- **Google Analytics**: User behavior (optional)

### Backend Monitoring

- **Supabase Dashboard**: Database queries, auth, realtime
- **OpenAI Usage**: API usage and costs

---

## 8. Security Checklist

- [ ] Contract deployed with correct parameters
- [ ] RLS policies enabled on Supabase
- [ ] Environment variables secured (not in git)
- [ ] API keys rotated regularly
- [ ] HTTPS enabled on frontend
- [ ] Freighter wallet integration tested
- [ ] Error handling tested
- [ ] Rate limiting configured (if needed)

---

## 9. Mainnet Deployment (When Ready)

### Differences from Testnet

1. **Network**: Use mainnet RPC and passphrase
2. **Funding**: Real XLM required (no Friendbot)
3. **Testing**: Thorough testing on testnet first
4. **Audit**: Consider smart contract audit
5. **Insurance**: Consider escrow insurance fund

### Mainnet Checklist

- [ ] Contract audited by security firm
- [ ] Extensive testnet testing completed
- [ ] Emergency pause mechanism implemented
- [ ] Multi-sig admin controls
- [ ] Insurance fund established
- [ ] Legal compliance reviewed
- [ ] User documentation complete
- [ ] Support system in place

---

## 10. Troubleshooting

### Contract Deployment Fails

```bash
# Check account balance
soroban keys address deployer
# Fund via Friendbot

# Check network configuration
soroban network ls

# Rebuild contract
cd contract
cargo clean
soroban contract build
```

### Frontend Build Fails

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check environment variables
cat .env

# Build with verbose output
npm run build -- --debug
```

### Supabase Connection Fails

- Verify project URL and anon key
- Check RLS policies
- Verify migration ran successfully
- Check browser console for CORS errors

### OpenAI API Fails

- Verify API key is valid
- Check usage limits
- Verify model name (gpt-4o-mini)
- Check rate limits

---

## 11. Rollback Procedure

### Contract Rollback

```bash
# Deploy previous version
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/milestone_escrow_v1.wasm \
  --source deployer \
  --network testnet

# Update frontend with old contract ID
```

### Frontend Rollback

**Vercel**:
```bash
vercel rollback
```

**Netlify**:
```bash
netlify rollback
```

---

## 12. Cost Estimates

### Testnet (Free)
- Contract deployment: Free
- Transactions: Free
- Friendbot funding: Free

### Mainnet (Estimated)
- Contract deployment: ~1 XLM
- Transaction fees: <0.00001 XLM per operation
- Account reserve: 1 XLM minimum balance

### Infrastructure
- Supabase: Free tier (up to 500MB database)
- Vercel: Free tier (100GB bandwidth)
- OpenAI: ~$0.0001 per milestone generation

---

## Support

For deployment issues:
- GitHub Issues: [Your Repo]
- Discord: [Your Server]
- Email: support@milestoneescrow.com

---

**Last Updated**: 2025-01-XX
