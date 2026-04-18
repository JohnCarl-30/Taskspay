# Implementation Plan

## Overview
Fix the missing `on_chain_id` field in database during escrow creation by capturing it from the blockchain response and passing it to the database insert/update operations.

---

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - On-Chain ID Not Saved to Database
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - escrow creation with valid blockchain response containing `onChainId`
  - Test that when `createEscrow()` returns `{ hash: "abc123", status: "PENDING", onChainId: 5 }`, the database record has `on_chain_id = 5`
  - Test multiple escrow creations with different `onChainId` values (1, 2, 3) and verify each database record has the correct `on_chain_id`
  - Test escrow creation with authentication flow (userId initially null) and verify `on_chain_id` is saved after authentication
  - Mock `createEscrow()` to return valid `onChainId` values
  - Assert that `insertEscrow()` or `updateEscrow()` receives and saves the `on_chain_id` parameter
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (database records have `on_chain_id = NULL` even when blockchain returns valid `onChainId`)
  - Document counterexamples: "Database record has `on_chain_id = NULL` when blockchain returned `onChainId = 5`"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [-] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Escrow Creation Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-`on_chain_id` fields
  - Test 1: Observe that `tx_hash` is correctly saved on unfixed code. Write property test: for any valid escrow creation, assert database record's `tx_hash` matches blockchain response's `hash`
  - Test 2: Observe that `status` is correctly updated to "active" on unfixed code. Write property test: for any valid escrow creation, assert database record's `status` is "active" after successful deployment
  - Test 3: Observe that blockchain errors prevent database insert on unfixed code. Write property test: for any escrow creation where blockchain fails, assert no database record is created
  - Test 4: Observe that authentication is triggered when `userId` is null on unfixed code. Write property test: for any escrow creation where `userId` is null, assert `authenticateWithWallet()` is called before database insert
  - Test 5: Observe that all other fields (wallet_address, freelancer_address, amount, description, milestones) are correctly saved on unfixed code. Write property test: for any valid escrow creation, assert all these fields match input values in database record
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [~] 3. Fix for missing on_chain_id in database

  - [~] 3.1 Implement the fix in EscrowPage.tsx and supabase.ts
    - In `frontend/src/pages/EscrowPage.tsx`, capture `onChainId` from blockchain response: `const onChainId = result.onChainId;`
    - Add validation: `if (!onChainId || onChainId <= 0) { console.warn("Invalid onChainId:", onChainId); }`
    - Add logging: `console.log("Captured onChainId from blockchain:", onChainId);`
    - Pass `on_chain_id` to `insertEscrow()`: `const record = await insertEscrow({ ..., on_chain_id: onChainId });`
    - OR pass `on_chain_id` to `updateEscrow()`: `await updateEscrow(record.id, { tx_hash: txHash, status: "active", on_chain_id: onChainId });`
    - In `frontend/src/supabase.ts`, ensure `EscrowUpdate` interface includes `on_chain_id?: number | null;`
    - Verify `EscrowInsert` interface already includes `on_chain_id?: number | null;` (no changes needed)
    - _Bug_Condition: isBugCondition(input) where input.blockchainResult.onChainId IS NOT NULL AND input.databaseInsert.on_chain_id IS NULL_
    - _Expected_Behavior: For any escrow creation where blockchain returns valid onChainId, database record's on_chain_id field SHALL contain the correct numeric value_
    - _Preservation: tx_hash saving, status updates, error handling, authentication flow, all other escrow fields must remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [~] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - On-Chain ID Saved to Database
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (database records now have correct `on_chain_id` values)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [~] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Escrow Creation Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in tx_hash, status, error handling, authentication, other fields)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [~] 4. Checkpoint - Ensure all tests pass
  - Run all tests (bug condition + preservation)
  - Verify `on_chain_id` is correctly saved for new escrows
  - Verify client decision UI (Release Funds and Reject buttons) now appears in `EscrowDetailPage.tsx`
  - Verify no regressions in existing escrow creation behavior
  - Ask the user if questions arise
