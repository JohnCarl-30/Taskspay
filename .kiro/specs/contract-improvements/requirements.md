# Requirements Document: Escrow Contract Improvements

## Introduction

This document specifies requirements for improving the existing Soroban smart contract escrow system. The current contract provides basic escrow creation, milestone-based fund releases, and refunds, but lacks critical security features, actual token transfers, dispute resolution mechanisms, and performance optimizations. These improvements will transform the contract from a proof-of-concept into a production-ready escrow system suitable for real-world freelance payment scenarios.

## Glossary

- **Escrow_Contract**: The Soroban smart contract that manages escrow agreements between clients and freelancers
- **Client**: The party creating an escrow and funding the contract (payer)
- **Freelancer**: The party receiving milestone-based payments upon work completion (payee)
- **Milestone**: A discrete unit of work that, when completed, triggers a proportional fund release
- **XLM**: Stellar Lumens, the native cryptocurrency of the Stellar network
- **Stroops**: The smallest unit of XLM (1 XLM = 10^7 stroops)
- **Arbiter**: A neutral third party authorized to resolve disputes between Client and Freelancer
- **Time_Lock**: A deadline mechanism that automatically triggers actions when a time threshold is reached
- **Partial_Refund**: A refund mechanism that accounts for already-completed milestones
- **Emergency_Stop**: A circuit breaker mechanism that pauses contract operations during critical issues
- **Event**: An on-chain log entry that records contract state changes for off-chain tracking

## Requirements

### Requirement 1: Actual Token Transfers

**User Story:** As a Client, I want the contract to actually transfer XLM tokens when I create escrows and release funds, so that real value is locked and distributed according to the agreement.

#### Acceptance Criteria

1. WHEN a Client creates an escrow, THE Escrow_Contract SHALL transfer the specified XLM amount from the Client's address to the contract's address
2. WHEN the Client releases funds for a milestone, THE Escrow_Contract SHALL transfer the proportional XLM amount (total_amount / total_milestones) from the contract to the Freelancer's address
3. WHEN all milestones are completed, THE Escrow_Contract SHALL have transferred the entire escrow amount to the Freelancer
4. IF the Client's balance is insufficient during escrow creation, THEN THE Escrow_Contract SHALL reject the transaction with an error message
5. FOR ALL successful fund releases, the sum of transferred amounts SHALL equal the original escrow amount within 1 stroop tolerance (to account for rounding)

### Requirement 2: Partial Refund Mechanism

**User Story:** As a Client, I want refunds to account for already-completed milestones, so that Freelancers are fairly compensated for work already done when disputes occur.

#### Acceptance Criteria

1. WHEN a Client requests a refund on an escrow with completed milestones, THE Escrow_Contract SHALL calculate the refund amount as: (total_amount / total_milestones) * (total_milestones - completed_milestones)
2. WHEN a partial refund is processed, THE Escrow_Contract SHALL transfer the calculated refund amount from the contract to the Client's address
3. WHEN a partial refund is processed, THE Escrow_Contract SHALL retain the amount corresponding to completed milestones (no transfer needed as already released)
4. WHEN a Client requests a refund on an escrow with zero completed milestones, THE Escrow_Contract SHALL refund the entire escrow amount
5. THE Escrow_Contract SHALL update the escrow status to Refunded after processing any refund

### Requirement 3: Dispute Resolution with Arbiter

**User Story:** As a Client or Freelancer, I want a neutral third party to resolve disputes, so that disagreements can be settled fairly without one party having unilateral control.

#### Acceptance Criteria

1. WHEN creating an escrow, THE Client SHALL optionally specify an Arbiter address
2. WHERE an Arbiter is specified, THE Arbiter SHALL have authority to release funds or issue refunds
3. WHEN an Arbiter releases funds, THE Escrow_Contract SHALL transfer the milestone amount to the Freelancer
4. WHEN an Arbiter issues a refund, THE Escrow_Contract SHALL apply the partial refund calculation and transfer to the Client
5. WHERE no Arbiter is specified, THE Escrow_Contract SHALL restrict fund release and refund operations to the Client only
6. THE Escrow_Contract SHALL emit an Event when an Arbiter performs any action on an escrow

### Requirement 4: Time Lock and Deadline Enforcement

**User Story:** As a Freelancer, I want automatic fund release if the Client doesn't respond within a deadline after milestone completion, so that I'm not indefinitely waiting for payment.

#### Acceptance Criteria

1. WHEN creating an escrow, THE Client SHALL specify a deadline timestamp for each milestone or a global deadline for the entire project
2. WHEN a milestone deadline is reached and the milestone is not yet released, THE Escrow_Contract SHALL allow the Freelancer to trigger an automatic release
3. WHEN the Freelancer triggers an automatic release after deadline, THE Escrow_Contract SHALL transfer the milestone amount to the Freelancer's address
4. THE Escrow_Contract SHALL prevent automatic release if the deadline has not been reached
5. WHERE an Arbiter is specified, THE Time_Lock SHALL be disabled and only the Arbiter can release funds after disputes

### Requirement 5: Emergency Stop Functionality

**User Story:** As a Contract Administrator, I want the ability to pause all contract operations during security incidents, so that potential exploits can be mitigated before causing damage.

#### Acceptance Criteria

1. THE Escrow_Contract SHALL maintain a paused state flag (boolean)
2. WHEN the contract is paused, THE Escrow_Contract SHALL reject all state-changing operations (create_escrow, release_funds, refund)
3. WHEN the contract is paused, THE Escrow_Contract SHALL allow read-only operations (get_escrow, get_client_escrows, get_freelancer_escrows)
4. THE Escrow_Contract SHALL allow only the contract administrator to pause or unpause the contract
5. THE Escrow_Contract SHALL emit an Event when the contract is paused or unpaused

### Requirement 6: Escrow Metadata and Descriptions

**User Story:** As a Client or Freelancer, I want to attach descriptions and metadata to escrows, so that I can track what each escrow is for and reference project details.

#### Acceptance Criteria

1. WHEN creating an escrow, THE Client SHALL optionally provide a project description (string, max 500 characters)
2. WHEN creating an escrow, THE Client SHALL optionally provide milestone descriptions (array of strings, one per milestone, max 200 characters each)
3. THE Escrow_Contract SHALL store the project description and milestone descriptions in the Escrow data structure
4. WHEN retrieving an escrow, THE Escrow_Contract SHALL return the project description and milestone descriptions
5. THE Escrow_Contract SHALL validate that description lengths do not exceed specified maximums

### Requirement 7: Event Logging for Off-Chain Tracking

**User Story:** As a Frontend Developer, I want the contract to emit events for all state changes, so that I can track escrow activity in real-time without constantly polling the blockchain.

#### Acceptance Criteria

1. WHEN an escrow is created, THE Escrow_Contract SHALL emit an EscrowCreated Event containing: escrow_id, client, freelancer, amount, total_milestones, timestamp
2. WHEN funds are released for a milestone, THE Escrow_Contract SHALL emit a FundsReleased Event containing: escrow_id, milestone_number, amount, released_by, timestamp
3. WHEN a refund is processed, THE Escrow_Contract SHALL emit a RefundProcessed Event containing: escrow_id, refund_amount, completed_milestones, timestamp
4. WHEN an escrow status changes, THE Escrow_Contract SHALL emit a StatusChanged Event containing: escrow_id, old_status, new_status, timestamp
5. WHEN the contract is paused or unpaused, THE Escrow_Contract SHALL emit an EmergencyStateChanged Event containing: paused, timestamp

### Requirement 8: Escrow Cancellation Before Activation

**User Story:** As a Client, I want to cancel an escrow before any milestones are completed, so that I can recover funds if the project doesn't start or the Freelancer is unresponsive.

#### Acceptance Criteria

1. WHEN a Client requests cancellation on an escrow with zero completed milestones, THE Escrow_Contract SHALL mark the escrow as Cancelled
2. WHEN an escrow is cancelled, THE Escrow_Contract SHALL transfer the entire escrow amount back to the Client
3. THE Escrow_Contract SHALL prevent cancellation if any milestones have been completed
4. THE Escrow_Contract SHALL prevent cancellation if the escrow status is not Active
5. THE Escrow_Contract SHALL emit an Event when an escrow is cancelled

### Requirement 9: Indexed Storage for Efficient Queries

**User Story:** As a User with many escrows, I want fast escrow lookups by client or freelancer, so that the application remains responsive even with thousands of escrows.

#### Acceptance Criteria

1. THE Escrow_Contract SHALL maintain a mapping from Client addresses to escrow IDs
2. THE Escrow_Contract SHALL maintain a mapping from Freelancer addresses to escrow IDs
3. WHEN creating an escrow, THE Escrow_Contract SHALL add the escrow_id to both the Client and Freelancer index mappings
4. WHEN retrieving escrows by client, THE Escrow_Contract SHALL use the Client index mapping instead of iterating all escrows
5. WHEN retrieving escrows by freelancer, THE Escrow_Contract SHALL use the Freelancer index mapping instead of iterating all escrows

### Requirement 10: Storage Cleanup for Completed Escrows

**User Story:** As a Contract Administrator, I want completed escrows to be archived or removed from active storage, so that storage costs remain manageable and query performance doesn't degrade over time.

#### Acceptance Criteria

1. WHERE an escrow status is Released or Refunded or Cancelled, THE Escrow_Contract SHALL mark the escrow as eligible for archival
2. THE Escrow_Contract SHALL provide an archive_escrow function that moves completed escrows to a separate storage area
3. WHEN archiving an escrow, THE Escrow_Contract SHALL remove the escrow from active storage and index mappings
4. WHEN archiving an escrow, THE Escrow_Contract SHALL store a minimal escrow record (id, status, final_amount, timestamp) in archive storage
5. THE Escrow_Contract SHALL allow retrieval of archived escrows through a separate get_archived_escrow function

### Requirement 11: Milestone Approval Workflow

**User Story:** As a Client, I want to explicitly approve milestone completion before funds are released, so that I can verify work quality before payment.

#### Acceptance Criteria

1. THE Escrow_Contract SHALL track an approval status for each milestone (Pending, Approved, Rejected)
2. WHEN a Freelancer marks a milestone as complete, THE Escrow_Contract SHALL set the milestone status to Pending
3. WHEN a Client approves a pending milestone, THE Escrow_Contract SHALL set the milestone status to Approved and allow fund release
4. WHEN a Client rejects a pending milestone, THE Escrow_Contract SHALL set the milestone status to Rejected and prevent fund release
5. THE Escrow_Contract SHALL emit an Event when milestone status changes

### Requirement 12: Multi-Signature Authorization

**User Story:** As a Client representing an organization, I want to require multiple signatures for fund releases, so that large payments have proper organizational oversight.

#### Acceptance Criteria

1. WHERE multi-signature is enabled, THE Client SHALL specify a list of authorized signer addresses and a required signature threshold during escrow creation
2. WHEN releasing funds on a multi-signature escrow, THE Escrow_Contract SHALL require signatures from at least the threshold number of authorized signers
3. THE Escrow_Contract SHALL track which signers have approved a pending release
4. WHEN the signature threshold is met, THE Escrow_Contract SHALL execute the fund release
5. WHERE multi-signature is not enabled, THE Escrow_Contract SHALL use the standard single-signature authorization

### Requirement 13: Escrow Amendment Capability

**User Story:** As a Client or Freelancer, I want to modify escrow terms after creation with mutual consent, so that we can adapt to changing project requirements without creating a new escrow.

#### Acceptance Criteria

1. THE Escrow_Contract SHALL allow the Client to propose amendments to: total_amount, total_milestones, deadline, or project_description
2. WHEN an amendment is proposed, THE Escrow_Contract SHALL require approval from both Client and Freelancer
3. WHEN both parties approve an amendment, THE Escrow_Contract SHALL update the escrow with the new terms
4. IF an amendment increases the total_amount, THEN THE Escrow_Contract SHALL require the Client to transfer the additional XLM
5. THE Escrow_Contract SHALL emit an Event when an amendment is proposed and when it is approved

### Requirement 14: Proportional Milestone Amounts

**User Story:** As a Client, I want to specify different payment amounts for each milestone, so that I can compensate more for complex milestones and less for simple ones.

#### Acceptance Criteria

1. WHEN creating an escrow, THE Client SHALL optionally provide an array of milestone amounts (one per milestone)
2. WHERE milestone amounts are specified, THE Escrow_Contract SHALL validate that the sum of milestone amounts equals the total escrow amount
3. WHEN releasing funds for a milestone with a specified amount, THE Escrow_Contract SHALL transfer that specific amount instead of the default proportional calculation
4. WHERE milestone amounts are not specified, THE Escrow_Contract SHALL use the default proportional calculation (total_amount / total_milestones)
5. THE Escrow_Contract SHALL store milestone amounts in the Escrow data structure

### Requirement 15: Reentrancy Protection

**User Story:** As a Security Auditor, I want the contract to prevent reentrancy attacks, so that malicious actors cannot drain funds through recursive calls.

#### Acceptance Criteria

1. THE Escrow_Contract SHALL implement a reentrancy guard that prevents recursive calls to state-changing functions
2. WHEN a state-changing function is executing, THE Escrow_Contract SHALL set a locked flag
3. WHEN a state-changing function is called while the locked flag is set, THE Escrow_Contract SHALL reject the call with an error
4. WHEN a state-changing function completes, THE Escrow_Contract SHALL clear the locked flag
5. THE reentrancy guard SHALL apply to: create_escrow, release_funds, refund, cancel_escrow, and archive_escrow functions

### Requirement 16: Input Validation and Bounds Checking

**User Story:** As a Contract User, I want comprehensive input validation, so that invalid data cannot corrupt contract state or cause unexpected behavior.

#### Acceptance Criteria

1. WHEN creating an escrow, THE Escrow_Contract SHALL validate that amount is greater than 0 and less than i128::MAX
2. WHEN creating an escrow, THE Escrow_Contract SHALL validate that total_milestones is between 1 and 1000
3. WHEN creating an escrow, THE Escrow_Contract SHALL validate that Client and Freelancer addresses are different
4. WHEN creating an escrow with deadlines, THE Escrow_Contract SHALL validate that deadline timestamps are in the future
5. WHEN creating an escrow with milestone amounts, THE Escrow_Contract SHALL validate that no individual milestone amount is 0 or negative

### Requirement 17: Gas Optimization for Batch Operations

**User Story:** As a Client with multiple escrows, I want to perform batch operations efficiently, so that I can manage many escrows without excessive transaction costs.

#### Acceptance Criteria

1. THE Escrow_Contract SHALL provide a batch_release_funds function that accepts an array of escrow_ids
2. WHEN batch releasing funds, THE Escrow_Contract SHALL process all releases in a single transaction
3. IF any release in a batch fails, THEN THE Escrow_Contract SHALL revert the entire batch transaction
4. THE Escrow_Contract SHALL provide a batch_create_escrows function for creating multiple escrows in one transaction
5. THE Escrow_Contract SHALL emit Events for each individual operation within a batch

### Requirement 18: Query Pagination for Large Result Sets

**User Story:** As a User with hundreds of escrows, I want paginated query results, so that I can retrieve escrows efficiently without hitting memory or gas limits.

#### Acceptance Criteria

1. WHEN querying escrows by client or freelancer, THE Escrow_Contract SHALL accept optional pagination parameters: page_size and page_number
2. WHERE pagination parameters are provided, THE Escrow_Contract SHALL return at most page_size escrows starting from the offset (page_number * page_size)
3. THE Escrow_Contract SHALL return pagination metadata: total_count, current_page, total_pages
4. WHERE pagination parameters are not provided, THE Escrow_Contract SHALL default to page_size of 50 and page_number of 0
5. THE Escrow_Contract SHALL validate that page_size is between 1 and 100

### Requirement 19: Escrow Status Transition Validation

**User Story:** As a Contract Developer, I want strict status transition rules, so that escrows cannot enter invalid states through unexpected operation sequences.

#### Acceptance Criteria

1. THE Escrow_Contract SHALL enforce that Active escrows can only transition to: Released, Refunded, or Cancelled
2. THE Escrow_Contract SHALL enforce that Released, Refunded, and Cancelled escrows cannot transition to any other status
3. WHEN attempting an invalid status transition, THE Escrow_Contract SHALL reject the operation with a descriptive error message
4. THE Escrow_Contract SHALL validate status transitions before executing any state-changing operation
5. THE Escrow_Contract SHALL maintain a status transition history for audit purposes

### Requirement 20: Contract Upgradeability

**User Story:** As a Contract Administrator, I want the ability to upgrade the contract logic while preserving existing escrow data, so that bugs can be fixed and features can be added without disrupting active escrows.

#### Acceptance Criteria

1. THE Escrow_Contract SHALL implement a proxy pattern that separates storage from logic
2. THE Escrow_Contract SHALL allow the administrator to update the logic contract address
3. WHEN the logic contract is updated, THE Escrow_Contract SHALL preserve all existing escrow data in storage
4. THE Escrow_Contract SHALL validate that the new logic contract implements the required interface
5. THE Escrow_Contract SHALL emit an Event when the contract is upgraded
