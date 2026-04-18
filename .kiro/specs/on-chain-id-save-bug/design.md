# On-Chain ID Save Bug - Bugfix Design

## Overview

This design document specifies the fix for a critical bug where the `on_chain_id` returned from the Stellar blockchain contract during escrow creation is not being saved to the database. The bug prevents clients from seeing the "Your Decision" section (Release Funds and Reject buttons) in `EscrowDetailPage.tsx`, completely blocking the payment release workflow.

The fix involves capturing `result.onChainId` from the `createEscrow()` response in `EscrowPage.tsx` and passing it to both `insertEscrow()` and `updateEscrow()` functions to ensure the database record contains the blockchain contract ID. The approach is minimal and surgical: capture the missing field, pass it through the existing data flow, and update the database schema interfaces to support it.

**Impact**: HIGH - This fix unblocks the core escrow approval workflow for all clients.

**Affected Files**:
- `frontend/src/pages/EscrowPage.tsx` - Capture and pass `onChainId`
- `frontend/src/supabase.ts` - Update `EscrowUpdate` interface to include `on_chain_id`

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when an escrow is created via the blockchain and the `on_chain_id` is not saved to the database
- **Property (P)**: The desired behavior when escrows are created - the `on_chain_id` field should contain the numeric blockchain contract ID
- **Preservation**: Existing escrow creation, database operations, and error handling that must remain unchanged by the fix
- **createEscrow()**: The function in `frontend/src/stellar.ts` that deploys the escrow contract to the Stellar blockchain and returns `{ hash, status, onChainId }`
- **insertEscrow()**: The function in `frontend/src/supabase.ts` that creates a new escrow record in the database
- **updateEscrow()**: The function in `frontend/src/supabase.ts` that updates an existing escrow record with transaction details
- **on_chain_id**: The numeric identifier assigned by the Stellar smart contract to uniquely identify the escrow on-chain (e.g., 1, 2, 3)
- **canDecide**: The boolean condition in `EscrowDetailPage.tsx` that determines whether to show the "Your Decision" section with Release Funds and Reject buttons

## Bug Details

### Bug Condition

The bug manifests when a user creates an escrow via `EscrowPage.tsx` and the blockchain deployment succeeds. The `createEscrow()` function returns `result.onChainId` from the blockchain, but the `handleInitEscrow()` function in `EscrowPage.tsx` only captures `result.hash` and ignores `result.onChainId`. Subsequently, neither `insertEscrow()` nor `updateEscrow()` receives the `on_chain_id` value, causing the database field to remain `NULL`.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { escrowCreationAttempt: boolean, blockchainSuccess: boolean, onChainIdReturned: number }
  OUTPUT: boolean
  
  RETURN input.escrowCreationAttempt == true
         AND input.blockchainSuccess == true
         AND input.onChainIdReturned > 0
         AND databaseRecord.on_chain_id == NULL
END FUNCTION
```

### Examples

- **Example 1**: User creates escrow with 100 XLM, blockchain returns `onChainId: 5`, but database record shows `on_chain_id: NULL` → Client cannot see decision buttons
- **Example 2**: User creates escrow with 50 XLM, blockchain returns `onChainId: 12`, but database record shows `on_chain_id: NULL` → Freelancer submits work, but client has no way to approve
- **Example 3**: User creates escrow with 200 XLM, blockchain returns `onChainId: 1`, but database record shows `on_chain_id: NULL` → `canDecide` evaluates to false, blocking payment release
- **Edge Case**: User creates escrow, blockchain fails (no `onChainId` returned) → Expected behavior: database should not be updated, `on_chain_id` remains `NULL` (this is correct)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Transaction hash (`tx_hash`) must continue to be saved correctly to the database
- Escrow status must continue to be updated to "active" after successful blockchain deployment
- Error handling for blockchain failures must continue to work (no database save on failure)
- Error handling for authentication failures must continue to work (appropriate error messages)
- The `insertEscrow()` function must continue to accept inserts without `on_chain_id` for backward compatibility (defaults to `NULL`)
- The `updateEscrow()` function must continue to support partial updates without requiring all fields
- The `releaseFunds()` function must continue to execute blockchain transactions correctly with valid `on_chain_id`
- The `EscrowDetailPage.tsx` must continue to display all other escrow details (milestones, amounts, addresses) correctly
- Freelancer work submission flow must continue to work (save submission, trigger AI verification)

**Scope:**
All inputs that do NOT involve successful escrow creation with a valid `onChainId` should be completely unaffected by this fix. This includes:
- Blockchain deployment failures (no `onChainId` returned)
- Authentication failures (no database operations attempted)
- Other database operations (fetching escrows, updating payment releases, etc.)
- Existing escrows with `on_chain_id = NULL` (no retroactive updates)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Missing Variable Capture**: In `EscrowPage.tsx`, the `handleInitEscrow()` function captures `result.hash` but does not capture `result.onChainId` from the `createEscrow()` response
   - Line 73: `const result = await createEscrow(...)` returns `{ hash, status, onChainId }`
   - Line 74: `txHash = result.hash` captures the hash
   - Missing: No variable to capture `result.onChainId`

2. **Missing Parameter in insertEscrow()**: The `insertEscrow()` call does not include the `on_chain_id` field in the insert payload
   - Line 95: `const record = await insertEscrow({ ... })` does not include `on_chain_id`
   - The `EscrowInsert` interface already supports `on_chain_id?: number | null` (optional field)

3. **Missing Parameter in updateEscrow()**: The `updateEscrow()` call only updates `tx_hash` and `status`, omitting `on_chain_id`
   - Line 101: `await updateEscrow(record.id, { tx_hash: txHash, status: "active" })` does not include `on_chain_id`
   - The `EscrowUpdate` interface does NOT currently support `on_chain_id` field (needs to be added)

4. **Interface Gap**: The `EscrowUpdate` interface in `frontend/src/supabase.ts` does not include `on_chain_id` as an updatable field
   - Lines 73-77 define `EscrowUpdate` with only `tx_hash`, `status`, `verification_result`, and `payment_releases`
   - Missing: `on_chain_id?: number | null;`

## Correctness Properties

Property 1: Bug Condition - On-Chain ID Saved to Database

_For any_ escrow creation where the blockchain deployment succeeds and returns a valid `onChainId` (isBugCondition returns true), the fixed code SHALL capture `result.onChainId` from the blockchain response and save it to the database `on_chain_id` field, ensuring the field contains the numeric blockchain contract ID instead of `NULL`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Preservation - Existing Escrow Creation Behavior

_For any_ escrow creation that does NOT involve a successful blockchain deployment with a valid `onChainId` (isBugCondition returns false), the fixed code SHALL produce exactly the same behavior as the original code, preserving error handling for blockchain failures, authentication failures, and database operation failures.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `frontend/src/pages/EscrowPage.tsx`

**Function**: `handleInitEscrow`

**Specific Changes**:
1. **Capture onChainId from blockchain response**: After line 74 (`txHash = result.hash`), add a new variable to capture `result.onChainId`
   - Add: `const onChainId = result.onChainId;`
   - This ensures the blockchain contract ID is available for database operations

2. **Pass on_chain_id to insertEscrow()**: Update the `insertEscrow()` call on line 95 to include the `on_chain_id` field
   - Change: `const record = await insertEscrow({ user_id: resolvedUserId, wallet_address: wallet.publicKey, freelancer_address: address.trim(), amount: parseFloat(amount), description: description, milestone_count: milestones.length, milestones: milestones });`
   - To: `const record = await insertEscrow({ user_id: resolvedUserId, wallet_address: wallet.publicKey, freelancer_address: address.trim(), amount: parseFloat(amount), description: description, milestone_count: milestones.length, milestones: milestones, on_chain_id: onChainId });`

3. **Pass on_chain_id to updateEscrow()**: Update the `updateEscrow()` call on line 101 to include the `on_chain_id` field
   - Change: `await updateEscrow(record.id, { tx_hash: txHash, status: "active" });`
   - To: `await updateEscrow(record.id, { tx_hash: txHash, status: "active", on_chain_id: onChainId });`

**File**: `frontend/src/supabase.ts`

**Interface**: `EscrowUpdate`

**Specific Changes**:
4. **Add on_chain_id to EscrowUpdate interface**: Update the `EscrowUpdate` interface (lines 73-77) to include the `on_chain_id` field
   - Add: `on_chain_id?: number | null;` after the `status` field
   - This allows `updateEscrow()` to accept and save the `on_chain_id` value

5. **No changes to insertEscrow()**: The `EscrowInsert` interface already supports `on_chain_id?: number | null` (line 71), so no changes are needed

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that create escrows via `EscrowPage.tsx`, mock the blockchain response to return a valid `onChainId`, and assert that the database record contains the `on_chain_id` value. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Basic Escrow Creation Test**: Create escrow with 100 XLM, mock blockchain to return `onChainId: 5`, assert database record has `on_chain_id: 5` (will fail on unfixed code - expects `NULL`)
2. **Multiple Escrow Creation Test**: Create 3 escrows sequentially, mock blockchain to return `onChainId: 1, 2, 3`, assert database records have correct `on_chain_id` values (will fail on unfixed code - expects all `NULL`)
3. **Escrow with Multiple Milestones Test**: Create escrow with 5 milestones, mock blockchain to return `onChainId: 10`, assert database record has `on_chain_id: 10` (will fail on unfixed code - expects `NULL`)
4. **Edge Case - Zero OnChainId Test**: Create escrow, mock blockchain to return `onChainId: 0`, assert database record has `on_chain_id: 0` (may fail on unfixed code - expects `NULL`)

**Expected Counterexamples**:
- Database records will have `on_chain_id: NULL` instead of the expected numeric value
- Possible causes: missing variable capture, missing parameter in `insertEscrow()`, missing parameter in `updateEscrow()`, missing field in `EscrowUpdate` interface

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleInitEscrow_fixed(input)
  ASSERT result.databaseRecord.on_chain_id == input.onChainIdReturned
END FOR
```

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

**Test Plan**: Observe behavior on UNFIXED code first for blockchain failures and authentication failures, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Blockchain Failure Preservation**: Observe that blockchain failures do NOT save to database on unfixed code, then write test to verify this continues after fix
2. **Authentication Failure Preservation**: Observe that authentication failures show error messages on unfixed code, then write test to verify this continues after fix
3. **Transaction Hash Preservation**: Observe that `tx_hash` is saved correctly on unfixed code, then write test to verify this continues after fix
4. **Status Update Preservation**: Observe that `status` is updated to "active" on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test that `handleInitEscrow()` captures `result.onChainId` from blockchain response
- Test that `insertEscrow()` receives `on_chain_id` parameter with correct value
- Test that `updateEscrow()` receives `on_chain_id` parameter with correct value
- Test that database record contains correct `on_chain_id` after escrow creation
- Test edge cases (onChainId = 0, onChainId = very large number)
- Test that blockchain failures do NOT save `on_chain_id` to database
- Test that authentication failures do NOT attempt database operations

### Property-Based Tests

- Generate random escrow creation scenarios (varying amounts, milestone counts, addresses) and verify `on_chain_id` is saved correctly for all successful blockchain deployments
- Generate random blockchain failure scenarios and verify database is NOT updated (preserving existing error handling)
- Generate random authentication failure scenarios and verify error messages are displayed correctly (preserving existing error handling)

### Integration Tests

- Test full escrow creation flow: connect wallet → enter escrow details → generate milestones → initialize escrow → verify database record has `on_chain_id`
- Test that `EscrowDetailPage.tsx` displays "Your Decision" section when `on_chain_id` is present
- Test that client can approve/reject work submissions after fix (end-to-end workflow)
- Test that existing escrows with `on_chain_id = NULL` continue to work (no retroactive updates)
