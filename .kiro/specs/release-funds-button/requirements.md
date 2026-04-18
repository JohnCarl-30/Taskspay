# Requirements Document: Release Funds Button

## Introduction

This feature adds a "Release Funds" button to the MilestoneEscrow application, enabling clients to approve milestone completion and release payment to freelancers after reviewing AI verification results. Currently, the application has AI-powered delivery verification that analyzes freelancer submissions and provides verification scores and recommendations, but lacks a UI control for clients to act on these recommendations and trigger the smart contract payment release. This feature completes the payment approval workflow by providing a clear, accessible button that integrates with both the AI verification display and the Soroban smart contract's `releaseFunds` function.

## Glossary

- **Release_Funds_Button**: The UI control that allows clients to approve milestone completion and trigger payment release
- **Client**: The party who created the escrow and has authority to release milestone payments
- **Freelancer**: The party who submits work deliverables and receives milestone payments
- **Verification_Report**: The AI analysis displaying score, recommendation, feedback, and gaps for a work submission
- **Soroban_Contract**: The smart contract managing escrow funds and milestone-based payment releases
- **Milestone**: A project phase with defined requirements, percentage allocation, and payment amount
- **Payment_Transaction**: The blockchain transaction that releases funds from escrow to the freelancer
- **Transaction_Confirmation**: User acknowledgment dialog before executing the payment transaction
- **Wallet_Signature**: Cryptographic signature from Freighter wallet authorizing the transaction
- **EscrowDetailPage**: The page displaying escrow information, milestones, submissions, and verification reports
- **Active_Milestone**: The current milestone awaiting completion and payment release
- **On_Chain_Escrow_ID**: The unique identifier for the escrow record stored in the Soroban smart contract

## Requirements

### Requirement 1: Release Funds Button Display

**User Story:** As a client, I want to see a "Release Funds" button when viewing an active milestone, so that I can approve payment after reviewing the work.

#### Acceptance Criteria

1. WHEN a client views an Active_Milestone on the EscrowDetailPage, THE Release_Funds_Button SHALL be displayed
2. THE Release_Funds_Button SHALL be positioned prominently near the Verification_Report display
3. THE Release_Funds_Button SHALL display the text "Release Funds" or "Approve & Release Payment"
4. THE Release_Funds_Button SHALL display the milestone payment amount (XLM) on or near the button
5. WHERE no work submission exists for the Active_Milestone, THE Release_Funds_Button SHALL display a warning indicator
6. WHERE the Verification_Report recommendation is "reject", THE Release_Funds_Button SHALL display a caution indicator
7. THE Release_Funds_Button SHALL use visual styling consistent with the existing application theme

### Requirement 2: Button Visibility Rules

**User Story:** As a client, I want the Release Funds button to appear only when appropriate, so that I don't accidentally release payment for the wrong milestone.

#### Acceptance Criteria

1. THE Release_Funds_Button SHALL be visible only when viewing an Active_Milestone
2. THE Release_Funds_Button SHALL not be visible for completed milestones
3. THE Release_Funds_Button SHALL not be visible for pending milestones (future milestones not yet active)
4. WHERE all milestones are completed, THE Release_Funds_Button SHALL not be displayed
5. THE Release_Funds_Button SHALL be visible regardless of whether a Verification_Report exists (AI verification is advisory)
6. WHERE the client wallet is not connected, THE Release_Funds_Button SHALL display a "Connect Wallet" message instead

### Requirement 3: Pre-Release Verification Check

**User Story:** As a client, I want to see AI verification results before releasing payment, so that I can make an informed decision.

#### Acceptance Criteria

1. WHEN the Release_Funds_Button is clicked, THE Release_Funds_Button SHALL check if a Verification_Report exists for the Active_Milestone
2. WHERE a Verification_Report exists with recommendation "approve", THE Release_Funds_Button SHALL display a Transaction_Confirmation dialog showing the verification score and positive recommendation
3. WHERE a Verification_Report exists with recommendation "request_changes", THE Release_Funds_Button SHALL display a Transaction_Confirmation dialog showing the verification score and caution message
4. WHERE a Verification_Report exists with recommendation "reject", THE Release_Funds_Button SHALL display a Transaction_Confirmation dialog with a strong warning about the low verification score
5. WHERE no Verification_Report exists, THE Release_Funds_Button SHALL display a Transaction_Confirmation dialog warning that no work has been submitted or verified
6. THE Transaction_Confirmation dialog SHALL display the milestone name, payment amount, and verification details (if available)
7. THE Transaction_Confirmation dialog SHALL provide "Confirm" and "Cancel" options

### Requirement 4: Transaction Execution

**User Story:** As a client, I want to release funds to the blockchain when I confirm payment, so that the freelancer receives their milestone payment.

#### Acceptance Criteria

1. WHEN the client confirms the Transaction_Confirmation dialog, THE Release_Funds_Button SHALL call the Soroban_Contract releaseFunds function
2. THE Release_Funds_Button SHALL pass the On_Chain_Escrow_ID and client wallet address to the releaseFunds function
3. THE Release_Funds_Button SHALL request a Wallet_Signature from the Freighter wallet
4. WHEN the Wallet_Signature is obtained, THE Release_Funds_Button SHALL submit the Payment_Transaction to the Stellar network
5. THE Release_Funds_Button SHALL display a loading state with message "Waiting for wallet signature..." while awaiting Wallet_Signature
6. THE Release_Funds_Button SHALL display a loading state with message "Submitting transaction..." while the Payment_Transaction is being processed
7. WHEN the Payment_Transaction is successfully submitted, THE Release_Funds_Button SHALL display the transaction hash

### Requirement 5: Transaction Success Handling

**User Story:** As a client, I want to see confirmation when payment is released successfully, so that I know the transaction completed.

#### Acceptance Criteria

1. WHEN the Payment_Transaction is successfully submitted, THE Release_Funds_Button SHALL display a success message
2. THE success message SHALL include the transaction hash with a link to the Stellar Explorer
3. THE Release_Funds_Button SHALL update the local escrow state to mark the milestone as completed
4. THE Release_Funds_Button SHALL update the Supabase database payment_releases column with the release record
5. THE payment_releases record SHALL include milestone_index, released_at timestamp, verification_id (if exists), verification_score (if exists), and verification_recommendation (if exists)
6. WHEN the milestone is marked as completed, THE Release_Funds_Button SHALL no longer be displayed for that milestone
7. WHERE additional milestones exist, THE Release_Funds_Button SHALL become visible for the next Active_Milestone

### Requirement 6: Transaction Error Handling

**User Story:** As a client, I want clear error messages if payment release fails, so that I can understand what went wrong and retry if needed.

#### Acceptance Criteria

1. IF the client cancels the Wallet_Signature request, THEN THE Release_Funds_Button SHALL display message "Transaction cancelled by user"
2. IF the Wallet_Signature request fails, THEN THE Release_Funds_Button SHALL display message "Wallet signature failed. Please try again."
3. IF the Payment_Transaction simulation fails, THEN THE Release_Funds_Button SHALL display the simulation error message
4. IF the Payment_Transaction submission fails, THEN THE Release_Funds_Button SHALL display message "Transaction failed. Please check your wallet and try again."
5. IF the Soroban_Contract returns an error (e.g., "Only client can release funds"), THEN THE Release_Funds_Button SHALL display the contract error message
6. WHEN an error occurs, THE Release_Funds_Button SHALL return to its initial enabled state allowing retry
7. THE Release_Funds_Button SHALL log all errors to the browser console for debugging

### Requirement 7: Database Audit Trail

**User Story:** As a system administrator, I want payment releases recorded with verification context, so that we have a complete audit trail for dispute resolution.

#### Acceptance Criteria

1. WHEN a Payment_Transaction is successfully submitted, THE Release_Funds_Button SHALL record the payment release in the Supabase database
2. THE payment release record SHALL include the milestone_index that was released
3. THE payment release record SHALL include the released_at timestamp
4. WHERE a Verification_Report existed at release time, THE payment release record SHALL include the verification_id
5. WHERE a Verification_Report existed at release time, THE payment release record SHALL include the verification_score
6. WHERE a Verification_Report existed at release time, THE payment release record SHALL include the verification_recommendation
7. THE payment release record SHALL be stored in the escrows table payment_releases JSONB column as an array element

### Requirement 8: Button State Management

**User Story:** As a client, I want the Release Funds button to show its current state clearly, so that I understand what action is happening.

#### Acceptance Criteria

1. THE Release_Funds_Button SHALL have a default enabled state when no action is in progress
2. WHILE awaiting Wallet_Signature, THE Release_Funds_Button SHALL be disabled and display "Waiting for wallet..."
3. WHILE submitting the Payment_Transaction, THE Release_Funds_Button SHALL be disabled and display "Submitting transaction..."
4. WHEN the Payment_Transaction succeeds, THE Release_Funds_Button SHALL display "✓ Payment Released!" for 3 seconds
5. WHEN an error occurs, THE Release_Funds_Button SHALL display the error state for 5 seconds then return to enabled state
6. THE Release_Funds_Button SHALL use visual indicators (spinner, checkmark, error icon) to reinforce the current state
7. THE Release_Funds_Button SHALL prevent double-clicks by disabling during transaction processing

### Requirement 9: Integration with Existing Components

**User Story:** As a developer, I want the Release Funds button to integrate seamlessly with existing components, so that the user experience is consistent.

#### Acceptance Criteria

1. THE Release_Funds_Button SHALL be added to the EscrowDetailPage component
2. THE Release_Funds_Button SHALL reuse the existing releaseFunds function from frontend/src/stellar.ts
3. THE Release_Funds_Button SHALL reuse the existing signTransaction function from frontend/src/freighter.ts
4. THE Release_Funds_Button SHALL reuse the existing updateEscrow function from frontend/src/supabase.ts
5. THE Release_Funds_Button SHALL use the same Tailwind CSS styling patterns as existing buttons in the application
6. THE Release_Funds_Button SHALL display transaction links using the existing TX_EXPLORER_URL function
7. THE Release_Funds_Button SHALL follow the same error handling patterns as the existing createEscrow flow

### Requirement 10: Accessibility and Usability

**User Story:** As a client, I want the Release Funds button to be accessible and easy to use, so that I can confidently release payments.

#### Acceptance Criteria

1. THE Release_Funds_Button SHALL have sufficient color contrast to meet WCAG AA standards
2. THE Release_Funds_Button SHALL have a minimum touch target size of 44x44 pixels for mobile accessibility
3. THE Release_Funds_Button SHALL display hover states to indicate interactivity
4. THE Release_Funds_Button SHALL display focus states for keyboard navigation
5. THE Release_Funds_Button SHALL include aria-label attributes describing the button action
6. THE Transaction_Confirmation dialog SHALL be keyboard accessible (Enter to confirm, Escape to cancel)
7. THE Release_Funds_Button SHALL display loading states with appropriate aria-busy attributes for screen readers

### Requirement 11: Edge Case Handling

**User Story:** As a user, I want the system to handle edge cases gracefully, so that payment release remains reliable under unusual conditions.

#### Acceptance Criteria

1. WHERE the On_Chain_Escrow_ID is missing from the database record, THE Release_Funds_Button SHALL display error "Escrow not found on blockchain"
2. WHERE the client wallet address does not match the escrow creator, THE Release_Funds_Button SHALL display error "Only the escrow creator can release funds"
3. WHERE the Freighter wallet is locked, THE Release_Funds_Button SHALL display error "Please unlock your Freighter wallet"
4. WHERE the Stellar network is unavailable, THE Release_Funds_Button SHALL display error "Network unavailable. Please try again later."
5. WHERE the database update fails after successful blockchain transaction, THE Release_Funds_Button SHALL display warning "Payment released on-chain but database update failed"
6. WHERE multiple clients attempt to release the same milestone simultaneously, THE Soroban_Contract SHALL prevent double-payment via its milestone counter
7. IF the Payment_Transaction succeeds but the page is closed before database update, THE system SHALL reconcile state on next page load by querying the Soroban_Contract

