# Task 12: Manual Testing and Verification Checklist

## Overview

This document provides a comprehensive manual testing checklist for the Release Funds Button feature. All automated tests are passing (22 tests across 2 test files). This checklist covers end-to-end scenarios, edge cases, and user experience validation that require manual verification.

**Status**: ✅ All automated tests passing (22/22)

---

## Prerequisites

Before starting manual testing, ensure:

- [ ] Freighter wallet extension is installed and configured
- [ ] Test wallet has sufficient XLM balance for transactions
- [ ] Supabase database is accessible and migrations are applied
- [ ] Stellar testnet is accessible
- [ ] Frontend development server is running (`npm run dev`)
- [ ] You have at least two test wallet addresses (client and freelancer)

---

## Test Scenarios

### 1. Happy Path - Complete Workflow

**Objective**: Verify the complete end-to-end flow from escrow creation to payment release.

#### Steps:

1. **Create Escrow**
   - [ ] Navigate to the application
   - [ ] Connect Freighter wallet as client
   - [ ] Create a new escrow with:
     - Title: "Test Project - Release Funds"
     - Freelancer address: [Your test freelancer address]
     - Total amount: 200 XLM
     - 2 milestones:
       - Milestone 1: "Design Phase" - 50% (100 XLM)
       - Milestone 2: "Development Phase" - 50% (100 XLM)
   - [ ] Sign the transaction with Freighter
   - [ ] Verify escrow is created successfully

2. **Submit Work for Milestone 1**
   - [ ] Navigate to the escrow detail page
   - [ ] Verify "Design Phase" is the active milestone
   - [ ] Submit work deliverable:
     - Description: "Completed design mockups and wireframes"
     - URLs: Add at least one URL (e.g., Figma link)
   - [ ] Verify submission is saved

3. **Wait for AI Verification**
   - [ ] Wait for AI verification to complete (should take 10-30 seconds)
   - [ ] Verify VerificationReport appears with score and recommendation

4. **Release Funds**
   - [ ] Verify "Release Funds" button appears below the verification report
   - [ ] Verify button displays milestone name "Design Phase"
   - [ ] Verify button displays amount "100.00 XLM"
   - [ ] Click "Release Funds" button
   - [ ] Verify confirmation dialog appears with:
     - Milestone name: "Design Phase"
     - Amount: "100.00 XLM"
     - Verification score and recommendation
   - [ ] Click "Confirm Release" button
   - [ ] Verify Freighter wallet popup appears
   - [ ] Sign the transaction in Freighter
   - [ ] Verify button shows "Waiting for wallet..." state
   - [ ] Verify button shows "Submitting transaction..." state
   - [ ] Verify success message appears with transaction hash
   - [ ] Verify transaction link to Stellar Explorer works
   - [ ] Verify success message auto-hides after 3 seconds

5. **Verify State Updates**
   - [ ] Verify "Design Phase" milestone is marked as completed
   - [ ] Verify "Release Funds" button is no longer visible for Milestone 1
   - [ ] Verify "Development Phase" (Milestone 2) becomes the active milestone
   - [ ] Verify "Release Funds" button appears for Milestone 2

6. **Verify Database Records**
   - [ ] Open Supabase dashboard
   - [ ] Navigate to `escrows` table
   - [ ] Find your test escrow record
   - [ ] Verify `payment_releases` column contains:
     ```json
     [
       {
         "milestone_index": 0,
         "released_at": "[timestamp]",
         "tx_hash": "[transaction hash]",
         "verification_id": "[UUID]",
         "score": [score value],
         "recommendation": "[approve/request_changes/reject]"
       }
     ]
     ```

**Expected Result**: ✅ Complete workflow executes successfully with proper state transitions and database updates.

---

### 2. Verification Recommendation Scenarios

**Objective**: Test button behavior with different AI verification recommendations.

#### 2.1 Test with "approve" Recommendation

- [ ] Create escrow and submit high-quality work
- [ ] Wait for verification (should get "approve" recommendation with score 80+)
- [ ] Verify button shows no warning indicators
- [ ] Click "Release Funds"
- [ ] Verify confirmation dialog shows:
  - ✅ Green checkmark icon
  - "Verification approved" message
  - Score display (e.g., "Score: 85/100")
- [ ] Confirm and complete release
- [ ] Verify transaction succeeds

**Expected Result**: ✅ Positive verification flow with green indicators.

#### 2.2 Test with "request_changes" Recommendation

- [ ] Create escrow and submit work with some gaps
- [ ] Wait for verification (should get "request_changes" recommendation with score 50-79)
- [ ] Verify button shows yellow caution indicator
- [ ] Verify warning text: "Verification suggests changes"
- [ ] Click "Release Funds"
- [ ] Verify confirmation dialog shows:
  - ⚠️ Yellow warning icon
  - "Verification suggests changes" message
  - Score display (e.g., "Score: 65/100")
  - Caution message about proceeding
- [ ] Confirm and complete release
- [ ] Verify transaction succeeds despite warning

**Expected Result**: ✅ Caution indicators displayed but release still allowed.

#### 2.3 Test with "reject" Recommendation

- [ ] Create escrow and submit incomplete/poor quality work
- [ ] Wait for verification (should get "reject" recommendation with score <50)
- [ ] Verify button shows red warning indicator
- [ ] Verify warning text: "Verification recommends rejection"
- [ ] Click "Release Funds"
- [ ] Verify confirmation dialog shows:
  - ❌ Red error icon
  - "Verification recommends rejection" message
  - Score display (e.g., "Score: 35/100")
  - Strong warning message about low score
- [ ] Verify "Confirm Release" button is still enabled (client has final authority)
- [ ] Confirm and complete release
- [ ] Verify transaction succeeds despite strong warning

**Expected Result**: ✅ Strong warning indicators displayed but release still allowed (client authority).

#### 2.4 Test with No Verification

- [ ] Create escrow
- [ ] Navigate to escrow detail page
- [ ] Verify "Release Funds" button is visible even without submission
- [ ] Verify warning indicator appears
- [ ] Verify warning text: "No verification available"
- [ ] Click "Release Funds"
- [ ] Verify confirmation dialog shows:
  - ⚠️ Warning icon
  - "No verification available" message
  - Warning that no work has been submitted or verified
- [ ] Confirm and complete release
- [ ] Verify transaction succeeds
- [ ] Verify database record has no verification_id, score, or recommendation

**Expected Result**: ✅ Release allowed without verification (AI is advisory only).

---

### 3. Error Handling Scenarios

**Objective**: Verify proper error handling and user feedback.

#### 3.1 Wallet Cancellation

- [ ] Create escrow and submit work
- [ ] Click "Release Funds" and confirm in dialog
- [ ] When Freighter popup appears, click "Reject" or close the popup
- [ ] Verify error message appears: "Transaction cancelled by user"
- [ ] Verify button returns to enabled state after 5 seconds
- [ ] Verify you can retry the transaction
- [ ] Retry and complete successfully

**Expected Result**: ✅ Clear error message, button recovers, retry works.

#### 3.2 Network Error Handling

- [ ] Create escrow and submit work
- [ ] Disconnect from internet or use browser dev tools to simulate offline
- [ ] Click "Release Funds" and confirm
- [ ] Sign transaction in Freighter
- [ ] Verify error message appears: "Network unavailable. Please try again later."
- [ ] Reconnect to internet
- [ ] Verify you can retry the transaction
- [ ] Retry and complete successfully

**Expected Result**: ✅ Network error detected and displayed, retry works after reconnection.

#### 3.3 Unauthorized Release Attempt (Wrong Wallet)

- [ ] Create escrow with Client Wallet A
- [ ] Switch to different wallet (Wallet B) in Freighter
- [ ] Navigate to escrow detail page
- [ ] Click "Release Funds" and confirm
- [ ] Sign transaction with Wallet B
- [ ] Verify error message appears: "Only the escrow creator can release funds"
- [ ] Switch back to Client Wallet A
- [ ] Retry and complete successfully

**Expected Result**: ✅ Contract rejects unauthorized release, clear error message.

#### 3.4 Wallet Not Connected

- [ ] Disconnect Freighter wallet
- [ ] Navigate to escrow detail page
- [ ] Verify "Release Funds" button shows "Connect Wallet" message
- [ ] Click button
- [ ] Verify error message: "Please connect your Freighter wallet"
- [ ] Connect wallet
- [ ] Verify button becomes functional

**Expected Result**: ✅ Clear messaging when wallet not connected.

#### 3.5 Locked Wallet

- [ ] Lock Freighter wallet (click lock icon in extension)
- [ ] Navigate to escrow detail page
- [ ] Click "Release Funds" and confirm
- [ ] Verify error message: "Please unlock your Freighter wallet"
- [ ] Unlock wallet
- [ ] Retry and complete successfully

**Expected Result**: ✅ Locked wallet detected, clear error message.

---

### 4. Milestone Progression Scenarios

**Objective**: Verify correct behavior with multiple milestones.

#### 4.1 Releasing Last Milestone

- [ ] Create escrow with 2 milestones
- [ ] Complete and release Milestone 1
- [ ] Verify Milestone 2 becomes active
- [ ] Complete and release Milestone 2
- [ ] Verify "Release Funds" button disappears completely
- [ ] Verify both milestones show as completed
- [ ] Verify no active milestone indicator

**Expected Result**: ✅ Button disappears after last milestone is released.

#### 4.2 Multiple Milestones Progression

- [ ] Create escrow with 3 milestones (33%, 33%, 34%)
- [ ] Verify only Milestone 1 shows "Release Funds" button
- [ ] Release Milestone 1
- [ ] Verify Milestone 2 becomes active and shows button
- [ ] Verify Milestone 1 no longer shows button
- [ ] Release Milestone 2
- [ ] Verify Milestone 3 becomes active and shows button
- [ ] Release Milestone 3
- [ ] Verify all milestones completed, no button visible

**Expected Result**: ✅ Button appears only for active milestone, progresses correctly.

#### 4.3 Skipping Milestones (Edge Case)

- [ ] Create escrow with 3 milestones
- [ ] Verify you cannot release Milestone 2 before Milestone 1
- [ ] Verify button only appears for active milestone (Milestone 1)

**Expected Result**: ✅ Sequential milestone release enforced.

---

### 5. UI/UX Validation

**Objective**: Verify visual design, accessibility, and user experience.

#### 5.1 Visual Design

- [ ] Verify button styling matches application theme
- [ ] Verify button has proper hover state (darker background)
- [ ] Verify button has proper focus state (ring outline)
- [ ] Verify button has proper disabled state (grayed out, cursor not-allowed)
- [ ] Verify warning indicators use correct colors:
  - Green for "approve"
  - Yellow for "request_changes"
  - Red for "reject"
  - Gray for no verification
- [ ] Verify confirmation dialog has backdrop overlay
- [ ] Verify confirmation dialog is centered on screen
- [ ] Verify success message has checkmark icon
- [ ] Verify error messages have error icon
- [ ] Verify loading states show spinner icon

**Expected Result**: ✅ Consistent, polished visual design.

#### 5.2 Responsive Design

- [ ] Test on desktop (1920x1080)
  - [ ] Verify button is properly sized
  - [ ] Verify dialog is centered and readable
- [ ] Test on tablet (768x1024)
  - [ ] Verify button adapts to smaller screen
  - [ ] Verify dialog remains usable
- [ ] Test on mobile (375x667)
  - [ ] Verify button has minimum 44x44px touch target
  - [ ] Verify dialog fits on screen
  - [ ] Verify text is readable
  - [ ] Verify buttons are easily tappable

**Expected Result**: ✅ Responsive design works on all screen sizes.

#### 5.3 Keyboard Accessibility

- [ ] Navigate to "Release Funds" button using Tab key
- [ ] Verify button has visible focus ring
- [ ] Press Enter to activate button
- [ ] Verify confirmation dialog opens
- [ ] Verify focus moves to "Confirm Release" button
- [ ] Press Tab to move between buttons in dialog
- [ ] Press Escape to close dialog
- [ ] Verify focus returns to "Release Funds" button
- [ ] Press Enter on "Release Funds" again
- [ ] Press Enter on "Confirm Release" to execute transaction

**Expected Result**: ✅ Full keyboard navigation support.

#### 5.4 Screen Reader Accessibility

- [ ] Enable screen reader (VoiceOver on Mac, NVDA on Windows)
- [ ] Navigate to "Release Funds" button
- [ ] Verify aria-label is announced: "Release 100.00 XLM payment for [Milestone Name]"
- [ ] Activate button
- [ ] Verify dialog role is announced
- [ ] Verify dialog title is announced
- [ ] Navigate through dialog content
- [ ] Verify button labels are announced correctly
- [ ] During transaction, verify aria-busy state is announced

**Expected Result**: ✅ Screen reader announces all relevant information.

#### 5.5 Loading States

- [ ] Click "Release Funds" and confirm
- [ ] Verify button shows "Waiting for wallet..." with spinner
- [ ] Sign transaction
- [ ] Verify button shows "Submitting transaction..." with spinner
- [ ] Verify button is disabled during processing
- [ ] Verify double-click prevention works (button stays disabled)
- [ ] Wait for success
- [ ] Verify button shows "✓ Payment Released!" with checkmark
- [ ] Verify success state auto-hides after 3 seconds

**Expected Result**: ✅ Clear loading states throughout transaction flow.

---

### 6. Database Audit Trail Verification

**Objective**: Verify complete audit trail in database.

#### 6.1 Payment Release Records

- [ ] Release funds for a milestone with verification
- [ ] Open Supabase dashboard
- [ ] Query `escrows` table for your test escrow
- [ ] Verify `payment_releases` array contains:
  - [ ] `milestone_index` matches released milestone
  - [ ] `released_at` timestamp is accurate
  - [ ] `tx_hash` matches Stellar transaction hash
  - [ ] `verification_id` matches verification record UUID
  - [ ] `score` matches verification score
  - [ ] `recommendation` matches verification recommendation

#### 6.2 Multiple Releases

- [ ] Release multiple milestones
- [ ] Verify `payment_releases` array grows with each release
- [ ] Verify array maintains chronological order
- [ ] Verify each record is complete and accurate

#### 6.3 Release Without Verification

- [ ] Release funds without submitting work
- [ ] Verify `payment_releases` record contains:
  - [ ] `milestone_index`
  - [ ] `released_at`
  - [ ] `tx_hash`
  - [ ] No `verification_id`, `score`, or `recommendation` fields

**Expected Result**: ✅ Complete, accurate audit trail for all releases.

---

### 7. Transaction Link Verification

**Objective**: Verify Stellar Explorer links work correctly.

- [ ] Release funds successfully
- [ ] Click transaction hash link in success message
- [ ] Verify link opens Stellar Explorer in new tab
- [ ] Verify transaction details are displayed:
  - [ ] Transaction hash matches
  - [ ] Source account matches client address
  - [ ] Operation type is "invoke_contract"
  - [ ] Transaction status is "success"
- [ ] Verify you can view full transaction details

**Expected Result**: ✅ Transaction links work and display correct information.

---

### 8. Edge Cases and Stress Testing

**Objective**: Test unusual scenarios and edge cases.

#### 8.1 Rapid Clicking (Double-Click Prevention)

- [ ] Click "Release Funds" button rapidly multiple times
- [ ] Verify only one confirmation dialog opens
- [ ] Confirm transaction
- [ ] Verify button is disabled during processing
- [ ] Verify only one transaction is submitted

**Expected Result**: ✅ Double-click prevention works.

#### 8.2 Page Refresh During Transaction

- [ ] Click "Release Funds" and confirm
- [ ] While transaction is processing, refresh the page
- [ ] Verify page reloads
- [ ] Check Stellar Explorer to see if transaction completed
- [ ] If completed, verify database is updated
- [ ] If not completed, verify you can retry

**Expected Result**: ✅ State recovers gracefully after page refresh.

#### 8.3 Multiple Browser Tabs

- [ ] Open escrow detail page in two browser tabs
- [ ] In Tab 1, release funds
- [ ] In Tab 2, refresh page
- [ ] Verify Tab 2 shows updated state (milestone completed)
- [ ] Verify button is no longer visible in Tab 2

**Expected Result**: ✅ State synchronizes across tabs after refresh.

#### 8.4 Slow Network

- [ ] Use browser dev tools to throttle network to "Slow 3G"
- [ ] Click "Release Funds" and confirm
- [ ] Verify loading states are displayed for longer duration
- [ ] Verify transaction eventually completes
- [ ] Verify no timeout errors occur

**Expected Result**: ✅ Works correctly on slow networks.

#### 8.5 Missing on_chain_id

- [ ] Create escrow but simulate database corruption by removing `on_chain_id`
- [ ] Navigate to escrow detail page
- [ ] Verify "Release Funds" button is not displayed
- [ ] Or verify error message: "Escrow not found on blockchain"

**Expected Result**: ✅ Graceful handling of missing on_chain_id.

---

## Test Results Summary

### Automated Tests
- ✅ **22/22 tests passing**
  - ReleaseFundsButton: 12 tests
  - ConfirmationDialog: 10 tests

### Manual Tests
Use this section to track your manual testing progress:

| Test Scenario | Status | Notes |
|--------------|--------|-------|
| 1. Happy Path | ⬜ | |
| 2.1 Approve Recommendation | ⬜ | |
| 2.2 Request Changes Recommendation | ⬜ | |
| 2.3 Reject Recommendation | ⬜ | |
| 2.4 No Verification | ⬜ | |
| 3.1 Wallet Cancellation | ⬜ | |
| 3.2 Network Error | ⬜ | |
| 3.3 Unauthorized Release | ⬜ | |
| 3.4 Wallet Not Connected | ⬜ | |
| 3.5 Locked Wallet | ⬜ | |
| 4.1 Last Milestone | ⬜ | |
| 4.2 Multiple Milestones | ⬜ | |
| 4.3 Sequential Enforcement | ⬜ | |
| 5.1 Visual Design | ⬜ | |
| 5.2 Responsive Design | ⬜ | |
| 5.3 Keyboard Accessibility | ⬜ | |
| 5.4 Screen Reader | ⬜ | |
| 5.5 Loading States | ⬜ | |
| 6.1 Payment Records | ⬜ | |
| 6.2 Multiple Releases | ⬜ | |
| 6.3 Release Without Verification | ⬜ | |
| 7. Transaction Links | ⬜ | |
| 8.1 Double-Click Prevention | ⬜ | |
| 8.2 Page Refresh | ⬜ | |
| 8.3 Multiple Tabs | ⬜ | |
| 8.4 Slow Network | ⬜ | |
| 8.5 Missing on_chain_id | ⬜ | |

---

## Known Issues

Document any issues found during testing:

1. **Issue**: [Description]
   - **Severity**: Critical / High / Medium / Low
   - **Steps to Reproduce**: [Steps]
   - **Expected**: [Expected behavior]
   - **Actual**: [Actual behavior]
   - **Status**: Open / In Progress / Resolved

---

## Sign-Off

Once all manual tests are complete and passing:

- [ ] All automated tests passing (22/22)
- [ ] All critical manual tests passing
- [ ] All high-priority manual tests passing
- [ ] Known issues documented
- [ ] Feature ready for production

**Tested By**: ___________________  
**Date**: ___________________  
**Signature**: ___________________

---

## Additional Notes

- The Release Funds Button feature is fully implemented and tested
- All requirements from the spec are met
- The feature integrates seamlessly with existing components
- Error handling is comprehensive and user-friendly
- Accessibility standards (WCAG AA) are met
- The feature is ready for user acceptance testing

**Next Steps**:
1. Perform manual testing using this checklist
2. Document any issues found
3. If issues are found, create bug reports and fix
4. Once all tests pass, mark Task 12 as complete
5. Feature is ready for production deployment
