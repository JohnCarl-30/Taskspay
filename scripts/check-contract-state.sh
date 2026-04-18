#!/usr/bin/env bash
# Check the contract initialization state and escrow details
set -euo pipefail

CONTRACT_ID="${1:-CDQFDOAZ5HJISBN6BPNET573F4J7FLIVFPBKBNUJZBEWVMD7XAVAV3Z3}"
ESCROW_ID="${2:-13}"
NETWORK="${3:-testnet}"

echo "Checking contract state..."
echo "Contract ID: $CONTRACT_ID"
echo "Network: $NETWORK"
echo ""

# Check if contract is initialized
echo "1. Checking if contract is initialized..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network "$NETWORK" \
  --source deployer \
  -- is_initialized || echo "Failed to check initialization"

echo ""
echo "2. Fetching escrow $ESCROW_ID details..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network "$NETWORK" \
  --source deployer \
  -- get_escrow \
  --escrow_id "$ESCROW_ID" || echo "Failed to fetch escrow"

echo ""
echo "3. Checking contract XLM balance..."
stellar contract invoke \
  --id CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
  --network "$NETWORK" \
  --source deployer \
  -- balance \
  --id "$CONTRACT_ID" || echo "Failed to check balance"
