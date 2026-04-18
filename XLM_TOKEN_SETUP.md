# XLM Token Address Setup

The `VITE_XLM_TOKEN_ADDRESS` is required to initialize the escrow contract with the Stellar Asset Contract (SAC) for XLM on testnet.

## Finding or Creating the XLM Token Address

### Option 1: Check Stellar Testnet Documentation
1. Visit [Stellar Soroban Documentation](https://developers.stellar.org/docs/learn/soroban)
2. Look for the published native asset contract address on testnet
3. It should be a 56-character string starting with "C"

### Option 2: Deploy a Test Stellar Asset Contract
If no native XLM token contract exists on testnet, you may need to deploy one:

```bash
# Deploy using Stellar CLI
stellar contract deploy \
  --wasm <path-to-sac-wasm> \
  --source my-key \
  --network testnet
```

Copy the returned contract address.

### Option 3: Use a Known Testnet Token
Check if there's a known test token already deployed on testnet that you can use.

## Setting Up .env

Once you have the XLM token address, update your `.env` file:

```env
VITE_XLM_TOKEN_ADDRESS=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Requirements:
- Must start with "C" (Soroban contract address)
- Must be exactly 56 characters
- Must be a valid Stellar Asset Contract (SAC) or similar token contract

## Verifying Setup

After setting the address:
1. Start the app: `npm run dev`
2. Connect your wallet
3. Click "Initialize Contract" button
4. If you see a transaction hash, it was successful!

## Troubleshooting

- **"invalid encoded string"** - The address format is invalid. Check it's exactly 56 chars and starts with "C"
- **"Transaction failed"** - The contract address might not exist or isn't accessible on testnet
- **Simulation errors** - The token contract might not support the required operations

Check browser console (F12) for detailed error messages.
