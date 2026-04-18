#!/usr/bin/env bash
# Check recent transactions for the contract
set -euo pipefail

CONTRACT_ID="${1:-CDQFDOAZ5HJISBN6BPNET573F4J7FLIVFPBKBNUJZBEWVMD7XAVAV3Z3}"

echo "Checking recent transactions for contract: $CONTRACT_ID"
echo ""

# Get contract info from Stellar Expert API
curl -s "https://api.stellar.expert/explorer/testnet/contract/$CONTRACT_ID" | jq '.'

echo ""
echo "Recent transactions:"
curl -s "https://api.stellar.expert/explorer/testnet/contract/$CONTRACT_ID/operations?limit=10" | jq '._embedded.records[] | {type, created_at, transaction_hash}'
