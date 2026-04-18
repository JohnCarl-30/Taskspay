# Implementation Plan: Enhanced Amount Input

## Overview

This implementation plan breaks down the enhanced-amount-input feature into discrete coding tasks. The feature adds three major capabilities: (1) enhanced text-based amount input with validation, (2) Supabase backend integration for data persistence and authentication, and (3) AI-powered milestone verification. Tasks are organized to build incrementally, with testing sub-tasks marked as optional for faster MVP delivery.

## Tasks

- [x] 1. Set up Supabase integration and environment configuration
  - Install @supabase/supabase-js dependency
  - Create frontend/src/supabase.ts module with client initialization
  - Add environment variables to .env file (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  - Create TypeScript interfaces for Database schema and EscrowRecord types
  - _Requirements: 7.1, 7.2_

- [x] 2. Create Supabase database schema and RLS policies
  - [x] 2.1 Create escrows table with all required columns
    - Write SQL migration for escrows table (id, created_at, updated_at, user_id, wallet_address, freelancer_address, amount, description, milestone_count, milestones, tx_hash, status, verification_result)
    - Add CHECK constraints for amount > 0 and milestone_count > 0
    - Add status enum constraint (pending, active, completed, refunded)
    - Create indexes on wallet_address, created_at, user_id, and status columns
    - _Requirements: 7.3, 12.3_
  
  - [x] 2.2 Enable Row Level Security and create policies
    - Enable RLS on escrows table
    - Create SELECT policy: users can view their own escrows
    - Create INSERT policy: users can insert their own escrows
    - Create UPDATE policy: users can update their own escrows
    - Create trigger for auto-updating updated_at timestamp
    - _Requirements: 9.5_

- [x] 3. Implement Supabase authentication with wallet integration
  - [x] 3.1 Create authentication functions in supabase.ts
    - Implement authenticateWithWallet function using Supabase anonymous auth or custom JWT
    - Associate wallet public key with Supabase user session
    - Store session in application state
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 3.2 Integrate authentication into EscrowPage component
    - Call authenticateWithWallet when wallet connects
    - Handle authentication errors with user-friendly messages
    - Prevent escrow creation when user is not authenticated
    - _Requirements: 9.6_

- [x] 4. Implement enhanced amount input with validation
  - [x] 4.1 Create amount input sanitization utility
    - Write sanitizeAmountInput function in frontend/src/utils/amount-utils.ts
    - Remove non-numeric characters except decimal point
    - Allow only one decimal point
    - Limit to 7 decimal places
    - _Requirements: 2.1, 2.2, 2.3, 3.1_
  
  - [ ]* 4.2 Write property test for input sanitization
    - **Property 1: Input Sanitization Produces Valid Numeric Format**
    - **Validates: Requirements 2.1, 2.2, 3.1**
    - Install fast-check dependency
    - Test that any input string produces valid numeric format (digits + at most one decimal, max 7 decimal places)
    - Run 100 iterations minimum
  
  - [x] 4.3 Modify Amount_Input in EscrowPage.tsx
    - Change input type from "number" to "text"
    - Apply sanitizeAmountInput in onChange handler
    - Maintain existing placeholder "0.00" and monospace font styling
    - Support copy/paste with sanitization
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.3_
  
  - [ ]* 4.4 Write unit tests for amount input validation
    - Test valid numeric input acceptance
    - Test invalid character rejection
    - Test multiple decimal point handling
    - Test paste sanitization
    - Test empty string and zero handling
    - _Requirements: 2.1, 2.2, 2.4, 4.4_

- [x] 5. Implement amount formatting utilities
  - [x] 5.1 Create display formatting function
    - Write formatDisplayAmount function in amount-utils.ts
    - Format to exactly 2 decimal places for Transaction_Summary display
    - Preserve integer part unchanged
    - _Requirements: 3.2_
  
  - [ ]* 5.2 Write property test for display formatting
    - **Property 2: Display Formatting Consistency**
    - **Validates: Requirements 3.2**
    - Test that any valid amount formats to exactly 2 decimal places
    - Test that formatted value is parseable and preserves integer part
  
  - [x] 5.3 Update Transaction_Summary to use formatted amounts
    - Apply formatDisplayAmount to "Payment amount" display
    - Apply formatDisplayAmount to "Total to Lock" display
    - Maintain real-time updates when amount changes
    - _Requirements: 5.1, 5.2_
  
  - [ ]* 5.4 Write property test for full precision preservation
    - **Property 3: Full Precision Preservation in Data Flow**
    - **Validates: Requirements 3.3, 3.4**
    - Test that amounts with up to 7 decimals maintain precision when passed to Milestone_Generator and blockchain
    - Verify no rounding errors introduced

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Supabase CRUD operations
  - [x] 7.1 Create database operation functions in supabase.ts
    - Implement insertEscrow function with error handling
    - Implement updateEscrow function for tx_hash and status updates
    - Implement fetchUserEscrows function with user_id filtering
    - Add retry logic with exponential backoff (3 retries)
    - _Requirements: 7.4, 7.5, 7.6, 11.4_
  
  - [x] 7.2 Integrate insertEscrow into escrow creation flow
    - Call insertEscrow when user initializes escrow
    - Store escrow record before blockchain transaction
    - Update record with tx_hash after transaction completes
    - _Requirements: 7.4, 7.5_
  
  - [ ]* 7.3 Write integration tests for Supabase operations
    - Test insertEscrow with valid data
    - Test updateEscrow with tx_hash
    - Test fetchUserEscrows returns only user's records
    - Test RLS policy enforcement
    - Use Supabase test project or local development environment

- [x] 8. Implement AI milestone verification system
  - [x] 8.1 Create verification module in frontend/src/verification.ts
    - Define VerificationResult interface (status, confidence, feedback, gaps)
    - Implement verifyMilestones function calling OpenAI API
    - Create verification prompt analyzing milestone-description alignment
    - Parse JSON response with status (matching/partial/not_matching)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 8.2 Add verification UI to Transaction_Summary
    - Display verification status indicator with three states
    - Show green checkmark for "Matching" status
    - Show yellow warning for "Partial Match" with gaps listed
    - Show red warning for "Not Matching" with explanation
    - Add "Regenerate Milestones" button for "Not Matching" status
    - _Requirements: 8.5, 8.6, 8.7, 8.10, 8.12_
  
  - [x] 8.3 Integrate verification into milestone generation flow
    - Call verifyMilestones after generateMilestones completes
    - Run verification asynchronously (non-blocking)
    - Store verification result in component state
    - Handle API errors gracefully with "Verification unavailable" message
    - _Requirements: 8.1, 8.11, 12.4_
  
  - [x] 8.4 Store verification results in database
    - Add verification_result to EscrowInsert interface
    - Store verification result in escrows table when inserting record
    - Include status, confidence_score, and ai_feedback in JSONB column
    - _Requirements: 8.9_
  
  - [ ]* 8.5 Write unit tests for verification module
    - Test verification prompt generation
    - Test JSON response parsing
    - Test error handling for API failures
    - Mock OpenAI API responses

- [x] 9. Implement real-time data synchronization
  - [x] 9.1 Create real-time subscription in supabase.ts
    - Implement subscribeToEscrows function using Supabase Realtime
    - Subscribe to INSERT, UPDATE, DELETE events on escrows table
    - Filter events by user_id
    - _Requirements: 10.3_
  
  - [x] 9.2 Integrate subscriptions into application state
    - Set up subscription when user authenticates
    - Update local state when real-time events received
    - Clean up subscription on component unmount
    - _Requirements: 10.3_

- [x] 10. Implement escrow history loading and filtering
  - [x] 10.1 Update HistoryPage to load from Supabase
    - Replace local state with fetchUserEscrows call
    - Display escrows from database instead of in-memory array
    - Handle loading and error states
    - _Requirements: 10.1, 10.2_
  
  - [x] 10.2 Add pagination to history view
    - Implement pagination with 20 records per page
    - Add "Load More" or page navigation controls
    - _Requirements: 10.5_
  
  - [x] 10.3 Add status and date filtering
    - Create filter UI for status (Pending, Active, Completed, Refunded)
    - Create date range filter controls
    - Apply filters to Supabase query
    - _Requirements: 10.6_
  
  - [ ]* 10.4 Write property test for status filtering
    - **Property 4: Status Filtering Correctness**
    - **Validates: Requirements 10.6**
    - Test that filtered results contain only matching records
    - Test that all matching records are included (no false negatives)
    - Test order preservation

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement offline support with localStorage
  - [x] 12.1 Create offline storage module in frontend/src/offline.ts
    - Define OfflineEscrow interface with offline_id and synced flag
    - Implement saveOfflineEscrow function storing to localStorage
    - Implement getOfflineEscrows function reading from localStorage
    - Implement clearSyncedEscrows function removing synced records
    - _Requirements: 11.2_
  
  - [x] 12.2 Add offline mode detection and UI
    - Detect Supabase connection failures
    - Display warning banner indicating offline mode
    - Store escrows in localStorage when offline
    - _Requirements: 11.1, 11.2_
  
  - [x] 12.3 Implement automatic sync when connection restored
    - Detect when connection is restored
    - Upload all offline escrows to Supabase
    - Mark successfully uploaded records as synced
    - Remove synced records from localStorage
    - _Requirements: 11.3_
  
  - [ ]* 12.4 Write property test for offline sync completeness
    - **Property 5: Offline Sync Completeness**
    - **Validates: Requirements 11.3**
    - Test that all offline records are uploaded when sync triggered
    - Test that synced records are marked and removed from queue
    - Test data preservation during upload

- [x] 13. Implement error handling and user feedback
  - [x] 13.1 Create error handling utilities
    - Define EscrowError class with code, recoverable flag, and userMessage
    - Implement handleError function categorizing errors
    - Map error types to user-friendly messages
    - _Requirements: 7.6, 11.5_
  
  - [x] 13.2 Add error UI to EscrowPage
    - Display error messages for validation failures
    - Display error messages for network failures
    - Display error messages for authentication failures
    - Maintain existing error display for transaction failures
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 13.3 Write unit tests for error handling
    - Test error classification for different error types
    - Test user message generation
    - Test retry logic behavior

- [x] 14. Implement performance optimizations
  - [x] 14.1 Add in-memory caching for escrow data
    - Create escrowCache Map in supabase.ts
    - Implement fetchUserEscrowsCached function
    - Cache verification results to avoid re-processing
    - _Requirements: 12.1, 12.5_
  
  - [x] 14.2 Implement optimistic UI updates
    - Create createEscrowOptimistic function
    - Update UI immediately with temporary record
    - Rollback on error
    - _Requirements: 12.2_
  
  - [ ]* 14.3 Write integration tests for caching
    - Test cache hit/miss behavior
    - Test cache invalidation
    - Test optimistic update rollback

- [x] 15. Final integration and wiring
  - [x] 15.1 Wire all components together in EscrowPage
    - Connect authentication flow to wallet connection
    - Connect enhanced input to validation and formatting
    - Connect milestone generation to verification
    - Connect escrow creation to database operations
    - Connect offline support to error handling
    - _Requirements: 5.3, 5.4, 5.5_
  
  - [x] 15.2 Update App.tsx to handle authentication state
    - Pass authentication state to EscrowPage and HistoryPage
    - Handle session persistence across page reloads
    - _Requirements: 9.2_
  
  - [ ]* 15.3 Write end-to-end integration tests
    - Test complete escrow creation flow (happy path)
    - Test offline mode with sync
    - Test error recovery scenarios
    - Use Playwright or Cypress for E2E tests

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties defined in the design
- Unit tests validate specific examples and edge cases
- Integration tests verify external service interactions (Supabase, OpenAI, Stellar)
- Checkpoints ensure incremental validation at reasonable breaks
- All code examples use TypeScript as specified in the design document
