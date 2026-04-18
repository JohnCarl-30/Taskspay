# Design Document: Release Funds Button

## Overview

The Release Funds Button feature adds a critical UI control to the MilestoneEscrow application, enabling clients to approve milestone completion and release payment to freelancers. This feature bridges the gap between AI-powered delivery verification (which provides recommendations) and actual payment execution (which requires explicit client approval).

The design integrates seamlessly with existing components and infrastructure:
- **Smart Contract Integration**: Calls the existing `releaseFunds` function in the Soroban smart contract
- **Wallet Integration**: Uses Freighter wallet for transaction signing
- **Database Audit Trail**: Records payment releases with verification context in the `payment_releases` JSONB column
- **UI Integration**: Adds button to EscrowDetailPage near the VerificationReport component

### Key Design Principles

1. **Safety First**: Multiple confirmation steps prevent accidental payment releases
2. **Transparency**: Clear display of verification results, payment amounts, and transaction status
3. **Resilience**: Comprehensive error handling for wallet, network, and contract failures
4. **Auditability**: Complete audit trail linking payments to verification results
5. **Reusability**: Leverages existing functions and patterns from the codebase

## Architecture

### Component Structure

```
EscrowDetailPage
├── Escrow Summary (existing)
├── Milestones List (existing)
└── Active Milestone Section
    ├── SubmissionForm (existing)
    ├── VerificationReport (existing)
    └── ReleaseFundsButton (NEW)
        ├── Button UI
        ├── ConfirmationDialog
        └── TransactionStatusDisplay
```

### Data Flow

```
User Click
    ↓
Check Verification Status
    ↓
Display Confirmation Dialog
    ↓
User Confirms
    ↓
Call releaseFunds(escrowId, clientAddress)
    ↓
Request Wallet Signature (Freighter)
    ↓
Submit Transaction (Stellar Network)
    ↓
Update Database (payment_releases)
    ↓
Update UI (mark milestone complete)
```

### State Management

The ReleaseFundsButton component manages the following state:

```typescript
interface ReleaseFundsState {
  // Transaction flow state
  status: 'idle' | 'confirming' | 'signing' | 'submitting' | 'success' | 'error';
  
  // Transaction data
  txHash: string | null;
  
  // Error handling
  error: string | null;
  
  // Confirmation dialog
  showConfirmation: boolean;
}
```

## Components and Interfaces

### ReleaseFundsButton Component

**Location**: `frontend/src/components/ReleaseFundsButton.tsx`

**Props Interface**:
```typescript
interface ReleaseFundsButtonProps {
  escrowId: string;
  onChainEscrowId: number;
  milestoneIndex: number;
  milestoneName: string;
  milestoneAmount: number;
  clientAddress: string;
  verification: DeliveryVerification | null;
  onSuccess: () => void;
  onError: (error: Error) => void;
}
```

**Component Structure**:
```typescript
export default function ReleaseFundsButton({
  escrowId,
  onChainEscrowId,
  milestoneIndex,
  milestoneName,
  milestoneAmount,
  clientAddress,
  verification,
  onSuccess,
  onError,
}: ReleaseFundsButtonProps) {
  const [state, setState] = useState<ReleaseFundsState>({
    status: 'idle',
    txHash: null,
    error: null,
    showConfirmation: false,
  });

  // Handler functions
  const handleClick = () => { /* Show confirmation dialog */ };
  const handleConfirm = async () => { /* Execute transaction */ };
  const handleCancel = () => { /* Close dialog */ };

  // Render button with appropriate state
  return (
    <>
      <button onClick={handleClick}>
        {/* Button content based on state */}
      </button>
      
      {state.showConfirmation && (
        <ConfirmationDialog
          milestoneName={milestoneName}
          amount={milestoneAmount}
          verification={verification}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      
      {state.status === 'success' && (
        <SuccessMessage txHash={state.txHash} />
      )}
      
      {state.status === 'error' && (
        <ErrorMessage error={state.error} />
      )}
    </>
  );
}
```

### ConfirmationDialog Component

**Location**: `frontend/src/components/ConfirmationDialog.tsx`

**Props Interface**:
```typescript
interface ConfirmationDialogProps {
  milestoneName: string;
  amount: number;
  verification: DeliveryVerification | null;
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Visual Design**:
- Modal overlay with backdrop
- Displays milestone name and payment amount prominently
- Shows verification score and recommendation (if available)
- Warning indicators for missing verification or "reject" recommendation
- Clear "Confirm Release" and "Cancel" buttons
- Keyboard accessible (Enter to confirm, Escape to cancel)

### Integration with EscrowDetailPage

**Modification**: `frontend/src/pages/EscrowDetailPage.tsx`

Add ReleaseFundsButton after VerificationReport in the active milestone section:

```typescript
{/* Display Verification Report if verification exists */}
{latestVerification && latestSubmission && (
  <div className="mt-4">
    <VerificationReport
      verification={latestVerification}
      submission={latestSubmission}
      showFullSubmission={false}
    />
  </div>
)}

{/* NEW: Release Funds Button */}
{isActiveMilestone && escrow.on_chain_id && wallet && (
  <div className="mt-4">
    <ReleaseFundsButton
      escrowId={escrow.id}
      onChainEscrowId={escrow.on_chain_id}
      milestoneIndex={escrow.currentMilestoneIndex}
      milestoneName={activeMilestone.name}
      milestoneAmount={activeMilestone.xlm}
      clientAddress={wallet.publicKey}
      verification={latestVerification}
      onSuccess={handleReleaseFundsSuccess}
      onError={handleReleaseFundsError}
    />
  </div>
)}
```

## Data Models

### Payment Release Record

**Schema** (stored in `escrows.payment_releases` JSONB array):
```typescript
interface PaymentRelease {
  milestone_index: number;
  released_at: string; // ISO 8601 timestamp
  tx_hash: string; // Stellar transaction hash
  verification_id?: string; // UUID of verification (if exists)
  score?: number; // Verification score 0-100 (if exists)
  recommendation?: 'approve' | 'request_changes' | 'reject'; // (if exists)
}
```

**Example**:
```json
[
  {
    "milestone_index": 0,
    "released_at": "2024-01-15T10:30:00Z",
    "tx_hash": "abc123...",
    "verification_id": "550e8400-e29b-41d4-a716-446655440000",
    "score": 85,
    "recommendation": "approve"
  }
]
```

### Extended Escrow Interface

Add `on_chain_id` to the EscrowDetail interface in EscrowDetailPage:

```typescript
interface EscrowDetail {
  id: string;
  title: string;
  freelancerAddress: string;
  totalAmount: number;
  milestones: Milestone[];
  currentMilestoneIndex: number;
  on_chain_id: number | null; // NEW: Required for releaseFunds call
}
```

## Error Handling

### Error Categories and Messages

1. **Wallet Errors**
   - Not connected: "Please connect your Freighter wallet"
   - Locked: "Please unlock your Freighter wallet"
   - User cancelled: "Transaction cancelled by user"
   - Signature failed: "Wallet signature failed. Please try again."

2. **Contract Errors**
   - Escrow not found: "Escrow not found on blockchain"
   - Unauthorized: "Only the escrow creator can release funds"
   - Already completed: "All milestones already completed"
   - Not active: "Escrow is not active"

3. **Network Errors**
   - Simulation failed: Display simulation error message
   - Submission failed: "Transaction failed. Please check your wallet and try again."
   - Network unavailable: "Network unavailable. Please try again later."

4. **Database Errors**
   - Update failed: "Payment released on-chain but database update failed. Please refresh the page."

### Error Handling Pattern

```typescript
const handleConfirm = async () => {
  setState({ ...state, status: 'signing', showConfirmation: false });
  
  try {
    // Step 1: Call smart contract
    setState({ ...state, status: 'submitting' });
    const result = await releaseFunds(
      clientAddress,
      onChainEscrowId,
      signTransaction
    );
    
    // Step 2: Update database
    const paymentRelease: PaymentRelease = {
      milestone_index: milestoneIndex,
      released_at: new Date().toISOString(),
      tx_hash: result.hash,
      ...(verification && {
        verification_id: verification.id,
        score: verification.score,
        recommendation: verification.recommendation,
      }),
    };
    
    await updateEscrowPaymentReleases(escrowId, paymentRelease);
    
    // Step 3: Success
    setState({
      status: 'success',
      txHash: result.hash,
      error: null,
      showConfirmation: false,
    });
    
    onSuccess();
    
  } catch (error) {
    // Categorize and display error
    const errorMessage = categorizeError(error);
    setState({
      status: 'error',
      txHash: null,
      error: errorMessage,
      showConfirmation: false,
    });
    
    onError(new Error(errorMessage));
  }
};

function categorizeError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Wallet errors
    if (message.includes('user declined') || message.includes('cancelled')) {
      return 'Transaction cancelled by user';
    }
    if (message.includes('freighter not installed')) {
      return 'Please install the Freighter wallet extension';
    }
    if (message.includes('locked')) {
      return 'Please unlock your Freighter wallet';
    }
    
    // Contract errors
    if (message.includes('only client can release')) {
      return 'Only the escrow creator can release funds';
    }
    if (message.includes('escrow not found')) {
      return 'Escrow not found on blockchain';
    }
    if (message.includes('not active')) {
      return 'Escrow is not active';
    }
    if (message.includes('all milestones already completed')) {
      return 'All milestones already completed';
    }
    
    // Network errors
    if (message.includes('simulation failed')) {
      return `Transaction simulation failed: ${error.message}`;
    }
    if (message.includes('network')) {
      return 'Network unavailable. Please try again later.';
    }
    
    // Generic error
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}
```

## Testing Strategy

### Unit Tests

**File**: `frontend/src/components/ReleaseFundsButton.test.tsx`

Test cases:
1. **Rendering**
   - Renders button with correct text and amount
   - Shows warning indicator when no verification exists
   - Shows caution indicator when verification recommendation is "reject"
   - Displays correct state (idle, signing, submitting, success, error)

2. **User Interactions**
   - Opens confirmation dialog on button click
   - Closes dialog on cancel
   - Disables button during transaction processing
   - Prevents double-clicks

3. **Transaction Flow**
   - Calls releaseFunds with correct parameters
   - Requests wallet signature
   - Updates database with payment release record
   - Calls onSuccess callback after successful transaction
   - Calls onError callback on failure

4. **Error Handling**
   - Displays correct error message for wallet cancellation
   - Displays correct error message for contract errors
   - Displays correct error message for network errors
   - Returns to idle state after error display timeout

5. **Accessibility**
   - Button has sufficient color contrast
   - Button has minimum 44x44px touch target
   - Dialog is keyboard accessible
   - Proper aria-label and aria-busy attributes

**File**: `frontend/src/components/ConfirmationDialog.test.tsx`

Test cases:
1. **Rendering**
   - Displays milestone name and amount
   - Shows verification score and recommendation when available
   - Shows warning when no verification exists
   - Shows strong warning for "reject" recommendation

2. **User Interactions**
   - Calls onConfirm when confirm button clicked
   - Calls onCancel when cancel button clicked
   - Closes on Escape key press
   - Confirms on Enter key press

3. **Accessibility**
   - Modal traps focus
   - First focusable element receives focus on open
   - Focus returns to trigger element on close

### Integration Tests

**File**: `frontend/src/pages/EscrowDetailPage.test.tsx`

Test cases:
1. **Button Visibility**
   - Shows button for active milestone
   - Hides button for completed milestones
   - Hides button for pending milestones
   - Hides button when wallet not connected
   - Hides button when on_chain_id is null

2. **End-to-End Flow**
   - Complete flow: click button → confirm → sign → submit → success
   - Verification context is passed correctly to button
   - Page updates after successful payment release
   - Next milestone becomes active after release

3. **Error Recovery**
   - Page remains functional after transaction error
   - User can retry after error
   - Database inconsistencies are handled gracefully

### Manual Testing Checklist

1. **Happy Path**
   - [ ] Create escrow with multiple milestones
   - [ ] Submit work for first milestone
   - [ ] Wait for AI verification
   - [ ] Click "Release Funds" button
   - [ ] Review confirmation dialog
   - [ ] Confirm transaction
   - [ ] Sign with Freighter wallet
   - [ ] Verify success message with transaction link
   - [ ] Verify milestone marked as completed
   - [ ] Verify next milestone becomes active

2. **Verification Scenarios**
   - [ ] Release with "approve" recommendation (green indicator)
   - [ ] Release with "request_changes" recommendation (yellow indicator)
   - [ ] Release with "reject" recommendation (red warning)
   - [ ] Release with no verification (warning message)

3. **Error Scenarios**
   - [ ] Cancel wallet signature → verify error message
   - [ ] Disconnect wallet during transaction → verify error
   - [ ] Try to release with wrong wallet address → verify contract error
   - [ ] Simulate network failure → verify error message
   - [ ] Try to release already completed milestone → verify error

4. **Edge Cases**
   - [ ] Release last milestone → verify button disappears
   - [ ] Refresh page during transaction → verify state recovery
   - [ ] Multiple browser tabs → verify state synchronization
   - [ ] Slow network → verify loading states

## Implementation Plan

### Phase 1: Core Component (Priority: High)

1. Create `ReleaseFundsButton.tsx` component
   - Implement state management
   - Implement button UI with state-based rendering
   - Add click handler to show confirmation dialog

2. Create `ConfirmationDialog.tsx` component
   - Implement modal overlay
   - Display milestone and verification information
   - Add confirm/cancel handlers
   - Implement keyboard accessibility

3. Integrate with `EscrowDetailPage.tsx`
   - Add ReleaseFundsButton after VerificationReport
   - Pass required props from escrow state
   - Add success/error handlers

### Phase 2: Transaction Logic (Priority: High)

1. Implement transaction execution in ReleaseFundsButton
   - Call `releaseFunds` from stellar.ts
   - Handle wallet signature request
   - Submit transaction to network
   - Update component state based on transaction status

2. Implement database update logic
   - Create helper function to update payment_releases
   - Handle database update errors
   - Implement retry logic for database failures

3. Add error categorization and handling
   - Implement `categorizeError` function
   - Add user-friendly error messages
   - Implement error state display

### Phase 3: UI Polish (Priority: Medium)

1. Add loading states and animations
   - Spinner during wallet signature
   - Progress indicator during submission
   - Success animation with checkmark
   - Error shake animation

2. Add transaction success display
   - Show transaction hash
   - Link to Stellar Explorer
   - Display success message for 3 seconds
   - Auto-hide after timeout

3. Implement warning indicators
   - Yellow caution icon for "request_changes"
   - Red warning icon for "reject"
   - Gray warning icon for missing verification

### Phase 4: Testing (Priority: High)

1. Write unit tests for ReleaseFundsButton
2. Write unit tests for ConfirmationDialog
3. Write integration tests for EscrowDetailPage
4. Perform manual testing with checklist
5. Test on different browsers and devices

### Phase 5: Documentation (Priority: Low)

1. Add JSDoc comments to components
2. Update README with feature description
3. Add inline code comments for complex logic
4. Document error codes and messages

## Dependencies

### Existing Functions (Reused)

- `releaseFunds(sourcePublicKey, escrowId, signTransaction)` from `frontend/src/stellar.ts`
- `signTransaction(xdr)` from `frontend/src/freighter.ts`
- `updateEscrow(id, updates)` from `frontend/src/supabase.ts`
- `TX_EXPLORER_URL(hash)` from `frontend/src/stellar.ts`

### New Functions (To Create)

```typescript
// frontend/src/supabase.ts
export const updateEscrowPaymentReleases = async (
  escrowId: string,
  paymentRelease: PaymentRelease
): Promise<void> => {
  // Fetch current payment_releases array
  const { data: escrow } = await supabase
    .from('escrows')
    .select('payment_releases')
    .eq('id', escrowId)
    .single();
  
  const currentReleases = escrow?.payment_releases || [];
  
  // Append new release
  const updatedReleases = [...currentReleases, paymentRelease];
  
  // Update database
  await updateEscrow(escrowId, {
    payment_releases: updatedReleases,
  });
};
```

### External Dependencies

- `@stellar/stellar-sdk` (already installed)
- `@stellar/freighter-api` (already installed)
- `@supabase/supabase-js` (already installed)
- React hooks: `useState`, `useEffect`
- Tailwind CSS for styling

## Security Considerations

1. **Authorization**
   - Smart contract enforces that only the client can release funds
   - Frontend validates wallet address matches escrow creator
   - Database RLS policies restrict updates to escrow owner

2. **Transaction Safety**
   - Confirmation dialog prevents accidental releases
   - Wallet signature required for every transaction
   - Transaction simulation catches errors before submission

3. **Data Integrity**
   - Payment releases are append-only (never modified)
   - Verification data is immutable once recorded
   - Database updates are atomic

4. **Error Handling**
   - Sensitive error details logged to console only
   - User-facing errors are sanitized
   - Failed transactions don't corrupt database state

## Performance Considerations

1. **Transaction Speed**
   - Stellar network typically confirms in 5-7 seconds
   - Loading states keep user informed during wait
   - No blocking operations on UI thread

2. **Database Updates**
   - Single database write per payment release
   - JSONB array append is efficient
   - No complex queries or joins

3. **Component Rendering**
   - Button state updates trigger minimal re-renders
   - Confirmation dialog uses portal for optimal performance
   - Success/error messages auto-dismiss to clean up DOM

## Accessibility

1. **Keyboard Navigation**
   - Button is keyboard focusable
   - Dialog is keyboard accessible (Enter/Escape)
   - Focus management in modal

2. **Screen Readers**
   - Proper aria-label on button
   - aria-busy during transaction processing
   - Descriptive error messages

3. **Visual Design**
   - WCAG AA color contrast ratios
   - Minimum 44x44px touch targets
   - Clear visual state indicators

4. **Responsive Design**
   - Button adapts to mobile screens
   - Dialog is mobile-friendly
   - Touch-friendly interaction areas

## Future Enhancements

1. **Batch Releases**
   - Allow releasing multiple milestones at once
   - Useful for completing projects with many small milestones

2. **Partial Releases**
   - Release a percentage of milestone payment
   - Useful for partial acceptance scenarios

3. **Release Scheduling**
   - Schedule automatic release after time period
   - Useful for time-based milestones

4. **Release History View**
   - Dedicated page showing all payment releases
   - Filter by date, milestone, verification score

5. **Email Notifications**
   - Notify freelancer when payment is released
   - Notify client when milestone is submitted

6. **Multi-Signature Support**
   - Require multiple approvals for large payments
   - Useful for enterprise escrows

## Conclusion

The Release Funds Button feature completes the payment approval workflow in the MilestoneEscrow application. By integrating AI verification recommendations with explicit client approval and blockchain-based payment execution, this feature provides a secure, transparent, and user-friendly way to release milestone payments.

The design prioritizes safety through multiple confirmation steps, transparency through clear display of verification results, and resilience through comprehensive error handling. The implementation leverages existing infrastructure and follows established patterns in the codebase, ensuring consistency and maintainability.
