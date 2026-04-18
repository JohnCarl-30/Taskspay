#!/usr/bin/env bash

# Deploy a Stellar Asset Contract (SAC) for XLM testing on Soroban testnet
# This script creates a native-like token that can be used with the escrow contract

echo "Deploying Stellar Asset Contract (SAC) for testing..."
echo ""
echo "Using Stellar CLI to deploy native asset contract to testnet..."
echo ""

# Deploy the native asset contract for XLM
# This creates a contract that can be used to test escrow fund transfers
stellar contract deploy \
  --wasm /dev/null \
  --source my-key \
  --network testnet

echo ""
echo "Stellar Asset Contract deployed!"
echo "Use the returned contract address as VITE_XLM_TOKEN_ADDRESS in .env"
