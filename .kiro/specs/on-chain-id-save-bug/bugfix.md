# Bugfix Requirements Document

## Introduction

This document specifies the requirements for fixing a critical bug in the escrow application where the `on_chain_id` returned from the Stellar blockchain contract is not being saved to the database. This causes the `on_chain_id` field to remain `NULL`, which prevents the "Your Decision" section (with Release Funds and Reject buttons) from appearing for clients, completely blocking the payment release workflow.

**Severity**: HIGH - Clients cannot approve or reject work submissions, making the escrow system non-functional for its primary purpose.

**Affected Components**:
- `frontend/src/pages/EscrowPage.tsx` - Escrow creation logic
- `frontend/src/supabase.ts` - Database interface types
- Database records - Existing escrows have `on_chain_id = NULL`

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user creates an escrow via `EscrowPage.tsx` THEN the system captures `result.hash` from the blockchain response but ignores `result.onChainId`

1.2 WHEN the system calls `insertEscrow()` to create the database record THEN the system does not include the `on_chain_id` parameter in the insert payload

1.3 WHEN the system calls `updateEscrow()` after blockchain deployment THEN the system only updates `tx_hash` and `status` fields, omitting the `on_chain_id` field

1.4 WHEN the database record is created THEN the `on_chain_id` field remains `NULL` instead of containing the blockchain contract ID

1.5 WHEN `EscrowDetailPage.tsx` evaluates the `canDecide` condition THEN the condition fails because `escrow.on_chain_id === null` evaluates to true

1.6 WHEN the `canDecide` condition fails THEN the "Your Decision" section with Release Funds and Reject buttons does not render for clients

1.7 WHEN existing escrows in the database have `on_chain_id = NULL` THEN those escrows cannot display decision buttons even if the blockchain deployment succeeded

### Expected Behavior (Correct)

2.1 WHEN a user creates an escrow via `EscrowPage.tsx` THEN the system SHALL capture both `result.hash` and `result.onChainId` from the blockchain response

2.2 WHEN the system calls `insertEscrow()` to create the database record THEN the system SHALL include the `on_chain_id` parameter with the value from `result.onChainId` in the insert payload

2.3 WHEN the system calls `updateEscrow()` after blockchain deployment THEN the system SHALL update `tx_hash`, `status`, and `on_chain_id` fields with the correct values

2.4 WHEN the database record is created or updated THEN the `on_chain_id` field SHALL contain the numeric blockchain contract ID (e.g., 1, 2, 3, etc.)

2.5 WHEN `EscrowDetailPage.tsx` evaluates the `canDecide` condition THEN the condition SHALL pass because `escrow.on_chain_id !== null` evaluates to true

2.6 WHEN the `canDecide` condition passes THEN the "Your Decision" section with Release Funds and Reject buttons SHALL render correctly for clients

2.7 WHEN a freelancer submits work for a milestone THEN the client SHALL be able to see and interact with the decision buttons to approve or reject the submission

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the system saves `tx_hash` to the database THEN the system SHALL CONTINUE TO save the transaction hash correctly as it does currently

3.2 WHEN the system updates the escrow `status` field THEN the system SHALL CONTINUE TO update the status to "active" after successful blockchain deployment

3.3 WHEN the blockchain deployment fails THEN the system SHALL CONTINUE TO handle the error gracefully without saving incomplete data to the database

3.4 WHEN the user authentication fails THEN the system SHALL CONTINUE TO display the appropriate error message without attempting database operations

3.5 WHEN the `EscrowInsert` interface is used for other operations THEN the system SHALL CONTINUE TO support optional `on_chain_id` field for backward compatibility

3.6 WHEN the `EscrowUpdate` interface is used for other operations THEN the system SHALL CONTINUE TO support partial updates without requiring all fields

3.7 WHEN the `insertEscrow()` function is called without `on_chain_id` THEN the system SHALL CONTINUE TO accept the insert and default the field to `NULL` for backward compatibility

3.8 WHEN the `releaseFunds()` function is called with a valid `on_chain_id` THEN the system SHALL CONTINUE TO execute the blockchain transaction correctly

3.9 WHEN the `EscrowDetailPage.tsx` displays escrow information THEN the system SHALL CONTINUE TO show all other escrow details (milestones, amounts, addresses) correctly

3.10 WHEN the freelancer submits work THEN the system SHALL CONTINUE TO save the submission to the database and trigger AI verification as it does currently
