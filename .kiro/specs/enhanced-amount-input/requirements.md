# Requirements Document

## Introduction

This feature enhances the escrow creation system with three major improvements: (1) enhanced amount input field supporting direct text input instead of spinner controls, (2) Supabase backend integration for data persistence and storage, and (3) AI-powered verification to ensure generated milestones match the project description. These enhancements improve user experience through faster data entry, reliable data storage, and intelligent validation of AI-generated content.

## Glossary

- **Amount_Input**: The input field in EscrowPage.tsx where users enter the total XLM amount for the escrow contract
- **XLM**: Stellar Lumens, the native cryptocurrency of the Stellar blockchain
- **Escrow_Form**: The transaction entry form containing freelancer address, amount, and project description fields
- **Milestone_Generator**: The AI-powered system that splits the total amount across project milestones
- **Transaction_Summary**: The display panel showing payment amount, network fee, milestones, and total to lock
- **Supabase**: Backend-as-a-Service platform providing database, authentication, and storage capabilities
- **Escrow_Record**: Database record storing escrow transaction details, metadata, and milestone information
- **AI_Verification**: Process that validates generated milestones accurately reflect the project description
- **Verification_Status**: Indicator showing whether milestones match the description (Matching, Partial Match, Not Matching)

## Requirements

### Requirement 1: Direct Text Input Support

**User Story:** As a user creating an escrow, I want to type the amount directly into the input field, so that I can enter values faster than using spinner controls.

#### Acceptance Criteria

1. THE Amount_Input SHALL accept keyboard text input for numeric values
2. WHEN a user types numeric characters, THE Amount_Input SHALL update the amount state in real-time
3. THE Amount_Input SHALL support decimal point input for fractional XLM amounts
4. THE Amount_Input SHALL maintain the existing placeholder text "0.00"
5. THE Amount_Input SHALL preserve the existing monospace font styling

### Requirement 2: Input Validation and Sanitization

**User Story:** As a user entering an amount, I want the system to prevent invalid input, so that I can only submit valid XLM amounts.

#### Acceptance Criteria

1. WHEN a user types non-numeric characters (excluding decimal point), THE Amount_Input SHALL reject the input
2. WHEN a user types multiple decimal points, THE Amount_Input SHALL accept only the first decimal point
3. WHEN a user types leading zeros before a decimal point, THE Amount_Input SHALL allow the input
4. THE Amount_Input SHALL accept empty string as valid input state
5. WHEN the amount value is parsed, THE Escrow_Form SHALL validate that parseFloat(amount) is greater than 0 before enabling escrow initialization

### Requirement 3: Decimal Precision Control

**User Story:** As a user entering cryptocurrency amounts, I want appropriate decimal precision, so that I can specify accurate payment amounts.

#### Acceptance Criteria

1. THE Amount_Input SHALL allow up to 7 decimal places for XLM amounts
2. WHEN the amount is displayed in Transaction_Summary, THE system SHALL format it to 2 decimal places
3. WHEN the amount is passed to Milestone_Generator, THE system SHALL use the full precision value
4. WHEN the amount is passed to the blockchain transaction, THE system SHALL use the full precision value

### Requirement 4: Accessibility and User Experience

**User Story:** As a user with accessibility needs, I want proper input labeling and keyboard navigation, so that I can use the form effectively.

#### Acceptance Criteria

1. THE Amount_Input SHALL maintain association with its label "Total Amount (XLM)"
2. THE Amount_Input SHALL support standard keyboard navigation (Tab, Shift+Tab)
3. THE Amount_Input SHALL support copy/paste operations for numeric values
4. WHEN a user pastes text, THE Amount_Input SHALL sanitize the input to allow only valid numeric format
5. THE Amount_Input SHALL maintain the existing visual focus state styling

### Requirement 5: Integration with Existing Features

**User Story:** As a user, I want the enhanced input to work seamlessly with existing features, so that my workflow is not disrupted.

#### Acceptance Criteria

1. WHEN the amount changes, THE Transaction_Summary SHALL update the "Payment amount" display in real-time
2. WHEN the amount changes, THE Transaction_Summary SHALL update the "Total to Lock" display in real-time
3. WHEN milestones are generated, THE Milestone_Generator SHALL receive the current amount value
4. WHEN the escrow is initialized, THE blockchain transaction SHALL use the current amount value
5. THE Amount_Input SHALL maintain the existing onChange handler pattern with setAmount(e.target.value)

### Requirement 6: Error Prevention and User Feedback

**User Story:** As a user, I want clear feedback when my input is invalid, so that I understand what needs to be corrected.

#### Acceptance Criteria

1. WHEN the amount is empty or zero, THE "Initialize Escrow" button SHALL remain disabled
2. WHEN the amount is invalid (non-numeric after parsing), THE "Initialize Escrow" button SHALL remain disabled
3. WHEN the amount is valid and greater than zero, THE "Initialize Escrow" button SHALL become enabled (if other conditions are met)
4. THE Amount_Input SHALL provide visual feedback through existing border and color styling
5. WHEN the amount is valid, THE Transaction_Summary SHALL display formatted values without error messages

### Requirement 7: Supabase Backend Integration

**User Story:** As a user, I want my escrow data persisted to a backend database, so that I can access my transaction history and data is not lost on page refresh.

#### Acceptance Criteria

1. THE system SHALL integrate Supabase client library (@supabase/supabase-js) into the frontend application
2. THE system SHALL configure Supabase connection with project URL and anon key from environment variables
3. THE system SHALL create an "escrows" table in Supabase with columns for: id (uuid), created_at (timestamp), wallet_address (text), freelancer_address (text), amount (numeric), description (text), milestone_count (integer), milestones (jsonb), tx_hash (text), status (text), verification_result (jsonb)
4. WHEN a user initializes an escrow, THE system SHALL insert a new record into the "escrows" table with all transaction details
5. WHEN the blockchain transaction completes, THE system SHALL update the escrow record with the transaction hash
6. THE system SHALL implement error handling for database operations with user-friendly error messages

### Requirement 8: AI Milestone Verification

**User Story:** As a user, I want the AI to verify that the generated milestones accurately match my project description, so that I can ensure the milestone breakdown is relevant and complete before creating the escrow.

#### Acceptance Criteria

1. WHEN the AI generates milestones, THE system SHALL automatically analyze if the generated milestones align with the project description
2. THE system SHALL send both the original project description and the generated milestones to OpenAI for verification analysis
3. THE AI verification SHALL determine if the milestones comprehensively cover the project scope described
4. THE system SHALL display a verification status indicator with three states: "Matching", "Partial Match", or "Not Matching"
5. WHEN milestones match the description, THE system SHALL display a green checkmark with message "✓ Milestones verified and match project description"
6. WHEN milestones partially match, THE system SHALL display a yellow warning with message "⚠ Some milestones may not fully cover the description" and list specific gaps or concerns
7. WHEN milestones do not match, THE system SHALL display a red warning with message "✗ Milestones do not match project description" and explain the mismatch
8. THE system SHALL allow users to proceed with escrow creation regardless of verification status (warning only, not blocking)
9. THE verification result SHALL be stored in the Supabase "escrows" table in the "verification_result" jsonb column containing: status, confidence_score, ai_feedback
10. THE Transaction_Summary panel SHALL display the milestone verification status before escrow initialization
11. WHEN verification fails due to API errors, THE system SHALL display "Verification unavailable" and allow the user to proceed
12. THE system SHALL provide a "Regenerate Milestones" button if verification shows "Not Matching" status

### Requirement 9: Supabase Authentication Integration

**User Story:** As a user, I want to authenticate with Supabase using my Stellar wallet address, so that my escrow data is securely associated with my identity.

#### Acceptance Criteria

1. THE system SHALL implement Supabase authentication using custom JWT tokens or anonymous authentication
2. WHEN a user connects their Freighter wallet, THE system SHALL create or retrieve a Supabase user session
3. THE system SHALL associate the wallet public key with the Supabase user identity
4. THE "escrows" table SHALL include a user_id column (uuid) referencing the authenticated user
5. THE system SHALL implement Row Level Security (RLS) policies ensuring users can only access their own escrow records
6. WHEN a user is not authenticated, THE system SHALL prevent escrow creation and display an authentication prompt

### Requirement 10: Data Synchronization and History

**User Story:** As a user, I want to see my historical escrow transactions loaded from the backend, so that I can track all my past and current escrows.

#### Acceptance Criteria

1. WHEN the application loads, THE system SHALL fetch all escrow records for the authenticated user from Supabase
2. THE HistoryPage component SHALL display escrows loaded from the Supabase database instead of local state
3. THE system SHALL implement real-time subscriptions to the "escrows" table to update the UI when data changes
4. WHEN an escrow status changes on the blockchain, THE system SHALL update the corresponding database record
5. THE system SHALL implement pagination for escrow history (20 records per page)
6. THE system SHALL provide filtering options by status (Pending, Active, Completed) and date range

### Requirement 11: Error Handling and Offline Support

**User Story:** As a user, I want graceful error handling when the backend is unavailable, so that I can still use basic functionality offline.

#### Acceptance Criteria

1. WHEN Supabase connection fails, THE system SHALL display a warning banner indicating offline mode
2. WHEN in offline mode, THE system SHALL allow escrow creation but store data in browser localStorage
3. WHEN connection is restored, THE system SHALL sync offline escrows to Supabase automatically
4. THE system SHALL implement retry logic for failed database operations (3 retries with exponential backoff)
5. THE system SHALL validate Supabase configuration on application startup and display setup errors clearly

### Requirement 12: Performance and Optimization

**User Story:** As a user, I want fast loading times and responsive interactions, so that the application feels smooth and professional.

#### Acceptance Criteria

1. THE system SHALL cache escrow data in memory to reduce database queries
2. THE system SHALL implement optimistic UI updates for escrow creation (show success immediately, sync in background)
3. THE system SHALL implement database indexes on wallet_address and created_at columns for fast queries
4. THE milestone verification process SHALL run asynchronously and not block escrow initialization
5. THE system SHALL cache verification results to avoid re-processing identical descriptions
