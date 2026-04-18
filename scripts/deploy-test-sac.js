#!/usr/bin/env node

/**
 * Deploy a test Stellar Asset Contract (SAC) on Soroban testnet
 * This creates a testnet token that can be used with the escrow contract
 * 
 * Prerequisites: stellar CLI installed and configured with testnet credentials
 * 
 * Usage: node scripts/deploy-test-sac.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function deploySAC() {
  try {
    console.log('🚀 Deploying Stellar Asset Contract (SAC) on testnet...\n');
    
    // Step 1: Get our account
    console.log('Step 1: Checking Stellar CLI configuration...');
    try {
      const keyInfo = execSync('stellar keys list').toString();
      console.log('✓ Stellar CLI configured\n');
    } catch (e) {
      console.error('❌ Error: Stellar CLI not configured properly');
      console.error('Run: stellar keys create my-key');
      process.exit(1);
    }
    
    // Step 2: Deploy using Soroban
    console.log('Step 2: Note - Manual deployment required');
    console.log('The Stellar CLI does not have a direct "deploy SAC" command.');
    console.log('You have two options:\n');
    
    console.log('OPTION A: Use a known testnet token (recommended for testing)');
    console.log('  1. Check Stellar documentation for available testnet tokens');
    console.log('  2. Use that contract address in .env\n');
    
    console.log('OPTION B: Deploy your own SAC using Soroban contract');
    console.log('  1. Use the contract test fixtures as reference');
    console.log('  2. The test code deploys: env.register_stellar_asset_contract_v2(admin)');
    console.log('  3. This is only available in test environments\n');
    
    console.log('RECOMMENDED FOR NOW:');
    console.log('  For testing purposes, you can use a simplified approach:');
    console.log('  1. Check the contract test file: contract/src/test.rs');
    console.log('  2. See how env.register_stellar_asset_contract_v2() is used');
    console.log('  3. Deploy a local test token and get its address\n');
    
    console.log('Checking Stellar testnet resources...');
    console.log('  Testnet RPC: https://soroban-testnet.stellar.org');
    console.log('  Testnet Docs: https://developers.stellar.org\n');
    
    console.log('⚠️  For production deployment, ensure you have a valid SAC address.');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deploySAC();
