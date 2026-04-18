# Implementation Plan: AI-Powered Delivery Verification

## Overview

This implementation plan breaks down the AI-powered delivery verification feature into discrete coding tasks. The feature enables freelancers to submit proof of work for milestones, uses OpenAI GPT-4 to analyze submissions against requirements, and provides clients with verification scores and recommendations before payment release.

**Tech Stack**: React 19, TypeScript, Vite, Tailwind CSS, Supabase, OpenAI API

**Implementation Approach**:
1. Database schema and migrations first
2. Core API functions for submissions and verifications
3. UI components for submission and display
4. Integration with existing escrow payment flow
5. Real-time updates and caching
6. Testing and validation

## Tasks

- [ ] 1. Create database schema and migrations
  - [x] 1.1 Create work_submissions table migration
    - Write SQL migration file `supabase/migrations/002_create_work_submissions_table.sql`
    - Include table structure with id, created_at, escrow_id, milestone_index, submitter_address, description, urls
    - Add constraints: description max 2000 chars, urls array max 5 items
    - Create indexes on escrow_id, milestone_index, and created_at
    - Add RLS policies for viewing and inserting submissions
    - _Requirements: 1.2, 1.5, 6.1, 6.2, 6.3, 6.4, 6.6_
  
  - [x] 1.2 Create delivery_verifications table migration
    - Write SQL migration file `supabase/migrations/003_create_delivery_verifications_table.sql`
    - Include table structure with id, created_at, submission_id, score, recommendation, feedback, gaps, raw_response
    - Add constraints: score 0-100, recommendation enum, unique submission_id
    - Create indexes on submission_id, score, and recommendation
    - Add RLS policies for viewing verifications
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 6.1, 6.2, 6.3, 6.5, 6.6_
  
  - [x] 1.3 Add payment_releases column to escrows table
    - Write SQL migration file `supabase/migrations/004_add_payment_releases_to_escrows.sql`
    - Add JSONB column to track which verification was displayed at payment release
    - _Requirements: 5.5_

- [ ] 2. Extend TypeScript interfaces and Supabase client
  - [x] 2.1 Add WorkSubmission and DeliveryVerification interfaces to supabase.ts
    - Define WorkSubmission interface with all fields
    - Define WorkSubmissionInsert type (omit id and created_at)
    - Define DeliveryVerification interface with all fields
    - Define DeliveryVerificationInsert type (omit id and created_at)
    - Define SubmissionWithVerification combined interface
    - Update Database schema types to include new tables
    - _Requirements: 1.2, 1.5, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2_
  
  - [ ]* 2.2 Write unit tests for TypeScript interfaces
    - Test interface type checking with valid and invalid data
    - Test WorkSubmissionInsert omits readonly fields
    - Test DeliveryVerificationInsert omits readonly fields
    - _Requirements: 1.2, 2.3_

- [ ] 3. Implement submission API functions
  - [x] 3.1 Create frontend/src/api/submissions.ts with core functions
    - Implement submitWork function with validation
    - Implement fetchMilestoneSubmissions function
    - Implement fetchSubmissionById function
    - Add retry logic with exponential backoff (reuse pattern from supabase.ts)
    - Add input validation for description length and URL format
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 6.7, 6.8, 9.1, 9.2, 9.5, 9.6_
  
  - [ ]* 3.2 Write unit tests for submission API functions
    - Test submitWork with valid inputs
    - Test submitWork validation errors (description too long, too many URLs)
    - Test fetchMilestoneSubmissions returns correct data
    - Test retry logic on network failures
    - _Requirements: 1.7, 6.7, 9.5, 9.6_

- [ ] 4. Implement AI verification API functions
  - [x] 4.1 Create frontend/src/api/verifications.ts with verification logic
    - Implement buildVerificationPrompt function using template from design
    - Implement verifyWorkSubmission function calling OpenAI API
    - Implement validateVerificationResponse function
    - Implement fetchVerification function to retrieve from database
    - Implement fetchVerificationCached function with in-memory cache
    - Implement clearVerificationCache function
    - Add 10-second timeout for OpenAI API calls
    - Handle missing API key gracefully
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 9.4_
  
  - [ ]* 4.2 Write unit tests for verification API functions
    - Test buildVerificationPrompt includes milestone and submission content
    - Test validateVerificationResponse catches invalid scores
    - Test validateVerificationResponse catches invalid recommendations
    - Test score-recommendation consistency warnings
    - Test cache hit and miss scenarios
    - Test cache invalidation
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 7.6, 7.7, 8.1, 8.2, 8.3_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Create SubmissionForm component
  - [x] 6.1 Implement SubmissionForm component with form UI
    - Create frontend/src/components/SubmissionForm.tsx
    - Build form with text area for description (2000 char limit with counter)
    - Build dynamic URL input fields (up to 5 URLs with add/remove buttons)
    - Add real-time validation with error messages
    - Add loading state during submission
    - Add success confirmation message with submission ID
    - Style with Tailwind CSS matching existing theme
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_
  
  - [x] 6.2 Add form validation logic to SubmissionForm
    - Validate description length (1-2000 characters)
    - Validate URL format using regex
    - Validate maximum 5 URLs
    - Display specific error messages for each validation failure
    - Disable submit button when validation fails
    - _Requirements: 1.3, 1.4, 1.7, 9.5, 9.6_
  
  - [x] 6.3 Integrate SubmissionForm with submission API
    - Call submitWork on form submission
    - Handle onSubmitSuccess callback
    - Handle onSubmitError callback
    - Clear form after successful submission
    - Display error messages from API failures
    - _Requirements: 1.5, 1.6, 1.7_
  
  - [ ]* 6.4 Write unit tests for SubmissionForm component
    - Test form renders with correct initial state
    - Test character counter updates as user types
    - Test URL fields can be added and removed
    - Test validation errors display correctly
    - Test submit button disabled when validation fails
    - Test successful submission clears form
    - _Requirements: 1.2, 1.3, 1.4, 1.7_

- [ ] 7. Create VerificationReport component
  - [x] 7.1 Implement VerificationReport component with display UI
    - Create frontend/src/components/VerificationReport.tsx
    - Display score as circular progress indicator (0-100)
    - Display color-coded recommendation badge (green/yellow/red)
    - Display feedback text in readable paragraph format
    - Display gaps as bulleted list when present
    - Display timestamp in relative format ("2 hours ago")
    - Add expandable section to view full submission content
    - Style with Tailwind CSS matching existing theme
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ]* 7.2 Write unit tests for VerificationReport component
    - Test score displays correctly
    - Test recommendation badge color matches score
    - Test feedback text renders
    - Test gaps list renders when present
    - Test gaps list hidden when not present
    - Test expandable submission section toggles
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 8. Create SubmissionHistory component
  - [x] 8.1 Implement SubmissionHistory component with list UI
    - Create frontend/src/components/SubmissionHistory.tsx
    - Fetch all submissions for milestone on mount
    - Display submissions in reverse chronological order
    - Show submission cards with timestamp, score, recommendation badge
    - Add "Most Recent" indicator on latest submission
    - Add click to expand full details
    - Add empty state message when no submissions exist
    - Add loading skeleton during data fetch
    - Style with Tailwind CSS matching existing theme
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ]* 8.2 Write unit tests for SubmissionHistory component
    - Test loading state displays skeleton
    - Test empty state displays message
    - Test submissions display in correct order
    - Test "Most Recent" indicator on first item
    - Test clicking submission expands details
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 9. Create VerificationBadge component
  - [x] 9.1 Implement VerificationBadge component
    - Create frontend/src/components/VerificationBadge.tsx
    - Display small circular badge with score
    - Color badge based on recommendation (green/yellow/red)
    - Add tooltip on hover showing recommendation text
    - Support size prop (small/medium/large)
    - Style with Tailwind CSS matching existing theme
    - _Requirements: 3.2_
  
  - [ ]* 9.2 Write unit tests for VerificationBadge component
    - Test badge displays correct score
    - Test badge color matches recommendation
    - Test tooltip shows on hover
    - Test size prop changes badge size
    - _Requirements: 3.2_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Integrate components into EscrowPage
  - [x] 11.1 Add SubmissionForm to EscrowPage for active milestones
    - Import SubmissionForm component
    - Display SubmissionForm when viewing active milestone
    - Pass escrowId, milestoneIndex, milestone name and description as props
    - Handle onSubmitSuccess to refresh verification data
    - Handle onSubmitError to display error messages
    - _Requirements: 1.1, 1.6_
  
  - [x] 11.2 Add VerificationReport to EscrowPage
    - Import VerificationReport component
    - Fetch latest verification for current milestone
    - Display VerificationReport when verification exists
    - Update display when new verification arrives via realtime
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [x] 11.3 Add SubmissionHistory to EscrowPage
    - Import SubmissionHistory component
    - Add expandable section to view submission history
    - Pass escrowId and milestoneIndex as props
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ]* 11.4 Write integration tests for EscrowPage with new components
    - Test SubmissionForm displays for active milestones
    - Test VerificationReport displays when verification exists
    - Test SubmissionHistory displays all submissions
    - Test components update when new data arrives
    - _Requirements: 1.1, 3.7, 4.1_

- [ ] 12. Enhance payment release flow with verification warnings
  - [x] 12.1 Add verification check before payment release
    - Fetch latest verification when client clicks release payment
    - Display warning dialog if no submission exists
    - Display confirmation dialog if recommendation is "reject"
    - Show verification score and recommendation in confirmation dialog
    - Allow client to proceed regardless of recommendation
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 12.2 Record verification at payment release time
    - Update payment_releases JSONB column when payment released
    - Store milestone_index, released_at timestamp, verification_id, score, recommendation
    - _Requirements: 5.5_
  
  - [ ]* 12.3 Write integration tests for payment release flow
    - Test warning displays when no submission exists
    - Test confirmation displays when recommendation is "reject"
    - Test payment proceeds after confirmation
    - Test payment_releases column updated correctly
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 13. Implement real-time subscriptions
  - [ ] 13.1 Add Supabase realtime subscriptions to EscrowPage
    - Subscribe to work_submissions table filtered by escrow_id
    - Subscribe to delivery_verifications table
    - Handle INSERT events for new submissions
    - Handle INSERT events for new verifications
    - Update UI state when events received
    - Unsubscribe on component unmount
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [ ] 13.2 Add notification badges for new submissions
    - Display notification badge on milestone when new submission arrives
    - Clear badge when user views the submission
    - _Requirements: 10.3_
  
  - [ ]* 13.3 Write integration tests for realtime subscriptions
    - Test subscription established on mount
    - Test UI updates when new submission event received
    - Test UI updates when new verification event received
    - Test subscription cleaned up on unmount
    - _Requirements: 10.1, 10.2, 10.4, 10.5, 10.6_

- [ ] 14. Enhance HistoryPage with verification badges
  - [ ] 14.1 Add VerificationBadge to EscrowCard in HistoryPage
    - Import VerificationBadge component
    - Fetch latest verification for each escrow
    - Display badge showing latest verification score
    - _Requirements: 3.2_
  
  - [ ] 14.2 Add "Needs Review" filter to HistoryPage
    - Add filter option for escrows with reject/request_changes recommendations
    - Filter escrows based on latest verification recommendation
    - _Requirements: 3.2_
  
  - [ ]* 14.3 Write integration tests for HistoryPage enhancements
    - Test verification badges display on escrow cards
    - Test "Needs Review" filter shows correct escrows
    - _Requirements: 3.2_

- [ ] 15. Implement edge case handling
  - [ ] 15.1 Handle submissions with only URLs (no description)
    - Accept submission with empty description if URLs provided
    - Note lack of description in verification feedback
    - _Requirements: 9.1_
  
  - [ ] 15.2 Handle submissions with only description (no URLs)
    - Accept submission with no URLs if description provided
    - Verify based on description only
    - _Requirements: 9.2_
  
  - [ ] 15.3 Handle milestones with no explicit acceptance criteria
    - Use milestone name and description for verification
    - _Requirements: 9.3_
  
  - [ ] 15.4 Handle OpenAI API unavailability
    - Display user-friendly message when API unavailable
    - Allow manual review without verification
    - _Requirements: 9.4_
  
  - [ ] 15.5 Handle inaccessible URLs in submissions
    - Note inaccessible URLs in verification feedback
    - Continue verification with available information
    - _Requirements: 9.7_
  
  - [ ]* 15.6 Write integration tests for edge cases
    - Test submission with only URLs accepted
    - Test submission with only description accepted
    - Test verification works with minimal milestone criteria
    - Test graceful degradation when OpenAI unavailable
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.7_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. End-to-end integration and validation
  - [ ] 17.1 Test complete submission-to-payment flow
    - Create test escrow with milestones
    - Submit work evidence as freelancer
    - Verify AI analysis completes successfully
    - Review verification report as client
    - Release payment with verification displayed
    - Verify audit trail recorded correctly
    - _Requirements: 1.1, 1.5, 1.6, 2.1, 2.2, 2.3, 2.10, 3.1, 3.7, 5.1, 5.5, 6.1, 6.2_
  
  - [ ] 17.2 Test real-time updates across multiple browser tabs
    - Open escrow in two browser tabs
    - Submit work in tab 1
    - Verify tab 2 receives realtime update
    - Verify verification report appears in both tabs
    - _Requirements: 10.1, 10.2, 10.4, 10.5_
  
  - [ ] 17.3 Test caching behavior
    - View verification report multiple times
    - Verify cache hit logged in console
    - Submit new work for same milestone
    - Verify cache invalidated
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 17.4 Validate database constraints and RLS policies
    - Attempt to insert submission with invalid data (should fail)
    - Attempt to view another user's submissions (should fail)
    - Verify indexes exist on all required columns
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- All components should match existing Tailwind CSS theme and design patterns
- Reuse existing patterns from codebase (retry logic, caching, error handling)
- AI verification is advisory only - clients can always override recommendations
- Complete audit trail maintained for all submissions and payment decisions
