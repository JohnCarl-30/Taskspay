# On-Chain ID Save Bug - Bugfix Design

## Overview

This design addresses a critical bug where the `on_chain_id` returned from the Stellar blockchain during escrow creation is not being saved to the database. The blockchain contract's `create_escrow` function returns a numeric escrow ID that must be stored in the database's `on_chain_id` field. Without this ID, the client decision UI (Release Funds and Reject buttons) cannot appear, completely blocking the payment release workflow.

The fix involves capturing the `onChainId` from the blockchain response in `EscrowPage.tsx` and passing it to either `insertEscrow()` or `updateEscrow()` to persist it in the database. The approach is minimal and surgical: add one field to the database insert/update calls without modifying any other logic.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when an escrow is created on the blockchain and the `on_chain_id` is not saved to the database
- **Property (P)**: The desired behavior when escrows are created - the `on_chain_id` field in the database should contain the numeric blockchain contract ID
- **Preservation**: Existing escrow creation behavior (tx_hash saving, status updates, error handling, authentication flow) that must remain unchanged by the fix
- **createEscrow()**: The function in `frontend/src/stellar.ts` that deploys the escrow contract to the Stellar blockchain and returns `{ hash, status, onChainId }`
- **insertEscrow()**: The function in `frontend/src/supabase.ts` that creates a new escrow record in the database
- **updateEscrow()**: The function in `frontend/src/supabase.ts` that updates an existing escrow record with transaction details
- **on_chain_id**: The database column (BIGINT) that stores the blockchain contract's numeric escrow identifier
- **canDecide**: The boolean condition in `EscrowDetailPage.tsx` that determines whether to show client decision buttons (requires `on_chain_id !== null`)

## Bug Details

### Bug Condition

The bug manifests when a user successfully creates an escrow on the Stellar blockchain. The `createEscrow()` function in `stellar.ts` correctly captures the `onChainId` from the simulation result and returns it in the response object. However, the `handleInitEscrow()` function in `EscrowPage.tsx` ignores this value and does not pass it to the database insert or update operations.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type EscrowCreationFlow
  OUTPUT: boolean
  
  RETURN input.blockchainResult.onChainId IS NOT NULL
         AND input.blockchainResult.status == "PENDING"
         AND input.databaseInsert.on_chain_id IS NULL
         AND input.databaseUpdate.on_chain_id IS NOT INCLUDED
END FUNCTION
```

### Examples

- **Example 1**: User creates escrow for 100 XLM with 3 milestones. Blockchain returns `{ hash: "abc123...", status: "PENDING", onChainId: 5 }`. Database record is created with `tx_hash = "abc123..."` and `status = "active"` but `on_chain_id = NULL`. Client cannot see decision buttons.

- **Example 2**: User creates escrow for 50 XLM with 2 milestones. Blockchain returns `{ hash: "def456...", status: "PENDING", onChainId: 12 }`. Database record is created with `tx_hash = "def456..."` and `status = "active"` but `on_chain_id = NULL`. Freelancer submits work, but client decision UI does not render.

- **Example 3**: User creates escrow for 200 XLM with 5 milestones. Blockchain returns `{ hash: "ghi789...", status: "PENDING", onChainId: 23 }`. Database record is created with `tx_hash = "ghi789..."` and `status = "active"` but `on_chain_id = NULL`. The `canDecide` condition evaluates to false, blocking the entire payment release workflow.

- **Edge Case**: User creates escrow but blockchain simulation fails before returning an `onChainId`. The `onChainId` is 0 or undefined. Database should not be updated with invalid data. Error handling should prevent database insert.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Transaction hash (`tx_hash`) must continue to be saved to the database exactly as before
- Escrow status must continue to be updated to "active" after successful blockchain deployment
- Error handling for blockchain failures must continue to work (no database insert on blockchain error)
- Authentication flow must continue to work (resolve userId before database operations)
- Database insert retry logic with exponential backoff must continue to work
- Optimistic UI updates must continue to work (if used elsewhere)
- The `EscrowInsert` and `EscrowUpdate` interfaces must remain backward compatible (optional `on_chain_id` field)
- All other escrow fields (wallet_address, freelancer_address, amount, description, milestones, verification_result) must continue to be saved correctly

**Scope:**
All inputs that do NOT involve the `on_chain_id` field should be completely unaffected by this fix. This includes:
- Escrow creation without blockchain deployment (if applicable)
- Escrow updates for status changes, verification results, or payment releases
- Escrow fetching and display logic
- Work submission and verification workflows
- Other database operations (insertWorkSubmission, updateWorkSubmission, etc.)

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Missing Field in Database Call**: The `handleInitEscrow()` function in `EscrowPage.tsx` captures `result.hash` but does not capture `result.onChainId` from the blockchain response. The subsequent `insertEscrow()` call does not include the `on_chain_id` parameter, and the `updateEscrow()` call only updates `tx_hash` and `status`.

2. **Two-Step Insert/Update Pattern**: The current code uses a two-step pattern: (1) `insertEscrow()` creates the record, (2) `updateEscrow()` adds the `tx_hash` and `status`. The `on_chain_id` could be added in either step, but it's currently omitted from both.

3. **Interface Already Supports Field**: The `EscrowInsert` interface in `supabase.ts` already includes `on_chain_id?: number | null` as an optional field, and the `stellar.ts` function already returns `onChainId` in the response. The bug is purely in the glue code that connects them.

4. **No Validation or Logging**: There is no validation to ensure `onChainId` is a valid number before saving, and no logging to indicate whether the field was captured. This made the bug silent and hard to detect.

## Correctness Properties

Property 1: Bug Condition - On-Chain ID Persistence

_For any_ escrow creation where the blockchain deployment succeeds and returns a valid `onChainId` (a positive integer), the fixed `handleInitEscrow` function SHALL capture that `onChainId` and pass it to the database insert or update operation, resulting in the database record's `on_chain_id` field containing the correct numeric value.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Existing Escrow Creation Behavior

_For any_ escrow creation flow, the fixed code SHALL produce exactly the same behavior as the original code for all fields OTHER than `on_chain_id`, preserving the correct saving of `tx_hash`, `status`, `wallet_address`, `freelancer_address`, `amount`, `description`, `milestones`, and `verification_result`.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `frontend/src/pages/EscrowPage.tsx`

**Function**: `handleInitEscrow`

**Specific Changes**:

1. **Capture onChainId from Blockchain Response**: After the `createEscrow()` call succeeds, capture both `result.hash` and `result.onChainId` into local variables.
   - Current: `const result = await createEscrow(...); txHash = result.hash;`
   - Fixed: `const result = await createEscrow(...); txHash = result.hash; const onChainId = result.onChainId;`

2. **Pass onChainId to insertEscrow()**: Add the `on_chain_id` field to the `insertEscrow()` payload.
   - Current: `const record = await insertEscrow({ user_id, wallet_address, ..., milestones });`
   - Fixed: `const record = await insertEscrow({ user_id, wallet_address, ..., milestones, on_chain_id: onChainId });`

3. **Alternative: Pass onChainId to updateEscrow()**: If the two-step pattern is preferred, add `on_chain_id` to the `updateEscrow()` call instead.
   - Current: `await updateEscrow(record.id, { tx_hash: txHash, status: "active" });`
   - Fixed: `await updateEscrow(record.id, { tx_hash: txHash, status: "active", on_chain_id: onChainId });`

4. **Add Validation (Optional but Recommended)**: Before saving to the database, validate that `onChainId` is a positive integer.
   - Add: `if (!onChainId || onChainId <= 0) { console.warn("Invalid onChainId:", onChainId); }`

5. **Add Logging (Optional but Recommended)**: Log the captured `onChainId` for debugging.
   - Add: `console.log("Captured onChainId from blockchain:", onChainId);`

**File**: `frontend/src/supabase.ts`

**Interface**: `EscrowUpdate`

**Specific Changes**:

1. **Add on_chain_id to EscrowUpdate Interface**: Ensure the `EscrowUpdate` interface includes `on_chain_id` as an optional field (it may already be missing).
   - Current: `export interface EscrowUpdate { tx_hash?: string; status?: ...; verification_result?: ...; payment_releases?: ...; }`
   - Fixed: `export interface EscrowUpdate { tx_hash?: string; status?: ...; verification_result?: ...; payment_releases?: ...; on_chain_id?: number | null; }`

**Note**: The `EscrowInsert` interface already includes `on_chain_id?: number | null`, so no changes are needed there.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the escrow creation flow and assert that the `on_chain_id` field is saved to the database. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Basic Escrow Creation Test**: Create an escrow with valid inputs. Mock `createEscrow()` to return `{ hash: "abc", status: "PENDING", onChainId: 5 }`. Assert that the database record has `on_chain_id = 5`. (will fail on unfixed code - `on_chain_id` will be NULL)

2. **Multiple Escrow Creation Test**: Create 3 escrows sequentially. Mock `createEscrow()` to return different `onChainId` values (1, 2, 3). Assert that each database record has the correct `on_chain_id`. (will fail on unfixed code - all `on_chain_id` fields will be NULL)

3. **Escrow Creation with Authentication Test**: Create an escrow when `userId` is initially null, triggering the authentication flow. Assert that after authentication, the database record has the correct `on_chain_id`. (will fail on unfixed code - `on_chain_id` will be NULL)

4. **Edge Case - Zero onChainId Test**: Mock `createEscrow()` to return `onChainId: 0`. Assert that the database record is NOT created or has `on_chain_id = NULL` (invalid ID should not be saved). (may fail on unfixed code if validation is missing)

**Expected Counterexamples**:
- Database records have `on_chain_id = NULL` even when blockchain returns a valid `onChainId`
- Possible causes: `onChainId` not captured from response, not passed to `insertEscrow()`, not passed to `updateEscrow()`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleInitEscrow_fixed(input)
  ASSERT result.databaseRecord.on_chain_id == input.blockchainResult.onChainId
END FOR
```

**Test Cases**:
1. **Property Test - Valid onChainId Range**: Generate random valid `onChainId` values (1 to 1000000). For each value, mock `createEscrow()` to return that `onChainId`. Assert that the database record has the correct `on_chain_id`.

2. **Property Test - Concurrent Escrow Creation**: Generate multiple escrow creation requests with different `onChainId` values. Execute them concurrently. Assert that each database record has the correct `on_chain_id` without race conditions.

3. **Integration Test - End-to-End Flow**: Create an escrow using the full UI flow (no mocks). Deploy to testnet. Assert that the database record has the correct `on_chain_id` matching the blockchain contract ID.

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT handleInitEscrow_original(input) = handleInitEscrow_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-`on_chain_id` fields, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Preservation Test - tx_hash Saving**: Observe that `tx_hash` is correctly saved on unfixed code. Write property test: for any valid escrow creation input, assert that the database record's `tx_hash` field matches the blockchain response's `hash` field (both before and after fix).

2. **Preservation Test - Status Update**: Observe that `status` is correctly updated to "active" on unfixed code. Write property test: for any valid escrow creation input, assert that the database record's `status` field is "active" after successful blockchain deployment (both before and after fix).

3. **Preservation Test - Error Handling**: Observe that blockchain errors prevent database insert on unfixed code. Write property test: for any escrow creation input where blockchain deployment fails, assert that no database record is created (both before and after fix).

4. **Preservation Test - Authentication Flow**: Observe that authentication is triggered when `userId` is null on unfixed code. Write property test: for any escrow creation input where `userId` is initially null, assert that `authenticateWithWallet()` is called before database insert (both before and after fix).

5. **Preservation Test - All Other Fields**: Observe that all other escrow fields (wallet_address, freelancer_address, amount, description, milestones) are correctly saved on unfixed code. Write property test: for any valid escrow creation input, assert that all these fields match the input values in the database record (both before and after fix).

### Unit Tests

- Test that `handleInitEscrow()` captures `onChainId` from blockchain response
- Test that `insertEscrow()` accepts `on_chain_id` parameter and saves it to database
- Test that `updateEscrow()` accepts `on_chain_id` parameter and updates it in database
- Test that invalid `onChainId` values (0, negative, undefined) are handled gracefully
- Test that `EscrowUpdate` interface includes `on_chain_id` field

### Property-Based Tests

- Generate random valid escrow creation inputs and verify `on_chain_id` is saved correctly
- Generate random `onChainId` values (1 to 1000000) and verify database persistence
- Generate random escrow creation inputs and verify all other fields are preserved (tx_hash, status, amount, etc.)
- Generate random error scenarios (blockchain failure, auth failure) and verify error handling is preserved

### Integration Tests

- Test full escrow creation flow from UI to database with real blockchain deployment
- Test that `EscrowDetailPage.tsx` displays decision buttons when `on_chain_id` is present
- Test that `releaseFunds()` works correctly with the saved `on_chain_id`
- Test that existing escrows with `on_chain_id = NULL` can be manually fixed (data migration scenario)
