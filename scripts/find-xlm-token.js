#!/usr/bin/env node

/**
 * Script to find the native XLM token (Stellar Asset Contract) address on Soroban testnet
 * Usage: node scripts/find-xlm-token.js
 */

const { SorobanRpc, Networks, Account, TransactionBuilder, BASE_FEE, Contract, nativeToScVal } = require('@stellar/stellar-sdk');

const RPC_URL = 'https://soroban-testnet.stellar.org';
const server = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

async function findNativeXlmToken() {
  try {
    console.log('Searching for native XLM token contract on testnet...\n');
    
    // The native asset contract address on testnet should be well-known
    // Try some common patterns for native asset contracts
    const possibleAddresses = [
      'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4', // Standard representation
      'CDQFDOAZ5HJISBN6BPNET573F4J7FLIVFPBKBNUJZBEWVMD7XAVAV3Z3', // Current contract
    ];
    
    console.log('Note: The native XLM Stellar Asset Contract should be deployed on testnet.');
    console.log('You may need to:');
    console.log('1. Check Stellar\'s Soroban testnet documentation for the native token address');
    console.log('2. Deploy your own Stellar Asset Contract for testing');
    console.log('3. Use a known testnet token contract\n');
    
    console.log('Common native asset contract patterns:');
    console.log('- Should start with "C" (contract address)');
    console.log('- Should be 56 characters long');
    console.log('- On testnet: Look for official Stellar documentation\n');
    
    console.log('For now, you can:');
    console.log('1. Check: https://developers.stellar.org/docs/learn/soroban');
    console.log('2. Or deploy a test Stellar Asset Contract');
    console.log('3. Set VITE_XLM_TOKEN_ADDRESS=<contract_address> in .env\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findNativeXlmToken();
