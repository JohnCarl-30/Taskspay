#!/usr/bin/env bash
# Wraps the native XLM asset as a Stellar Asset Contract (SAC) on testnet
# so the Taskspay escrow contract can transfer XLM via token::Client.
#
# Usage: bash scripts/wrap-native-xlm.sh [key-name] [network]
#   key-name: Stellar CLI key identity (default: deployer)
#   network:  stellar network (default: testnet)
#
# Output: the SAC contract ID to paste into frontend/.env as VITE_XLM_TOKEN_ADDRESS.
set -euo pipefail

KEY_NAME="${1:-deployer}"
NETWORK="${2:-testnet}"

if ! command -v stellar >/dev/null 2>&1; then
  echo "ERROR: stellar CLI not found." >&2
  echo "Install: https://developers.stellar.org/docs/tools/cli/install-cli" >&2
  exit 1
fi

# Ensure a key identity exists and is funded on testnet.
if ! stellar keys address "$KEY_NAME" >/dev/null 2>&1; then
  echo "Generating + funding new key '$KEY_NAME' on $NETWORK..."
  stellar keys generate "$KEY_NAME" --network "$NETWORK" --fund
fi

echo "Using key:     $(stellar keys address "$KEY_NAME")"
echo "Network:       $NETWORK"
echo "Wrapping native XLM asset as a Stellar Asset Contract..."
echo ""

# Try deploy; if already wrapped, fall back to computing the deterministic ID.
if SAC_ID=$(stellar contract asset deploy \
  --asset native \
  --source "$KEY_NAME" \
  --network "$NETWORK" 2>/dev/null); then
  echo "Deployed new SAC wrapper."
else
  echo "SAC already wrapped on this network. Fetching existing ID..."
  SAC_ID=$(stellar contract id asset \
    --asset native \
    --network "$NETWORK")
fi

echo ""
echo "=================================================================="
echo "Native XLM SAC contract ID:"
echo "  $SAC_ID"
echo ""
echo "Add this line to frontend/.env:"
echo "  VITE_XLM_TOKEN_ADDRESS=$SAC_ID"
echo ""
echo "Then restart the dev server (npm run dev) and click Initialize Contract."
echo "=================================================================="
